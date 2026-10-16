import { useState, useMemo } from "react";
import { SUBSYSTEMS } from "../../lib/constants.js";
import { RPNChip } from "../../components/RPNChip.jsx";
import { CommentBubble } from "../../components/CommentBubble.jsx";

export function Worksheet({entries,onAdd,onEdit,onDelete,onReview,currentUser,diagramSubsystems}){
  const isPM=currentUser.role==="PM";
  const allSubs=[...new Set([...SUBSYSTEMS,...diagramSubsystems])];
  const [search,setSearch]=useState("");
  const [fSub,setFSub]=useState("All");
  const [fRisk,setFRisk]=useState("All");
  const [fStat,setFStat]=useState("All");
  const [fReview,setFReview]=useState("All"); // All | HasOpen | HasComment
  const [sort,setSort]=useState({col:"rpn",dir:-1});

  const filtered=useMemo(()=>{
    let r=[...entries];
    if(search)r=r.filter(e=>JSON.stringify(e).toLowerCase().includes(search.toLowerCase()));
    if(fSub!=="All")r=r.filter(e=>e.subsystem===fSub);
    if(fStat!=="All")r=r.filter(e=>e.status===fStat);
    if(fRisk!=="All"){if(fRisk==="Critical")r=r.filter(e=>e.rpn>200);else if(fRisk==="High")r=r.filter(e=>e.rpn>100&&e.rpn<=200);else if(fRisk==="Med")r=r.filter(e=>e.rpn>50&&e.rpn<=100);else r=r.filter(e=>e.rpn<=50);}
    if(fReview==="HasOpen")r=r.filter(e=>(e.comments||[]).some(c=>c.status==="open"));
    if(fReview==="HasComment")r=r.filter(e=>(e.comments||[]).length>0);
    r.sort((a,b)=>{const av=a[sort.col],bv=b[sort.col];return typeof av==="string"?av.localeCompare(bv)*sort.dir:(av-bv)*sort.dir;});
    return r;
  },[entries,search,fSub,fRisk,fStat,fReview,sort]);

  const cs=col=>setSort(s=>({col,dir:s.col===col?-s.dir:-1}));
  const sortHeader=(col,label)=><span style={{cursor:"pointer"}} onClick={()=>cs(col)}>{label}{sort.col===col?(sort.dir>0?" ↑":" ↓"):""}</span>;

  return(
    <div>
      <div className="filter-bar">
        <input placeholder="🔍 Search…" value={search} onChange={e=>setSearch(e.target.value)}/>
        <select value={fSub} onChange={e=>setFSub(e.target.value)}><option value="All">All Subsystems</option>{allSubs.map(s=><option key={s}>{s}</option>)}</select>
        <select value={fRisk} onChange={e=>setFRisk(e.target.value)}><option value="All">All Risk</option><option value="Critical">Critical</option><option value="High">High</option><option value="Med">Med</option><option value="Low">Low</option></select>
        <select value={fStat} onChange={e=>setFStat(e.target.value)}><option value="All">All Status</option><option>Open</option><option>Review</option><option>Closed</option></select>
        <select value={fReview} onChange={e=>setFReview(e.target.value)}><option value="All">All Comments</option><option value="HasOpen">Has Open</option><option value="HasComment">Has Any</option></select>
        <span style={{marginLeft:"auto",fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)"}}>{filtered.length}/{entries.length}</span>
        {isPM&&<button className="btn btn-primary btn-sm" onClick={onAdd}>+ Add</button>}
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr>
            <th>{sortHeader("subsystem","Subsystem")}</th>
            <th>{sortHeader("component","Component")}</th>
            <th>Failure Mode</th><th>Effect</th>
            <th>{sortHeader("severity","S")}</th>
            <th>{sortHeader("occurrence","O")}</th>
            <th>{sortHeader("detection","D")}</th>
            <th>{sortHeader("rpn","RPN")}</th>
            <th>Action</th><th>Owner</th>
            <th>{sortHeader("dueDate","Due")}</th>
            <th>{sortHeader("revisedRPN","Rev.RPN")}</th>
            <th>{sortHeader("status","Status")}</th>
            <th>Ver</th>
            <th>Review</th>
            <th>⚙</th>
          </tr></thead>
          <tbody>
            {filtered.map(e=>{
              const od=e.dueDate&&new Date(e.dueDate)<new Date()&&e.status!=="Closed";
              const openC=(e.comments||[]).filter(c=>c.status==="open").length;
              const rowCls=openC>0?"has-open-comment":(e.comments||[]).length>0?"has-comment":"";
              return(
                <tr key={e.id} className={rowCls}>
                  <td style={{fontSize:11,color:"var(--muted)"}}>{e.subsystem}</td>
                  <td style={{fontWeight:500}}>{e.component}</td>
                  <td className="desc-cell" title={e.failureMode}>{e.failureMode}</td>
                  <td className="desc-cell" title={e.failureEffect}>{e.failureEffect}</td>
                  <td style={{textAlign:"center",fontFamily:"var(--mono)",color:e.severity>=8?"var(--danger)":e.severity>=5?"var(--warn)":"var(--ok)"}}>{e.severity}</td>
                  <td style={{textAlign:"center",fontFamily:"var(--mono)"}}>{e.occurrence}</td>
                  <td style={{textAlign:"center",fontFamily:"var(--mono)"}}>{e.detection}</td>
                  <td><RPNChip value={e.rpn}/></td>
                  <td className="desc-cell" title={e.action}>{e.action}</td>
                  <td style={{fontSize:11}}>{e.responsible}</td>
                  <td style={{fontFamily:"var(--mono)",fontSize:11,color:od?"var(--danger)":"var(--muted)"}}>{od?"⚠ ":""}{e.dueDate}</td>
                  <td><RPNChip value={e.revisedRPN}/></td>
                  <td><span className={`chip chip-${e.status.toLowerCase()}`}>{e.status}</span></td>
                  <td style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted)",textAlign:"center"}}>v{e.version||1}</td>
                  <td><CommentBubble comments={e.comments} onClick={()=>onReview(e)}/></td>
                  <td><div style={{display:"flex",gap:4}}>
                    <button className="btn btn-ghost btn-sm" onClick={()=>onEdit(e)} title={isPM?"Edit":"View"}>
                      {isPM?"✎":"👁"}
                    </button>
                    {isPM&&<button className="btn btn-danger btn-sm" onClick={()=>onDelete(e.id)}>✕</button>}
                  </div></td>
                </tr>
              );
            })}
            {filtered.length===0&&<tr><td colSpan={16} style={{textAlign:"center",color:"var(--muted)",padding:"40px 0",fontFamily:"var(--mono)"}}>No entries match</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
