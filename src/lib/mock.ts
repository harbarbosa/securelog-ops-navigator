// Dados fictícios do protótipo SecureLog — nada aqui é persistido.
const pad = (n: number) => String(n).padStart(2, "0");
export function fmt(d: Date | string) {
  const x = typeof d === "string" ? new Date(d) : d;
  return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}/${x.getFullYear()} ${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}`;
}
export function toInput(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
export const NOW = new Date(2026, 10, 9, 13, 24, 37);
export const ago = (min: number) => new Date(NOW.getTime() - min * 60000);

export type Status = "online" | "offline" | "sincronizando" | "pendente" | "sincronizado" | "erro" | "ativo" | "inativo" | "falha";

export const gravadores = [
  { id: "g1", nome: "NVR-CD-01", endereco: "10.20.1.10", porta: 8000, usuario: "admin", modelo: "Hikvision DS-7732NI", tipo: "NVR", cameras: 12, status: "online" as Status, ultima: ago(0.5) },
  { id: "g2", nome: "NVR-CD-02", endereco: "10.20.1.11", porta: 8000, usuario: "admin", modelo: "Intelbras NVD 3316", tipo: "NVR", cameras: 8, status: "online" as Status, ultima: ago(1) },
  { id: "g3", nome: "DVR-EXP-01", endereco: "10.20.2.20", porta: 37777, usuario: "operacao", modelo: "Dahua XVR5116", tipo: "DVR", cameras: 6, status: "offline" as Status, ultima: ago(47) },
];

export const locais = [
  { id: "l1", nome: "Doca 01 — Recebimento", descricao: "Entrada de carga paletizada", camera: "CAM-DOCA-01", gravador: "NVR-CD-01", dispositivos: 3, status: "ativo" as Status, ultima: ago(2) },
  { id: "l2", nome: "Doca 02 — Recebimento", descricao: "Entrada de carga fracionada", camera: "CAM-DOCA-02", gravador: "NVR-CD-01", dispositivos: 2, status: "ativo" as Status, ultima: ago(6) },
  { id: "l3", nome: "Separação — Rua A", descricao: "Picking de itens leves", camera: "CAM-SEP-A", gravador: "NVR-CD-02", dispositivos: 4, status: "ativo" as Status, ultima: ago(1) },
  { id: "l4", nome: "Conferência Final", descricao: "Bancada de conferência antes da expedição", camera: "CAM-CONF-01", gravador: "NVR-CD-02", dispositivos: 2, status: "ativo" as Status, ultima: ago(4) },
  { id: "l5", nome: "Expedição — Portão 3", descricao: "Carregamento de veículos", camera: "CAM-EXP-03", gravador: "DVR-EXP-01", dispositivos: 2, status: "ativo" as Status, ultima: ago(52) },
  { id: "l6", nome: "Devoluções", descricao: "Triagem de devoluções", camera: "CAM-DEV-01", gravador: "NVR-CD-02", dispositivos: 1, status: "inativo" as Status, ultima: ago(60 * 26) },
];

export const cameras = [
  { id: "c1", nome: "CAM-DOCA-01", local: locais[0]!.nome, gravador: "NVR-CD-01", canal: 1, tipo: "Bullet IP 4MP", descricao: "Visão frontal da doca", status: "online" as Status },
  { id: "c2", nome: "CAM-DOCA-02", local: locais[1]!.nome, gravador: "NVR-CD-01", canal: 2, tipo: "Bullet IP 4MP", descricao: "Visão lateral", status: "online" as Status },
  { id: "c3", nome: "CAM-SEP-A", local: locais[2]!.nome, gravador: "NVR-CD-02", canal: 5, tipo: "Dome IP 2MP", descricao: "Corredor A", status: "online" as Status },
  { id: "c4", nome: "CAM-CONF-01", local: locais[3]!.nome, gravador: "NVR-CD-02", canal: 7, tipo: "Dome IP 4MP", descricao: "Bancada superior", status: "online" as Status },
  { id: "c5", nome: "CAM-EXP-03", local: locais[4]!.nome, gravador: "DVR-EXP-01", canal: 3, tipo: "Bullet analógica", descricao: "Portão 3", status: "offline" as Status },
  { id: "c6", nome: "CAM-DEV-01", local: locais[5]!.nome, gravador: "NVR-CD-02", canal: 9, tipo: "Dome IP 2MP", descricao: "Área de triagem", status: "online" as Status },
];

export const usuarios = [
  { id: "u1", nome: "Henrique Barbosa", usuario: "henrique.barbosa", perfil: "Administrador", locais: ["Todos"], ultimo: ago(1), status: "ativo" as Status, video: true, admin: true },
  { id: "u2", nome: "Juliana Ferreira", usuario: "juliana.ferreira", perfil: "Supervisor", locais: ["Doca 01", "Doca 02", "Conferência"], ultimo: ago(35), status: "ativo" as Status, video: true, admin: false },
  { id: "u3", nome: "Carlos Mendes", usuario: "carlos.mendes", perfil: "Operador", locais: ["Doca 01"], ultimo: ago(2), status: "ativo" as Status, video: false, admin: false },
  { id: "u4", nome: "Ana Paula Souza", usuario: "ana.souza", perfil: "Operador", locais: ["Separação — Rua A"], ultimo: ago(8), status: "ativo" as Status, video: false, admin: false },
  { id: "u5", nome: "Rafael Lima", usuario: "rafael.lima", perfil: "Operador", locais: ["Expedição — Portão 3"], ultimo: ago(55), status: "ativo" as Status, video: false, admin: false },
  { id: "u6", nome: "Marcos Oliveira", usuario: "marcos.oliveira", perfil: "Consulta", locais: ["Todos"], ultimo: ago(60 * 30), status: "inativo" as Status, video: true, admin: false },
];

export const dispositivos = [
  { id: "d1", nome: "Zebra TC21 #01", codigo: "ZB-001", serie: "21345522019841", local: locais[0]!.nome, usuario: "Carlos Mendes", ultima: ago(0.3), pendentes: 0, status: "online" as Status },
  { id: "d2", nome: "Zebra TC21 #02", codigo: "ZB-002", serie: "21345522019877", local: locais[1]!.nome, usuario: "Juliana Ferreira", ultima: ago(3), pendentes: 0, status: "online" as Status },
  { id: "d3", nome: "Zebra MC3300 #01", codigo: "ZB-010", serie: "MC33-2209-4471", local: locais[2]!.nome, usuario: "Ana Paula Souza", ultima: ago(0.8), pendentes: 3, status: "sincronizando" as Status },
  { id: "d4", nome: "Zebra MC3300 #02", codigo: "ZB-011", serie: "MC33-2209-4502", local: locais[3]!.nome, usuario: "—", ultima: ago(12), pendentes: 7, status: "pendente" as Status },
  { id: "d5", nome: "Zebra TC26 #01", codigo: "ZB-020", serie: "TC26-2301-0093", local: locais[4]!.nome, usuario: "Rafael Lima", ultima: ago(41), pendentes: 18, status: "offline" as Status },
];

const usersOp = ["Carlos Mendes", "Ana Paula Souza", "Juliana Ferreira", "Rafael Lima"];
let seed = 7;
const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280);

export type Leitura = {
  id: string; codigo: string; data: Date; usuario: string; local: string; dispositivo: string;
  camera: string; gravador: string; status: Status;
};

export const leituras: Leitura[] = Array.from({ length: 64 }, (_, i) => {
  const li = Math.floor(rnd() * 5);
  const local = locais[li]!;
  const disp = dispositivos[li]!;
  const r = rnd();
  const status: Status = disp.status === "offline" ? "pendente" : r > 0.93 ? "erro" : r > 0.85 ? "pendente" : "sincronizado";
  return {
    id: `LT-2026110${9}-${String(4821 - i).padStart(5, "0")}`,
    codigo: `789${String(Math.floor(rnd() * 1e10)).padStart(10, "0")}`,
    data: ago(i * 7 + Math.floor(rnd() * 5)),
    usuario: usersOp[li % usersOp.length]!,
    local: local.nome,
    dispositivo: disp.nome,
    camera: local.camera,
    gravador: local.gravador,
    status,
  };
});

export const alertas = [
  { id: 1, tipo: "Leitor offline", texto: "Zebra TC26 #01 sem comunicação há 41 min", data: ago(41), nivel: "erro" },
  { id: 2, tipo: "Gravador sem comunicação", texto: "DVR-EXP-01 não responde (10.20.2.20:37777)", data: ago(47), nivel: "erro" },
  { id: 3, tipo: "Leituras pendentes", texto: "28 leituras aguardando sincronização em 3 leitores", data: ago(12), nivel: "aviso" },
  { id: 4, tipo: "Falha de sincronização", texto: "Zebra MC3300 #02: tempo limite excedido (3 tentativas)", data: ago(9), nivel: "aviso" },
];

export const eventos = [
  { id: 1, tipo: "Heartbeat recebido", origem: "Alfredo/n8n", data: ago(0.5), status: "online" as Status },
  { id: 2, tipo: "Leitor desconectado", origem: "Zebra TC26 #01", data: ago(41), status: "offline" as Status },
  { id: 3, tipo: "Gravador sem comunicação", origem: "DVR-EXP-01", data: ago(47), status: "offline" as Status },
  { id: 4, tipo: "Gravador recuperado", origem: "NVR-CD-02", data: ago(95), status: "online" as Status },
  { id: 5, tipo: "Falha de banco", origem: "MySQL — conexão recusada (12 s)", data: ago(180), status: "falha" as Status },
  { id: 6, tipo: "Servidor reiniciado", origem: "srv-securelog-01", data: ago(182), status: "pendente" as Status },
  { id: 7, tipo: "Heartbeat recebido", origem: "Alfredo/n8n", data: ago(240), status: "online" as Status },
  { id: 8, tipo: "Leitor desconectado", origem: "Zebra MC3300 #02", data: ago(60 * 20), status: "offline" as Status },
];
