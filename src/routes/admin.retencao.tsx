import { createFileRoute } from "@tanstack/react-router";
import { Card, PageHeader, meta } from "@/components/sl/ui";
export const Route=createFileRoute("/admin/retencao")({head:()=>meta("Retenção de mídia","Configuração da retenção real de mídia."),component:Retencao});
function Retencao(){return <><PageHeader title="Retenção de mídia" crumbs={["Configurações","Retenção de mídia"]}/><Card><div className="p-6"><p className="font-medium text-primary">Configuração não disponível</p><p className="mt-2 text-sm text-muted-foreground">A integração de armazenamento de mídia e a rotina de retenção ainda não foram configuradas. Nenhum valor padrão ou limpeza simulada é exibido.</p></div></Card></>}
