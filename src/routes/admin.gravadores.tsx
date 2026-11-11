import {createFileRoute} from "@tanstack/react-router";
import {useEffect,useState} from "react";
import {Pencil,Plus,Power,Trash2} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card,Field,PageHeader,Table,Td,Th,meta} from "@/components/sl/ui";
import {FormDialog} from "@/components/sl/crud";
import {securelog} from "@/lib/securelog-api";
export const Route=createFileRoute("/admin/gravadores")({head:()=>meta("Gravadores","Cadastro de gravadores NVR/DVR."),component:Gravadores});
type Recorder={id:string;name:string;host:string;port:number;rtsp_port:number;sdk_port:number;protocol:string;username:string|null;has_credentials:boolean;active:boolean;last_seen_at:string|null};
const blank={name:"",host:"",port:80,rtsp_port:554,sdk_port:37777,protocol:"http",username:"",password:"",active:true};
function Gravadores(){
 const [rows,setRows]=useState<Recorder[]>([]);
 const [edit,setEdit]=useState<(typeof blank&{id?:string})|null>(null);
 const [loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);try{setRows((await securelog.list<Recorder>("recorders",100)).items);}catch(e){toast.error(e instanceof Error?e.message:"Erro ao carregar");}finally{setLoading(false);}};
 useEffect(()=>{void load();},[]);
  const save=async()=>{if(!edit?.name.trim()||!edit.host.trim()){toast.error("Informe nome e endereço");return;}
 const data={name:edit.name.trim(),host:edit.host.trim(),port:edit.port,rtsp_port:edit.rtsp_port,sdk_port:edit.sdk_port,protocol:edit.protocol,username:edit.username.trim()||null,...(edit.password.trim()?{password:edit.password.trim()}:{}),active:edit.active};
  try{if(edit.id)await securelog.update("recorders",edit.id,data);else await securelog.create("recorders",data);toast.success("Gravador salvo");setEdit(null);await load();}catch(e){toast.error(e instanceof Error?e.message:"Erro ao salvar");}
 };
 const toggle=async(r:Recorder)=>{try{await securelog.update("recorders",r.id,{active:!r.active});await load();}catch(e){toast.error(e instanceof Error?e.message:"Erro ao atualizar");}};
 const remove=async(r:Recorder)=>{if(!window.confirm(`Excluir o gravador “${r.name}”? Essa ação não pode ser desfeita.`))return;try{await securelog.delete("recorders",r.id);toast.success("Gravador excluído");await load();}catch(e){toast.error(e instanceof Error?e.message:"Erro ao excluir gravador");}};
 return <>
 <PageHeader title="Gravadores" crumbs={["Configurações","Gravadores"]} actions={<Button onClick={()=>setEdit({...blank})}><Plus className="h-4 w-4"/>Novo gravador</Button>}/>
 <Card><Table head={<><Th>Nome</Th><Th>Endereço</Th><Th>Protocolo</Th><Th>Credenciais</Th><Th>Status cadastral</Th><Th>Última comunicação</Th><Th>Ações</Th></>}>
 {rows.map(r=><tr key={r.id}><Td>{r.name}</Td><Td className="font-mono text-xs">{r.host}:{r.port}</Td><Td>{r.protocol}</Td><Td>{r.has_credentials?`Usuário: ${r.username??"configurado"}`:"Não configuradas"}</Td><Td>{r.active?"Ativo":"Inativo"}</Td><Td>{r.last_seen_at?new Date(r.last_seen_at).toLocaleString("pt-BR"):"Não verificada"}</Td><Td><Button size="icon" variant="ghost" aria-label="Editar" onClick={()=>setEdit({id:r.id,name:r.name,host:r.host,port:r.port,rtsp_port:r.rtsp_port??554,sdk_port:r.sdk_port??37777,protocol:r.protocol,username:r.username??"",password:"",active:r.active})}><Pencil className="h-4 w-4"/></Button><Button size="icon" variant="ghost" aria-label={r.active?"Desativar":"Ativar"} onClick={()=>void toggle(r)}><Power className="h-4 w-4"/></Button><Button size="icon" variant="ghost" aria-label="Excluir" onClick={()=>void remove(r)}><Trash2 className="h-4 w-4 text-destructive"/></Button></Td></tr>)}
 </Table>{loading&&<p className="p-4 text-sm">Carregando...</p>}{!loading&&!rows.length&&<p className="p-4 text-sm text-muted-foreground">Nenhum gravador cadastrado.</p>}</Card>
 {edit&&<FormDialog open onOpenChange={()=>setEdit(null)} title={edit.id?"Editar gravador":"Novo gravador"} onSave={()=>void save()}>
 <Field label="Nome"><Input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/></Field>
 <Field label="Endereço interno"><Input value={edit.host} onChange={e=>setEdit({...edit,host:e.target.value})}/></Field>
 <Field label="Porta HTTP/HTTPS"><Input type="number" value={edit.port} onChange={e=>setEdit({...edit,port:Number(e.target.value)})}/></Field>
 <Field label="Porta RTSP"><Input type="number" value={edit.rtsp_port} onChange={e=>setEdit({...edit,rtsp_port:Number(e.target.value)})}/></Field><Field label="Porta NetSDK (0 desativa)"><Input type="number" min="0" value={edit.sdk_port} onChange={e=>setEdit({...edit,sdk_port:Number(e.target.value)})}/></Field>
 <Field label="Protocolo HTTP"><select className="w-full rounded-md border bg-background p-2" value={edit.protocol} onChange={e=>setEdit({...edit,protocol:e.target.value})}><option value="http">HTTP</option><option value="https">HTTPS</option></select></Field>
 <Field label="Usuário do gravador"><Input autoComplete="username" value={edit.username} onChange={e=>setEdit({...edit,username:e.target.value})}/></Field>
 <Field label={edit.id?"Nova senha (deixe em branco para manter)":"Senha do gravador"}><Input type="password" autoComplete={edit.id?"new-password":"current-password"} value={edit.password} onChange={e=>setEdit({...edit,password:e.target.value})}/></Field>
 <p className="text-xs text-muted-foreground sm:col-span-2">A senha é cifrada no backend e nunca retorna para o navegador. A consulta de imagens depende do fabricante/protocolo do gravador.</p>
 </FormDialog>}
 </>;
}
