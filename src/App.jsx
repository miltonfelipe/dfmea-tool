import { useState, useEffect } from "react";
import "./App.css";
import { loadUsers, saveUsers, loadTheme, saveTheme } from "./lib/storage.js";
import { DEFAULT_USERS } from "./data/defaults.js";
import { UserManagementModal } from "./components/modals/UserManagementModal.jsx";
import { LoginScreen } from "./screens/LoginScreen.jsx";
import { ProjectManager } from "./screens/ProjectManager.jsx";
import { ProjectView } from "./screens/ProjectView.jsx";

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
