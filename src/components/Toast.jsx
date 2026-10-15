import { useEffect, useEffectEvent } from "react";

export function Toast({msg,type,onDone}){
  const done=useEffectEvent(onDone);
  useEffect(()=>{const t=setTimeout(()=>done(),2800);return()=>clearTimeout(t);},[]);
  return <div className={`toast toast-${type}`}>{type==="ok"?"✓":type==="err"?"✕":"ℹ"} {msg}</div>;
}
