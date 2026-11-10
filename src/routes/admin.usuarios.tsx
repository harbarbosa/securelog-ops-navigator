import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, PageHeader, StatusBadge, Table, Td, Th, meta } from "@/components/sl/ui";
import { api, type Page } from "@/lib/securelog-api";
import { fmt } from "@/lib/format";
import { toast } from "sonner";
export const Route=createFileRoute("/admin/usuarios")({head:()=>meta("Usuários","Usuários reais cadastrados no SecureLog."),component:Usuarios});
type User={id:string;name:string;username:string;email:string|null;role:"admin"|"supervisor"|"operator"|"viewer";active:boolean;created_at:string};
function Usuarios(){const [rows,setRows]=useState<User[]>([]);const [loading,setLoading]=useState(true);useEffect(()=>{api<Page<User>>("/api/users?limit=100&offset=0").then(r=>setRows(r.items)).catch(e=>toast.error(e instanceof Error?e.message:"Falha ao carregar usuários")).finally(()=>setLoading(false));},[]);return <><PageHeader title="Usuários" crumbs={["Usuários"]}/><Card><Table head={<><Th>Nome</Th><Th>Usuário</Th><Th>E-mail</Th><Th>Perfil</Th><Th>Cadastro</Th><Th>Status</Th></>} >{rows.map(r=><tr key={r.id}><Td className="font-medium">{r.name}</Td><Td className="font-mono text-xs">{r.username}</Td><Td>{r.email??"—"}</Td><Td>{r.role}</Td><Td>{fmt(r.created_at)}</Td><Td><StatusBadge status={r.active?"ativo":"inativo"}/></Td></tr>)}</Table>{loading&&<p className="p-4 text-sm">Carregando usuários...</p>}{!loading&&!rows.length&&<p className="p-4 text-sm text-muted-foreground">Nenhum usuário cadastrado.</p>}</Card></>}
