/**
 * Browser API client for the local SecureLog backend.
 * Set VITE_SECURELOG_API_URL=http://127.0.0.1:3333 when running the UI locally.
 */
const baseUrl=(import.meta.env['VITE_SECURELOG_API_URL'] as string|undefined)?.replace(/\/$/,'')??'';
export const securelogApiBase=baseUrl;
export type SecureLogUser={id:string;username:string;name:string;role:'admin'|'supervisor'|'operator'|'viewer'};
export type Page<T>={items:T[];total:number;limit:number;offset:number};
export type EntityName='locations'|'recorders'|'cameras'|'devices'|'users';
export class ApiError extends Error {
 constructor(public status:number,message:string){super(message);this.name='ApiError';}
}
export async function api<T>(path:string,options:RequestInit={}):Promise<T>{
 const response=await fetch(baseUrl+path,{...options,credentials:'include',headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
 const payload:unknown=await response.json().catch(()=>null);
 if(!response.ok){const error=payload as {error?:string}|null;throw new ApiError(response.status,error?.error??'Falha de comunicação com o SecureLog');}
 return payload as T;
}
export const securelog={
 login:(username:string,password:string)=>api<{user:SecureLogUser}>('/api/auth/login',{method:'POST',body:JSON.stringify({username,password})}),
 me:()=>api<{user:SecureLogUser}>('/api/auth/me'),
 logout:()=>api<{ok:boolean}>('/api/auth/logout',{method:'POST'}),
 list:<T>(entity:EntityName,limit=25,offset=0)=>api<Page<T>>(`/api/${entity}?limit=${limit}&offset=${offset}`),
  create:(entity:EntityName,body:Record<string,unknown>)=>api<{id:string}>(`/api/manage/${entity}`,{method:'POST',body:JSON.stringify(body)}),
  update:(entity:EntityName,id:string,body:Record<string,unknown>)=>api<{id:string}>(`/api/manage/${entity}/${encodeURIComponent(id)}`,{method:'PATCH',body:JSON.stringify(body)}),
  delete:(entity:EntityName,id:string)=>api<{id:string;deleted:true}>(`/api/manage/${entity}/${encodeURIComponent(id)}`,{method:'DELETE'}),
 provisionDeviceToken:(id:string)=>api<{device_id:string;token:string}>(`/api/manage/devices/${encodeURIComponent(id)}/token`,{method:'POST'}),
 readings:(code?:string,limit=25,offset=0)=>api<Page<Record<string,unknown>>>(`/api/readings?limit=${limit}&offset=${offset}${code?'&code='+encodeURIComponent(code):''}`)
};
