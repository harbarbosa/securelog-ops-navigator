import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {pool} from './db.js';
import {requireUser,requireRole} from './auth.js';

const schemas={
 locations:z.object({name:z.string().trim().min(1).max(160),description:z.string().max(2000).nullable().optional(),primary_camera_id:z.string().uuid().nullable().optional(),active:z.boolean().optional()}),
 recorders:z.object({name:z.string().trim().min(1).max(160),host:z.string().trim().min(1).max(255),port:z.number().int().min(1).max(65535),protocol:z.string().trim().min(1).max(80),active:z.boolean().optional()}),
 cameras:z.object({name:z.string().trim().min(1).max(160),recorder_id:z.string().uuid(),channel:z.number().int().min(0),active:z.boolean().optional()}),
 devices:z.object({name:z.string().trim().min(1).max(160),serial_number:z.string().trim().min(1).max(160),location_id:z.string().uuid().nullable().optional(),active:z.boolean().optional()})
} as const;
type Entity=keyof typeof schemas;
const allowed=new Set<string>(Object.keys(schemas));
function entityName(value:string):Entity|null{return allowed.has(value)?value as Entity:null;}
const uuid=z.string().uuid();
export async function registerCrud(app:FastifyInstance){
 app.post('/api/manage/:entity',async(req,reply)=>{
  const user=await requireUser(req,reply);if(!user||!requireRole(user,['admin','supervisor'],reply))return;
  const {entity}=z.object({entity:z.string()}).parse(req.params);
  const table=entityName(entity);if(!table)return reply.code(404).send({error:'Recurso não encontrado'});
  const values=schemas[table].parse(req.body) as Record<string,unknown>;
  const keys=Object.keys(values);
  const result=await pool.query(`INSERT INTO "${table}" (${keys.map(k=>'"'+k+'"').join(',')}) VALUES (${keys.map((_,i)=>'$'+(i+1)).join(',')}) RETURNING id`,keys.map(k=>values[k]));
  await pool.query('INSERT INTO audit_events(actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[user.id,'create',table,result.rows[0].id]);
  return reply.code(201).send({id:result.rows[0].id});
 });
 app.patch('/api/manage/:entity/:id',async(req,reply)=>{
  const user=await requireUser(req,reply);if(!user||!requireRole(user,['admin','supervisor'],reply))return;
  const {entity,id}=z.object({entity:z.string(),id:uuid}).parse(req.params);
  const table=entityName(entity);if(!table)return reply.code(404).send({error:'Recurso não encontrado'});
  const values=z.record(z.unknown()).parse(req.body) as Record<string,unknown>;
  const keys=Object.keys(values);
  const result=await pool.query(`UPDATE "${table}" SET ${keys.map((k,i)=>'"'+k+'"=$'+(i+1)).join(',')} WHERE id=$${keys.length+1} RETURNING id`,[...keys.map(k=>values[k]),id]);
  if(!result.rowCount)return reply.code(404).send({error:'Registro não encontrado'});
  await pool.query('INSERT INTO audit_events(actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[user.id,'update',table,id]);
  return {id};
 });
 app.delete('/api/manage/:entity/:id',async(req,reply)=>{
  const user=await requireUser(req,reply);if(!user||!requireRole(user,['admin'],reply))return;
  const {entity,id}=z.object({entity:z.string(),id:uuid}).parse(req.params);
  const table=entityName(entity);if(!table)return reply.code(404).send({error:'Recurso não encontrado'});
  const result=await pool.query(`UPDATE "${table}" SET active=false WHERE id=$1 RETURNING id`,[id]);
  if(!result.rowCount)return reply.code(404).send({error:'Registro não encontrado'});
  await pool.query('INSERT INTO audit_events(actor_user_id,action,entity_type,entity_id) VALUES($1,$2,$3,$4)',[user.id,'deactivate',table,id]);
  return {id,active:false};
 });
}
