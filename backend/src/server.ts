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
import {readingInput} from './validation.js';
const app=Fastify({logger:true,bodyLimit:1024*1024});
const origin=process.env.CORS_ORIGIN;
if(!origin) throw new Error('CORS_ORIGIN missing');
await app.register(cors,{origin:origin.split(',').map(s=>s.trim()),credentials:true});
await app.register(cookie);
await app.register(rateLimit,{global:true,max:120,timeWindow:'1 minute'});
app.setErrorHandler((error,req,reply)=>{
 req.log.error(error);
 if(error instanceof z.ZodError){return reply.code(400).send({error:'Dados inválidos',details:error.flatten()});}
 return reply.code(error.statusCode&&error.statusCode<500?error.statusCode:500).send({error:error.statusCode&&error.statusCode<500?error.message:'Erro interno'});
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
 recorders:{table:'recorders',columns:'id,name,host,port,protocol,active,last_seen_at',sort:'name'},
 cameras:{table:'cameras',columns:'id,name,recorder_id,channel,active',sort:'name'},
 devices:{table:'devices',columns:'id,name,serial_number,location_id,active,last_seen_at',sort:'name'},
 users:{table:'users',columns:'id,name,username,email,role,active,created_at',sort:'name'}
} as const;
app.get('/api/:entity',async(req,reply)=>{
 const user=await requireUser(req,reply);if(!user)return;
 const {entity}=z.object({entity:z.string()}).parse(req.params);
 if(!(entity in entities))return reply.code(404).send({error:'Recurso não encontrado'});
 if(entity==='users'&&!requireRole(user,['admin','supervisor'],reply))return;
 const cfg=entities[entity as keyof typeof entities];
 const query=z.object({limit:z.coerce.number().int().min(1).max(100).default(25),offset:z.coerce.number().int().min(0).default(0)}).parse(req.query);
 const {rows}=await pool.query(`SELECT ${cfg.columns} FROM ${cfg.table} ORDER BY ${cfg.sort} LIMIT $1 OFFSET $2`,[query.limit,query.offset]);
 const count=await pool.query(`SELECT count(*)::int AS total FROM ${cfg.table}`);
 return {items:rows,total:count.rows[0].total,limit:query.limit,offset:query.offset};
});
app.get('/api/readings',async(req,reply)=>{
 const user=await requireUser(req,reply);if(!user)return;
 const q=z.object({code:z.string().optional(),limit:z.coerce.number().int().min(1).max(100).default(25),offset:z.coerce.number().int().min(0).default(0)}).parse(req.query);
 const params=q.code?['%'+q.code+'%']:[];const where=q.code?'WHERE r.code ILIKE $1':'';
 const sql=`SELECT r.id,r.code,r.occurred_at,r.received_at,r.device_id,r.location_id,r.camera_id,r.user_id FROM readings r ${where} ORDER BY r.occurred_at DESC LIMIT $${params.length+1} OFFSET $${params.length+2}`;
 const {rows}=await pool.query(sql,[...params,q.limit,q.offset]);
 const count=await pool.query(`SELECT count(*)::int AS total FROM readings r ${where}`,params);
 return {items:rows,total:count.rows[0].total,limit:q.limit,offset:q.offset};
});
app.post('/api/readings',async(req,reply)=>{
 const user=await requireUser(req,reply);if(!user||!requireRole(user,['admin','supervisor','operator'],reply))return;
 const b=readingInput.parse(req.body);
 const device=await pool.query('SELECT id,location_id,active FROM devices WHERE id=$1',[b.device_id]);
 if(!device.rows[0]?.active||device.rows[0].location_id!==b.location_id)return reply.code(400).send({error:'Dispositivo inativo ou local incompatível'});
 const {rows}=await pool.query(`INSERT INTO readings(device_event_id,device_id,user_id,location_id,camera_id,code,occurred_at) VALUES($1,$2,$3,$4,$5,$6,$7) ON CONFLICT(device_id,device_event_id) DO NOTHING RETURNING id`,[b.device_event_id,b.device_id,user.id,b.location_id,b.camera_id??null,b.code,b.occurred_at]);
 if(!rows[0])return {duplicate:true};
 return reply.code(201).send({id:rows[0].id,duplicate:false});
});
await registerCrud(app);
const port=Number(process.env.PORT??3333);
await app.listen({host:process.env.HOST??'127.0.0.1',port});
