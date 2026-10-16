import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { ROLES } from "../lib/constants.js";
import { uid, safeName } from "../lib/utils.js";
import { api } from "../lib/api.js";
import { EMPTY_DIAGRAM } from "../data/defaults.js";
import { Toast } from "../components/Toast.jsx";
import { UserAvatar } from "../components/UserAvatar.jsx";
import { ThemeToggle } from "../components/ThemeToggle.jsx";
import { ReviewModal } from "../components/modals/ReviewModal.jsx";
import { EntryModal } from "../components/modals/EntryModal.jsx";
import { ProjectSettingsModal } from "../components/modals/ProjectSettingsModal.jsx";
import { BlockDiagram } from "./project/BlockDiagram.jsx";
import { Dashboard } from "./project/Dashboard.jsx";
import { Worksheet } from "./project/Worksheet.jsx";
import { Actions } from "./project/Actions.jsx";
import { Reference } from "./project/Reference.jsx";

const DIAGRAM_SAVE_DELAY=600; // ms; dragging a block fires many changes

export function ProjectView({projectId,currentUser,users,onBack,theme,onToggleTheme}){
  const [project,setProject] = useState(null);
  const [loadError,setLoadError] = useState("");
  const [tab,setTab]       = useState("diagram");
  const [modal,setModal]   = useState(null);
  const [editEntry,setEditEntry]   = useState(null);
  const [reviewEntry,setReviewEntry] = useState(null);
  const [settingsOpen,setSettingsOpen] = useState(false);
  const [toast,setToast]   = useState(null);
  const showToast=(msg,type="ok")=>setToast({msg,type,k:uid()});
  const fail=(what,e)=>showToast(`${what} failed: ${e.message}`,"err");
  const isPM=currentUser.role==="PM";

  const load=useCallback(()=>api.getProject(projectId).then(p=>{setProject(p);setLoadError("");}).catch(e=>setLoadError(e.message)),[projectId]);
  useEffect(()=>{load();},[load]);

  const entries=project?.entries||[];
  const diagram=project?.diagram||EMPTY_DIAGRAM;
  const diagramSubsystems=useMemo(()=>[...new Set((diagram.nodes||[]).filter(n=>n.type==="subsystem").map(n=>n.label))],[diagram]);

  const replaceEntry=entry=>setProject(p=>({...p,entries:p.entries.map(e=>e.id===entry.id?entry:e)}));

  // The server records history and bumps the version; it rejects stale
  // versions with 409, in which case we reload to show the other edit.
  const saveEntry=async(entry)=>{
    const exists=entries.some(e=>e.id===entry.id);
    try{
      if(exists){
        const saved=await api.updateEntry(entry.id,entry);
        replaceEntry(saved);
        showToast(`Entry updated (v${saved.version})`);
      }else{
        const saved=await api.createEntry(projectId,entry);
        setProject(p=>({...p,entries:[...p.entries,saved]}));
        showToast("Entry added");
      }
      setModal(null);setEditEntry(null);
    }catch(e){
      if(e.status===409){
        setModal(null);setEditEntry(null);await load();
        showToast("Someone else changed this entry; reloaded the latest version","err");
      }else fail("Save",e);
    }
  };

  const deleteEntry=async(id)=>{
    try{
      await api.deleteEntry(id);
      setProject(p=>({...p,entries:p.entries.filter(e=>e.id!==id)}));
      showToast("Entry deleted","info");
    }catch(e){fail("Delete",e);}
  };

  const saveSettings=async(meta)=>{
    try{
      setProject(await api.updateProject(projectId,meta));
      setSettingsOpen(false);showToast("Settings saved");
    }catch(e){fail("Save settings",e);}
  };

  // Debounced: BlockDiagram reports every drag step and keystroke.
  const pendingDiagram=useRef(null);
  const diagramTimer=useRef(null);
  const flushDiagram=useCallback(()=>{
    clearTimeout(diagramTimer.current);
    const d=pendingDiagram.current;
    if(!d)return;
    pendingDiagram.current=null;
    api.saveDiagram(projectId,d).catch(e=>showToast(`Diagram save failed: ${e.message}`,"err"));
  },[projectId]);
  const saveDiagram=useCallback(d=>{
    setProject(p=>({...p,diagram:d})); // keeps worksheet subsystem options current
    pendingDiagram.current=d;
    clearTimeout(diagramTimer.current);
    diagramTimer.current=setTimeout(flushDiagram,DIAGRAM_SAVE_DELAY);
  },[flushDiagram]);
  useEffect(()=>flushDiagram,[flushDiagram]); // save pending changes when leaving

  const addComment=async(entryId,text)=>{
    try{
      const comment=await api.addComment(entryId,text);
      setProject(p=>({...p,entries:p.entries.map(e=>e.id===entryId?{...e,comments:[...e.comments,comment]}:e)}));
      showToast("Comment added","info");
    }catch(e){fail("Comment",e);}
  };

  const resolveComment=async(entryId,commentId)=>{
    try{
      const resolved=await api.resolveComment(commentId);
      setProject(p=>({...p,entries:p.entries.map(e=>e.id===entryId?{...e,comments:e.comments.map(c=>c.id===commentId?resolved:c)}:e)}));
      showToast("Comment resolved","ok");
    }catch(e){fail("Resolve",e);}
  };

  const download=(blob,ext)=>{
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    a.download=`${safeName(project.name)}_${safeName(project.revision||"A")}.${ext}`;a.click();
    URL.revokeObjectURL(a.href);
  };
  const exportDFMEA=async()=>{
    try{
      flushDiagram();
      const payload=await api.exportProject(projectId);
      download(new Blob([JSON.stringify(payload,null,2)],{type:"application/json"}),"dfmea");
      showToast("Exported .dfmea");
    }catch(e){fail("Export",e);}
  };
  const exportCSV=()=>{
    const cols=["subsystem","component","function","failureMode","failureEffect","failureCause","category","severity","occurrence","detection","rpn","controls","action","responsible","dueDate","status","revisedS","revisedO","revisedD","revisedRPN","version"];
    download(new Blob([[cols.join(","),...entries.map(e=>cols.map(c=>`"${(e[c]||"").toString().replace(/"/g,'""')}"`).join(","))].join("\n")],{type:"text/csv"}),"csv");
    showToast("Exported CSV");
  };

  if(!project)return(
    <div className="pm-screen" style={{alignItems:"center",justifyContent:"center",gap:12}}>
      <span style={{fontFamily:"var(--mono)",color:loadError?"var(--danger)":"var(--muted)"}}>{loadError?`Could not load project: ${loadError}`:"Loading…"}</span>
      {loadError&&<div style={{display:"flex",gap:8}}>
        <button className="btn btn-ghost btn-sm" onClick={load}>Retry</button>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>◀ Back</button>
      </div>}
    </div>
  );

  const openComments=entries.reduce((a,e)=>a+(e.comments||[]).filter(c=>c.status==="open").length,0);

  const TABS=[
    {id:"diagram",  label:"Block Diagram"},
    {id:"dashboard",label:"Dashboard"},
    {id:"worksheet",label:"DFMEA Worksheet"},
    {id:"actions",  label:"Action Tracker"},
    {id:"reference",label:"Reference"},
  ];

  return(
    <>
      
      <div className="app">
        <div className="topbar">
          <span className="logo">DFMEA<span>·TOOL</span></span>
          <span className={`badge-role badge-${currentUser.role.toLowerCase()}`}>{ROLES[currentUser.role]}</span>
          <div className="proj-crumb" onClick={()=>{flushDiagram();onBack();}}>
            ◀ <span style={{maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{project.name}</span>
            {project.revision&&<span style={{color:"var(--accent)"}}>Rev {project.revision}</span>}
          </div>
          {openComments>0&&<span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--warn)"}}>💬 {openComments} open</span>}
          <div className="topbar-right">
            {isPM&&<button className="btn btn-ghost btn-sm" onClick={()=>setSettingsOpen(true)}>⚙ Settings</button>}
            {isPM&&<button className="btn btn-ghost btn-sm" onClick={exportCSV}>⬇ CSV</button>}
            {isPM&&<button className="btn btn-ok btn-sm" onClick={exportDFMEA}>⬇ Export .dfmea</button>}
            {isPM&&<button className="btn btn-primary btn-sm" onClick={()=>{setEditEntry(null);setModal("add");}}>+ Failure Mode</button>}
            <ThemeToggle theme={theme} onToggle={onToggleTheme}/>
            <UserAvatar user={currentUser} size={28}/>
          </div>
        </div>

        <div className="tabs">
          {TABS.map(t=>(
            <button key={t.id} className={`tab${tab===t.id?" active":""}`} onClick={()=>setTab(t.id)}>{t.label}</button>
          ))}
        </div>

        {tab==="diagram"?(
          <div className="content-fill">
            <BlockDiagram diagram={diagram} onChange={saveDiagram} entries={entries} readOnly={!isPM}/>
          </div>
        ):(
          <div className="content">
            {tab==="dashboard"&&<Dashboard entries={entries}/>}
            {tab==="worksheet"&&<Worksheet
              entries={entries}
              onAdd={()=>{setEditEntry(null);setModal("add");}}
              onEdit={e=>{setEditEntry(e);setModal("edit");}}
              onDelete={deleteEntry}
              onReview={e=>setReviewEntry(e)}
              currentUser={currentUser}
              diagramSubsystems={diagramSubsystems}/>}
            {tab==="actions"&&<Actions entries={entries} onReview={e=>setReviewEntry(e)}/>}
            {tab==="reference"&&<Reference/>}
          </div>
        )}

        {/* entry edit/view modal */}
        {(modal==="add"||modal==="edit")&&(
          <EntryModal
            entry={modal==="edit"?editEntry:null}
            onSave={saveEntry}
            onClose={()=>{setModal(null);setEditEntry(null);}}
            subsystemOptions={diagramSubsystems}
            currentUser={currentUser}
            readOnly={!isPM}/>
        )}

        {/* review comments + version history modal */}
        {reviewEntry&&(
          <ReviewModal
            entry={entries.find(e=>e.id===reviewEntry.id)||reviewEntry}
            currentUser={currentUser}
            users={users}
            onAddComment={addComment}
            onResolveComment={resolveComment}
            onClose={()=>setReviewEntry(null)}/>
        )}

        {isPM&&settingsOpen&&<ProjectSettingsModal project={project} onSave={saveSettings} onClose={()=>setSettingsOpen(false)}/>}
        {toast&&<Toast key={toast.k} msg={toast.msg} type={toast.type} onDone={()=>setToast(null)}/>}
      </div>
    </>
  );
}
