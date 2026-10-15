import { useState, useMemo, useCallback } from "react";
import { FILE_FORMAT, ROLES } from "../lib/constants.js";
import { uid, now, safeName } from "../lib/utils.js";
import { saveDB } from "../lib/storage.js";
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

export function ProjectView({projectId,initialDb,currentUser,users,onBack,theme,onToggleTheme}){
  const [db,setDb]         = useState(initialDb);
  const [tab,setTab]       = useState("diagram");
  const [modal,setModal]   = useState(null);
  const [editEntry,setEditEntry]   = useState(null);
  const [reviewEntry,setReviewEntry] = useState(null);
  const [settingsOpen,setSettingsOpen] = useState(false);
  const [toast,setToast]   = useState(null);
  const showToast=(msg,type="ok")=>setToast({msg,type,k:uid()});
  const isPM=currentUser.role==="PM";

  const project=db[projectId];
  const entries=project?.entries||[];
  const diagram=project?.diagram||EMPTY_DIAGRAM;
  const diagramSubsystems=useMemo(()=>[...new Set((diagram.nodes||[]).filter(n=>n.type==="subsystem").map(n=>n.label))],[diagram]);

  const persist=async(updatedProject)=>{
    const next={...db,[projectId]:{...updatedProject,updatedAt:now()}};
    setDb(next);await saveDB(next);
  };

  // build diff between old and new entry for versioning
  const buildDiff=(oldE,newE)=>{
    const TRACKED=["subsystem","component","function","failureMode","failureEffect","failureCause","category","severity","occurrence","detection","rpn","controls","action","responsible","dueDate","status","revisedS","revisedO","revisedD","revisedRPN"];
    const diff={};
    TRACKED.forEach(k=>{if(String(oldE[k]||"")!==String(newE[k]||""))diff[k]={old:oldE[k],new:newE[k]};});
    return diff;
  };

  const saveEntry=async(entry)=>{
    const idx=entries.findIndex(e=>e.id===entry.id);
    let savedEntry;
    if(idx>=0){
      const old=entries[idx];
      const diff=buildDiff(old,entry);
      const hasChanges=Object.keys(diff).length>0;
      const histEntry={version:old.version||1,editedBy:currentUser.id,editedAt:now(),diff};
      savedEntry={...entry,
        version:hasChanges?(old.version||1)+1:(old.version||1),
        history:hasChanges?[...(old.history||[]),histEntry]:(old.history||[]),
        comments:old.comments||[],
        updatedAt:now(),
      };
    } else {
      savedEntry={...entry,version:1,history:[],comments:[],createdAt:now(),createdBy:currentUser.id,updatedAt:now()};
    }
    const next=idx>=0?entries.map((e,i)=>i===idx?savedEntry:e):[...entries,savedEntry];
    await persist({...project,entries:next});
    setModal(null);setEditEntry(null);
    showToast(idx>=0?`Entry updated (v${savedEntry.version})`:"Entry added");
  };

  const deleteEntry=async(id)=>{
    await persist({...project,entries:entries.filter(e=>e.id!==id)});
    showToast("Entry deleted","info");
  };

  const saveSettings=async(meta)=>{
    await persist({...project,...meta});setSettingsOpen(false);showToast("Settings saved");
  };

  const saveDiagram=useCallback(async(d)=>{
    const next={...db,[projectId]:{...project,diagram:d,updatedAt:now()}};
    setDb(next);await saveDB(next);
  },[db,projectId,project]);

  // add comment to entry
  const addComment=async(entryId,comment)=>{
    const next=entries.map(e=>e.id===entryId?{...e,comments:[...(e.comments||[]),comment]}:e);
    await persist({...project,entries:next});
    // update reviewEntry state so modal refreshes
    const updated=next.find(e=>e.id===entryId);
    setReviewEntry(updated);
    showToast("Comment added","info");
  };

  // resolve comment
  const resolveComment=async(entryId,commentId)=>{
    const next=entries.map(e=>e.id===entryId?{...e,comments:(e.comments||[]).map(c=>c.id===commentId?{...c,status:"resolved",resolvedBy:currentUser.id,resolvedAt:now()}:c)}:e);
    await persist({...project,entries:next});
    const updated=next.find(e=>e.id===entryId);
    setReviewEntry(updated);
    showToast("Comment resolved","ok");
  };

  const exportDFMEA=()=>{
    const payload={__format:FILE_FORMAT,exportedAt:now(),project:{...project}};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    a.download=`${safeName(project.name)}_${safeName(project.revision||"A")}.dfmea`;a.click();
    showToast("Exported .dfmea");
  };
  const exportCSV=()=>{
    const cols=["subsystem","component","function","failureMode","failureEffect","failureCause","category","severity","occurrence","detection","rpn","controls","action","responsible","dueDate","status","revisedS","revisedO","revisedD","revisedRPN","version"];
    const blob=new Blob([[cols.join(","),...entries.map(e=>cols.map(c=>`"${(e[c]||"").toString().replace(/"/g,'""')}"`).join(","))].join("\n")],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);
    a.download=`${safeName(project.name)}_${safeName(project.revision||"A")}.csv`;a.click();
    showToast("Exported CSV");
  };

  if(!project)return null;

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
          <div className="proj-crumb" onClick={onBack}>
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
