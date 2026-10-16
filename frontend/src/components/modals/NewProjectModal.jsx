import { useState } from "react";

export function NewProjectModal({onCreate,onClose}){
  const [f,setF]=useState({name:"",product:"",revision:"A",team:"",description:"",demo:false});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const ok=f.name.trim().length>0;
  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">NEW PROJECT</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="form-group"><label className="label">Project Name *</label>
            <input value={f.name} onChange={e=>set("name",e.target.value)} autoFocus/></div>
          <div className="grid2" style={{gap:12}}>
            <div className="form-group"><label className="label">Product</label><input value={f.product} onChange={e=>set("product",e.target.value)}/></div>
            <div className="form-group"><label className="label">Revision</label><input value={f.revision} onChange={e=>set("revision",e.target.value)}/></div>
          </div>
          <div className="form-group"><label className="label">Team</label><input value={f.team} onChange={e=>set("team",e.target.value)}/></div>
          <div className="form-group"><label className="label">Description</label><textarea value={f.description} onChange={e=>set("description",e.target.value)} style={{minHeight:56}}/></div>
          <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"10px 14px",background:"var(--surface2)",borderRadius:6,border:"1px solid var(--border)"}}>
            <input type="checkbox" checked={f.demo} onChange={e=>set("demo",e.target.checked)} style={{width:"auto"}}/>
            <div><div style={{fontSize:13}}>Populate with demo data</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>5 failure modes + block diagram</div></div>
          </label>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:24}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!ok} onClick={()=>ok&&onCreate(f)}>Create Project</button>
        </div>
      </div>
    </div>
  );
}
