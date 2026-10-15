export const STORAGE_KEY="dfmea_projects_v2";
export const USERS_KEY="dfmea_users_v1";
export const THEME_KEY="dfmea_theme_v1";
export function loadJSON(key,fallback){
  try{const r=localStorage.getItem(key);return r?JSON.parse(r):fallback}
  catch{return fallback}
}
export function saveJSON(key,value){
  try{localStorage.setItem(key,JSON.stringify(value))}
  catch(e){console.error(e)}
}
export const loadDB=async()=>loadJSON(STORAGE_KEY,{});
export const saveDB=async db=>saveJSON(STORAGE_KEY,db);
export const loadUsers=()=>loadJSON(USERS_KEY,null);
export const saveUsers=u=>saveJSON(USERS_KEY,u);
export const loadTheme=()=>{const t=loadJSON(THEME_KEY,"dark");return t==="light"?"light":"dark";};
export const saveTheme=t=>saveJSON(THEME_KEY,t);
