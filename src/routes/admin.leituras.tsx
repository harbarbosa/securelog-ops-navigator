import {createFileRoute} from "@tanstack/react-router";
import {useEffect,useState} from "react";
import {useNavigate} from "@tanstack/react-router";
import {Search,X} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card,Field,PageHeader,Pagination,Table,Td,Th,meta} from "@/components/sl/ui";
import {api,type Page} from "@/lib/securelog-api";
export const Route=createFileRoute("/admin/leituras")({head:()=>meta("Leituras","Histórico real de leituras dos coletores."),component:Leituras});
type Reading={id:string;code:string;occurred_at:string;received_at:string;location_name:string;camera_name:string|null;device_id:string;camera_id:string|null};
const per=25;
function Leituras(){
 const navigate=useNavigate();
 const [code,setCode]=useState("");
 const [filter,setFilter]=useState("");
 const [page,setPage]=useState(1);
 const [result,setResult]=useState<Page<Reading>>({items:[],total:0,limit:per,offset:0});
 const [loading,setLoading]=useState(true);
 useEffect(()=>{let active=true;setLoading(true);
  const now=new Date();
  const start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
  const end=new Date(now.getFullYear(),now.getMonth(),now.getDate()+1,0,0,0,-1);
  const qs=new URLSearchParams({limit:String(per),offset:String((page-1)*per),from:start.toISOString(),to:end.toISOString()});
  if(filter)qs.set("code",filter);
  api<Page<Reading>>("/api/search/readings?"+qs.toString()).then(r=>{if(active)setResult(r);}).catch(e=>{if(active)toast.error(e instanceof Error?e.message:"Falha ao consultar leituras");}).finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[filter,page]);
 const totalPages=Math.max(1,Math.ceil(result.total/per));
 return <>
 <PageHeader title="Leituras" crumbs={["Leituras"]}/>
 <Card className="mb-6 p-5"><div className="flex flex-wrap items-end gap-3">
 <Field label="Código lido"><Input value={code} onChange={e=>setCode(e.target.value)} placeholder="Pesquisar código"/></Field>
 <Button onClick={()=>{setPage(1);setFilter(code);}}><Search className="h-4 w-4"/>Pesquisar</Button>
 <Button variant="ghost" onClick={()=>{setCode("");setFilter("");setPage(1);}}><X className="h-4 w-4"/>Limpar</Button>
 </div></Card>
 <Card><Table head={<><Th>Código</Th><Th>Data da leitura</Th><Th>Recebido no servidor</Th><Th>Local</Th><Th>Câmera vinculada</Th><Th>Dispositivo</Th></>}>
 {result.items.map(r=><tr key={r.id} role="link" tabIndex={0} onClick={()=>navigate({to:"/admin/pesquisar",search:{code:r.code}})} onKeyDown={e=>{if(e.key==="Enter"||e.key===" ")navigate({to:"/admin/pesquisar",search:{code:r.code}});}} className="cursor-pointer hover:bg-brand-soft/40 focus:bg-brand-soft/40 focus:outline-none"><Td className="font-mono">{r.code}</Td><Td>{new Date(r.occurred_at).toLocaleString("pt-BR")}</Td><Td>{new Date(r.received_at).toLocaleString("pt-BR")}</Td><Td>{r.location_name}</Td><Td>{r.camera_name??"Não vinculada"}</Td><Td className="font-mono text-xs">{r.device_id}</Td></tr>)}
 </Table>{loading&&<p className="p-4 text-sm">Consultando leituras de hoje...</p>}{!loading&&!result.items.length&&<p className="p-4 text-sm text-muted-foreground">Nenhuma leitura encontrada hoje.</p>}
 <div className="flex flex-wrap items-center justify-between gap-3 border-t p-4 text-sm"><span>{result.total} leituras de hoje · página {page} de {totalPages}</span><Pagination page={page} total={totalPages} onPage={p=>{if(!loading)setPage(p);}}/></div>
 </Card></>;
}
