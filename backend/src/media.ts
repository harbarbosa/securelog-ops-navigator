import type {FastifyInstance} from 'fastify';
import {createHash,randomBytes} from 'node:crypto';
import {mkdir,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,basename} from 'node:path';
import {spawn} from 'node:child_process';
import {Readable} from 'node:stream';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {pool} from './db.js';
import {requireUser} from './auth.js';
import {decryptSecret} from './secret.js';

type Recorder={id:string;host:string;port:number;rtsp_port:number;protocol:string;username:string|null;password_ciphertext:string|null};
type MediaFile={channel:number;start_time:string;end_time:string;file_path:string;length?:number;type?:string};
const jobs=new Map<string,{dir:string;process:ReturnType<typeof spawn>;created:number}>();

function parseDigest(header:string){
 const params:Record<string,string>={};
 for(const match of header.matchAll(/(\w+)=(?:"([^"]+)"|([^,]+))/g)) params[match[1]]=match[2]??match[3];
 return params;
}
async function digestGet(url:string,username:string,password:string,timeoutMs=5000){
 const first=await fetch(url,{signal:AbortSignal.timeout(timeoutMs)});
 if(first.status!==401)return first;
 const challenge=first.headers.get('www-authenticate');
 if(!challenge||!challenge.toLowerCase().startsWith('digest')) throw new Error('O gravador não retornou autenticação Digest');
 const d=parseDigest(challenge);const method='GET';const uri=new URL(url).pathname+new URL(url).search;
 const nc='00000001';const cnonce=randomBytes(8).toString('hex');
 const ha1=createHash('md5').update(`${username}:${d.realm}:${password}`).digest('hex');
 const ha2=createHash('md5').update(`${method}:${uri}`).digest('hex');
 const response=createHash('md5').update(`${ha1}:${d.nonce}:${nc}:${cnonce}:${d.qop??'auth'}:${ha2}`).digest('hex');
 const authorization=[`Digest username="${username}"`,`realm="${d.realm}"`,`nonce="${d.nonce}"`,`uri="${uri}"`,`algorithm=MD5`,`response="${response}"`,`qop=${d.qop??'auth'}`,`nc=${nc}`,`cnonce="${cnonce}"`,d.opaque?`opaque="${d.opaque}"`:'' ].filter(Boolean).join(', ');
 return fetch(url,{headers:{Authorization:authorization},signal:AbortSignal.timeout(timeoutMs)});
}
function recorderBase(r:Recorder){return `${r.protocol.toLowerCase()==='https'?'https':'http'}://${r.host}:${r.port}`;}
function nvrTime(value:string){return value.slice(0,19).replace('T',' ');}
function rtspTime(value:string){return value.slice(0,19).replace('T','_').replace(/:/g,'_');}
function parseMediaFiles(body:string):MediaFile[]{
 const lines=body.split(/\r?\n/);const found=Number(lines.find(x=>x.startsWith('found='))?.split('=')[1]??0);if(!found)return [];
 const files=new Map<number,Record<string,string>>();
 for(const line of lines){const m=line.match(/^items\[(\d+)\]\.([^=]+)=(.*)$/);if(m)(files.get(Number(m[1]))??(files.set(Number(m[1]),{}),files.get(Number(m[1]))!))[m[2]]=m[3];}
 return [...files.values()].map(x=>({channel:Number(x.Channel),start_time:x.StartTime,end_time:x.EndTime,file_path:x.FilePath,length:x.Length?Number(x.Length):undefined,type:x.Type})).filter(x=>x.file_path);
}
async function searchRecorder(r:Recorder,channel:number,start:string,end:string){
 if(!r.username||!r.password_ciphertext) throw new Error('Credenciais do gravador não configuradas');
 const password=decryptSecret(r.password_ciphertext);const base=recorderBase(r);let object='';
 try{
  const factory=await digestGet(`${base}/cgi-bin/mediaFileFind.cgi?action=factory.create`,r.username,password);const factoryText=await factory.text();
  object=factoryText.match(/(?:result|object)=([^\r\n]+)/i)?.[1]?.trim()??factoryText.trim();
  if(!object)throw new Error('O NVR não criou a pesquisa de gravações');
  const params=new URLSearchParams({action:'findFile',object});params.set('condition.Channel',String(Math.max(1,channel)));params.set('condition.StartTime',nvrTime(start));params.set('condition.EndTime',nvrTime(end));params.set('condition.Types[0]','dav');params.set('condition.VideoStream','Main');
  const find=await digestGet(`${base}/cgi-bin/mediaFileFind.cgi?${params}`,r.username,password);if(!find.ok)throw new Error(`NVR recusou a pesquisa (${find.status})`);
  const nextParams=new URLSearchParams({action:'findNextFile',object,count:'100'});const next=await digestGet(`${base}/cgi-bin/mediaFileFind.cgi?${nextParams}`,r.username,password);if(!next.ok)throw new Error(`NVR recusou os resultados (${next.status})`);
  return parseMediaFiles(await next.text());
 } finally {
  if(object&&r.username&&r.password_ciphertext){const password=decryptSecret(r.password_ciphertext);await digestGet(`${recorderBase(r)}/cgi-bin/mediaFileFind.cgi?action=close&object=${encodeURIComponent(object)}`,r.username,password).catch(()=>undefined);await digestGet(`${recorderBase(r)}/cgi-bin/mediaFileFind.cgi?action=destroy&object=${encodeURIComponent(object)}`,r.username,password).catch(()=>undefined);}
 }
}
function requireFfmpeg(){return process.env.FFMPEG_PATH??'ffmpeg';}
async function spawnPlayback(r:Recorder,channel:number,start:string,end:string,dir:string,filePath?:string){
 if(!r.username||!r.password_ciphertext) throw new Error('Credenciais do gravador não configuradas');
 const password=decryptSecret(r.password_ciphertext);const streamPath=filePath?filePath:`/cam/playback?channel=${channel}&starttime=${rtspTime(start)}&endtime=${rtspTime(end)}`;const rtsp=`rtsp://${encodeURIComponent(r.username)}:${encodeURIComponent(password)}@${r.host}:${r.rtsp_port}${streamPath}`;
 const output=join(dir,'index.m3u8');
 let input='';let response:Response|undefined;
 if(filePath){response=await digestGet(`${recorderBase(r)}/cgi-bin/RPC_Loadfile${filePath}`,r.username,password,120000);if(!response.ok||!response.body)throw new Error(`NVR recusou o arquivo de gravação (${response.status})`);input='pipe:0';}
 else input=rtsp;
 const args=['-hide_banner','-loglevel','error',...(filePath?[]:['-rtsp_transport','tcp']),'-i',input,'-map','0:v:0','-an','-c:v','libx264','-preset','veryfast','-f','hls','-hls_time','2','-hls_list_size','0','-hls_flags','independent_segments',output];
 const child=spawn(requireFfmpeg(),args,{windowsHide:true});
 if(response?.body){const inputStream=Readable.fromWeb(response.body as never);inputStream.on('error',()=>{if(!child.killed)child.kill();});child.stdin?.on('error',()=>undefined);inputStream.pipe(child.stdin!);}
 child.on('close',()=>{setTimeout(()=>{void rm(dir,{recursive:true,force:true});},10*60*1000);});
 return child;
}
export async function registerMedia(app:FastifyInstance){
 app.get('/api/media/search',async(req,reply)=>{
  const user=await requireUser(req,reply);if(!user)return;
  const q=z.object({camera_id:z.string().uuid(),start:z.string().datetime({offset:true}),end:z.string().datetime({offset:true})}).parse(req.query);
  const params=[q.camera_id];let access='';if(user.role!=='admin'){params.push(user.id);access=' AND EXISTS (SELECT 1 FROM user_locations ul JOIN locations l ON l.id=ul.location_id WHERE ul.user_id=$2 AND l.primary_camera_id=c.id)';}
  const result=await pool.query<Recorder>(`SELECT r.id,r.host,r.port,r.rtsp_port,r.protocol,r.username,r.password_ciphertext,c.channel FROM cameras c JOIN recorders r ON r.id=c.recorder_id WHERE c.id=$1 AND c.active=true AND r.active=true${access}`,params);
  const recorder=result.rows[0];if(!recorder)return reply.code(404).send({error:'Câmera ou gravador não encontrado'});
  try {
   const files=await searchRecorder(recorder,Number((recorder as Recorder&{channel:number}).channel),q.start,q.end);
   return {items:files};
  } catch(error) {
   return reply.code(502).send({error:error instanceof Error?error.message:'Falha de comunicação com o gravador'});
  }
 });
 app.post('/api/media/playback',async(req,reply)=>{
  const user=await requireUser(req,reply);if(!user)return;
  const q=z.object({camera_id:z.string().uuid(),start:z.string().datetime({offset:true}),end:z.string().datetime({offset:true})}).parse(req.body);
  if(new Date(q.end)<=new Date(q.start))return reply.code(400).send({error:'O período final deve ser posterior ao inicial'});
  const params=[q.camera_id];let access='';if(user.role!=='admin'){params.push(user.id);access=' AND EXISTS (SELECT 1 FROM user_locations ul JOIN locations l ON l.id=ul.location_id WHERE ul.user_id=$2 AND l.primary_camera_id=c.id)';}
  const result=await pool.query<Recorder&{channel:number}>(`SELECT r.id,r.host,r.port,r.rtsp_port,r.protocol,r.username,r.password_ciphertext,c.channel FROM cameras c JOIN recorders r ON r.id=c.recorder_id WHERE c.id=$1 AND c.active=true AND r.active=true${access}`,params);const recorder=result.rows[0];if(!recorder)return reply.code(404).send({error:'Câmera ou gravador não encontrado'});
  let files:MediaFile[];
  try{files=await searchRecorder(recorder,recorder.channel,q.start,q.end);}catch(error){return reply.code(502).send({error:error instanceof Error?error.message:'Falha de comunicação com o gravador'});}
  if(!files.length)return reply.code(404).send({error:'Nenhuma gravação encontrada no período'});
  const id=randomUUID();const dir=join(tmpdir(),'securelog-media',id);await mkdir(dir,{recursive:true});
  try{const child=await spawnPlayback(recorder,recorder.channel,q.start,q.end,dir,files[0].file_path);jobs.set(id,{dir,process:child,created:Date.now()});child.on('error',()=>jobs.delete(id));return reply.code(202).send({id,playlist:`/api/media/playback/${id}/index.m3u8`,recording:files[0]});}catch(error){await rm(dir,{recursive:true,force:true});throw error;}
 });
 app.get('/api/media/playback/:id/:file',async(req,reply)=>{
  const user=await requireUser(req,reply);if(!user)return;
  const {id,file}=z.object({id:z.string().uuid(),file:z.string().regex(/^[a-zA-Z0-9._-]+$/)}).parse(req.params);const job=jobs.get(id);if(!job)return reply.code(404).send({error:'Reprodução expirada'});
  const data=await readFile(join(job.dir,basename(file))).catch(()=>null);if(!data)return reply.code(404).send({error:'Segmento ainda não disponível'});reply.type(file.endsWith('.m3u8')?'application/vnd.apple.mpegurl':'video/mp2t');return data;
 });
}
