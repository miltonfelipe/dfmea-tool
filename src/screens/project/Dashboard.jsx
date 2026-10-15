import { MATRIX_COLOR } from "../../lib/utils.js";
import { RPNChip } from "../../components/RPNChip.jsx";

export function Dashboard({entries}){
  const total=entries.length,crit=entries.filter(e=>e.rpn>200).length,open=entries.filter(e=>e.status==="Open").length;
  const avgRPN=total?Math.round(entries.reduce((a,e)=>a+e.rpn,0)/total):0;
  const avgRev=total?Math.round(entries.reduce((a,e)=>a+e.revisedRPN,0)/total):0;
  const openComments=entries.reduce((a,e)=>a+(e.comments||[]).filter(c=>c.status==="open").length,0);
  const byS={};entries.forEach(e=>{if(!byS[e.subsystem])byS[e.subsystem]={count:0,maxRPN:0};byS[e.subsystem].count++;byS[e.subsystem].maxRPN=Math.max(byS[e.subsystem].maxRPN,e.rpn);});
  const subList=Object.entries(byS).sort((a,b)=>b[1].maxRPN-a[1].maxRPN);
  const mat=Array.from({length:5},()=>Array(5).fill(0));
  entries.forEach(e=>{mat[4-Math.min(4,Math.floor((e.severity-1)/2))][Math.min(4,Math.floor((e.occurrence-1)/2))]++;});
  if(total===0)return<div style={{textAlign:"center",color:"var(--muted)",padding:"80px 0",fontFamily:"var(--mono)"}}>No failure modes yet.</div>;
  return(
    <div>
      <div className="grid4" style={{marginBottom:20}}>
        <div className="stat"><div className="stat-val">{total}</div><div className="stat-label">Failure Modes</div></div>
        <div className="stat"><div className="stat-val" style={{color:"var(--danger)"}}>{crit}</div><div className="stat-label">Critical &gt;200</div></div>
        <div className="stat"><div className="stat-val" style={{color:"var(--ok)"}}>{open}</div><div className="stat-label">Open Actions</div></div>
        <div className="stat"><div className="stat-val" style={{color:"var(--warn)"}}>{openComments}</div><div className="stat-label">Open Comments</div></div>
      </div>
      <div className="grid2" style={{marginBottom:20}}>
        <div className="card">
          <div className="card-title">RPN REDUCTION</div>
          <div style={{display:"flex",gap:24,marginBottom:20}}>
            <div><div style={{fontFamily:"var(--mono)",fontSize:26,fontWeight:700,color:"var(--warn)"}}>{avgRPN}</div><div style={{fontSize:11,color:"var(--muted)"}}>Avg Current</div></div>
            <div style={{display:"flex",alignItems:"center",color:"var(--muted)",fontSize:20}}>→</div>
            <div><div style={{fontFamily:"var(--mono)",fontSize:26,fontWeight:700,color:"var(--ok)"}}>{avgRev}</div><div style={{fontSize:11,color:"var(--muted)"}}>Avg Revised</div></div>
            {avgRPN>0&&<div style={{alignSelf:"center",fontFamily:"var(--mono)",fontSize:13,color:"var(--ok)",fontWeight:700}}>▼ {Math.round((1-avgRev/avgRPN)*100)}%</div>}
          </div>
          {[...entries].sort((a,b)=>b.rpn-a.rpn).slice(0,5).map(e=>(
            <div key={e.id} style={{marginBottom:10}}>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:3}}>
                <span style={{color:"var(--muted)"}}>{e.component} · {e.failureMode.slice(0,28)}{e.failureMode.length>28?"…":""}</span>
                <RPNChip value={e.rpn}/>
              </div>
              <div className="progress-wrap"><div className="progress-bar" style={{width:`${(e.rpn/1000)*100}%`,background:e.rpn>200?"var(--danger)":e.rpn>100?"var(--warn)":"var(--ok)"}}/></div>
            </div>
          ))}
        </div>
        <div className="card">
          <div className="card-title">RISK MATRIX</div>
          <div style={{display:"flex",gap:8}}>
            <div style={{display:"flex",flexDirection:"column",justifyContent:"space-around",paddingBottom:28}}>
              {["9-10","7-8","5-6","3-4","1-2"].map(l=><div key={l} style={{fontSize:10,color:"var(--muted)",fontFamily:"var(--mono)",width:28,textAlign:"right"}}>{l}</div>)}
            </div>
            <div>
              {mat.map((row,ri)=>(
                <div key={ri} style={{display:"flex",gap:3,marginBottom:3}}>
                  {row.map((v,ci)=>{const s=(4-ri)*2+1.5,o=ci*2+1.5,bg=MATRIX_COLOR(s,o);return<div key={ci} className="matrix-cell" style={{background:v>0?bg+"44":"var(--surface2)",border:`1px solid ${v>0?bg+"88":"var(--border)"}`,color:v>0?bg:"var(--border)"}}>{v||"·"}</div>;})}
                </div>
              ))}
              <div style={{display:"flex",gap:3,marginTop:4}}>{["1-2","3-4","5-6","7-8","9-10"].map(l=><div key={l} style={{width:36,fontSize:10,color:"var(--muted)",fontFamily:"var(--mono)",textAlign:"center"}}>{l}</div>)}</div>
              <div style={{fontSize:10,color:"var(--muted)",textAlign:"center",marginTop:2}}>← Occurrence →</div>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="card-title">SUBSYSTEM BREAKDOWN</div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {subList.map(([sub,d])=>(
            <div key={sub} style={{display:"flex",alignItems:"center",gap:16}}>
              <div style={{width:140,fontSize:12}}>{sub}</div>
              <div style={{flex:1}}><div className="progress-wrap"><div className="progress-bar" style={{width:`${(d.maxRPN/1000)*100}%`,background:d.maxRPN>200?"var(--danger)":d.maxRPN>100?"var(--warn)":"var(--ok)"}}/></div></div>
              <div style={{display:"flex",gap:8,alignItems:"center",flexShrink:0}}>
                <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)"}}>{d.count}</span>
                <RPNChip value={d.maxRPN}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
