import {createHash,timingSafeEqual} from 'node:crypto';
import type {FastifyRequest,FastifyReply} from 'fastify';
import {pool} from './db.js';
export const digest=(value:string)=>createHash('sha256').update(value).digest('hex');
export async function authenticateDevice(req:FastifyRequest,reply:FastifyReply):Promise<{id:string;location_id:string|null}|null>{
 const header=req.headers.authorization;
 if(!header?.startsWith('Bearer ')){reply.code(401).send({error:'Credencial do coletor obrigatória'});return null;}
 const token=header.slice(7);
 if(token.length<32||token.length>512){reply.code(401).send({error:'Credencial inválida'});return null;}
 const {rows}=await pool.query<{id:string;location_id:string|null;token_hash:string}>('SELECT d.id,d.location_id,dc.token_hash FROM device_credentials dc JOIN devices d ON d.id=dc.device_id LEFT JOIN locations l ON l.id=d.location_id WHERE d.active=true AND (d.location_id IS NULL OR l.active=true) AND dc.token_hash=$1',[digest(token)]);
 const found=rows[0];
 if(!found||!timingSafeEqual(Buffer.from(found.token_hash,'hex'),Buffer.from(digest(token),'hex'))){reply.code(401).send({error:'Coletor não autorizado'});return null;}
 return {id:found.id,location_id:found.location_id};
}
