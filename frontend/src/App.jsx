import { useState, useEffect } from "react";
import "./App.css";
import { loadTheme, saveTheme } from "./lib/storage.js";
import { api, hasToken, setUnauthorizedHandler } from "./lib/api.js";
import { UserManagementModal } from "./components/modals/UserManagementModal.jsx";
import { LoginScreen } from "./screens/LoginScreen.jsx";
import { ProjectManager } from "./screens/ProjectManager.jsx";
import { ProjectView } from "./screens/ProjectView.jsx";

export default function App(){
  const [users,setUsers]       = useState([]);
  const [currentUser,setCurrentUser] = useState(null);
  const [restoring,setRestoring] = useState(hasToken); // checking a saved token
  const [sessionMsg,setSessionMsg] = useState("");
  const [view,setView]         = useState("manager");
  const [projId,setProjId]     = useState(null);
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

  const resetSession=()=>{setCurrentUser(null);setUsers([]);setView("manager");setProjId(null);setUserMgmtOpen(false);};

  // Any 401 from the API (expired token, account disabled) returns to login.
  useEffect(()=>{
    setUnauthorizedHandler(()=>{resetSession();setSessionMsg("Your session has expired. Please sign in again.");});
    return()=>setUnauthorizedHandler(null);
  },[]);

  // Resume a session from a token saved earlier in this tab.
  useEffect(()=>{
    if(!hasToken())return;
    api.me().then(setCurrentUser).catch(()=>api.logout()).finally(()=>setRestoring(false));
  },[]);

  // Users are needed for avatars, comment authors and user management.
  useEffect(()=>{
    if(currentUser)api.listUsers().then(setUsers).catch(e=>console.error(e));
  },[currentUser]);

  const handleLogin=user=>{setSessionMsg("");setCurrentUser(user);};
  const handleLogout=()=>{api.logout();resetSession();};

  // Apply the modal's edits: create new users, patch changed ones. Compared
  // against fresh server state so retrying after a partial failure is safe.
  const saveUsers=async list=>{
    const current=await api.listUsers();
    const byId=Object.fromEntries(current.map(u=>[u.id,u]));
    const taken=new Set(current.map(u=>u.username));
    for(const u of list){
      if(u.isNew){
        if(taken.has(u.username))continue;
        await api.createUser({name:u.name,username:u.username,password:u.password,role:u.role,color:u.color});
      }else{
        const old=byId[u.id];
        const patch={};
        for(const k of ["role","active"])if(old&&old[k]!==u[k])patch[k]=u[k];
        if(Object.keys(patch).length)await api.updateUser(u.id,patch);
      }
    }
    setUsers(await api.listUsers());
    setUserMgmtOpen(false);
  };

  if(restoring) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",background:"var(--bg)",color:"var(--muted)",fontFamily:"var(--mono)"}}>
      Loading…
    </div>
  );

  if(!currentUser) return(
    <LoginScreen onLogin={handleLogin} notice={sessionMsg} theme={theme} onToggleTheme={toggleTheme}/>
  );

  const openProject=id=>{setProjId(id);setView("project");};
  const goBack=()=>{setView("manager");setProjId(null);};

  return(
    <>
      {userMgmtOpen&&(
        <UserManagementModal users={users} currentUser={currentUser} onSave={saveUsers} onClose={()=>setUserMgmtOpen(false)}/>
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
          currentUser={currentUser}
          users={users}
          onBack={goBack}
          theme={theme}
          onToggleTheme={toggleTheme}/>
      )}
    </>
  );
}
