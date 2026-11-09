import {createFileRoute} from "@tanstack/react-router";
import {useEffect,useState} from "react";
import {Pencil,Plus,Power} from "lucide-react";
import {toast} from "sonner";
import {Button} from "@/components/ui/button";
import {Input} from "@/components/ui/input";
import {Card,Field,PageHeader,Table,Td,Th,meta} from "@/components/sl/ui";
import {FormDialog} from "@/components/sl/crud";
import {securelog} from "@/lib/securelog-api";
export const Route=createFileRoute("/admin/cameras")({head:()=>meta("Câmeras","Cadastro de câmeras e canais vinculados aos gravadores."),component:Cameras});
type Camera={id:string;name:string;recorder_id:string;channel:number;active:boolean};
type Recorder={id:string;name:string;active:boolean};
const blank={name:"",recorder_id:"",channel:1,active:true};
function Cameras(){
 const [rows,setRows]=useState<Camera[]>([]);
 const [recorders,setRecorders]=useState<Recorder[]>([]);
 const [edit,setEdit]=useState<(typeof blank&{id?:string})|null>(null);
 const [loading,setLoading]=useState(true);
 const load=async()=>{setLoading(true);try{const [c,r]=await Promise.all([securelog.list<Camera>("cameras",100),securelog.list<Recorder>("recorders",100)]);setRows(c.items);setRecorders(r.items);}catch(e){toast.error(e instanceof Error?e.message:"Falha ao carregar câmeras");}finally{setLoading(false);}};
 useEffect(()=>{void load();},[]);
  const save=async()=>{if(!edit?.name.trim()||!edit.recorder_id){toast.error("Informe nome e gravador");return;}
  const data={name:edit.name.trim(),recorder_id:edit.recorder_id,channel:edit.channel,active:edit.active};
  try{if(edit.id)await securelog.update("cameras",edit.id,data);else await securelog.create("cameras",data);toast.success("Câmera salva");setEdit(null);await load();}catch(e){toast.error(e instanceof Error?e.message:"Falha ao salvar câmera");}
 };
 const toggle=async(r:Camera)=>{try{await securelog.update("cameras",r.id,{active:!r.active});await load();}catch(e){toast.error(e instanceof Error?e.message:"Falha ao atualizar");}};
 return <>
  <PageHeader title="Câmeras" crumbs={["Configurações","Câmeras"]} actions={<Button onClick={()=>setEdit({...blank,recorder_id:recorders.find(r=>r.active)?.id??""})}><Plus className="h-4 w-4"/>Nova câmera</Button>}/>
  <Card><Table head={<><Th>Nome</Th><Th>Gravador</Th><Th>Canal</Th><Th>Status cadastral</Th><Th>Ações</Th></>}>
  {rows.map(r=><tr key={r.id}><Td className="font-medium">{r.name}</Td><Td>{recorders.find(g=>g.id===r.recorder_id)?.name??"—"}</Td><Td>{r.channel}</Td><Td>{r.active?"Ativa":"Inativa"}</Td><Td><Button size="icon" variant="ghost" aria-label="Editar" onClick={()=>setEdit({...r})}><Pencil className="h-4 w-4"/></Button><Button size="icon" variant="ghost" aria-label="Ativar ou desativar" onClick={()=>void toggle(r)}><Power className="h-4 w-4"/></Button></Td></tr>)}
  </Table>{loading&&<p className="p-4 text-sm">Carregando...</p>}{!loading&&!rows.length&&<p className="p-4 text-sm text-muted-foreground">Nenhuma câmera cadastrada.</p>}</Card>
  {edit&&<FormDialog open onOpenChange={()=>setEdit(null)} title={edit.id?"Editar câmera":"Nova câmera"} onSave={()=>void save()}>
  <Field label="Nome"><Input value={edit.name} onChange={e=>setEdit({...edit,name:e.target.value})}/></Field>
  <Field label="Gravador"><select className="w-full rounded-md border bg-background p-2" value={edit.recorder_id} onChange={e=>setEdit({...edit,recorder_id:e.target.value})}><option value="">Selecione</option>{recorders.filter(r=>r.active||r.id===edit.recorder_id).map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></Field>
  <Field label="Canal"><Input type="number" min={0} value={edit.channel} onChange={e=>setEdit({...edit,channel:Number(e.target.value)})}/></Field>
  <p className="text-xs text-muted-foreground sm:col-span-2">Visualização ao vivo e gravações estarão disponíveis após a integração com o NVR.</p>
  </FormDialog>}
 </>;
}
