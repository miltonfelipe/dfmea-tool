import { useState, useEffect, useRef } from "react";
import { ROLES, ROLE_COLORS } from "../lib/constants.js";
import { uid, fmtDate } from "../lib/utils.js";
import { api } from "../lib/api.js";
import { Toast } from "../components/Toast.jsx";
import { UserAvatar } from "../components/UserAvatar.jsx";
import { ThemeToggle } from "../components/ThemeToggle.jsx";
import { NewProjectModal } from "../components/modals/NewProjectModal.jsx";

export function ProjectManager({onOpen,currentUser,onLogout,onManageUsers,theme,onToggleTheme}){
  const [projects,setProjects]=useState(null);
  const [loadError,setLoadError]=useState("");
  const [newModal,setNewModal]=useState(false);
  const [delId,setDelId]=useState(null);
  const [drag,setDrag]=useState(false);
  const [toast,setToast]=useState(null);
  const fileRef=useRef();
  const showToast=(msg,type="ok")=>setToast({msg,type,k:uid()});
  const isPM=currentUser.role==="PM";

  const refresh=()=>api.listProjects().then(p=>{setProjects(p);setLoadError("");}).catch(e=>setLoadError(e.message));
  useEffect(()=>{refresh();},[]);

  const createProject=async(meta)=>{
    try{
      const proj=await api.createProject(meta);
      await refresh();
      setNewModal(false);showToast(`Project "${proj.name}" created`);
    }catch(e){showToast("Create failed: "+e.message,"err");}
  };

  const deleteProject=async(id)=>{
    try{
      await api.deleteProject(id);
      await refresh();
      setDelId(null);showToast("Project deleted","info");
    }catch(e){showToast("Delete failed: "+e.message,"err");}
  };

  const handleFileImport=async(file)=>{
    try{
      let data;
      try{data=JSON.parse(await file.text());}catch{throw new Error("File is not valid JSON");}
      const imported=await api.importProject(data);
      await refresh();
      showToast(`Imported "${imported.name}"`);
    }catch(e){showToast("Import failed: "+e.message,"err");}
  };

  const onDrop=(e)=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)handleFileImport(f);};

  if(projects===null)return(
    <div className="pm-screen" style={{alignItems:"center",justifyContent:"center",gap:12}}>
      <span style={{fontFamily:"var(--mono)",color:loadError?"var(--danger)":"var(--muted)"}}>{loadError?`Could not load projects: ${loadError}`:"Loading…"}</span>
      {loadError&&<button className="btn btn-ghost btn-sm" onClick={refresh}>Retry</button>}
    </div>
  );

  return(
    <div className="pm-screen">
      <div className="pm-hero">
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",flexWrap:"wrap",gap:16}}>
          <div>
            <div className="pm-title">DFMEA · TOOL</div>
            <div className="pm-sub">Electronics / Industrial Machinery</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            <UserAvatar user={currentUser} size={32}/>
            <div>
              <div style={{fontSize:13,fontWeight:600}}>{currentUser.name}</div>
              <div style={{fontFamily:"var(--mono)",fontSize:10,color:ROLE_COLORS[currentUser.role]}}>{ROLES[currentUser.role]}</div>
            </div>
            {isPM&&<button className="btn btn-ghost btn-sm" onClick={onManageUsers}>👥 Users</button>}
            {isPM&&<button className="btn btn-ghost btn-sm" onClick={()=>fileRef.current.click()}>⬆ Import</button>}
            {isPM&&<button className="btn btn-primary btn-sm" onClick={()=>setNewModal(true)}>+ New Project</button>}
            <ThemeToggle theme={theme} onToggle={onToggleTheme}/>
            <button className="btn btn-danger btn-sm" onClick={onLogout}>Sign Out</button>
          </div>
        </div>
        <input ref={fileRef} type="file" accept=".dfmea,.json" style={{display:"none"}}
          onChange={e=>{if(e.target.files[0])handleFileImport(e.target.files[0]);e.target.value="";}}/>
      </div>

      <div className="pm-body">
        {isPM&&(
          <div className={`import-zone${drag?" drag":""}`} style={{marginBottom:24}}
            onDragOver={e=>{e.preventDefault();setDrag(true)}} onDragLeave={()=>setDrag(false)}
            onDrop={onDrop} onClick={()=>fileRef.current.click()}>
            <div style={{fontSize:28}}>📂</div>
            <p>Drop a <strong style={{color:"var(--text)"}}>exported .dfmea file</strong> here to import — or click to browse</p>
          </div>
        )}

        {!isPM&&projects.length===0&&(
          <div style={{textAlign:"center",color:"var(--muted)",padding:"48px 0",fontFamily:"var(--mono)"}}>No projects available yet. Ask your Project Manager to create one.</div>
        )}

        {projects.length>0&&(
          <div className="pm-grid">
            {projects.map(p=>{
              const {criticalCount:crit,openCount:open,commentCount:totalComments,openCommentCount:openComments}=p;
              return(
                <div key={p.id} className="proj-card" onClick={()=>onOpen(p.id)}>
                  {isPM&&<div className="proj-card-actions" onClick={ev=>ev.stopPropagation()}>
                    <button className="btn btn-danger btn-sm" onClick={()=>setDelId(p.id)}>✕</button>
                  </div>}
                  <div className="proj-card-name">{p.name}</div>
                  <div className="proj-card-meta">
                    {p.product&&<span>{p.product} · </span>}{p.revision&&<span>Rev {p.revision} · </span>}
                    Updated {fmtDate(p.updatedAt)}
                  </div>
                  {p.description&&<div style={{fontSize:12,color:"var(--muted)",marginBottom:10}}>{p.description}</div>}
                  <div className="proj-card-stats">
                    <div className="proj-stat"><span>{p.entryCount}</span> modes</div>
                    {crit>0&&<div className="proj-stat"><span style={{color:"var(--danger)"}}>{crit}</span> crit</div>}
                    <div className="proj-stat"><span style={{color:open>0?"var(--warn)":"var(--ok)"}}>{open}</span> open</div>
                    {openComments>0&&<div className="proj-stat"><span style={{color:"var(--warn)"}}>💬 {openComments}</span> comments</div>}
                    {openComments===0&&totalComments>0&&<div className="proj-stat"><span style={{color:"#a855f7"}}>💬 {totalComments}</span> resolved</div>}
                  </div>
                </div>
              );
            })}
            {isPM&&<div className="new-proj-card" onClick={()=>setNewModal(true)}>
              <div style={{fontSize:32}}>＋</div>
              <span style={{fontFamily:"var(--mono)",fontSize:11}}>NEW PROJECT</span>
            </div>}
          </div>
        )}
      </div>

      {newModal&&<NewProjectModal onCreate={createProject} onClose={()=>setNewModal(false)}/>}
      {delId&&(
        <div className="modal-overlay" onClick={()=>setDelId(null)}>
          <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">DELETE PROJECT</span>
              <button className="btn btn-ghost btn-sm" onClick={()=>setDelId(null)}>✕</button></div>
            <p style={{color:"var(--muted)",marginBottom:8}}>Delete <strong style={{color:"var(--text)"}}>{projects.find(p=>p.id===delId)?.name}</strong>?</p>
            <p style={{color:"var(--muted)",fontSize:12,marginBottom:24}}>Export first to keep a backup.</p>
            <div style={{display:"flex",justifyContent:"flex-end",gap:8}}>
              <button className="btn btn-ghost" onClick={()=>setDelId(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={()=>deleteProject(delId)}>Delete</button>
            </div>
          </div>
        </div>
      )}
      {toast&&<Toast key={toast.k} msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
    </div>
  );
}
