const pad=(n:number)=>String(n).padStart(2,"0");
export function fmt(d:Date|string){const x=typeof d==="string"?new Date(d):d;return `${pad(x.getDate())}/${pad(x.getMonth()+1)}/${x.getFullYear()} ${pad(x.getHours())}:${pad(x.getMinutes())}:${pad(x.getSeconds())}`;}
export function toInput(d:Date){return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;}
export type Status="online"|"offline"|"sincronizando"|"pendente"|"sincronizado"|"erro"|"ativo"|"inativo"|"falha";
