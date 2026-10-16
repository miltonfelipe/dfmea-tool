import { useState } from "react";
import { api } from "../lib/api.js";
import { ThemeToggle } from "../components/ThemeToggle.jsx";

export function LoginScreen({onLogin, notice, theme, onToggleTheme}){
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);

  const handleLogin=async(e)=>{
    e.preventDefault();
    if(!username.trim()||!password){setError("Enter your username and password.");return;}
    setBusy(true);setError("");
    try{onLogin(await api.login(username.trim(),password));}
    catch(err){setError(err.status===401?"Invalid username or password.":err.message);}
    finally{setBusy(false);}
  };

  return(
    <div className="login-screen">

      <div className="login-box">
        <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:4}}>
          <div className="login-logo">DFMEA<span>·TOOL</span></div>
          <ThemeToggle theme={theme} onToggle={onToggleTheme}/>
        </div>
        <div className="login-sub">Electronics / Industrial Machinery · v2</div>

        {(error||notice)&&<div className="login-error">{error||notice}</div>}

        <form onSubmit={handleLogin} style={{display:"flex",flexDirection:"column",gap:14}}>
          <div className="form-group">
            <label className="label">Username</label>
            <input value={username} onChange={e=>setUsername(e.target.value)} autoFocus autoComplete="username" placeholder="username"/>
          </div>
          <div className="form-group">
            <label className="label">Password</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} autoComplete="current-password" placeholder="password"/>
          </div>
          <button className="btn btn-primary" type="submit" disabled={busy} style={{justifyContent:"center"}}>{busy?"Signing in…":"Sign In"}</button>
        </form>
      </div>
    </div>
  );
}
