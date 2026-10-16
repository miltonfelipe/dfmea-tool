import { useState } from "react";
import { SEV_LABELS, OCC_LABELS, DET_LABELS, FAILURE_CATEGORIES, SUBSYSTEMS } from "../../lib/constants.js";
import { uid } from "../../lib/utils.js";
import { RPNChip } from "../RPNChip.jsx";
import { RatingSlider } from "../RatingSlider.jsx";

export function EntryModal({entry,onSave,onClose,subsystemOptions,currentUser,readOnly}){
  const allSubs=[...new Set([...SUBSYSTEMS,...(subsystemOptions||[])])];
  const blank={id:uid(),subsystem:allSubs[0]||"Power Supply",component:"",function:"",failureMode:"",failureEffect:"",failureCause:"",category:"Short Circuit",severity:5,occurrence:5,detection:5,controls:"",action:"",responsible:"",dueDate:"",status:"Open",revisedS:5,revisedO:3,revisedD:3,version:1,history:[],comments:[]};
  const [f,setF]=useState(entry||blank);
  const rpn=f.severity*f.occurrence*f.detection;
  const rRPN=f.revisedS*f.revisedO*f.revisedD;
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const ro=readOnly||currentUser.role==="RV"; // reviewers can't edit entries

  return(
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{ro?"VIEW":"EDIT"} FAILURE MODE {ro&&<span style={{color:"var(--warn)",fontSize:10,marginLeft:8}}>READ-ONLY</span>}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {ro&&<div style={{background:"#ffb02011",border:"1px solid #ffb02033",borderRadius:6,padding:"8px 12px",marginBottom:16,fontSize:12,color:"var(--warn)"}}>
          Reviewers can read entries and add comments, but cannot modify data. Use the 💬 button on the worksheet row.
        </div>}
        <div className="grid2" style={{gap:12,marginBottom:16}}>
          <div className="form-group"><label className="label">Subsystem</label>
            <select value={f.subsystem} onChange={e=>set("subsystem",e.target.value)} disabled={ro}>{allSubs.map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="form-group"><label className="label">Component</label>
            <input value={f.component} onChange={e=>set("component",e.target.value)} disabled={ro}/></div>
        </div>
        <div className="grid2" style={{gap:12,marginBottom:16}}>
          <div className="form-group"><label className="label">Intended Function</label>
            <input value={f.function} onChange={e=>set("function",e.target.value)} disabled={ro}/></div>
          <div className="form-group"><label className="label">Failure Category</label>
            <select value={f.category} onChange={e=>set("category",e.target.value)} disabled={ro}>{FAILURE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
        </div>
        <div className="form-group" style={{marginBottom:12}}>
          <label className="label">Failure Mode</label>
          <input value={f.failureMode} onChange={e=>set("failureMode",e.target.value)} disabled={ro}/></div>
        <div className="grid2" style={{gap:12,marginBottom:12}}>
          <div className="form-group"><label className="label">Failure Effect</label>
            <textarea value={f.failureEffect} onChange={e=>set("failureEffect",e.target.value)} disabled={ro}/></div>
          <div className="form-group"><label className="label">Failure Cause</label>
            <textarea value={f.failureCause} onChange={e=>set("failureCause",e.target.value)} disabled={ro}/></div>
        </div>
        <hr className="sep"/>
        <div style={{marginBottom:20}}>
          <div className="card-title" style={{marginBottom:16}}>CURRENT RATINGS</div>
          <div className="grid3" style={{gap:20}}>
            <RatingSlider label="Severity (S)" value={f.severity} onChange={v=>set("severity",v)} labels={SEV_LABELS} disabled={ro}/>
            <RatingSlider label="Occurrence (O)" value={f.occurrence} onChange={v=>set("occurrence",v)} labels={OCC_LABELS}/>
            <RatingSlider label="Detection (D)" value={f.detection} onChange={v=>set("detection",v)} labels={DET_LABELS}/>
          </div>
          <div style={{marginTop:16,display:"flex",alignItems:"center",gap:12}}>
            <span className="label">CURRENT RPN</span><RPNChip value={rpn}/>
          </div>
        </div>
        <div className="form-group" style={{marginBottom:16}}>
          <label className="label">Current Controls</label>
          <textarea value={f.controls} onChange={e=>set("controls",e.target.value)} disabled={ro}/></div>
        <hr className="sep"/>
        <div className="card-title" style={{marginBottom:16}}>RECOMMENDED ACTION</div>
        <div className="form-group" style={{marginBottom:12}}>
          <label className="label">Action</label>
          <textarea value={f.action} onChange={e=>set("action",e.target.value)} disabled={ro}/></div>
        <div className="grid3" style={{gap:12,marginBottom:16}}>
          <div className="form-group"><label className="label">Responsible</label>
            <input value={f.responsible} onChange={e=>set("responsible",e.target.value)} disabled={ro}/></div>
          <div className="form-group"><label className="label">Due Date</label>
            <input type="date" value={f.dueDate} onChange={e=>set("dueDate",e.target.value)} disabled={ro}/></div>
          <div className="form-group"><label className="label">Status</label>
            <select value={f.status} onChange={e=>set("status",e.target.value)} disabled={ro}>
              <option>Open</option><option>Review</option><option>Closed</option></select></div>
        </div>
        <div style={{marginBottom:12}}>
          <div className="card-title" style={{marginBottom:16}}>REVISED RATINGS</div>
          <div className="grid3" style={{gap:20}}>
            <RatingSlider label="Revised S" value={f.revisedS} onChange={v=>set("revisedS",v)} labels={SEV_LABELS}/>
            <RatingSlider label="Revised O" value={f.revisedO} onChange={v=>set("revisedO",v)} labels={OCC_LABELS}/>
            <RatingSlider label="Revised D" value={f.revisedD} onChange={v=>set("revisedD",v)} labels={DET_LABELS}/>
          </div>
          <div style={{marginTop:16,display:"flex",alignItems:"center",gap:12}}>
            <span className="label">REVISED RPN</span><RPNChip value={rRPN}/>
            {rpn>0&&<span style={{color:rRPN<rpn?"var(--ok)":"var(--danger)",fontFamily:"var(--mono)",fontSize:11}}>
              {rRPN<rpn?"▼ ":"▲ "}{Math.abs(Math.round((1-rRPN/rpn)*100))}%
            </span>}
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:24}}>
          <button className="btn btn-ghost" onClick={onClose}>{ro?"Close":"Cancel"}</button>
          {!ro&&<button className="btn btn-primary" onClick={()=>onSave({...f,rpn,revisedRPN:rRPN})}>✓ Save</button>}
        </div>
      </div>
    </div>
  );
}
