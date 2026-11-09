import {createHash,randomBytes} from 'node:crypto';
import type {FastifyRequest,FastifyReply} from 'fastify';
import {pool} from './db.js';
export type AuthUser={id:string;username:string;name:string;role:'admin'|'supervisor'|'operator'|'viewer'};
export const hashToken=(s:string)=>createHash('sha256').update(s).digest('hex');
export async function createSession(userId:string){
 const token=randomBytes(32).toString('hex');
 await pool.query("INSERT INTO sessions(user_id,token_hash,expires_at) VALUES($1,$2,now()+interval '12 hours')",[userId,hashToken(token)]);
 return token;
}
export async function requireUser(req:FastifyRequest,reply:FastifyReply):Promise<AuthUser|null>{
 const token=req.cookies.securelog_session;
 if(!token){reply.code(401).send({error:'Não autenticado'});return null;}
 const {rows}=await pool.query<AuthUser>(`SELECT u.id,u.username,u.name,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true`,[hashToken(token)]);
 if(!rows[0]){reply.code(401).send({error:'Sessão inválida ou expirada'});return null;}
 return rows[0];
}
export function requireRole(user:AuthUser,allowed:AuthUser['role'][],reply:FastifyReply){
 if(!allowed.includes(user.role)){reply.code(403).send({error:'Sem permissão'});return false;}return true;
}
