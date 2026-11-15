import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {pool} from './db.js';
import {requireRole,requireUser} from './auth.js';

export async function registerUserLocations(app:FastifyInstance){
 app.get('/api/manage/users/:id/locations',async(req,reply)=>{
  const user=await requireUser(req,reply);if(!user||!requireRole(user,['admin'],reply))return;
  const {id}=z.object({id:z.string().uuid()}).parse(req.params);
  const {rows}=await pool.query('SELECT location_id FROM user_locations WHERE user_id=$1',[id]);
  return {location_ids:rows.map(row=>row.location_id)};
 });
 app.put('/api/manage/users/:id/locations',async(req,reply)=>{
  const user=await requireUser(req,reply);if(!user||!requireRole(user,['admin'],reply))return;
  const {id}=z.object({id:z.string().uuid()}).parse(req.params);
  const body=z.object({location_ids:z.array(z.string().uuid()).max(500)}).parse(req.body);
  const client=await pool.connect();
  try{
   await client.query('BEGIN');
   await client.query('DELETE FROM user_locations WHERE user_id=$1',[id]);
   for(const locationId of body.location_ids) await client.query('INSERT INTO user_locations(user_id,location_id) SELECT $1,$2 WHERE EXISTS (SELECT 1 FROM locations WHERE id=$2 AND active=true) ON CONFLICT DO NOTHING',[id,locationId]);
   await client.query('INSERT INTO audit_events(actor_user_id,action,entity_type,entity_id,metadata) VALUES($1,$2,$3,$4,$5)',[user.id,'update','user_locations',id,JSON.stringify({location_ids:body.location_ids})]);
   await client.query('COMMIT');
   return {user_id:id,location_ids:body.location_ids};
  }catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();}
 });
}
