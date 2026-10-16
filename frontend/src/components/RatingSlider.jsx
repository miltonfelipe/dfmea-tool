export function RatingSlider({label,value,onChange,labels}){
  const colors=["#22c55e","#84cc16","#eab308","#f97316","#ef4444"];
  const c=colors[Math.min(4,Math.floor((value-1)/2))];
  return(
    <div className="form-group">
      <label className="label">{label} — <span style={{color:c,fontWeight:700}}>{value} · {labels[value]||""}</span></label>
      <input type="range" min={1} max={10} value={value} onChange={e=>onChange(Number(e.target.value))} style={{accentColor:c,cursor:"pointer"}}/>
      <div className="sbar">{Array.from({length:10},(_,i)=><div key={i} className={`sbar-seg${i<value?" on":""}`} style={{"--c":c}}/>)}</div>
    </div>
  );
}
