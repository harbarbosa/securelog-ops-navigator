import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {pool} from './db.js';
import {authenticateDevice} from './device-auth.js';
import {requireUser} from './auth.js';
import {readingInput} from './validation.js';
export async function registerDeviceReadings(app:FastifyInstance){
 app.post('/api/device/readings',{config:{rateLimit:{max:120,timeWindow:'1 minute'}}},async(req,reply)=>{
  const device=await authenticateDevice(req,reply);if(!device)return;
   const body=readingInput.omit({device_id:true,camera_id:true}).extend({location_id:z.string().uuid().optional()}).parse(req.body);
   const locationId=body.location_id??device.location_id;
   if(!locationId)return reply.code(409).send({error:'Selecione um local para o coletor'});
   if(req.cookies.securelog_session){
    const user=await requireUser(req,reply);if(!user)return;
    if(user.role!=='admin'&&user.role!=='operator'){
     const allowed=await pool.query('SELECT 1 FROM user_locations WHERE user_id=$1 AND location_id=$2',[user.id,locationId]);
     if(!allowed.rowCount)return reply.code(403).send({error:'O operador não tem acesso a este local'});
    }
   }else if(body.location_id&&body.location_id!==device.location_id){
    return reply.code(403).send({error:'A troca de local exige uma sessão de operador'});
   }
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const prior=await client.query('SELECT id,location_id,camera_id,code,occurred_at FROM readings WHERE device_id=$1 AND device_event_id=$2',[device.id,body.device_event_id]);
   if(prior.rowCount){
    if(prior.rows[0].code!==body.code||new Date(prior.rows[0].occurred_at).getTime()!==new Date(body.occurred_at).getTime()){
     await client.query('ROLLBACK');return reply.code(409).send({error:'Identificador de evento já utilizado com dados diferentes'});
    }
    await client.query('COMMIT');return {id:prior.rows[0].id,duplicate:true,camera_id:prior.rows[0].camera_id};
   }
   const location=await client.query('SELECT l.id,l.primary_camera_id,c.active AS camera_active,r.active AS recorder_active FROM locations l LEFT JOIN cameras c ON c.id=l.primary_camera_id LEFT JOIN recorders r ON r.id=c.recorder_id WHERE l.id=$1 AND l.active=true FOR UPDATE OF l',[locationId]);
   if(!location.rowCount){await client.query('ROLLBACK');return reply.code(409).send({error:'Local indisponível'});}
   const loc=location.rows[0];
   const cameraId=loc.camera_active&&loc.recorder_active?loc.primary_camera_id:null;
   const inserted=await client.query(`INSERT INTO readings(device_event_id,device_id,location_id,camera_id,code,occurred_at)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(device_id,device_event_id) DO NOTHING RETURNING id`,
    [body.device_event_id,device.id,locationId,cameraId,body.code,body.occurred_at]);
   const id=inserted.rows[0]?.id;
   if(id)await client.query('UPDATE devices SET last_seen_at=now() WHERE id=$1',[device.id]);
   await client.query('COMMIT');
   if(!id){const existing=await pool.query('SELECT id,camera_id,code,occurred_at FROM readings WHERE device_id=$1 AND device_event_id=$2',[device.id,body.device_event_id]);
    const old=existing.rows[0];if(!old||old.code!==body.code||new Date(old.occurred_at).getTime()!==new Date(body.occurred_at).getTime())return reply.code(409).send({error:'Conflito de evento'});
    return {id:old.id,duplicate:true,camera_id:old.camera_id};}
   return reply.code(201).send({id,duplicate:false,camera_id:cameraId});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 });
}
