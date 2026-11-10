import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {pool} from './db.js';
import {requireUser,requireRole} from './auth.js';
import {pagination} from './validation.js';
export async function registerReadingSearch(app:FastifyInstance){
 app.get('/api/search/readings',async(req,reply)=>{
  const user=await requireUser(req,reply);if(!user)return;
  const q=pagination.extend({id:z.string().uuid().optional(),code:z.string().max(512).optional(),location_id:z.string().uuid().optional(),from:z.string().datetime({offset:true}).optional(),to:z.string().datetime({offset:true}).optional()}).parse(req.query);
  const params:unknown[]=[];const where:string[]=[];
  if(q.id){params.push(q.id);where.push(`r.id=$${params.length}`);}
  if(q.code){params.push('%'+q.code.replace(/[\\%_]/g,'\\$&')+'%');where.push(`r.code ILIKE $${params.length} ESCAPE '\\'`);}
  if(q.location_id){params.push(q.location_id);where.push(`r.location_id=$${params.length}`);}
  if(q.from){params.push(q.from);where.push(`r.occurred_at >= $${params.length}`);}
  if(q.to){params.push(q.to);where.push(`r.occurred_at <= $${params.length}`);}
  if(user.role!=='admin'){params.push(user.id);where.push(`EXISTS (SELECT 1 FROM user_locations ul WHERE ul.user_id=$${params.length} AND ul.location_id=r.location_id)`);}
  const filter=where.length?'WHERE '+where.join(' AND '):'';
  const count=await pool.query(`SELECT count(*)::int AS total FROM readings r ${filter}`,params);
  params.push(q.limit,q.offset);
  const {rows}=await pool.query(`SELECT r.id,r.code,r.occurred_at,r.received_at,r.device_id,r.location_id,r.camera_id,l.name AS location_name,c.name AS camera_name FROM readings r JOIN locations l ON l.id=r.location_id LEFT JOIN cameras c ON c.id=r.camera_id ${filter} ORDER BY r.occurred_at DESC,r.id DESC LIMIT $${params.length-1} OFFSET $${params.length}`,params);
  return {items:rows,total:count.rows[0].total,limit:q.limit,offset:q.offset};
 });
}
