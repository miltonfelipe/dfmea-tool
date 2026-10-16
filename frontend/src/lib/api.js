// Client for the FastAPI backend (backend/). In dev, Vite proxies /api to it.
const BASE=import.meta.env.VITE_API_BASE??"";
const TOKEN_KEY="dfmea_token_v1";

export class ApiError extends Error{
  constructor(status,message){super(message);this.status=status;}
}

// Token lives in sessionStorage: survives a reload, not a closed tab.
let token=null;
try{token=sessionStorage.getItem(TOKEN_KEY);}catch{/* storage unavailable */}
const setToken=t=>{
  token=t;
  try{t?sessionStorage.setItem(TOKEN_KEY,t):sessionStorage.removeItem(TOKEN_KEY);}catch{/* storage unavailable */}
};
export const hasToken=()=>!!token;

let onUnauthorized=null;
export const setUnauthorizedHandler=fn=>{onUnauthorized=fn;};

// FastAPI errors: {detail:"msg"} or {detail:[{loc:[...],msg}]} for validation.
const errorMessage=(data,fallback)=>{
  const d=data?.detail;
  if(typeof d==="string")return d;
  if(Array.isArray(d))return d.map(e=>`${e.loc?.slice(1).join(".")||"request"}: ${e.msg}`).join("; ");
  return fallback;
};

async function request(method,path,body){
  const headers={};
  if(body!==undefined)headers["Content-Type"]="application/json";
  if(token)headers.Authorization=`Bearer ${token}`;
  let res;
  try{
    res=await fetch(`${BASE}/api${path}`,{method,headers,body:body!==undefined?JSON.stringify(body):undefined});
  }catch{
    throw new ApiError(0,"Cannot reach the server");
  }
  if(res.status===204)return null;
  const data=await res.json().catch(()=>null);
  if(!res.ok){
    if(res.status===401&&token&&path!=="/auth/login"){setToken(null);onUnauthorized?.();}
    throw new ApiError(res.status,errorMessage(data,res.statusText||`HTTP ${res.status}`));
  }
  return data;
}

export const api={
  async login(username,password){
    const r=await request("POST","/auth/login",{username,password});
    setToken(r.accessToken);
    return r.user;
  },
  logout:()=>setToken(null),
  me:()=>request("GET","/auth/me"),
  // Ends all other sessions; the response carries a new token for this one.
  async changePassword(currentPassword,newPassword){
    const r=await request("POST","/auth/password",{currentPassword,newPassword});
    setToken(r.accessToken);
  },

  listUsers:()=>request("GET","/users"),
  createUser:u=>request("POST","/users",u),
  updateUser:(id,patch)=>request("PATCH",`/users/${id}`,patch),

  listProjects:()=>request("GET","/projects"),
  createProject:meta=>request("POST","/projects",meta),
  getProject:id=>request("GET",`/projects/${id}`),
  updateProject:(id,meta)=>request("PATCH",`/projects/${id}`,meta),
  deleteProject:id=>request("DELETE",`/projects/${id}`),
  saveDiagram:(id,diagram)=>request("PUT",`/projects/${id}/diagram`,diagram),
  exportProject:id=>request("GET",`/projects/${id}/export`),
  importProject:file=>request("POST","/projects/import",file),

  createEntry:(projectId,entry)=>request("POST",`/projects/${projectId}/entries`,entry),
  updateEntry:(id,entry)=>request("PATCH",`/entries/${id}`,entry),
  deleteEntry:id=>request("DELETE",`/entries/${id}`),
  addComment:(entryId,text)=>request("POST",`/entries/${entryId}/comments`,{text}),
  resolveComment:id=>request("POST",`/comments/${id}/resolve`),
};
