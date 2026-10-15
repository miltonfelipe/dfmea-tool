import { useState } from "react";
import { ROLES, ROLE_COLORS } from "../lib/constants.js";
import { UserAvatar } from "../components/UserAvatar.jsx";
import { ThemeToggle } from "../components/ThemeToggle.jsx";

export function LoginScreen({users, onLogin, theme, onToggleTheme}){
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
