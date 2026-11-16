import {randomBytes} from 'node:crypto';
import type {FastifyInstance} from 'fastify';
import {pool} from './db.js';
import {requireRole,requireUser} from './auth.js';
import {digest} from './device-auth.js';
import {decryptSecret,encryptSecret} from './secret.js';
import {z} from 'zod';

export async function registerDeviceProvision(app:FastifyInstance){
 app.post('/api/device/register',{config:{rateLimit:{max:20,timeWindow:'1 minute'}}},async(req,reply)=>{
  const body=z.object({name:z.string().trim().min(1).max(160),serial_number:z.string().trim().min(1).max(160)}).parse(req.body);
  const existing=await pool.query<{id:string;active:boolean;location_id:string|null;pairing_code:string|null;has_token:boolean}>('SELECT d.id,d.active,d.location_id,d.pairing_code,EXISTS (SELECT 1 FROM device_credentials dc WHERE dc.device_id=d.id) AS has_token FROM devices d WHERE d.serial_number=$1',[body.serial_number]);
  if(existing.rowCount){
   const device=existing.rows[0];
   await pool.query('UPDATE devices SET name=$1,last_seen_at=now() WHERE id=$2',[body.name,device.id]);
   if(device.has_token&&device.active)return {device_id:device.id,status:'associated'};
   const pairingCode=device.pairing_code??randomBytes(16).toString('hex');
   await pool.query('UPDATE devices SET active=false,pairing_code=$1,last_seen_at=now() WHERE id=$2',[pairingCode,device.id]);
   return {device_id:device.id,status:'pending',pairing_code:pairingCode};
  }
  const pairingCode=randomBytes(16).toString('hex');
  const created=await pool.query<{id:string}>('INSERT INTO devices(name,serial_number,active,pairing_code,last_seen_at) VALUES($1,$2,false,$3,now()) RETURNING id',[body.name,body.serial_number,pairingCode]);
  return reply.code(201).send({device_id:created.rows[0].id,status:'pending',pairing_code:pairingCode});
 });
 app.get('/api/device/pairing/:id',async(req,reply)=>{
  const {id}=z.object({id:z.string().uuid()}).parse(req.params);
  const code=req.headers['x-pairing-code'];
  if(typeof code!=='string'||!code)return reply.code(401).send({error:'Código de pareamento obrigatório'});
  const result=await pool.query<{token_ciphertext:string|null;location_id:string|null}>('SELECT dc.token_ciphertext,d.location_id FROM devices d LEFT JOIN device_credentials dc ON dc.device_id=d.id WHERE d.id=$1 AND d.active=true AND d.pairing_code=$2',[id,code]);
  const row=result.rows[0];
  if(!row)return reply.code(404).send({status:'pending'});
  if(!row.token_ciphertext)return {status:'pending'};
  const token=decryptSecret(row.token_ciphertext);
  await pool.query('UPDATE devices SET pairing_code=NULL,paired_at=now() WHERE id=$1',[id]);
  await pool.query('UPDATE device_credentials SET token_ciphertext=NULL WHERE device_id=$1',[id]);
  return {status:'associated',device_id:id,location_id:row.location_id,token};
 });
 app.post('/api/manage/devices/:id/token',async(req,reply)=>{
  const user=await requireUser(req,reply);if(!user||!requireRole(user,['admin'],reply))return;
  const {id}=req.params as {id:string};
  const token=randomBytes(32).toString('hex');
  const device=await pool.query('SELECT id FROM devices WHERE id=$1 AND active=true',[id]);
  if(!device.rowCount)return reply.code(404).send({error:'Coletor ativo não encontrado'});
  await pool.query(`INSERT INTO device_credentials(device_id,token_hash,token_ciphertext) VALUES($1,$2,$3)
   ON CONFLICT(device_id) DO UPDATE SET token_hash=excluded.token_hash,token_ciphertext=excluded.token_ciphertext,rotated_at=now()`,[id,digest(token),encryptSecret(token)]);
  await pool.query('INSERT INTO audit_events(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)',[user.id,'provision','device_token',id,JSON.stringify({device_id:id})]);
  return {device_id:id,token};
 });
 app.post('/api/manage/devices/:id/associate',async(req,reply)=>{
  const user=await requireUser(req,reply);if(!user||!requireRole(user,['admin'],reply))return;
  const {id}=z.object({id:z.string().uuid()}).parse(req.params);
  const body=z.object({location_id:z.string().uuid().nullable().optional()}).parse(req.body);
  if(body.location_id){
   const location=await pool.query('SELECT id FROM locations WHERE id=$1 AND active=true',[body.location_id]);
   if(!location.rowCount)return reply.code(404).send({error:'Local ativo não encontrado'});
  }
  const device=await pool.query('SELECT id FROM devices WHERE id=$1',[id]);
  if(!device.rowCount)return reply.code(404).send({error:'Leitor não encontrado'});
  await pool.query('UPDATE devices SET location_id=$1,active=true WHERE id=$2',[body.location_id??null,id]);
  const token=randomBytes(32).toString('hex');
  await pool.query(`INSERT INTO device_credentials(device_id,token_hash,token_ciphertext) VALUES($1,$2,$3)
   ON CONFLICT(device_id) DO UPDATE SET token_hash=excluded.token_hash,token_ciphertext=excluded.token_ciphertext,rotated_at=now()`,[id,digest(token),encryptSecret(token)]);
  await pool.query('INSERT INTO audit_events(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)',[user.id,'associate','device',id,JSON.stringify({location_id:body.location_id})]);
  return {device_id:id,status:'associated'};
 });
}
