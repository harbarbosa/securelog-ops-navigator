import 'dotenv/config';
import {randomBytes} from 'node:crypto';
import {pool} from './db.js';
import {digest} from './device-auth.js';
const id=process.argv[2];
if(!id||!/^[0-9a-f-]{36}$/i.test(id))throw new Error('Usage: npm run device:token -- <device-uuid>');
const device=await pool.query('SELECT id FROM devices WHERE id=$1 AND active=true',[id]);
if(!device.rowCount)throw new Error('Active device not found');
const token=randomBytes(32).toString('hex');
await pool.query(`INSERT INTO device_credentials(device_id,token_hash) VALUES($1,$2)
ON CONFLICT(device_id) DO UPDATE SET token_hash=excluded.token_hash,rotated_at=now()`,[id,digest(token)]);
console.log('DEVICE_TOKEN='+token);
console.log('Save this token securely. It will not be shown again.');
await pool.end();
