export const SEV_LABELS=["—","Negligible","Minor","Low","Moderate","Moderate+","Significant","High","Critical","Catastrophic","Safety"];
export const OCC_LABELS=["—","Extremely Unlikely","Remote","Very Low","Low","Moderate-Low","Moderate","Moderate-High","High","Very High","Almost Certain"];
export const DET_LABELS=["—","Almost Certain","Very High","High","Moderate-High","Moderate","Low","Very Low","Remote","Extremely Remote","Undetectable"];
export const FAILURE_CATEGORIES=["Short Circuit","Open Circuit","Overvoltage","Overcurrent","Thermal Runaway","Signal Integrity","EMI/EMC","Corrosion","Mechanical Stress","Firmware Fault","Communication Loss","Power Loss","ESD Damage","Component Drift","Other"];
export const SUBSYSTEMS=["Power Supply","Motor Drive","Control Logic","I/O Interface","Communication","Sensors","Actuators","Protection Circuit","HMI","Firmware","Safety Module","Other"];
export const NODE_TYPES=[
  {type:"subsystem",label:"Subsystem",  icon:"⬜",defaultColor:"#1e3a5f",defaultBorder:"#00d4ff"},
  {type:"input",    label:"Input",       icon:"→", defaultColor:"#1a3020",defaultBorder:"#22c55e"},
  {type:"output",   label:"Output",      icon:"←", defaultColor:"#3a1f10",defaultBorder:"#f97316"},
  {type:"external", label:"External Sys",icon:"◈", defaultColor:"#2a1f3a",defaultBorder:"#a855f7"},
  {type:"power",    label:"Power Rail",  icon:"⚡", defaultColor:"#3a2f00",defaultBorder:"#ffb020"},
  {type:"note",     label:"Note",        icon:"📝",defaultColor:"#1a1a2e",defaultBorder:"#475569"},
];
export const PALETTE_COLORS=["#1e3a5f","#1a3020","#3a1f10","#2a1f3a","#3a2f00","#1a1a2e","#1f2937","#2d1b1b"];
export const PALETTE_BORDERS=["#00d4ff","#22c55e","#f97316","#a855f7","#ffb020","#475569","#e2e8f0","#ff4444"];
export const ROLES={PM:"Project Manager",RV:"Reviewer"};
export const ROLE_COLORS={PM:"#00d4ff",RV:"#a855f7"};
