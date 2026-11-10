import {createCipheriv,createHash,randomBytes} from 'node:crypto';

const key=createHash('sha256').update(process.env.RECORDER_CREDENTIAL_SECRET??process.env.SESSION_SECRET??'').digest();
if(!process.env.RECORDER_CREDENTIAL_SECRET&&!process.env.SESSION_SECRET) throw new Error('RECORDER_CREDENTIAL_SECRET or SESSION_SECRET missing');

export function encryptSecret(value:string){
 const iv=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',key,iv);
 const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}
