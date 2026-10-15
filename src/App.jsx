import { useState, useMemo, useEffect, useRef, useCallback, useEffectEvent } from "react";
import "./App.css";

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const SEV_LABELS=["—","Negligible","Minor","Low","Moderate","Moderate+","Significant","High","Critical","Catastrophic","Safety"];
const OCC_LABELS=["—","Extremely Unlikely","Remote","Very Low","Low","Moderate-Low","Moderate","Moderate-High","High","Very High","Almost Certain"];
const DET_LABELS=["—","Almost Certain","Very High","High","Moderate-High","Moderate","Low","Very Low","Remote","Extremely Remote","Undetectable"];
const FAILURE_CATEGORIES=["Short Circuit","Open Circuit","Overvoltage","Overcurrent","Thermal Runaway","Signal Integrity","EMI/EMC","Corrosion","Mechanical Stress","Firmware Fault","Communication Loss","Power Loss","ESD Damage","Component Drift","Other"];
const SUBSYSTEMS=["Power Supply","Motor Drive","Control Logic","I/O Interface","Communication","Sensors","Actuators","Protection Circuit","HMI","Firmware","Safety Module","Other"];
const FILE_FORMAT="DFMEA-v2";

const NODE_TYPES=[
  {type:"subsystem",label:"Subsystem",  icon:"⬜",defaultColor:"#1e3a5f",defaultBorder:"#00d4ff"},
  {type:"input",    label:"Input",       icon:"→", defaultColor:"#1a3020",defaultBorder:"#22c55e"},
  {type:"output",   label:"Output",      icon:"←", defaultColor:"#3a1f10",defaultBorder:"#f97316"},
  {type:"external", label:"External Sys",icon:"◈", defaultColor:"#2a1f3a",defaultBorder:"#a855f7"},
  {type:"power",    label:"Power Rail",  icon:"⚡", defaultColor:"#3a2f00",defaultBorder:"#ffb020"},
  {type:"note",     label:"Note",        icon:"📝",defaultColor:"#1a1a2e",defaultBorder:"#475569"},
];
const PALETTE_COLORS=["#1e3a5f","#1a3020","#3a1f10","#2a1f3a","#3a2f00","#1a1a2e","#1f2937","#2d1b1b"];
const PALETTE_BORDERS=["#00d4ff","#22c55e","#f97316","#a855f7","#ffb020","#475569","#e2e8f0","#ff4444"];

const ROLES={PM:"Project Manager",RV:"Reviewer"};
const ROLE_COLORS={PM:"#00d4ff",RV:"#a855f7"};

const rpnClass=r=>r<=50?"rpn-low":r<=100?"rpn-med":r<=200?"rpn-high":"rpn-crit";
const rpnColor=r=>r<=50?"#22c55e":r<=100?"#ffb020":r<=200?"#ff4444":"#ff2222";
const MATRIX_COLOR=(s,o)=>{const v=s*o;return v<=9?"#22c55e":v<=25?"#84cc16":v<=50?"#ffb020":v<=100?"#f97316":"#ef4444";};
const randomCoord=(base,range)=>Math.round(base+Math.random()*range);
const uid=()=>Math.random().toString(36).slice(2,9);
const now=()=>new Date().toISOString();
const fmtDate=d=>d?new Date(d).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}):"—";
const fmtDateTime=d=>d?new Date(d).toLocaleString("en-GB",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"—";
const safeName=s=>s.replace(/[^a-z0-9_-]/gi,"_");
const initials=name=>name.split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);

// ─────────────────────────────────────────────────────────────────────────────
// STORAGE
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_KEY="dfmea_projects_v2";
const USERS_KEY="dfmea_users_v1";
const THEME_KEY="dfmea_theme_v1";
function loadJSON(key,fallback){
  try{const r=localStorage.getItem(key);return r?JSON.parse(r):fallback}
  catch{return fallback}
}
function saveJSON(key,value){
  try{localStorage.setItem(key,JSON.stringify(value))}
  catch(e){console.error(e)}
}
const loadDB=async()=>loadJSON(STORAGE_KEY,{});
const saveDB=async db=>saveJSON(STORAGE_KEY,db);
const loadUsers=()=>loadJSON(USERS_KEY,null);
const saveUsers=u=>saveJSON(USERS_KEY,u);
const loadTheme=()=>{const t=loadJSON(THEME_KEY,"dark");return t==="light"?"light":"dark";};
const saveTheme=t=>saveJSON(THEME_KEY,t);

// ─────────────────────────────────────────────────────────────────────────────
// DEFAULT USERS
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULT_USERS=[
  {id:"u1",name:"Alex Ferreira",username:"alex",password:"pm123",role:"PM",color:"#00d4ff",active:true},
  {id:"u2",name:"Sofia Mendes",username:"sofia",password:"rv123",role:"RV",color:"#a855f7",active:true},
  {id:"u3",name:"Bruno Costa",username:"bruno",password:"rv456",role:"RV",color:"#22c55e",active:true},
];

// ─────────────────────────────────────────────────────────────────────────────
// DEMO DATA
// ─────────────────────────────────────────────────────────────────────────────
const DEMO_ENTRIES=[
  {id:"d1",subsystem:"Power Supply",component:"DC-DC Converter",function:"Regulate 24V→5V",failureMode:"Output voltage out of tolerance",failureEffect:"MCU reset / data corruption",failureCause:"Capacitor aging / thermal stress",category:"Component Drift",severity:7,occurrence:4,detection:3,rpn:84,controls:"100% EOL test, HALT testing",action:"Add TVS diode, increase derating",responsible:"HW-Lead",dueDate:"2025-06-30",status:"Open",revisedS:7,revisedO:2,revisedD:2,revisedRPN:28,version:1,history:[],comments:[]},
  {id:"d2",subsystem:"Motor Drive",component:"Gate Driver IC",function:"Drive IGBT switches",failureMode:"Gate drive undervoltage lockout",failureEffect:"Motor stops unexpectedly",failureCause:"EMI coupling on bootstrap supply",category:"EMI/EMC",severity:9,occurrence:3,detection:5,rpn:135,controls:"PCB EMI review, ferrite beads",action:"Redesign isolation barrier",responsible:"HW-Lead",dueDate:"2025-05-15",status:"Open",revisedS:9,revisedO:2,revisedD:2,revisedRPN:36,version:1,history:[],comments:[]},
  {id:"d3",subsystem:"Control Logic",component:"STM32 MCU",function:"Execute safety state machine",failureMode:"MCU lockup / unresponsive",failureEffect:"Safety function unavailable",failureCause:"Stack overflow / runaway pointer",category:"Firmware Fault",severity:9,occurrence:2,detection:4,rpn:72,controls:"Watchdog timer, SW review",action:"MISRA-C compliance, unit tests",responsible:"FW-Lead",dueDate:"2025-07-01",status:"Review",revisedS:9,revisedO:1,revisedD:2,revisedRPN:18,version:1,history:[],comments:[]},
  {id:"d4",subsystem:"I/O Interface",component:"Digital Input Module",function:"Read emergency stop signal",failureMode:"Input stuck HIGH",failureEffect:"E-stop not detected",failureCause:"ESD damage to input clamp",category:"ESD Damage",severity:10,occurrence:2,detection:3,rpn:60,controls:"TVS on inputs, IEC 61000-4-2",action:"Add redundant input channel",responsible:"HW-Lead",dueDate:"2025-05-30",status:"Open",revisedS:10,revisedO:1,revisedD:1,revisedRPN:10,version:1,history:[],comments:[]},
  {id:"d5",subsystem:"Communication",component:"CAN Bus Transceiver",function:"Industrial fieldbus comms",failureMode:"Bus dominant fault",failureEffect:"Network loss — all nodes offline",failureCause:"Short to GND on CAN_L line",category:"Short Circuit",severity:8,occurrence:3,detection:4,rpn:96,controls:"Termination resistors, TVS",action:"Add CAN fault confinement logic",responsible:"HW-Lead",dueDate:"2025-06-15",status:"Closed",revisedS:8,revisedO:2,revisedD:2,revisedRPN:32,version:1,history:[],comments:[]},
];
const EMPTY_DIAGRAM={nodes:[],edges:[]};
const DEMO_DIAGRAM={
  nodes:[
    {id:"n1",type:"input",  label:"24V DC Supply",subtitle:"External Power",x:60, y:180,w:130,h:60,color:"#1a3020",border:"#22c55e"},
    {id:"n2",type:"power",  label:"Power Supply",  subtitle:"PSU / DC-DC",  x:260,y:180,w:140,h:60,color:"#3a2f00",border:"#ffb020"},
    {id:"n3",type:"subsystem",label:"Control Logic",subtitle:"MCU / FPGA",  x:460,y:80, w:140,h:60,color:"#1e3a5f",border:"#00d4ff"},
    {id:"n4",type:"subsystem",label:"Motor Drive",  subtitle:"Gate+IGBT",   x:460,y:200,w:140,h:60,color:"#1e3a5f",border:"#00d4ff"},
    {id:"n5",type:"subsystem",label:"I/O Interface",subtitle:"DI/DO Module",x:460,y:320,w:140,h:60,color:"#1e3a5f",border:"#00d4ff"},
    {id:"n6",type:"subsystem",label:"Communication",subtitle:"CAN/Ethernet", x:460,y:440,w:140,h:60,color:"#1e3a5f",border:"#00d4ff"},
    {id:"n7",type:"output",  label:"AC Motor",     subtitle:"3-Phase Load", x:680,y:200,w:130,h:60,color:"#3a1f10",border:"#f97316"},
    {id:"n8",type:"external",label:"PLC / SCADA",  subtitle:"Host System",  x:680,y:440,w:130,h:60,color:"#2a1f3a",border:"#a855f7"},
    {id:"n9",type:"input",   label:"Safety E-Stop",subtitle:"Emergency Stop",x:260,y:320,w:130,h:60,color:"#1a3020",border:"#22c55e"},
  ],
  edges:[
    {id:"e1",from:"n1",to:"n2",label:"24V DC"},{id:"e2",from:"n2",to:"n3",label:"5V Logic"},
    {id:"e3",from:"n2",to:"n4",label:"15V Gate"},{id:"e4",from:"n2",to:"n5",label:"5V I/O"},
    {id:"e5",from:"n2",to:"n6",label:"3.3V"},{id:"e6",from:"n3",to:"n4",label:"PWM"},
    {id:"e7",from:"n4",to:"n7",label:"3Φ PWM"},{id:"e8",from:"n9",to:"n5",label:"E-Stop"},
    {id:"e9",from:"n5",to:"n3",label:"Digital I/O"},{id:"e10",from:"n6",to:"n8",label:"CAN Bus"},
    {id:"e11",from:"n3",to:"n6",label:"SPI/UART"},
  ]
};

// ─────────────────────────────────────────────────────────────────────────────
// SHARED SMALL COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function Toast({msg,type,onDone}){
  const done=useEffectEvent(onDone);
  useEffect(()=>{const t=setTimeout(()=>done(),2800);return()=>clearTimeout(t);},[]);
  return <div className={`toast toast-${type}`}>{type==="ok"?"✓":type==="err"?"✕":"ℹ"} {msg}</div>;
}
function RPNChip({value}){return <span className={`rpn ${rpnClass(value)}`}>{value}</span>;}
function RatingSlider({label,value,onChange,labels}){
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
function UserAvatar({user,size=28}){
  return <div className="user-avatar" style={{width:size,height:size,fontSize:size*0.4,background:user.color+"33",color:user.color,border:`1px solid ${user.color}44`}}>{initials(user.name)}</div>;
}

// ─────────────────────────────────────────────────────────────────────────────
// LOGIN SCREEN
// ─────────────────────────────────────────────────────────────────────────────
function LoginScreen({users, onLogin, theme, onToggleTheme}){
  const [manualMode,setManualMode]=useState(false);
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");

  const handleQuickLogin=(user)=>{ if(!user.active){setError("Account disabled.");return;} onLogin(user); };

  const handleManualLogin=(e)=>{
    e.preventDefault();
    const user=users.find(u=>u.username===username.trim()&&u.password===password);
    if(!user){setError("Invalid username or password.");return;}
    if(!user.active){setError("Account is disabled.");return;}
    onLogin(user);
  };

  return(
    <div className="login-screen">
      
      <div className="login-box">
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:4}}>
          <div className="login-logo">DFMEA<span>·TOOL</span></div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme}/>
        </div>
        <div className="login-sub">Electronics / Industrial Machinery · v2</div>

        {error&&<div className="login-error">{error}</div>}

        {!manualMode?(
          <>
            <div className="label" style={{marginBottom:12}}>Select Account</div>
            {users.filter(u=>u.active).map(u=>(
              <div key={u.id} className="login-user-card" onClick={()=>handleQuickLogin(u)}>
                <UserAvatar user={u} size={36}/>
                <div>
                  <div className="login-user-name">{u.name}</div>
                  <div className="login-user-role" style={{color:ROLE_COLORS[u.role]}}>{ROLES[u.role]}</div>
                </div>
                <div style={{marginLeft:"auto",fontFamily:"var(--mono)",fontSize:10,color:"var(--muted)"}}>@{u.username}</div>
              </div>
            ))}
            <div className="login-sep">or</div>
            <button className="btn btn-ghost" style={{width:"100%",justifyContent:"center"}} onClick={()=>setManualMode(true)}>Sign in with credentials</button>
          </>
        ):(
          <form onSubmit={handleManualLogin} style={{display:"flex",flexDirection:"column",gap:14}}>
            <div className="form-group">
              <label className="label">Username</label>
              <input value={username} onChange={e=>setUsername(e.target.value)} autoFocus placeholder="username"/>
            </div>
            <div className="form-group">
              <label className="label">Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="password"/>
            </div>
            <button className="btn btn-primary" type="submit" style={{justifyContent:"center"}}>Sign In</button>
            <button className="btn btn-ghost" type="button" style={{justifyContent:"center"}} onClick={()=>{setManualMode(false);setError("");}}>← Back</button>
          </form>
        )}

        <div style={{marginTop:24,padding:"12px 14px",background:"var(--surface2)",borderRadius:6,border:"1px solid var(--border)"}}>
          <div className="label" style={{marginBottom:8}}>Demo Credentials</div>
          {users.map(u=><div key={u.id} style={{fontSize:11,color:"var(--muted)",fontFamily:"var(--mono)",marginBottom:3}}>
            @{u.username} / {u.password} — <span style={{color:ROLE_COLORS[u.role]}}>{ROLES[u.role]}</span>
          </div>)}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// USER MANAGEMENT MODAL (PM only)
// ─────────────────────────────────────────────────────────────────────────────
function UserManagementModal({users,onSave,onClose}){
  const [list,setList]=useState(users.map(u=>({...u})));
  const [newUser,setNewUser]=useState({name:"",username:"",password:"",role:"RV",color:"#a855f7"});
  const [adding,setAdding]=useState(false);
  const update=(id,patch)=>setList(l=>l.map(u=>u.id===id?{...u,...patch}:u));
  const addUser=()=>{
    if(!newUser.name||!newUser.username||!newUser.password)return;
    setList(l=>[...l,{id:uid(),...newUser,active:true}]);
    setNewUser({name:"",username:"",password:"",role:"RV",color:"#a855f7"});
    setAdding(false);
  };
  const colorOpts=["#00d4ff","#a855f7","#22c55e","#f97316","#ffb020","#ff4444","#e2e8f0"];
  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">USER MANAGEMENT</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {list.map(u=>(
          <div key={u.id} className="user-mgmt-row">
            <UserAvatar user={u}/>
            <div style={{flex:1}}>
              <div style={{fontSize:13,fontWeight:600}}>{u.name}</div>
              <div style={{fontFamily:"var(--mono)",fontSize:10,color:"var(--muted)"}}>@{u.username} · {ROLES[u.role]}</div>
            </div>
            <select value={u.role} onChange={e=>update(u.id,{role:e.target.value})} style={{width:130}}>
              <option value="PM">Project Manager</option>
              <option value="RV">Reviewer</option>
            </select>
            <button className={`btn btn-sm ${u.active?"btn-danger":"btn-ghost"}`}
              onClick={()=>update(u.id,{active:!u.active})}>
              {u.active?"Disable":"Enable"}
            </button>
          </div>
        ))}

        {adding?(
          <div style={{marginTop:16,display:"flex",flexDirection:"column",gap:10,padding:"14px",background:"var(--surface2)",borderRadius:6,border:"1px solid var(--border)"}}>
            <div className="card-title" style={{marginBottom:0}}>NEW USER</div>
            <div className="grid2" style={{gap:10}}>
              <div className="form-group"><label className="label">Full Name</label><input value={newUser.name} onChange={e=>setNewUser(p=>({...p,name:e.target.value}))}/></div>
              <div className="form-group"><label className="label">Username</label><input value={newUser.username} onChange={e=>setNewUser(p=>({...p,username:e.target.value}))}/></div>
            </div>
            <div className="grid2" style={{gap:10}}>
              <div className="form-group"><label className="label">Password</label><input value={newUser.password} onChange={e=>setNewUser(p=>({...p,password:e.target.value}))}/></div>
              <div className="form-group"><label className="label">Role</label>
                <select value={newUser.role} onChange={e=>setNewUser(p=>({...p,role:e.target.value}))}>
                  <option value="PM">Project Manager</option><option value="RV">Reviewer</option>
                </select>
              </div>
            </div>
            <div className="form-group"><label className="label">Avatar Color</label>
              <div className="color-swatches">{colorOpts.map(c=><div key={c} className={`color-swatch${newUser.color===c?" selected":""}`} style={{background:c}} onClick={()=>setNewUser(p=>({...p,color:c}))}/>)}</div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <button className="btn btn-primary btn-sm" onClick={addUser}>Add User</button>
              <button className="btn btn-ghost btn-sm" onClick={()=>setAdding(false)}>Cancel</button>
            </div>
          </div>
        ):(
          <button className="btn btn-ghost btn-sm" style={{marginTop:16}} onClick={()=>setAdding(true)}>+ Add User</button>
        )}

        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:24}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={()=>onSave(list)}>Save Changes</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMMENT BUBBLE BUTTON
// ─────────────────────────────────────────────────────────────────────────────
function CommentBubble({comments,onClick}){
  const open=(comments||[]).filter(c=>c.status==="open").length;
  const total=(comments||[]).length;
  const cls=open>0?"has-open":total>0?"has-resolved":"empty";
  return(
    <span className={`comment-bubble ${cls}`} onClick={e=>{e.stopPropagation();onClick();}} title="Review comments">
      💬 {total>0?total:""}
      {open>0&&<span style={{color:"var(--warn)",fontWeight:700}}> ●</span>}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REVIEW PANEL MODAL — comments + version history for one entry
// ─────────────────────────────────────────────────────────────────────────────
function ReviewModal({entry,currentUser,users,onAddComment,onResolveComment,onClose}){
  const [tab,setTab]=useState("comments");
  const [text,setText]=useState("");
  const canResolve=currentUser.role==="PM";

  const submitComment=()=>{
    if(!text.trim())return;
    onAddComment(entry.id,{id:uid(),authorId:currentUser.id,text:text.trim(),createdAt:now(),status:"open"});
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

// ─────────────────────────────────────────────────────────────────────────────
// ENTRY MODAL (edit / add)
// ─────────────────────────────────────────────────────────────────────────────
function EntryModal({entry,onSave,onClose,subsystemOptions,currentUser,readOnly}){
  const allSubs=[...new Set([...SUBSYSTEMS,...(subsystemOptions||[])])];
  const blank={id:uid(),subsystem:allSubs[0]||"Power Supply",component:"",function:"",failureMode:"",failureEffect:"",failureCause:"",category:"Short Circuit",severity:5,occurrence:5,detection:5,controls:"",action:"",responsible:"",dueDate:"",status:"Open",revisedS:5,revisedO:3,revisedD:3,version:1,history:[],comments:[]};
  const [f,setF]=useState(entry||blank);
  const rpn=f.severity*f.occurrence*f.detection;
  const rRPN=f.revisedS*f.revisedO*f.revisedD;
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const ro=readOnly||currentUser.role==="RV"; // reviewers can't edit entries

  return(
    <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">{ro?"VIEW":"EDIT"} FAILURE MODE {ro&&<span style={{color:"var(--warn)",fontSize:10,marginLeft:8}}>READ-ONLY</span>}</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button>
        </div>
        {ro&&<div style={{background:"#ffb02011",border:"1px solid #ffb02033",borderRadius:6,padding:"8px 12px",marginBottom:16,fontSize:12,color:"var(--warn)"}}>
          Reviewers can read entries and add comments, but cannot modify data. Use the 💬 button on the worksheet row.
        </div>}
        <div className="grid2" style={{gap:12,marginBottom:16}}>
          <div className="form-group"><label className="label">Subsystem</label>
            <select value={f.subsystem} onChange={e=>set("subsystem",e.target.value)} disabled={ro}>{allSubs.map(s=><option key={s}>{s}</option>)}</select></div>
          <div className="form-group"><label className="label">Component</label>
            <input value={f.component} onChange={e=>set("component",e.target.value)} disabled={ro}/></div>
        </div>
        <div className="grid2" style={{gap:12,marginBottom:16}}>
          <div className="form-group"><label className="label">Intended Function</label>
            <input value={f.function} onChange={e=>set("function",e.target.value)} disabled={ro}/></div>
          <div className="form-group"><label className="label">Failure Category</label>
            <select value={f.category} onChange={e=>set("category",e.target.value)} disabled={ro}>{FAILURE_CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
        </div>
        <div className="form-group" style={{marginBottom:12}}>
          <label className="label">Failure Mode</label>
          <input value={f.failureMode} onChange={e=>set("failureMode",e.target.value)} disabled={ro}/></div>
        <div className="grid2" style={{gap:12,marginBottom:12}}>
          <div className="form-group"><label className="label">Failure Effect</label>
            <textarea value={f.failureEffect} onChange={e=>set("failureEffect",e.target.value)} disabled={ro}/></div>
          <div className="form-group"><label className="label">Failure Cause</label>
            <textarea value={f.failureCause} onChange={e=>set("failureCause",e.target.value)} disabled={ro}/></div>
        </div>
        <hr className="sep"/>
        <div style={{marginBottom:20}}>
          <div className="card-title" style={{marginBottom:16}}>CURRENT RATINGS</div>
          <div className="grid3" style={{gap:20}}>
            <RatingSlider label="Severity (S)" value={f.severity} onChange={v=>set("severity",v)} labels={SEV_LABELS} disabled={ro}/>
            <RatingSlider label="Occurrence (O)" value={f.occurrence} onChange={v=>set("occurrence",v)} labels={OCC_LABELS}/>
            <RatingSlider label="Detection (D)" value={f.detection} onChange={v=>set("detection",v)} labels={DET_LABELS}/>
          </div>
          <div style={{marginTop:16,display:"flex",alignItems:"center",gap:12}}>
            <span className="label">CURRENT RPN</span><RPNChip value={rpn}/>
          </div>
        </div>
        <div className="form-group" style={{marginBottom:16}}>
          <label className="label">Current Controls</label>
          <textarea value={f.controls} onChange={e=>set("controls",e.target.value)} disabled={ro}/></div>
        <hr className="sep"/>
        <div className="card-title" style={{marginBottom:16}}>RECOMMENDED ACTION</div>
        <div className="form-group" style={{marginBottom:12}}>
          <label className="label">Action</label>
          <textarea value={f.action} onChange={e=>set("action",e.target.value)} disabled={ro}/></div>
        <div className="grid3" style={{gap:12,marginBottom:16}}>
          <div className="form-group"><label className="label">Responsible</label>
            <input value={f.responsible} onChange={e=>set("responsible",e.target.value)} disabled={ro}/></div>
          <div className="form-group"><label className="label">Due Date</label>
            <input type="date" value={f.dueDate} onChange={e=>set("dueDate",e.target.value)} disabled={ro}/></div>
          <div className="form-group"><label className="label">Status</label>
            <select value={f.status} onChange={e=>set("status",e.target.value)} disabled={ro}>
              <option>Open</option><option>Review</option><option>Closed</option></select></div>
        </div>
        <div style={{marginBottom:12}}>
          <div className="card-title" style={{marginBottom:16}}>REVISED RATINGS</div>
          <div className="grid3" style={{gap:20}}>
            <RatingSlider label="Revised S" value={f.revisedS} onChange={v=>set("revisedS",v)} labels={SEV_LABELS}/>
            <RatingSlider label="Revised O" value={f.revisedO} onChange={v=>set("revisedO",v)} labels={OCC_LABELS}/>
            <RatingSlider label="Revised D" value={f.revisedD} onChange={v=>set("revisedD",v)} labels={DET_LABELS}/>
          </div>
          <div style={{marginTop:16,display:"flex",alignItems:"center",gap:12}}>
            <span className="label">REVISED RPN</span><RPNChip value={rRPN}/>
            {rpn>0&&<span style={{color:rRPN<rpn?"var(--ok)":"var(--danger)",fontFamily:"var(--mono)",fontSize:11}}>
              {rRPN<rpn?"▼ ":"▲ "}{Math.abs(Math.round((1-rRPN/rpn)*100))}%
            </span>}
          </div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:24}}>
          <button className="btn btn-ghost" onClick={onClose}>{ro?"Close":"Cancel"}</button>
          {!ro&&<button className="btn btn-primary" onClick={()=>onSave({...f,rpn,revisedRPN:rRPN})}>✓ Save</button>}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT SETTINGS MODAL
// ─────────────────────────────────────────────────────────────────────────────
function ProjectSettingsModal({project,onSave,onClose}){
  const [f,setF]=useState({name:project.name,product:project.product||"",revision:project.revision||"",team:project.team||"",description:project.description||""});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">PROJECT SETTINGS</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="form-group"><label className="label">Project Name</label><input value={f.name} onChange={e=>set("name",e.target.value)}/></div>
          <div className="grid2" style={{gap:12}}>
            <div className="form-group"><label className="label">Product</label><input value={f.product} onChange={e=>set("product",e.target.value)}/></div>
            <div className="form-group"><label className="label">Revision</label><input value={f.revision} onChange={e=>set("revision",e.target.value)}/></div>
          </div>
          <div className="form-group"><label className="label">Team</label><input value={f.team} onChange={e=>set("team",e.target.value)}/></div>
          <div className="form-group"><label className="label">Description</label><textarea value={f.description} onChange={e=>set("description",e.target.value)} style={{minHeight:56}}/></div>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:24}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={()=>onSave(f)}>Save</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW PROJECT MODAL
// ─────────────────────────────────────────────────────────────────────────────
function NewProjectModal({onCreate,onClose}){
  const [f,setF]=useState({name:"",product:"",revision:"A",team:"",description:"",demo:false});
  const set=(k,v)=>setF(p=>({...p,[k]:v}));
  const ok=f.name.trim().length>0;
  return(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-sm" onClick={e=>e.stopPropagation()}>
        <div className="modal-header"><span className="modal-title">NEW PROJECT</span>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>✕</button></div>
        <div style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="form-group"><label className="label">Project Name *</label>
            <input value={f.name} onChange={e=>set("name",e.target.value)} autoFocus/></div>
          <div className="grid2" style={{gap:12}}>
            <div className="form-group"><label className="label">Product</label><input value={f.product} onChange={e=>set("product",e.target.value)}/></div>
            <div className="form-group"><label className="label">Revision</label><input value={f.revision} onChange={e=>set("revision",e.target.value)}/></div>
          </div>
          <div className="form-group"><label className="label">Team</label><input value={f.team} onChange={e=>set("team",e.target.value)}/></div>
          <div className="form-group"><label className="label">Description</label><textarea value={f.description} onChange={e=>set("description",e.target.value)} style={{minHeight:56}}/></div>
          <label style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer",padding:"10px 14px",background:"var(--surface2)",borderRadius:6,border:"1px solid var(--border)"}}>
            <input type="checkbox" checked={f.demo} onChange={e=>set("demo",e.target.checked)} style={{width:"auto"}}/>
            <div><div style={{fontSize:13}}>Populate with demo data</div>
              <div style={{fontSize:11,color:"var(--muted)"}}>5 failure modes + block diagram</div></div>
          </label>
        </div>
        <div style={{display:"flex",justifyContent:"flex-end",gap:8,marginTop:24}}>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" disabled={!ok} onClick={()=>ok&&onCreate(f)}>Create Project</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT MANAGER
// ─────────────────────────────────────────────────────────────────────────────
function ProjectManager({onOpen,currentUser,onLogout,onManageUsers,theme,onToggleTheme}){
  const [db,setDb]=useState(null);
  const [newModal,setNewModal]=useState(false);
  const [delId,setDelId]=useState(null);
  const [drag,setDrag]=useState(false);
  const [toast,setToast]=useState(null);
  const fileRef=useRef();
  const showToast=(msg,type="ok")=>setToast({msg,type,k:uid()});
  const isPM=currentUser.role==="PM";

  useEffect(()=>{loadDB().then(setDb);},[]);

  const persistDB=async(next)=>{setDb(next);await saveDB(next);};

  const createProject=async(meta)=>{
    const id=uid();
    const proj={id,...meta,createdAt:now(),updatedAt:now(),createdBy:currentUser.id,
      entries:meta.demo?DEMO_ENTRIES.map(e=>({...e,id:uid(),createdAt:now(),createdBy:currentUser.id})):[],
      diagram:meta.demo?DEMO_DIAGRAM:null};
    delete proj.demo;
    await persistDB({...(db||{}),[id]:proj});
    setNewModal(false);showToast(`Project "${proj.name}" created`);
  };

  const deleteProject=async(id)=>{
    const next={...db};delete next[id];
    await persistDB(next);setDelId(null);showToast("Project deleted","info");
  };

  const handleFileImport=async(file)=>{
    try{
      const text=await file.text();
      const data=JSON.parse(text);
      if(!["DFMEA-v1","DFMEA-v2"].includes(data.__format))throw new Error("Unrecognised file format");
      const proj=data.project;
      if(!proj?.name||!Array.isArray(proj?.entries))throw new Error("Invalid project data");
      // ensure entries have version/history/comments fields
      const entries=(proj.entries||[]).map(e=>({version:1,history:[],comments:[],...e}));
      const id=uid();
      const imported={...proj,entries,id,importedAt:now(),updatedAt:now()};
      await persistDB({...(db||{}),[id]:imported});
      showToast(`Imported "${imported.name}"`);
    }catch(e){showToast("Import failed: "+e.message,"err");}
  };

  const onDrop=(e)=>{e.preventDefault();setDrag(false);const f=e.dataTransfer.files[0];if(f)handleFileImport(f);};

  if(db===null)return(<div className="pm-screen" style={{alignItems:"center",justifyContent:"center"}}><span style={{fontFamily:"var(--mono)",color:"var(--muted)"}}>Loading…</span></div>);

  const projects=Object.values(db).sort((a,b)=>new Date(b.updatedAt)-new Date(a.updatedAt));

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
              const crit=p.entries.filter(e=>e.rpn>200).length;
              const open=p.entries.filter(e=>e.status==="Open").length;
              const totalComments=p.entries.reduce((a,e)=>(a+(e.comments||[]).length),0);
              const openComments=p.entries.reduce((a,e)=>(a+(e.comments||[]).filter(c=>c.status==="open").length),0);
              return(
                <div key={p.id} className="proj-card" onClick={()=>onOpen(p.id,db)}>
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
                    <div className="proj-stat"><span>{p.entries.length}</span> modes</div>
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
            <p style={{color:"var(--muted)",marginBottom:8}}>Delete <strong style={{color:"var(--text)"}}>{db[delId]?.name}</strong>?</p>
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

// ─────────────────────────────────────────────────────────────────────────────
// BLOCK DIAGRAM EDITOR (unchanged logic)
// ─────────────────────────────────────────────────────────────────────────────
function BlockDiagram({diagram,onChange,entries,readOnly}){
  const [nodes,setNodes]=useState(diagram?.nodes||[]);
  const [edges,setEdges]=useState(diagram?.edges||[]);
  const [selected,setSelected]=useState(null);
  const [tool,setTool]=useState("select");
  const [pan,setPan]=useState({x:0,y:0});
  const [zoom,setZoom]=useState(1);
  const [connecting,setConnecting]=useState(null);
  const [editEdge,setEditEdge]=useState(null);
  const [editLabel,setEditLabel]=useState(null);
  const [labelDraft,setLabelDraft]=useState("");
  const [showRPN,setShowRPN]=useState(true);
  const canvasRef=useRef();
  const dragRef=useRef(null);
  const panRef=useRef(null);

  const subsysRPN=useMemo(()=>{const m={};entries.forEach(e=>{const k=e.subsystem;if(!m[k]||e.rpn>m[k])m[k]=e.rpn;});return m;},[entries]);
  const persist=useCallback((n,e)=>{onChange({nodes:n,edges:e});},[onChange]);
  const setE=e=>{setEdges(e);persist(nodes,e);}

  const getPortPos=(node,side)=>{
    const hw=node.w/2,hh=node.h/2,cx=node.x+hw,cy=node.y+hh;
    if(side==="right")return{x:node.x+node.w,y:cy};
    if(side==="left")return{x:node.x,y:cy};
    if(side==="top")return{x:cx,y:node.y};
    return{x:cx,y:node.y+node.h};
  };
  const getBestPorts=(n1,n2)=>{
    const dx=(n2.x+n2.w/2)-(n1.x+n1.w/2),dy=(n2.y+n2.h/2)-(n1.y+n1.h/2);
    let from,to;
    if(Math.abs(dx)>=Math.abs(dy)){from=dx>0?"right":"left";to=dx>0?"left":"right";}
    else{from=dy>0?"bottom":"top";to=dy>0?"top":"bottom";}
    return{from:getPortPos(n1,from),to:getPortPos(n2,to)};
  };
  const edgePath=edge=>{
    const n1=nodes.find(n=>n.id===edge.from),n2=nodes.find(n=>n.id===edge.to);
    if(!n1||!n2)return null;
    const{from:p1,to:p2}=getBestPorts(n1,n2);
    const dx=Math.abs(p2.x-p1.x)*0.4;
    return{d:`M ${p1.x} ${p1.y} C ${p1.x+dx} ${p1.y}, ${p2.x-dx} ${p2.y}, ${p2.x} ${p2.y}`,mid:{x:(p1.x+p2.x)/2,y:(p1.y+p2.y)/2}};
  };
  const toCanvas=(cx,cy)=>{const rect=canvasRef.current.getBoundingClientRect();return{x:(cx-rect.left-pan.x)/zoom,y:(cy-rect.top-pan.y)/zoom};};

  const onNodeMouseDown=(e,nodeId)=>{
    e.stopPropagation();
    if(readOnly)return;
    if(tool==="connect"){
      if(!connecting)setConnecting({fromId:nodeId});
      else if(connecting.fromId!==nodeId){setE([...edges,{id:uid(),from:connecting.fromId,to:nodeId,label:""}]);setConnecting(null);}
      return;
    }
    if(tool==="select"){setSelected({type:"node",id:nodeId});const node=nodes.find(n=>n.id===nodeId);dragRef.current={nodeId,startX:e.clientX,startY:e.clientY,origX:node.x,origY:node.y};}
  };
  const onCanvasMouseMove=useCallback(e=>{
    if(dragRef.current){const{nodeId,startX,startY,origX,origY}=dragRef.current;const dx=(e.clientX-startX)/zoom,dy=(e.clientY-startY)/zoom;setNodes(prev=>{const next=prev.map(n=>n.id===nodeId?{...n,x:Math.round(origX+dx),y:Math.round(origY+dy)}:n);persist(next,edges);return next;});}
    if(panRef.current){const{startX,startY,origPanX,origPanY}=panRef.current;setPan({x:origPanX+(e.clientX-startX),y:origPanY+(e.clientY-startY)});}
  },[zoom,edges,persist]);
  const onCanvasMouseUp=useCallback(()=>{dragRef.current=null;panRef.current=null;},[]);
  const onCanvasMouseDown=e=>{
    if(tool==="pan"){panRef.current={startX:e.clientX,startY:e.clientY,origPanX:pan.x,origPanY:pan.y};return;}
    if(tool==="select")setSelected(null);
    setConnecting(null);
  };
  const onWheel=e=>{e.preventDefault();setZoom(z=>Math.min(3,Math.max(0.2,z*(e.deltaY<0?1.1:0.9))));};
  useEffect(()=>{const el=canvasRef.current;if(!el)return;el.addEventListener("wheel",onWheel,{passive:false});return()=>el.removeEventListener("wheel",onWheel);},[]);

  const onCanvasDrop=e=>{
    e.preventDefault();if(readOnly)return;
    const typeStr=e.dataTransfer.getData("nodeType");if(!typeStr)return;
    const def=NODE_TYPES.find(t=>t.type===typeStr)||NODE_TYPES[0];
    const pos=toCanvas(e.clientX,e.clientY);
    const nn={id:uid(),type:def.type,label:def.label,subtitle:"",x:Math.round(pos.x-70),y:Math.round(pos.y-30),w:140,h:60,color:def.defaultColor,border:def.defaultBorder};
    const next=[...nodes,nn];setNodes(next);persist(next,edges);setSelected({type:"node",id:nn.id});
  };
  const addNodeFromPalette=typeStr=>{
    if(readOnly)return;
    const def=NODE_TYPES.find(t=>t.type===typeStr)||NODE_TYPES[0];
    const nn={id:uid(),type:def.type,label:def.label,subtitle:"",x:randomCoord(80,300),y:randomCoord(100,200),w:140,h:60,color:def.defaultColor,border:def.defaultBorder};
    const next=[...nodes,nn];setNodes(next);persist(next,edges);setSelected({type:"node",id:nn.id});
  };
  const deleteSelected=()=>{
    if(!selected||readOnly)return;
    if(selected.type==="node"){const nn=nodes.filter(n=>n.id!==selected.id);const ne=edges.filter(e=>e.from!==selected.id&&e.to!==selected.id);setNodes(nn);setEdges(ne);persist(nn,ne);}
    else{const ne=edges.filter(e=>e.id!==selected.id);setEdges(ne);persist(nodes,ne);}
    setSelected(null);
  };
  const onKeyDown=useEffectEvent(e=>{if((e.key==="Delete"||e.key==="Backspace")&&selected&&e.target.tagName!=="INPUT"&&e.target.tagName!=="TEXTAREA")deleteSelected();});
  useEffect(()=>{
    const h=e=>onKeyDown(e);
    window.addEventListener("keydown",h);return()=>window.removeEventListener("keydown",h);
  },[]);
  const fitView=()=>{
    if(!nodes.length){setPan({x:0,y:0});setZoom(1);return;}
    const rect=canvasRef.current.getBoundingClientRect();
    const minX=Math.min(...nodes.map(n=>n.x)),minY=Math.min(...nodes.map(n=>n.y));
    const maxX=Math.max(...nodes.map(n=>n.x+n.w)),maxY=Math.max(...nodes.map(n=>n.y+n.h));
    const z=Math.min(rect.width/(maxX-minX+80),rect.height/(maxY-minY+80),1.5);
    setPan({x:(rect.width-(maxX-minX)*z)/2-minX*z+40*z,y:(rect.height-(maxY-minY)*z)/2-minY*z+40*z});setZoom(z);
  };
  const clearDiagram=()=>{if(readOnly||!confirm("Clear diagram?"))return;setNodes([]);setEdges([]);persist([],[]);setSelected(null);};
  const loadDemo=()=>{if(readOnly)return;setNodes(DEMO_DIAGRAM.nodes);setEdges(DEMO_DIAGRAM.edges);persist(DEMO_DIAGRAM.nodes,DEMO_DIAGRAM.edges);setTimeout(fitView,50);};

  const selectedNode=selected?.type==="node"?nodes.find(n=>n.id===selected.id):null;
  const selectedEdge=selected?.type==="edge"?edges.find(e=>e.id===selected.id):null;
  const updateNode=(id,patch)=>{if(readOnly)return;const nn=nodes.map(n=>n.id===id?{...n,...patch}:n);setNodes(nn);persist(nn,edges);};
  const updateEdge=(id,patch)=>{if(readOnly)return;const ne=edges.map(e=>e.id===id?{...e,...patch}:e);setEdges(ne);persist(nodes,ne);};
  const diagramSubsystems=[...new Set(nodes.filter(n=>n.type==="subsystem").map(n=>n.label))];

  return(
    <div style={{display:"flex",flexDirection:"column",height:"100%",overflow:"hidden"}}>
      {readOnly&&<div style={{background:"#ffb02011",border:"1px solid #ffb02022",padding:"6px 16px",fontSize:11,color:"var(--warn)",fontFamily:"var(--mono)"}}>
        VIEW ONLY — Reviewers cannot edit the block diagram
      </div>}
      <div className="bd-toolbar">
        {!readOnly&&<>
          <button className={`btn btn-ghost btn-sm${tool==="select"?" active-tool":""}`} onClick={()=>{setTool("select");setConnecting(null);}}>↖ Select</button>
          <button className={`btn btn-ghost btn-sm${tool==="connect"?" active-tool":""}`} onClick={()=>{setTool("connect");setSelected(null);}}>⟶ Connect{connecting?" (pick target)":""}</button>
          <button className={`btn btn-ghost btn-sm${tool==="pan"?" active-tool":""}`} onClick={()=>setTool("pan")}>✋ Pan</button>
          <div style={{width:1,height:20,background:"var(--border)",margin:"0 4px"}}/>
        </>}
        <button className="btn btn-ghost btn-sm" onClick={fitView}>⊞ Fit</button>
        <button className="btn btn-ghost btn-sm" onClick={()=>setZoom(z=>Math.min(3,z*1.2))}>+</button>
        <button className="btn btn-ghost btn-sm" onClick={()=>setZoom(z=>Math.max(0.2,z/1.2))}>−</button>
        <button className="btn btn-ghost btn-sm" onClick={()=>setShowRPN(v=>!v)}>{showRPN?"Hide":"Show"} RPN</button>
        {!readOnly&&selected&&<button className="btn btn-danger btn-sm" onClick={deleteSelected}>✕ Delete</button>}
        {!readOnly&&<div style={{marginLeft:"auto",display:"flex",gap:6}}>
          {nodes.length===0&&<button className="btn btn-ghost btn-sm" onClick={loadDemo}>Load Demo</button>}
          <button className="btn btn-danger btn-sm" onClick={clearDiagram}>Clear</button>
        </div>}
      </div>
      <div className="bd-wrap">
        <div className="bd-sidebar">
          <div className="bd-sidebar-section">
            <div className="bd-sidebar-title">Block Types</div>
            {NODE_TYPES.map(t=>(
              <div key={t.type} className="bd-palette-item"
                draggable={!readOnly} onDragStart={e=>e.dataTransfer.setData("nodeType",t.type)}
                onClick={()=>addNodeFromPalette(t.type)} style={{opacity:readOnly?.5:1,cursor:readOnly?"default":"grab"}}>
                <span style={{fontSize:14,width:18,textAlign:"center"}}>{t.icon}</span>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
          <div className="bd-legend">
            <div className="bd-sidebar-title">RPN Legend</div>
            {[{l:"Low ≤50",c:"#22c55e"},{l:"Med 51–100",c:"#ffb020"},{l:"High 101–200",c:"#ff4444"},{l:"Critical >200",c:"#ff2222"}].map(r=>(
              <div key={r.l} className="bd-legend-item"><div className="bd-legend-swatch" style={{background:r.c}}/><span style={{fontSize:11,color:"var(--muted)"}}>{r.l}</span></div>
            ))}
            {diagramSubsystems.length>0&&<><div className="bd-sidebar-title" style={{marginTop:12}}>Subsystems</div>
              {diagramSubsystems.map(s=>{const r=subsysRPN[s];return<div key={s} className="bd-legend-item">
                <div className="bd-legend-swatch" style={{background:r?rpnColor(r):"var(--border)"}}/>
                <span style={{fontSize:10,color:"var(--muted)"}}>{s}{r?` (${r})`:""}</span>
              </div>;})}</>}
          </div>
        </div>

        <div className="bd-canvas-wrap" ref={canvasRef}
          onMouseMove={onCanvasMouseMove} onMouseUp={onCanvasMouseUp} onMouseDown={onCanvasMouseDown}
          onDragOver={e=>e.preventDefault()} onDrop={onCanvasDrop}
          style={{cursor:readOnly?"default":tool==="pan"?"grab":tool==="connect"?"crosshair":"default"}}>

          {nodes.length===0&&!readOnly&&(
            <div className="bd-empty">
              <div style={{fontSize:48,opacity:.3}}>⬜</div>
              <div style={{fontFamily:"var(--mono)",fontSize:12}}>Drag blocks from the sidebar or click to add</div>
              <button className="btn btn-ghost btn-sm" onClick={loadDemo}>Load Demo Diagram</button>
            </div>
          )}

          <svg style={{position:"absolute",top:0,left:0,width:"100%",height:"100%",pointerEvents:"none",overflow:"visible"}}>
            <defs>
              <marker id="arr" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#475569"/></marker>
              <marker id="arr-sel" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto"><polygon points="0 0, 8 3, 0 6" fill="#00d4ff"/></marker>
            </defs>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {edges.map(edge=>{const ep=edgePath(edge);if(!ep)return null;const isSel=selected?.type==="edge"&&selected?.id===edge.id;return(
                <g key={edge.id} style={{pointerEvents:"all",cursor:"pointer"}} onClick={e=>{e.stopPropagation();if(!readOnly)setSelected({type:"edge",id:edge.id});}}>
                  <path d={ep.d} stroke="transparent" strokeWidth={12} fill="none"/>
                  <path d={ep.d} stroke={isSel?"#00d4ff":"#475569"} strokeWidth={isSel?2.5:1.5} fill="none" strokeDasharray={isSel?"6,3":""} markerEnd={`url(#${isSel?"arr-sel":"arr"})`}/>
                </g>
              );})}
            </g>
          </svg>

          <div style={{position:"absolute",top:0,left:0,transformOrigin:"0 0",transform:`translate(${pan.x}px,${pan.y}px) scale(${zoom})`}}>
            {nodes.map(node=>{
              const isSel=selected?.type==="node"&&selected?.id===node.id;
              const isFrom=connecting?.fromId===node.id;
              const maxRPN=subsysRPN[node.label];
              const rpnC=maxRPN?rpnColor(maxRPN):null;
              return(
                <div key={node.id} className={`bd-node${isSel?" selected":""}`}
                  style={{left:node.x,top:node.y,width:node.w,height:node.h,background:node.color,borderColor:isFrom?"#00d4ff":node.border,borderWidth:isFrom?3:2,color:"#e8edf5",boxShadow:isFrom?"0 0 0 4px #00d4ff44":""}}
                  onMouseDown={e=>onNodeMouseDown(e,node.id)}
                  onDoubleClick={()=>{if(!readOnly){setEditLabel(node.id);setLabelDraft(node.label);}}}>
                  {editLabel===node.id?(
                    <input autoFocus value={labelDraft} onChange={e=>setLabelDraft(e.target.value)}
                      onBlur={()=>{updateNode(node.id,{label:labelDraft});setEditLabel(null);}}
                      onKeyDown={e=>{if(e.key==="Enter"){updateNode(node.id,{label:labelDraft});setEditLabel(null);}if(e.key==="Escape")setEditLabel(null);}}
                      style={{background:"transparent",border:"none",textAlign:"center",width:"100%",fontSize:12,fontWeight:600,color:"#e8edf5",outline:"none"}}
                      onClick={e=>e.stopPropagation()}/>
                  ):(
                    <div className="bd-node-label">{node.label}</div>
                  )}
                  {node.subtitle&&<div className="bd-node-sub">{node.subtitle}</div>}
                  {showRPN&&maxRPN&&<div className="bd-node-rpn" style={{background:rpnC+"33",color:rpnC,border:`1px solid ${rpnC}55`}}>RPN {maxRPN}</div>}
                </div>
              );
            })}
            {edges.map(edge=>{const ep=edgePath(edge);if(!ep||!edge.label)return null;return(
              <div key={`lbl-${edge.id}`} className="bd-edge-label" style={{left:ep.mid.x,top:ep.mid.y}}
                onClick={e=>{e.stopPropagation();if(!readOnly)setEditEdge(edge.id);}}>{edge.label}</div>
            );})}
          </div>
          <div className="bd-zoom-badge">{Math.round(zoom*100)}%</div>
        </div>

        <div className="bd-props">
          {!selected&&<div>
            <div className="bd-props-title">DIAGRAM INFO</div>
            <div style={{fontSize:11,color:"var(--muted)",lineHeight:1.8}}>
              <div><span style={{color:"var(--text)"}}>{nodes.length}</span> blocks · <span style={{color:"var(--text)"}}>{edges.length}</span> connections</div>
              {!readOnly&&<div style={{marginTop:8}}>Double-click block to rename.<br/>Del key removes selected.</div>}
            </div>
          </div>}
          {selectedNode&&!readOnly&&<div>
            <div className="bd-props-title">BLOCK</div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div className="form-group"><label className="label">Label</label><input value={selectedNode.label} onChange={e=>updateNode(selectedNode.id,{label:e.target.value})}/></div>
              <div className="form-group"><label className="label">Subtitle</label><input value={selectedNode.subtitle||""} onChange={e=>updateNode(selectedNode.id,{subtitle:e.target.value})}/></div>
              <div className="form-group"><label className="label">Type</label>
                <select value={selectedNode.type} onChange={e=>{const def=NODE_TYPES.find(t=>t.type===e.target.value);updateNode(selectedNode.id,{type:e.target.value,border:def?.defaultBorder||selectedNode.border});}}>
                  {NODE_TYPES.map(t=><option key={t.type} value={t.type}>{t.icon} {t.label}</option>)}</select></div>
              <div className="form-group"><label className="label">Fill</label>
                <div className="color-swatches">{PALETTE_COLORS.map(c=><div key={c} className={`color-swatch${selectedNode.color===c?" selected":""}`} style={{background:c}} onClick={()=>updateNode(selectedNode.id,{color:c})}/>)}</div></div>
              <div className="form-group"><label className="label">Border</label>
                <div className="color-swatches">{PALETTE_BORDERS.map(c=><div key={c} className={`color-swatch${selectedNode.border===c?" selected":""}`} style={{background:c}} onClick={()=>updateNode(selectedNode.id,{border:c})}/>)}</div></div>
              {subsysRPN[selectedNode.label]!==undefined&&<div style={{background:"var(--surface2)",borderRadius:6,padding:"10px 12px"}}>
                <div className="label" style={{marginBottom:4}}>DFMEA LINK</div>
                <div style={{fontSize:12}}>Max RPN: <span style={{color:rpnColor(subsysRPN[selectedNode.label]),fontFamily:"var(--mono)",fontWeight:700}}>{subsysRPN[selectedNode.label]}</span></div>
              </div>}
              <button className="btn btn-danger btn-sm" onClick={deleteSelected}>✕ Delete</button>
            </div>
          </div>}
          {selectedEdge&&!readOnly&&<div>
            <div className="bd-props-title">CONNECTION</div>
            <div className="form-group"><label className="label">Label</label>
              <input value={selectedEdge.label||""} onChange={e=>updateEdge(selectedEdge.id,{label:e.target.value})}/></div>
            <button className="btn btn-danger btn-sm" style={{marginTop:10}} onClick={deleteSelected}>✕ Delete</button>
          </div>}
        </div>
      </div>

      {editEdge&&<div className="modal-overlay" onClick={()=>setEditEdge(null)}>
        <div className="modal modal-sm" onClick={e=>e.stopPropagation()} style={{padding:20}}>
          <div className="modal-header" style={{marginBottom:12}}><span className="modal-title">EDIT CONNECTION LABEL</span>
            <button className="btn btn-ghost btn-sm" onClick={()=>setEditEdge(null)}>✕</button></div>
          <input autoFocus value={edges.find(e=>e.id===editEdge)?.label||""}
            onChange={ev=>updateEdge(editEdge,{label:ev.target.value})}
            onKeyDown={e=>{if(e.key==="Enter"||e.key==="Escape")setEditEdge(null);}}/>
          <div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}>
            <button className="btn btn-primary btn-sm" onClick={()=>setEditEdge(null)}>Done</button>
          </div>
        </div>
      </div>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD
// ─────────────────────────────────────────────────────────────────────────────
function Dashboard({entries}){
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

// ─────────────────────────────────────────────────────────────────────────────
// WORKSHEET  (with comment bubbles + version badge)
// ─────────────────────────────────────────────────────────────────────────────
function Worksheet({entries,onAdd,onEdit,onDelete,onReview,currentUser,diagramSubsystems}){
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

// ─────────────────────────────────────────────────────────────────────────────
// ACTIONS TAB
// ─────────────────────────────────────────────────────────────────────────────
function Actions({entries,onReview}){
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

// ─────────────────────────────────────────────────────────────────────────────
// REFERENCE TAB
// ─────────────────────────────────────────────────────────────────────────────
function Reference(){
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

// ─────────────────────────────────────────────────────────────────────────────
// PROJECT VIEW
// ─────────────────────────────────────────────────────────────────────────────
function ProjectView({projectId,initialDb,currentUser,users,onBack,theme,onToggleTheme}){
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

// ─────────────────────────────────────────────────────────────────────────────
// THEME TOGGLE BUTTON — reusable widget
// ─────────────────────────────────────────────────────────────────────────────
function ThemeToggle({theme,onToggle}){
  const isDark=theme==="dark";
  return(
    <button className="theme-toggle" onClick={onToggle} title={`Switch to ${isDark?"light":"dark"} theme`}>
      <span>{isDark?"🌙":"☀️"}</span>
      <div className={`theme-toggle-track${isDark?" on":""}`}>
        <div className="theme-toggle-thumb"/>
      </div>
      <span style={{fontSize:10}}>{isDark?"Dark":"Light"}</span>
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ROOT
// ─────────────────────────────────────────────────────────────────────────────
export default function App(){
  const [users,setUsers]       = useState(()=>loadUsers()||DEFAULT_USERS);
  const [currentUser,setCurrentUser] = useState(null);
  const [view,setView]         = useState("manager");
  const [projId,setProjId]     = useState(null);
  const [dbSnap,setDbSnap]     = useState(null);
  const [userMgmtOpen,setUserMgmtOpen] = useState(false);
  const [theme,setTheme]       = useState(loadTheme); // "dark" | "light"

  // Apply theme to <html> whenever it changes
  useEffect(()=>{
    document.documentElement.setAttribute("data-theme",theme);
  },[theme]);

  const toggleTheme=()=>{
    const next=theme==="dark"?"light":"dark";
    setTheme(next);
    saveTheme(next);
  };

  const handleLogin=user=>setCurrentUser(user);
  const handleLogout=()=>{setCurrentUser(null);setView("manager");setProjId(null);};

  const persistUsers=list=>{
    setUsers(list);
    saveUsers(list);
  };

  if(!currentUser) return(
    <LoginScreen users={users} onLogin={handleLogin} theme={theme} onToggleTheme={toggleTheme}/>
  );

  const openProject=(id,db)=>{setProjId(id);setDbSnap(db);setView("project");};
  const goBack=()=>{setView("manager");setProjId(null);setDbSnap(null);};

  return(
    <>
      {userMgmtOpen&&(
        <UserManagementModal users={users} onSave={persistUsers} onClose={()=>setUserMgmtOpen(false)}/>
      )}
      {view==="manager"&&(
        <ProjectManager
          onOpen={openProject}
          currentUser={currentUser}
          onLogout={handleLogout}
          onManageUsers={()=>setUserMgmtOpen(true)}
          theme={theme}
          onToggleTheme={toggleTheme}/>
      )}
      {view==="project"&&(
        <ProjectView
          projectId={projId}
          initialDb={dbSnap}
          currentUser={currentUser}
          users={users}
          onBack={goBack}
          theme={theme}
          onToggleTheme={toggleTheme}/>
      )}
    </>
  );
}
