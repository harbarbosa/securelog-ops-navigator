import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import rateLimit from '@fastify/rate-limit';
import argon2 from 'argon2';
import {z} from 'zod';
import {pool,dbHealth} from './db.js';
import {createSession,hashToken,requireUser,requireRole} from './auth.js';
import {registerCrud} from './crud.js';
import {registerDeviceReadings} from './device-readings.js';
import {registerDeviceProvision} from './device-provision.js';
import {registerReadingSearch} from './reading-access.js';
import {registerMedia} from './media.js';
import {registerUserLocations} from './user-locations.js';
const app=Fastify({logger:true,bodyLimit:1024*1024});
const origin=process.env.CORS_ORIGIN;
if(!origin) throw new Error('CORS_ORIGIN missing');
const nativeOrigins=['capacitor://localhost','http://localhost','https://localhost','ionic://localhost'];
const configuredOrigins=origin.split(',').map(s=>s.trim()).filter(Boolean);
const allowedOrigins=new Set([...configuredOrigins,...nativeOrigins]);
await app.register(cors,{origin:[...allowedOrigins],credentials:true});
await app.register(cookie);
app.addHook('onRequest',async(req,reply)=>{
 if(!['POST','PUT','PATCH','DELETE'].includes(req.method))return;
 // Browser cookie-authenticated requests must come from an allowed origin.
 // Zebra bearer-token requests have no session cookie and use a separate auth mechanism.
 if(req.url.startsWith('/api/device/'))return;
 const requestOrigin=req.headers.origin;
 if(requestOrigin&&!allowedOrigins.has(requestOrigin)){return reply.code(403).send({error:'Origem não autorizada'});}
 if(req.headers.cookie&&!requestOrigin){return reply.code(403).send({error:'Origem obrigatória para requisições autenticadas'});}
});
await app.register(rateLimit,{global:true,max:120,timeWindow:'1 minute'});
app.setErrorHandler((error,req,reply)=>{
 req.log.error(error);
 if(error instanceof z.ZodError){return reply.code(400).send({error:'Dados inválidos',details:error.flatten()});}
 const status=('statusCode' in Object(error))?Number((error as {statusCode?:number}).statusCode):500;
 return reply.code(status>=400&&status<500?status:500).send({error:status>=400&&status<500&&error instanceof Error?error.message:'Erro interno'});
});
app.get('/api/health',async()=>{await dbHealth();return {status:'ok',service:'securelog-api'};});
app.post('/api/auth/login',{config:{rateLimit:{max:10,timeWindow:'15 minutes'}}},async(req,reply)=>{
 const body=z.object({username:z.string().min(1),password:z.string().min(1)}).parse(req.body);
 const {rows}=await pool.query('SELECT id,username,name,role,password_hash FROM users WHERE username=$1 AND active=true',[body.username]);
 const u=rows[0];
 if(!u||!(await argon2.verify(u.password_hash,body.password)))return reply.code(401).send({error:'Credenciais inválidas'});
 const token=await createSession(u.id);
 reply.setCookie('securelog_session',token,{httpOnly:true,secure:process.env.NODE_ENV==='production',sameSite:'strict',path:'/',maxAge:43200});
 return {user:{id:u.id,username:u.username,name:u.name,role:u.role}};
});
app.get('/api/auth/me',async(req,reply)=>{const user=await requireUser(req,reply);if(!user)return;return {user};});
app.post('/api/auth/logout',async(req,reply)=>{
 const token=req.cookies.securelog_session;
 if(token)await pool.query('DELETE FROM sessions WHERE token_hash=$1',[hashToken(token)]);
 reply.clearCookie('securelog_session',{path:'/'});
 return {ok:true};
});
const entities={
 locations:{table:'locations',columns:'id,name,description,primary_camera_id,active',sort:'name'},
 recorders:{table:'recorders',columns:'id,name,host,port,rtsp_port,sdk_port,protocol,username,(password_ciphertext IS NOT NULL) AS has_credentials,active,last_seen_at',sort:'name'},
 cameras:{table:'cameras',columns:'id,name,recorder_id,channel,active',sort:'name'},
 devices:{table:'devices',columns:'id,name,serial_number,location_id,active,last_seen_at,(EXISTS (SELECT 1 FROM device_credentials dc WHERE dc.device_id=devices.id)) AS has_token',sort:'name'},
 users:{table:'users',columns:'id,name,username,email,role,active,created_at',sort:'name'}
} as const;
app.get('/api/:entity',async(req,reply)=>{
 const user=await requireUser(req,reply);if(!user)return;
 const {entity}=z.object({entity:z.string()}).parse(req.params);
 if(!(entity in entities))return reply.code(404).send({error:'Recurso não encontrado'});
 if(entity==='users'&&!requireRole(user,['admin','supervisor'],reply))return;
 const cfg=entities[entity as keyof typeof entities];
 const query=z.object({limit:z.coerce.number().int().min(1).max(100).default(25),offset:z.coerce.number().int().min(0).default(0)}).parse(req.query);
 const params:unknown[]=[];
 let where='';
 if(user.role!=='admin'){
  if(entity==='locations')where=' WHERE active=true';
  else if(entity==='devices')where=' WHERE location_id IN (SELECT location_id FROM user_locations WHERE user_id=$1)';
  else if(entity==='cameras')where=' WHERE id IN (SELECT primary_camera_id FROM locations WHERE id IN (SELECT location_id FROM user_locations WHERE user_id=$1))';
  else if(entity==='recorders')where=' WHERE id IN (SELECT recorder_id FROM cameras WHERE id IN (SELECT primary_camera_id FROM locations WHERE id IN (SELECT location_id FROM user_locations WHERE user_id=$1)))';
  else if(entity==='users'&&user.role==='supervisor')where=' WHERE id IN (SELECT user_id FROM user_locations WHERE location_id IN (SELECT location_id FROM user_locations WHERE user_id=$1))';
  if(where.includes('$1'))params.push(user.id);
 }
 const {rows}=await pool.query(`SELECT ${cfg.columns} FROM ${cfg.table}${where} ORDER BY ${cfg.sort} LIMIT $${params.length+1} OFFSET $${params.length+2}`,[...params,query.limit,query.offset]);
 const count=await pool.query(`SELECT count(*)::int AS total FROM ${cfg.table}${where}`,params);
 return {items:rows,total:count.rows[0].total,limit:query.limit,offset:query.offset};
});
// Reading ingestion is restricted to authenticated device credentials.
// Search is restricted by user location assignments.
await registerCrud(app);
await registerDeviceReadings(app);
await registerDeviceProvision(app);
await registerReadingSearch(app);
await registerMedia(app);
await registerUserLocations(app);
const port=Number(process.env.PORT??3333);
await app.listen({host:process.env.HOST??'127.0.0.1',port});
