import {createCipheriv,createDecipheriv,createHash,randomBytes} from 'node:crypto';

const key=createHash('sha256').update(process.env.RECORDER_CREDENTIAL_SECRET??process.env.SESSION_SECRET??'').digest();
if(!process.env.RECORDER_CREDENTIAL_SECRET&&!process.env.SESSION_SECRET) throw new Error('RECORDER_CREDENTIAL_SECRET or SESSION_SECRET missing');

export function encryptSecret(value:string){
 const iv=randomBytes(12);
 const cipher=createCipheriv('aes-256-gcm',key,iv);
 const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
 return `${iv.toString('base64url')}.${cipher.getAuthTag().toString('base64url')}.${encrypted.toString('base64url')}`;
}

export function decryptSecret(value:string){
 const [ivText,tagText,dataText]=value.split('.');
 if(!ivText||!tagText||!dataText) throw new Error('Credencial cifrada inválida');
 const decipher=createDecipheriv('aes-256-gcm',key,Buffer.from(ivText,'base64url'));
 decipher.setAuthTag(Buffer.from(tagText,'base64url'));
 return Buffer.concat([decipher.update(Buffer.from(dataText,'base64url')),decipher.final()]).toString('utf8');
}
