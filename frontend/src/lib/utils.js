export const rpnClass=r=>r<=50?"rpn-low":r<=100?"rpn-med":r<=200?"rpn-high":"rpn-crit";
export const rpnColor=r=>r<=50?"#22c55e":r<=100?"#ffb020":r<=200?"#ff4444":"#ff2222";
export const MATRIX_COLOR=(s,o)=>{const v=s*o;return v<=9?"#22c55e":v<=25?"#84cc16":v<=50?"#ffb020":v<=100?"#f97316":"#ef4444";};
export const randomCoord=(base,range)=>Math.round(base+Math.random()*range);
export const uid=()=>Math.random().toString(36).slice(2,9);
export const fmtDate=d=>d?new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";
export const fmtDateTime=d=>d?new Date(d).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"—";
export const safeName=s=>s.replace(/[^a-z0-9_-]/gi,"_");
export const initials=name=>name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
