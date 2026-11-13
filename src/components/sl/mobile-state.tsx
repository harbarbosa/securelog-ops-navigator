import {createContext,useCallback,useContext,useEffect,useMemo,useState,type ReactNode} from "react";
import {securelogApiBase,setSecurelogApiBase} from "@/lib/securelog-api";
import {getPendingRecords,savePendingRecords,type PendingRecord} from "@/lib/mobile-db";

export type Pend={id:string;codigo:string;data:Date;locationId:string;tentativas:number;status:"aguardando"|"enviando"|"erro"};
export type MobileLog={id:string;at:Date;type:"info"|"success"|"error";message:string};
export type MobileConfig={serverHost:string;serverPort:number;deviceId:string;deviceName:string;token:string};
type Role="admin"|"supervisor"|"operator"|"viewer"|"";
type S={user:string;role:Role;setUser:(u:string)=>void;setRole:(r:Role)=>void;local:string;setLocal:(l:string)=>void;leitor:string;setLeitor:(l:string)=>void;online:boolean;setOnline:(o:boolean)=>void;sessao:{codigo:string;data:Date}[];recordReading:(code:string)=>Promise<void>;pend:Pend[];sync:()=>Promise<void>;ultimaSync:Date;config:MobileConfig;updateConfig:(c:Partial<MobileConfig>)=>void;logs:MobileLog[];addLog:(message:string,type?:MobileLog["type"])=>void;reset:()=>void;logout:()=>void};
const Ctx=createContext<S|null>(null);
const configKey="securelog.mobile.config";
const pendKey="securelog.mobile.pending";
const logsKey="securelog.mobile.logs";
const readJson=<T,>(key:string,fallback:T):T=>{if(typeof window==="undefined")return fallback;try{return JSON.parse(localStorage.getItem(key)??"") as T;}catch{return fallback;}};
const defaultConfig=():MobileConfig=>({serverHost:typeof window!=="undefined"?window.location.hostname:"127.0.0.1",serverPort:3333,deviceId:"",deviceName:"",token:""});
const serverUrl=(config:MobileConfig)=>{const host=config.serverHost.trim();if(!host)return securelogApiBase||window.location.origin;return `http://${host}:${config.serverPort}`;};

export function MobileProvider({children}:{children:ReactNode}){
 const [user,setUser]=useState("");
 const [role,setRole]=useState<Role>("");
 const [local,setLocal]=useState("");
 const [leitor,setLeitorState]=useState("");
 const [online,setOnline]=useState(true);
 const [sessao,setSessao]=useState<S["sessao"]>([]);
 const [config,setConfig]=useState<MobileConfig>(()=>({...defaultConfig(),...readJson<Partial<MobileConfig>>(configKey,{})}));
 const [pend,setPend]=useState<Pend[]>(()=>readJson<Pend[]>(pendKey,[]).map(p=>({...p,data:new Date(p.data),locationId:p.locationId??""})));
 const [pendingLoaded,setPendingLoaded]=useState(false);
 const [logs,setLogs]=useState<MobileLog[]>(()=>readJson<MobileLog[]>(logsKey,[]).slice(0,100).map(l=>({...l,at:new Date(l.at)})));
 const [ultimaSync,setUltimaSync]=useState(new Date(0));
 useEffect(()=>{setSecurelogApiBase(serverUrl(config));},[config]);
 const addLog=useCallback((message:string,type:MobileLog["type"]="info")=>{const item={id:crypto.randomUUID(),at:new Date(),type,message};setLogs(prev=>{const next=[item,...prev].slice(0,100);localStorage.setItem(logsKey,JSON.stringify(next));return next;});},[]);
 const savePend=useCallback((next:Pend[])=>{setPend(next);localStorage.setItem(pendKey,JSON.stringify(next));void savePendingRecords(next.map(p=>({...p,data:p.data.toISOString()})));},[]);
 const updateConfig=useCallback((changes:Partial<MobileConfig>)=>{setConfig(prev=>{const next={...prev,...changes};localStorage.setItem(configKey,JSON.stringify(next));return next;});addLog("Configuração do coletor atualizada");},[addLog]);
 const setLeitor=useCallback((id:string)=>{setLeitorState(id);updateConfig({deviceId:id});},[updateConfig]);
 const sendOne=useCallback(async(p:Pend)=>{
  if(!config.token||!config.deviceId)throw new Error("Token ou coletor não configurado");
  const response=await fetch(`${serverUrl(config)}/api/device/readings`,{method:"POST",credentials:"include",headers:{"Content-Type":"application/json",Authorization:`Bearer ${config.token}`},body:JSON.stringify({device_event_id:p.id,code:p.codigo,location_id:p.locationId,occurred_at:p.data.toISOString()})});
  if(!response.ok){const body=await response.json().catch(()=>null) as {error?:string}|null;throw new Error(body?.error??`Servidor retornou HTTP ${response.status}`);}
 },[config]);
 const sync=useCallback(async()=>{
  if(!online||!pend.length)return;
  let remaining=[...pend];
  for(const item of pend){
   savePend(remaining.map(p=>p.id===item.id?{...p,status:"enviando"}:p));
   try{await sendOne(item);remaining=remaining.filter(p=>p.id!==item.id);savePend(remaining);setUltimaSync(new Date());addLog(`Leitura ${item.codigo} sincronizada`,"success");}
   catch(error){remaining=remaining.map(p=>p.id===item.id?{...p,status:"erro",tentativas:p.tentativas+1}:p);savePend(remaining);addLog(`Falha ao sincronizar ${item.codigo}: ${error instanceof Error?error.message:"erro desconhecido"}`,"error");break;}
  }
 },[addLog,online,pend,savePend,sendOne]);
 const recordReading=useCallback(async(code:string)=>{
  const item:Pend={id:crypto.randomUUID(),codigo:code.trim(),data:new Date(),locationId:local,tentativas:0,status:"aguardando"};
  setSessao(s=>[{codigo:item.codigo,data:item.data},...s]);
  if(!online||!config.token||!config.deviceId){savePend([item,...pend]);addLog(!online?"Sem conexão: leitura salva no banco local":"Coletor sem token: leitura salva no banco local", "error");return;}
  try{await sendOne(item);setUltimaSync(new Date());addLog(`Leitura ${item.codigo} enviada ao servidor`,"success");}
  catch(error){savePend([item,...pend]);setOnline(false);addLog(`Servidor indisponível: leitura ${item.codigo} salva no banco local`,"error");}
 },[addLog,config.deviceId,config.token,online,pend,savePend,sendOne]);
 useEffect(()=>{
  if(!config.token||!config.deviceId)return;
  const timer=window.setInterval(async()=>{try{await fetch(`${serverUrl(config)}/api/health`,{signal:AbortSignal.timeout(4000)});if(!online){setOnline(true);addLog("Conexão com o servidor restaurada","success");}}catch{if(online){setOnline(false);addLog("Servidor indisponível","error");}}},15000);
  return()=>window.clearInterval(timer);
 },[addLog,config,online]);
 useEffect(()=>{void getPendingRecords().then(records=>{if(records?.length)setPend(records.map((p:PendingRecord)=>({...p,data:new Date(p.data)})));setPendingLoaded(true);}).catch(()=>setPendingLoaded(true));},[]);
 useEffect(()=>{if(pendingLoaded&&online&&pend.length)void sync();},[online,pendingLoaded]);
 const reset=useCallback(()=>{setLocal("");setLeitorState("");setSessao([]);},[]);
 const logout=useCallback(()=>{setUser("");setRole("");reset();addLog("Sessão encerrada");},[addLog,reset]);
 const value=useMemo(()=>({user,role,setUser,setRole,local,setLocal,leitor,setLeitor,online,setOnline,sessao,recordReading,pend,sync,ultimaSync,config,updateConfig,logs,addLog,reset,logout}),[user,role,local,leitor,online,sessao,recordReading,pend,sync,ultimaSync,config,updateConfig,logs,addLog,reset,logout]);
 return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useMobile=()=>useContext(Ctx)!;
