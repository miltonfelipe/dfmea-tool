import { useState } from "react";

export function ProjectSettingsModal({project,onSave,onClose}){
  const [f,setF]=useState({name:project.name,product:project.product||"",revision:project.revision||"",team:project.team||"",description:project.description||""});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">PROJECT SETTINGS</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="form-group"><label className="label">Project Name</label><input value={f.name} onChange={e=>set("name",e.target.value)}/></div>
          <div className="grid2" style={{gap:12}}>
            <div className="form-group"><label className="label">Product</label><input value={f.product} onChange={e=>set("product",e.target.value)}/></div>
            <div className="form-group"><label className="label">Revision</label><input value={f.revision} onChange={e=>set("revision",e.target.value)}/></div>
          </div>
          <div className="form-group"><label className="label">Team</label><input value={f.team} onChange={e=>set("team",e.target.value)}/></div>
          <div className="form-group"><label className="label">Description</label><textarea value={f.description} onChange={e=>set("description",e.target.value)} style={{minHeight:56}}/></div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:24}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={()=>onSave(f)}>Save</button>
        </div>
      </div>
    </div>
  );
}
