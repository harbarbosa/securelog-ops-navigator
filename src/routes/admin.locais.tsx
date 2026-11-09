import {createFileRoute} from "@tanstack/react-router";
import {useEffect,useState} from "react";
import {Pencil,Plus,Power} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Textarea} from "@/components/ui/textarea";
import {Card,Field,PageHeader,Table,Td,Th,meta} from "@/components/sl/ui";
import {FormDialog} from "@/components/sl/crud";
import {securelog} from "@/lib/securelog-api";

export const Route=createFileRoute("/admin/locais")({head:()=>meta("Locais","Cadastro de locais operacionais."),component:Locais});
type Location={id:string;name:string;description:string|null;primary_camera_id:string|null;active:boolean};
type Camera={id:string;name:string};
const blank={name:"",description:"",primary_camera_id:"",active:true};
function Locais(){
 const [rows,setRows]=useState<Location[]>([]);
 const [cameras,setCameras]=useState<Camera[]>([]);
 const [edit,setEdit]=useState<(typeof blank & {id?:string})|null>(null);
 const [loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);try{const [l,c]=await Promise.all([securelog.list<Location>("locations",100),securelog.list<Camera>("cameras",100)]);setRows(l.items);setCameras(c.items);}catch(e){toast.error(e instanceof Error?e.message:"Erro ao carregar locais");}finally{setLoading(false);}};
 useEffect(()=>{void load();},[]);
 const save=async()=>{if(!edit?.name.trim())return toast.error("Informe o nome do local");
  const data={name:edit.name.trim(),description:edit.description||null,primary_camera_id:edit.primary_camera_id||null,active:edit.active};
  try{if(edit.id)await securelog.update("locations",edit.id,data);else await securelog.create("locations",data);toast.success("Local salvo");setEdit(null);await load();}catch(e){toast.error(e instanceof Error?e.message:"Erro ao salvar");}
 };
 const toggle=async(row:Location)=>{try{await securelog.update("locations",row.id,{active:!row.active});toast.success("Status atualizado");await load();}catch(e){toast.error(e instanceof Error?e.message:"Erro ao alterar status");}};
 return <>
  <PageHeader title="Locais" crumbs={["Locais"]} actions={<Button onClick={()=>setEdit({...blank})}><Plus className="h-4 w-4"/>Novo local</Button>}/>
  <p className="mb-4 text-sm text-muted-foreground">Locais cadastrados no banco de dados SecureLog.</p>
  <Card><Table head={<><Th>Nome</Th><Th>Descrição</Th><Th>Câmera principal</Th><Th>Status</Th><Th className="text-right">Ações</Th></>}>
  {rows.map(r=><tr key={r.id}><Td className="font-medium">{r.name}</Td><Td>{r.description||"—"}</Td><Td>{cameras.find(c=>c.id===r.primary_camera_id)?.name||"—"}</Td><Td>{r.active?"Ativo":"Inativo"}</Td><Td className="text-right"><Button variant="ghost" size="icon" aria-label="Editar" onClick={()=>setEdit({id:r.id,name:r.name,description:r.description||"",primary_camera_id:r.primary_camera_id||"",active:r.active})}><Pencil className="h-4 w-4"/></Button><Button variant="ghost" size="icon" aria-label="Ativar ou desativar" onClick={()=>void toggle(r)}><Power className="h-4 w-4"/></Button></Td></tr>)}
  </Table>{loading&&<p className="p-4 text-sm">Carregando...</p>}{!loading&&rows.length===0&&<p className="p-4 text-sm text-muted-foreground">Nenhum local cadastrado.</p>}</Card>
  {edit&&<FormDialog open onOpenChange={()=>setEdit(null)} title={edit.id?"Editar local":"Novo local"} onSave={()=>void save()}>
   <Field label="Nome"><Input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/></Field>
   <Field label="Descrição"><Textarea value={edit.description} onChange={e=>setEdit({...edit,description:e.target.value})}/></Field>
   <Field label="Câmera principal"><select className="w-full rounded-md border bg-background p-2" value={edit.primary_camera_id} onChange={e=>setEdit({...edit,primary_camera_id:e.target.value})}><option value="">Nenhuma</option>{cameras.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
  </FormDialog>}
 </>;
}
