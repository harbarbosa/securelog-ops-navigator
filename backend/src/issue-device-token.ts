import 'dotenv/config';
import {randomBytes} from 'node:crypto';
import {pool} from './db.js';
import {digest} from './device-auth.js';
import {encryptSecret} from './secret.js';
const id=process.argv[2];
if(!id||!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Usage: npm run device:token -- <device-uuid>');
const device=await pool.query('SELECT id FROM devices WHERE id=$1 AND active=true',[id]);
if(!device.rowCount)throw new Error('Active device not found');
const token=randomBytes(32).toString('hex');
await pool.query(`INSERT INTO device_credentials(device_id,token_hash,token_ciphertext) VALUES($1,$2,$3)
ON CONFLICT(device_id) DO UPDATE SET token_hash=excluded.token_hash,token_ciphertext=excluded.token_ciphertext,rotated_at=now()`,[id,digest(token),encryptSecret(token)]);
console.log('DEVICE_TOKEN='+token);
console.log('Save this token securely. It will not be shown again.');
await pool.end();
