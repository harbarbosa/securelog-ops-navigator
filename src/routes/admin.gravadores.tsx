import {createFileRoute} from "@tanstack/react-router";
import {useEffect,useState} from "react";
import {Pencil,Plus,Power} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card,Field,PageHeader,Table,Td,Th,meta} from "@/components/sl/ui";
import {FormDialog} from "@/components/sl/crud";
import {securelog} from "@/lib/securelog-api";
export const Route=createFileRoute("/admin/gravadores")({head:()=>meta("Gravadores","Cadastro de gravadores NVR/DVR."),component:Gravadores});
type Recorder={id:string;name:string;host:string;port:number;protocol:string;active:boolean;last_seen_at:string|null};
const blank={name:"",host:"",port:8000,protocol:"NVR",active:true};
function Gravadores(){
 const [rows,setRows]=useState<Recorder[]>([]);
 const [edit,setEdit]=useState<(typeof blank&{id?:string})|null>(null);
 const [loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);try{setRows((await securelog.list<Recorder>("recorders",100)).items);}catch(e){toast.error(e instanceof Error?e.message:"Erro ao carregar");}finally{setLoading(false);}};
 useEffect(()=>{void load();},[]);
  const save=async()=>{if(!edit?.name.trim()||!edit.host.trim()){toast.error("Informe nome e endereço");return;}
  const data={name:edit.name.trim(),host:edit.host.trim(),port:edit.port,protocol:edit.protocol,active:edit.active};
  try{if(edit.id)await securelog.update("recorders",edit.id,data);else await securelog.create("recorders",data);toast.success("Gravador salvo");setEdit(null);await load();}catch(e){toast.error(e instanceof Error?e.message:"Erro ao salvar");}
 };
 const toggle=async(r:Recorder)=>{try{await securelog.update("recorders",r.id,{active:!r.active});await load();}catch(e){toast.error(e instanceof Error?e.message:"Erro ao atualizar");}};
 return <>
 <PageHeader title="Gravadores" crumbs={["Configurações","Gravadores"]} actions={<Button onClick={()=>setEdit({...blank})}><Plus className="h-4 w-4"/>Novo gravador</Button>}/>
 <Card><Table head={<><Th>Nome</Th><Th>Endereço</Th><Th>Protocolo</Th><Th>Status cadastral</Th><Th>Última comunicação</Th><Th>Ações</Th></>}>
 {rows.map(r=><tr key={r.id}><Td>{r.name}</Td><Td className="font-mono text-xs">{r.host}:{r.port}</Td><Td>{r.protocol}</Td><Td>{r.active?"Ativo":"Inativo"}</Td><Td>{r.last_seen_at?new Date(r.last_seen_at).toLocaleString("pt-BR"):"Não verificada"}</Td><Td><Button size="icon" variant="ghost" aria-label="Editar" onClick={()=>setEdit({id:r.id,name:r.name,host:r.host,port:r.port,protocol:r.protocol,active:r.active})}><Pencil className="h-4 w-4"/></Button><Button size="icon" variant="ghost" aria-label="Ativar ou desativar" onClick={()=>void toggle(r)}><Power className="h-4 w-4"/></Button></Td></tr>)}
 </Table>{loading&&<p className="p-4 text-sm">Carregando...</p>}{!loading&&!rows.length&&<p className="p-4 text-sm text-muted-foreground">Nenhum gravador cadastrado.</p>}</Card>
 {edit&&<FormDialog open onOpenChange={()=>setEdit(null)} title={edit.id?"Editar gravador":"Novo gravador"} onSave={()=>void save()}>
 <Field label="Nome"><Input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/></Field>
 <Field label="Endereço interno"><Input value={edit.host} onChange={e=>setEdit({...edit,host:e.target.value})}/></Field>
 <Field label="Porta"><Input type="number" value={edit.port} onChange={e=>setEdit({...edit,port:Number(e.target.value)})}/></Field>
 <Field label="Protocolo"><Input value={edit.protocol} onChange={e=>setEdit({...edit,protocol:e.target.value})}/></Field>
 <p className="text-xs text-muted-foreground sm:col-span-2">A conexão com o NVR ainda não está implementada. Este formulário salva apenas o cadastro.</p>
 </FormDialog>}
 </>;
}
