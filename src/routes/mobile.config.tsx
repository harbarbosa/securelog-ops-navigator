import {createFileRoute,useNavigate} from "@tanstack/react-router";
import {useEffect,useState} from "react";
import {Clipboard,KeyRound,Loader2,LogOut,RefreshCw,Save,Server,Wifi,WifiOff} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card,Field,PageHeader,StatusBadge,meta} from "@/components/sl/ui";
import {useMobile} from "@/components/sl/mobile-state";
import {api,securelog,type Page} from "@/lib/securelog-api";

export const Route=createFileRoute("/mobile/config")({head:()=>meta("Coletor — Configuração","Configuração do servidor e provisionamento do coletor Zebra."),component:MobileConfig});
type Device={id:string;name:string;serial_number:string;location_id:string|null;active:boolean};

function MobileConfig(){
 const m=useMobile();const nav=useNavigate();
 const [devices,setDevices]=useState<Device[]>([]);const [loading,setLoading]=useState(true);const [testing,setTesting]=useState(false);const [saving,setSaving]=useState(false);const [token,setToken]=useState("");
 const [host,setHost]=useState(m.config.serverHost);const [port,setPort]=useState(String(m.config.serverPort));const [deviceId,setDeviceId]=useState(m.config.deviceId);const [deviceName,setDeviceName]=useState(m.config.deviceName);
 useEffect(()=>{api<Page<Device>>("/api/devices?limit=100&offset=0").then(r=>setDevices(r.items.filter(d=>d.active))).catch(e=>toast.error(e instanceof Error?e.message:"Falha ao carregar coletores")).finally(()=>setLoading(false));},[]);
 useEffect(()=>{const d=devices.find(x=>x.id===deviceId);if(d&&!deviceName)setDeviceName(d.name);},[devices,deviceId,deviceName]);
 const save=async()=>{const serverPort=Number(port);if(!host.trim()||!Number.isInteger(serverPort)||serverPort<1||serverPort>65535||!deviceId){toast.error("Informe servidor, porta e coletor");return;}setSaving(true);try{m.updateConfig({serverHost:host.trim(),serverPort,deviceId,deviceName:deviceName.trim()});if(deviceName.trim())await securelog.update("devices",deviceId,{name:deviceName.trim()});toast.success("Configuração salva");}catch(e){toast.error(e instanceof Error?e.message:"Falha ao salvar");}finally{setSaving(false);}};
 const test=async()=>{setTesting(true);try{const base=`http://${host.trim()}:${Number(port)}`;const response=await fetch(`${base}/api/health`,{signal:AbortSignal.timeout(5000)});if(!response.ok)throw new Error(`Servidor retornou HTTP ${response.status}`);m.setOnline(true);m.addLog(`Conexão confirmada com ${base}`,"success");toast.success("Servidor acessível");}catch(e){m.setOnline(false);m.addLog(`Falha de conexão com ${host}:${port}`,"error");toast.error(e instanceof Error?e.message:"Servidor inacessível");}finally{setTesting(false);}};
 const provision=async()=>{if(!deviceId){toast.error("Selecione o coletor");return;}try{const result=await securelog.provisionDeviceToken(deviceId);setToken(result.token);m.updateConfig({serverHost:host.trim(),serverPort:Number(port),deviceId,deviceName:deviceName.trim(),token:result.token});m.addLog("Token do coletor provisionado","success");toast.success("Token gerado. Copie e configure no coletor.");}catch(e){toast.error(e instanceof Error?e.message:"Falha ao provisionar token");}};
 return <div className="space-y-4 p-4">
  <PageHeader title="Configuração do coletor" crumbs={["Mobile","Configuração"]}/>
  <Card title="Servidor de leituras"><div className="space-y-3 p-4">
   <div className="flex items-center gap-2 text-sm text-muted-foreground"><Server className="h-4 w-4"/>Destino usado pelo coletor para enviar leituras</div>
   <Field label="Endereço do servidor"><Input value={host} onChange={e=>setHost(e.target.value)} placeholder="192.168.0.10"/></Field>
   <Field label="Porta"><Input type="number" value={port} onChange={e=>setPort(e.target.value)} placeholder="3333"/></Field>
   <div className="flex gap-2"><Button variant="outline" onClick={()=>void test()} disabled={testing}>{testing?<Loader2 className="h-4 w-4 animate-spin"/>:<Wifi className="h-4 w-4"/>}Testar conexão</Button><Button onClick={()=>void save()} disabled={saving}>{saving?<Loader2 className="h-4 w-4 animate-spin"/>:<Save className="h-4 w-4"/>}Salvar</Button></div>
  </div></Card>
  <Card title="Identificação do coletor"><div className="space-y-3 p-4">
   <Field label="Coletor cadastrado"><select className="w-full rounded-md border bg-background p-2" value={deviceId} onChange={e=>setDeviceId(e.target.value)}><option value="">{loading?"Carregando...":"Selecione um coletor"}</option>{devices.map(d=><option key={d.id} value={d.id}>{d.name} — {d.serial_number}</option>)}</select></Field>
   <Field label="Nome do coletor"><Input value={deviceName} onChange={e=>setDeviceName(e.target.value)} placeholder="Zebra expedição 01"/></Field>
   <div className="flex items-center gap-2 text-sm">{m.config.token?<StatusBadge status="online" label="Token configurado"/>:<StatusBadge status="pendente" label="Token não configurado"/>}</div>
   <Button className="w-full" onClick={()=>void provision()} disabled={!deviceId}><KeyRound className="h-4 w-4"/>Gerar/renovar token do coletor</Button>
   {token&&<div className="rounded-md border bg-muted p-3"><p className="mb-1 text-xs text-muted-foreground">Token exibido somente nesta tela</p><div className="flex gap-2"><Input readOnly value={token} className="font-mono text-xs"/><Button variant="outline" size="icon" onClick={()=>void navigator.clipboard.writeText(token)} aria-label="Copiar token"><Clipboard className="h-4 w-4"/></Button></div></div>}
  </div></Card>
  <Card title="Logs de acesso e problemas"><div className="p-4"><div className="mb-3 flex items-center gap-2 text-sm"><RefreshCw className="h-4 w-4 text-brand"/>Últimos eventos locais</div>{!m.logs.length&&<p className="text-sm text-muted-foreground">Nenhum evento registrado.</p>}<ul className="max-h-64 space-y-2 overflow-y-auto">{m.logs.map(log=><li key={log.id} className="flex gap-2 text-xs"><span className={log.type==="error"?"text-destructive":log.type==="success"?"text-success":"text-muted-foreground"}>{log.type==="error"?<WifiOff className="h-3 w-3"/>:<Wifi className="h-3 w-3"/>}</span><span><b>{new Date(log.at).toLocaleString("pt-BR")}</b> — {log.message}</span></li>)}</ul></div></Card>
  <Button variant="destructive" className="w-full" onClick={()=>{m.logout();nav({to:"/mobile"});}}><LogOut className="h-4 w-4"/>Sair do coletor</Button>
 </div>;
}
