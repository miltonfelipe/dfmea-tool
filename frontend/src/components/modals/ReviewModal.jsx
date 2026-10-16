import { useState } from "react";
import { ROLES, ROLE_COLORS } from "../../lib/constants.js";
import { rpnColor, fmtDateTime } from "../../lib/utils.js";
import { UserAvatar } from "../UserAvatar.jsx";

export function ReviewModal({entry,currentUser,users,onAddComment,onResolveComment,onClose}){
  const [tab,setTab]=useState("comments");
  const [text,setText]=useState("");
  const canResolve=currentUser.role==="PM";

  const submitComment=()=>{
    if(!text.trim())return;
    onAddComment(entry.id,text.trim());
    setText("");
  };

  const FIELD_LABELS={
    subsystem:"Subsystem",component:"Component",function:"Function",
    failureMode:"Failure Mode",failureEffect:"Failure Effect",failureCause:"Failure Cause",
    category:"Category",severity:"Severity (S)",occurrence:"Occurrence (O)",detection:"Detection (D)",
    rpn:"RPN",controls:"Controls",action:"Action",responsible:"Responsible",
    dueDate:"Due Date",status:"Status",revisedS:"Revised S",revisedO:"Revised O",
    revisedD:"Revised D",revisedRPN:"Revised RPN",
  };

  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={e=>e.stopPropagation()} style={{maxHeight:"85vh",display:"flex",flexDirection:"column"}}>
        <div className="modal-header" style={{flexShrink:0}}>
          <div>
            <span className="modal-title">REVIEW — {entry.component}</span>
            <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted)",marginTop:4}}>
              {entry.failureMode} · v{entry.version||1}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>

        {/* tabs */}
        <div style={{display:"flex",gap:2,marginBottom:16,flexShrink:0}}>
          {["comments","history"].map(t=>(
            <button key={t} className={`tab${tab===t?" active":""}`} style={{padding:"6px 14px",textTransform:"uppercase",fontSize:10}}
              onClick={()=>setTab(t)}>{t==="comments"?"💬 Comments":"🕐 Version History"}</button>
          ))}
        </div>

        <div style={{flex:1,overflow:"auto"}}>
          {tab==="comments"&&(
            <div>
              {/* comment list */}
              {(entry.comments||[]).length===0&&(
                <div style={{color:"var(--muted)",fontFamily:"var(--mono)",fontSize:12,padding:"20px 0",textAlign:"center"}}>No comments yet</div>
              )}
              {(entry.comments||[]).map(c=>{
                const author=users.find(u=>u.id===c.authorId)||{name:"Unknown",color:"#888"};
                return(
                  <div key={c.id} className="comment-entry" style={{borderLeft:`3px solid ${c.status==="open"?"var(--warn)":"var(--ok)"}`}}>
                    <div className="comment-meta">
                      <UserAvatar user={author} size={22}/>
                      <span className="comment-author">{author.name}</span>
                      <span className="badge-role" style={{background:ROLE_COLORS[author.role]+"22",color:ROLE_COLORS[author.role],border:`1px solid ${ROLE_COLORS[author.role]}44`,fontSize:9,padding:"1px 5px"}}>{ROLES[author.role]}</span>
                      <span className="comment-time">{fmtDateTime(c.createdAt)}</span>
                      {c.status==="open"
                        ?<span className="review-status-open">● OPEN</span>
                        :<span className="review-status-resolved">✓ RESOLVED</span>}
                    </div>
                    <div className="comment-text">{c.text}</div>
                    {c.status==="open"&&canResolve&&(
                      <div className="comment-actions">
                        <button className="btn btn-ok btn-sm" onClick={()=>onResolveComment(entry.id,c.id)}>✓ Resolve</button>
                      </div>
                    )}
                    {c.resolvedBy&&(
                      <div style={{fontSize:11,color:"var(--muted)",marginTop:6}}>
                        Resolved by {users.find(u=>u.id===c.resolvedBy)?.name||"?"} · {fmtDateTime(c.resolvedAt)}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* add comment */}
              <div style={{padding:"14px 0",borderTop:"1px solid var(--border)",marginTop:8}}>
                <div className="label" style={{marginBottom:8}}>Add Comment</div>
                <textarea value={text} onChange={e=>setText(e.target.value)}
                  placeholder="Write your review comment, question, or concern…"
                  style={{minHeight:80,marginBottom:8}}/>
                <div style={{display:"flex",justifyContent:"flex-end"}}>
                  <button className="btn btn-primary btn-sm" onClick={submitComment} disabled={!text.trim()}>
                    Submit Comment
                  </button>
                </div>
              </div>
            </div>
          )}

          {tab==="history"&&(
            <div>
              {/* current version */}
              <div style={{background:"var(--surface2)",borderRadius:6,padding:"12px 16px",border:"1px solid var(--border)",marginBottom:12}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--accent)",fontWeight:700}}>v{entry.version||1} — CURRENT</span>
                  <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted)"}}>{fmtDateTime(entry.updatedAt||entry.createdAt)}</span>
                </div>
                <div className="grid3" style={{gap:8}}>
                  {["subsystem","component","failureMode","severity","occurrence","detection","rpn","status","responsible"].map(k=>(
                    <div key={k} style={{fontSize:11}}>
                      <span style={{color:"var(--muted)"}}>{FIELD_LABELS[k]}: </span>
                      <span style={{fontFamily:["severity","occurrence","detection","rpn"].includes(k)?"var(--mono)":"inherit",color:k==="rpn"?rpnColor(entry[k]):"var(--text)"}}>{entry[k]||"—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* history */}
              {(entry.history||[]).length===0&&(
                <div style={{color:"var(--muted)",fontFamily:"var(--mono)",fontSize:12,padding:"20px 0",textAlign:"center"}}>No previous versions</div>
              )}
              {[...(entry.history||[])].reverse().map((h,i)=>{
                const editor=users.find(u=>u.id===h.editedBy)||{name:"Unknown",color:"#888"};
                const changedKeys=Object.keys(h.diff||{});
                return(
                  <div key={i} style={{marginBottom:12,position:"relative",paddingLeft:28}}>
                    <div style={{position:"absolute",left:8,top:6,bottom:0,width:1,background:"var(--border)"}}/>
                    <div style={{position:"absolute",left:4,top:6,width:9,height:9,borderRadius:"50%",background:"var(--surface2)",border:"2px solid var(--border2)"}}/>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                      <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted)",fontWeight:600}}>v{h.version}</span>
                      <UserAvatar user={editor} size={18}/>
                      <span style={{fontSize:11,color:"var(--muted)"}}>{editor.name}</span>
                      <span style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted)"}}>{fmtDateTime(h.editedAt)}</span>
                    </div>
                    {changedKeys.length>0&&(
                      <div style={{background:"var(--surface2)",borderRadius:4,padding:"8px 10px",border:"1px solid var(--border)"}}>
                        {changedKeys.map(k=>(
                          <div key={k} className="diff-field">
                            <span style={{color:"var(--muted)",fontSize:11}}>{FIELD_LABELS[k]||k}: </span>
                            <span className="diff-old">{String(h.diff[k].old)}</span>
                            {" → "}
                            <span className="diff-new">{String(h.diff[k].new)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
