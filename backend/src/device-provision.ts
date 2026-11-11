import {randomBytes} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import {pool} from './db.js';
import {requireRole,requireUser} from './auth.js';
import {digest} from './device-auth.js';

export async function registerDeviceProvision(app:FastifyInstance){
 app.post('/api/manage/devices/:id/token',async(req,reply)=>{
  const user=await requireUser(req,reply);if(!user||!requireRole(user,['admin'],reply))return;
  const {id}=req.params as {id:string};
  const token=randomBytes(32).toString('hex');
  const device=await pool.query('SELECT id FROM devices WHERE id=$1 AND active=true',[id]);
  if(!device.rowCount)return reply.code(404).send({error:'Coletor ativo não encontrado'});
  await pool.query(`INSERT INTO device_credentials(device_id,token_hash) VALUES($1,$2)
   ON CONFLICT(device_id) DO UPDATE SET token_hash=excluded.token_hash,rotated_at=now()`,[id,digest(token)]);
  await pool.query('INSERT INTO audit_events(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)',[user.id,'provision','device_token',id,JSON.stringify({device_id:id})]);
  return {device_id:id,token};
 });
}
