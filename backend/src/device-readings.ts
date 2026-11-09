import type {FastifyInstance} from 'fastify';
import {pool} from './db.js';
import {authenticateDevice} from './device-auth.js';
import {readingInput} from './validation.js';
export async function registerDeviceReadings(app:FastifyInstance){
 app.post('/api/device/readings',{config:{rateLimit:{max:120,timeWindow:'1 minute'}}},async(req,reply)=>{
  const device=await authenticateDevice(req,reply);if(!device)return;
  const body=readingInput.omit({device_id:true,location_id:true,camera_id:true}).parse(req.body);
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   const prior=await client.query('SELECT id,location_id,camera_id,code,occurred_at FROM readings WHERE device_id=$1 AND device_event_id=$2',[device.id,body.device_event_id]);
   if(prior.rowCount){await client.query('COMMIT');return {id:prior.rows[0].id,duplicate:true,camera_id:prior.rows[0].camera_id};}
   const location=await client.query('SELECT l.id,l.primary_camera_id,c.active AS camera_active,r.active AS recorder_active FROM locations l LEFT JOIN cameras c ON c.id=l.primary_camera_id LEFT JOIN recorders r ON r.id=c.recorder_id WHERE l.id=$1 AND l.active=true FOR UPDATE OF l',[device.location_id]);
   if(!location.rowCount){await client.query('ROLLBACK');return reply.code(409).send({error:'Local indisponível'});}
   const loc=location.rows[0];
   const cameraId=loc.camera_active&&loc.recorder_active?loc.primary_camera_id:null;
   const inserted=await client.query(`INSERT INTO readings(device_event_id,device_id,location_id,camera_id,code,occurred_at)
    VALUES($1,$2,$3,$4,$5,$6) ON CONFLICT(device_id,device_event_id) DO NOTHING RETURNING id`,
    [body.device_event_id,device.id,device.location_id,cameraId,body.code,body.occurred_at]);
   const id=inserted.rows[0]?.id;
   if(id)await client.query('UPDATE devices SET last_seen_at=now() WHERE id=$1',[device.id]);
   await client.query('COMMIT');
   if(!id){const existing=await pool.query('SELECT id,camera_id FROM readings WHERE device_id=$1 AND device_event_id=$2',[device.id,body.device_event_id]);return {id:existing.rows[0]?.id,duplicate:true,camera_id:existing.rows[0]?.camera_id};}
   return reply.code(201).send({id,duplicate:false,camera_id:cameraId});
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 });
}
