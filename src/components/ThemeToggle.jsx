export function ThemeToggle({theme,onToggle}){
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
