import { useState } from "react";
import { ROLES } from "../../lib/constants.js";
import { uid } from "../../lib/utils.js";
import { UserAvatar } from "../UserAvatar.jsx";

export function UserManagementModal({users,onSave,onClose}){
  const [list,setList]=useState(users.map(u=>({...u})));
  const [newUser,setNewUser]=useState({name:"",username:"",password:"",role:"RV",color:"#a855f7"});
  const [adding,setAdding]=useState(false);
  const update=(id,patch)=>setList(l=>l.map(u=>u.id===id?{...u,...patch}:u));
  const addUser=()=>{
    if(!newUser.name||!newUser.username||!newUser.password)return;
    setList(l=>[...l,{id:uid(),...newUser,active:true}]);
    setNewUser({name:"",username:"",password:"",role:"RV",color:"#a855f7"});
    setAdding(false);
  };
  const colorOpts=["#00d4ff","#a855f7","#22c55e","#f97316","#ffb020","#ff4444","#e2e8f0"];
  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">USER MANAGEMENT</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {list.map(u=>(
          <div key={u.id} className="user-mgmt-row">
            <UserAvatar user={u}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600}}>{u.name}</div>
              <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted)"}}>@{u.username} · {ROLES[u.role]}</div>
            </div>
            <select value={u.role} onChange={e=>update(u.id,{role:e.target.value})} style={{width:130}}>
              <option value="PM">Project Manager</option>
              <option value="RV">Reviewer</option>
            </select>
            <button className={`btn btn-sm ${u.active?"btn-danger":"btn-ghost"}`}
              onClick={()=>update(u.id,{active:!u.active})}>
              {u.active?"Disable":"Enable"}
            </button>
          </div>
        ))}

        {adding?(
          <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:10,padding:"14px",background:"var(--surface2)",borderRadius:6,border:"1px solid var(--border)"}}>
            <div className="card-title" style={{marginBottom:0}}>NEW USER</div>
            <div className="grid2" style={{gap:10}}>
              <div className="form-group"><label className="label">Full Name</label><input value={newUser.name} onChange={e=>setNewUser(p=>({...p,name:e.target.value}))}/></div>
              <div className="form-group"><label className="label">Username</label><input value={newUser.username} onChange={e=>setNewUser(p=>({...p,username:e.target.value}))}/></div>
            </div>
            <div className="grid2" style={{gap:10}}>
              <div className="form-group"><label className="label">Password</label><input value={newUser.password} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))}/></div>
              <div className="form-group"><label className="label">Role</label>
                <select value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}>
                  <option value="PM">Project Manager</option><option value="RV">Reviewer</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label className="label">Avatar Color</label>
              <div className="color-swatches">{colorOpts.map(c=><div key={c} className={`color-swatch${newUser.color===c?" selected":""}`} style={{background:c}} onClick={()=>setNewUser(p=>({...p,color:c}))}/>)}</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-primary btn-sm" onClick={addUser}>Add User</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setAdding(false)}>Cancel</button>
            </div>
          </div>
        ):(
          <button className="btn btn-ghost btn-sm" style={{marginTop:16}} onClick={()=>setAdding(true)}>+ Add User</button>
        )}

        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:24}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={()=>onSave(list)}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}
