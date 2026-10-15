// Per-browser preferences only; project data lives on the server (lib/api.js).
const THEME_KEY="dfmea_theme_v1";
export const loadTheme=()=>{
  try{return JSON.parse(localStorage.getItem(THEME_KEY))==="light"?"light":"dark";}
  catch{return "dark";}
};
export const saveTheme=t=>{
  try{localStorage.setItem(THEME_KEY,JSON.stringify(t));}
  catch(e){console.error(e);}
};
