import {pool} from './db.js';
import {readFile,readdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const dir=resolve(process.cwd(),'migrations');
const client=await pool.connect();
try {
 await client.query('SELECT pg_advisory_lock(79342201)');
 await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
 for(const name of (await readdir(dir)).filter(x=>x.endsWith('.sql')).sort()){
  const exists=await client.query('SELECT 1 FROM schema_migrations WHERE name=$1',[name]);
  if(exists.rowCount) continue;
  await client.query('BEGIN');
  try{
   await client.query(await readFile(resolve(dir,name),'utf8'));
   await client.query('INSERT INTO schema_migrations(name) VALUES($1)',[name]);
   await client.query('COMMIT');
   console.log('Applied',name);
  }catch(e){await client.query('ROLLBACK');throw e;}
 }
}finally{await client.query('SELECT pg_advisory_unlock(79342201)');client.release();await pool.end();}
