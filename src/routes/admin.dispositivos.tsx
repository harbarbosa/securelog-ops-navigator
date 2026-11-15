import {createFileRoute} from "@tanstack/react-router";
import {useEffect,useState} from "react";
import {Link2,Pencil,Plus,Power,Trash2} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card,Field,PageHeader,Table,Td,Th,meta} from "@/components/sl/ui";
import {FormDialog} from "@/components/sl/crud";
import {securelog} from "@/lib/securelog-api";
export const Route=createFileRoute("/admin/dispositivos")({head:()=>meta("Dispositivos","Cadastro dos coletores Zebra."),component:Dispositivos});
type Device={id:string;name:string;serial_number:string;location_id:string|null;active:boolean;has_token:boolean;last_seen_at:string|null};
type Location={id:string;name:string;active:boolean};
const blank={name:"",serial_number:"",location_id:"",active:true};
function Dispositivos(){
 const [rows,setRows]=useState<Device[]>([]);
 const [locations,setLocations]=useState<Location[]>([]);
 const [edit,setEdit]=useState<(typeof blank&{id?:string})|null>(null);
 const [associate,setAssociate]=useState<Device|null>(null);
 const [loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);try{const [d,l]=await Promise.all([securelog.list<Device>("devices",100),securelog.list<Location>("locations",100)]);setRows(d.items);setLocations(l.items);}catch(e){toast.error(e instanceof Error?e.message:"Falha ao carregar dispositivos");}finally{setLoading(false);}};
 useEffect(()=>{void load();},[]);
  const save=async()=>{if(!edit?.name.trim()||!edit.serial_number.trim()){toast.error("Informe nome e número de série");return;}
  const data={name:edit.name.trim(),serial_number:edit.serial_number.trim(),location_id:edit.location_id||null,active:edit.active};
  try{if(edit.id)await securelog.update("devices",edit.id,data);else await securelog.create("devices",data);toast.success("Dispositivo salvo");setEdit(null);await load();}catch(e){toast.error(e instanceof Error?e.message:"Falha ao salvar dispositivo");}
 };
 const toggle=async(r:Device)=>{try{await securelog.update("devices",r.id,{active:!r.active});await load();}catch(e){toast.error(e instanceof Error?e.message:"Falha ao atualizar");}};
 const link=async()=>{if(!associate?.location_id){toast.error("Selecione um local");return;}try{await securelog.associateDevice(associate.id,associate.location_id);toast.success("Leitor associado e token enviado para pareamento");setAssociate(null);await load();}catch(e){toast.error(e instanceof Error?e.message:"Falha ao associar leitor");}};
 const remove=async(r:Device)=>{if(!window.confirm(`Excluir o leitor “${r.name}”? Essa ação não pode ser desfeita.`))return;try{await securelog.delete("devices",r.id);toast.success("Leitor excluído");await load();}catch(e){toast.error(e instanceof Error?e.message:"Falha ao excluir leitor");}};
 return <>
  <PageHeader title="Dispositivos e leitores" crumbs={["Configurações","Dispositivos"]} actions={<Button onClick={()=>setEdit({...blank})}><Plus className="h-4 w-4"/>Novo leitor</Button>}/>
  <Card><Table head={<><Th>Nome do leitor</Th><Th>Número de série</Th><Th>Local</Th><Th>Última comunicação</Th><Th>Status cadastral</Th><Th>Ações</Th></>}>
  {rows.map(r=><tr key={r.id}><Td className="font-medium">{r.name}</Td><Td className="font-mono text-xs">{r.serial_number}</Td><Td>{locations.find(l=>l.id===r.location_id)?.name??"Sem local"}</Td><Td>{r.last_seen_at?new Date(r.last_seen_at).toLocaleString("pt-BR"):"Nunca"}</Td><Td>{r.active&&r.location_id&&r.has_token?"Associado":"Pendente"}</Td><Td>{(!r.active||!r.location_id||!r.has_token)&&<Button size="icon" variant="ghost" aria-label="Associar" onClick={()=>setAssociate({...r})}><Link2 className="h-4 w-4 text-brand"/></Button>}<Button size="icon" variant="ghost" aria-label="Editar" onClick={()=>setEdit({id:r.id,name:r.name,serial_number:r.serial_number,location_id:r.location_id??"",active:r.active})}><Pencil className="h-4 w-4"/></Button><Button size="icon" variant="ghost" aria-label={r.active?"Desativar":"Ativar"} onClick={()=>void toggle(r)}><Power className="h-4 w-4"/></Button><Button size="icon" variant="ghost" aria-label="Excluir" onClick={()=>void remove(r)}><Trash2 className="h-4 w-4 text-destructive"/></Button></Td></tr>)}
  </Table>{loading&&<p className="p-4 text-sm">Carregando...</p>}{!loading&&!rows.length&&<p className="p-4 text-sm text-muted-foreground">Nenhum leitor cadastrado.</p>}</Card>
  {edit&&<FormDialog open onOpenChange={()=>setEdit(null)} title={edit.id?"Editar leitor":"Novo leitor"} onSave={()=>void save()}>
  <Field label="Nome"><Input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/></Field>
  <Field label="Número de série"><Input value={edit.serial_number} onChange={e=>setEdit({...edit,serial_number:e.target.value})}/></Field>
  <Field label="Local permitido"><select className="w-full rounded-md border bg-background p-2" value={edit.location_id} onChange={e=>setEdit({...edit,location_id:e.target.value})}><option value="">Nenhum</option>{locations.filter(l=>l.active||l.id===edit.location_id).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
  <p className="text-xs text-muted-foreground sm:col-span-2">Comunicação e sincronização com o Zebra serão habilitadas em uma próxima etapa.</p>
  </FormDialog>}
  {associate&&<FormDialog open onOpenChange={()=>setAssociate(null)} title={`Associar leitor: ${associate.name}`} onSave={()=>void link()}>
  <Field label="Local permitido"><select className="w-full rounded-md border bg-background p-2" value={associate.location_id??""} onChange={e=>setAssociate({...associate,location_id:e.target.value||null})}><option value="">Selecione um local</option>{locations.filter(l=>l.active).map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></Field>
  <p className="text-xs text-muted-foreground sm:col-span-2">Ao associar, o servidor ativa o leitor e libera um token temporário para o coletor buscar automaticamente.</p>
  </FormDialog>}
 </>;
}
