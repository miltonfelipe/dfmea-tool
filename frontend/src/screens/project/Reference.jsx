import { SEV_LABELS, OCC_LABELS, DET_LABELS } from "../../lib/constants.js";
import { RPNChip } from "../../components/RPNChip.jsx";

export function Reference(){
  return(
    <div className="grid2" style={{gap:20}}>
      <div className="card">
        <div className="card-title">SEVERITY (S)</div>
        <table><thead><tr><th>S</th><th>Effect</th></tr></thead>
          <tbody>{SEV_LABELS.slice(1).map((l,i)=>(
            <tr key={i}><td style={{fontFamily:"var(--mono)",textAlign:"center",color:i>=8?"var(--danger)":i>=5?"var(--warn)":"var(--ok)"}}>{i+1}</td><td>{l}</td></tr>
          ))}</tbody></table>
      </div>
      <div className="card">
        <div className="card-title">OCCURRENCE (O)</div>
        <table><thead><tr><th>O</th><th>Description</th><th>/1k</th></tr></thead>
          <tbody>{OCC_LABELS.slice(1).map((l,i)=>(
            <tr key={i}><td style={{fontFamily:"var(--mono)",textAlign:"center"}}>{i+1}</td><td>{l}</td>
              <td style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--muted)"}}>{["<.01",".1",".5","1","2","5","10","20","50",">100"][i]}</td>
            </tr>
          ))}</tbody></table>
      </div>
      <div className="card">
        <div className="card-title">DETECTION (D)</div>
        <table><thead><tr><th>D</th><th>Description</th></tr></thead>
          <tbody>{DET_LABELS.slice(1).map((l,i)=>(<tr key={i}><td style={{fontFamily:"var(--mono)",textAlign:"center"}}>{i+1}</td><td>{l}</td></tr>))}</tbody></table>
      </div>
      <div className="card">
        <div className="card-title">RPN THRESHOLDS</div>
        <div style={{display:"flex",flexDirection:"column",gap:12}}>
          {[{l:"Critical",r:">200",c:"var(--danger)",v:500,a:"Block release. Immediate corrective action."},
            {l:"High",r:"101–200",c:"var(--warn)",v:150,a:"Define action plan with owner and deadline."},
            {l:"Medium",r:"51–100",c:"#eab308",v:75,a:"Schedule improvement in next design cycle."},
            {l:"Low",r:"≤50",c:"var(--ok)",v:30,a:"Acceptable. Document and review periodically."},
          ].map(r=>(
            <div key={r.l} style={{background:"var(--surface2)",border:`1px solid ${r.c}33`,borderRadius:6,padding:"12px 16px"}}>
              <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:4}}>
                <RPNChip value={r.v}/><span style={{fontFamily:"var(--mono)",fontSize:11,color:r.c}}>{r.r}</span>
              </div>
              <div style={{fontSize:12,color:"var(--muted)"}}>{r.a}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
