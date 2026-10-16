import { RPNChip } from "../../components/RPNChip.jsx";
import { CommentBubble } from "../../components/CommentBubble.jsx";

export function Actions({entries,onReview}){
  const actionable=[...entries].filter(e=>e.action?.trim()).sort((a,b)=>b.rpn-a.rpn);
  const today=new Date();
  const overdue=actionable.filter(e=>e.dueDate&&new Date(e.dueDate)<today&&e.status!=="Closed");
  return(
    <div>
      {overdue.length>0&&<div style={{background:"#ff444411",border:"1px solid #ff444433",borderRadius:6,padding:"12px 16px",marginBottom:16,display:"flex",gap:12,alignItems:"center"}}>
        <span style={{color:"var(--danger)",fontFamily:"var(--mono)",fontSize:12,fontWeight:700}}>⚠ {overdue.length} OVERDUE</span>
        <span style={{color:"var(--muted)",fontSize:12}}>{overdue.map(e=>e.component).join(", ")}</span>
      </div>}
      <div className="table-wrap">
        <table>
          <thead><tr><th>#</th><th>Component</th><th>Failure Mode</th><th>RPN</th><th>Action</th><th>Owner</th><th>Due</th><th>Rev.RPN</th><th>Status</th><th>Review</th></tr></thead>
          <tbody>
            {actionable.map((e,i)=>{
              const od=e.dueDate&&new Date(e.dueDate)<today&&e.status!=="Closed";
              return(
                <tr key={e.id}>
                  <td style={{fontFamily:"var(--mono)",color:"var(--muted)",textAlign:"center"}}>#{i+1}</td>
                  <td style={{fontWeight:500}}>{e.component}</td>
                  <td className="desc-cell" title={e.failureMode}>{e.failureMode}</td>
                  <td><RPNChip value={e.rpn}/></td>
                  <td className="desc-cell" style={{maxWidth:250}} title={e.action}>{e.action}</td>
                  <td>{e.responsible}</td>
                  <td style={{fontFamily:"var(--mono)",fontSize:11,color:od?"var(--danger)":"var(--text)"}}>{od?"⚠ ":""}{e.dueDate}</td>
                  <td><RPNChip value={e.revisedRPN}/></td>
                  <td><span className={`chip chip-${e.status.toLowerCase()}`}>{e.status}</span></td>
                  <td><CommentBubble comments={e.comments} onClick={()=>onReview(e)}/></td>
                </tr>
              );
            })}
            {actionable.length===0&&<tr><td colSpan={10} style={{textAlign:"center",color:"var(--muted)",padding:"40px 0",fontFamily:"var(--mono)"}}>No actions yet</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
