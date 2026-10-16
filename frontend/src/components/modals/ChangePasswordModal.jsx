import { useState } from "react";
import { api } from "../../lib/api.js";

const MIN_LENGTH=8;

export function ChangePasswordModal({onDone,onClose}){
  const [f,setF]=useState({current:"",next:"",confirm:""});
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  const set=(k,v)=>setF(p=>({...p,[k]:v}));

  const submit=async e=>{
    e.preventDefault();
    if(f.next.length<MIN_LENGTH){setError(`New password must be at least ${MIN_LENGTH} characters.`);return;}
    if(f.next!==f.confirm){setError("New passwords do not match.");return;}
    setBusy(true);setError("");
    try{await api.changePassword(f.current,f.next);onDone();}
    catch(err){setError(err.message);}
    finally{setBusy(false);}
  };

  return(
    <div className="modal-overlay" onClick={onClose}>
      <form className="modal modal-sm" onClick={e=>e.stopPropagation()} onSubmit={submit}>
        <div className="modal-header"><span className="modal-title">CHANGE PASSWORD</span>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        {error&&<div className="login-error">{error}</div>}
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="form-group"><label className="label">Current Password</label>
            <input type="password" autoComplete="current-password" autoFocus value={f.current} onChange={e=>set("current",e.target.value)}/></div>
          <div className="form-group"><label className="label">New Password (min {MIN_LENGTH})</label>
            <input type="password" autoComplete="new-password" value={f.next} onChange={e=>set("next",e.target.value)}/></div>
          <div className="form-group"><label className="label">Repeat New Password</label>
            <input type="password" autoComplete="new-password" value={f.confirm} onChange={e=>set("confirm",e.target.value)}/></div>
        </div>
        <p style={{color:"var(--muted)",fontSize:12,marginTop:12}}>You'll stay signed in here; other sessions are signed out.</p>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:16}}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy?"Saving…":"Change Password"}</button>
        </div>
      </form>
    </div>
  );
}
