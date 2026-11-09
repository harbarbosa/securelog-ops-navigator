import { createContext, useContext, useState, type ReactNode } from "react";
import { NOW } from "@/lib/mock";

export type Pend = { id: string; codigo: string; data: Date; tentativas: number; status: "aguardando" | "enviando" | "erro" };
type S = {
  user: string; setUser: (u: string) => void;
  local: string; setLocal: (l: string) => void;
  leitor: string; setLeitor: (l: string) => void;
  online: boolean; setOnline: (o: boolean) => void;
  sessao: { codigo: string; data: Date }[]; addLeitura: (c: string) => void;
  pend: Pend[]; setPend: (p: Pend[]) => void;
  ultimaSync: Date; setUltimaSync: (d: Date) => void;
  reset: () => void;
};
const Ctx = createContext<S | null>(null);
const seedPend: Pend[] = [
  { id: "p1", codigo: "7891234500981", data: new Date(NOW.getTime() - 9 * 60000), tentativas: 3, status: "erro" },
  { id: "p2", codigo: "7891234501230", data: new Date(NOW.getTime() - 7 * 60000), tentativas: 1, status: "aguardando" },
];

export function MobileProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState("carlos.mendes");
  const [local, setLocal] = useState("");
  const [leitor, setLeitor] = useState("");
  const [online, setOnline] = useState(true);
  const [sessao, setSessao] = useState<S["sessao"]>([]);
  const [pend, setPend] = useState<Pend[]>(seedPend);
  const [ultimaSync, setUltimaSync] = useState(new Date(NOW.getTime() - 4 * 60000));
  const addLeitura = (codigo: string) => {
    const data = new Date();
    setSessao((s) => [{ codigo, data }, ...s]);
    if (!online) setPend((p) => [...p, { id: crypto.randomUUID(), codigo, data, tentativas: 0, status: "aguardando" }]);
    else setUltimaSync(data);
  };
  const reset = () => { setLocal(""); setLeitor(""); setSessao([]); };
  return <Ctx.Provider value={{ user, setUser, local, setLocal, leitor, setLeitor, online, setOnline, sessao, addLeitura, pend, setPend, ultimaSync, setUltimaSync, reset }}>{children}</Ctx.Provider>;
}
export const useMobile = () => useContext(Ctx)!;
