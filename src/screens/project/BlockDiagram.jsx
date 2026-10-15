import { useState, useMemo, useEffect, useRef, useCallback, useEffectEvent } from "react";
import { NODE_TYPES, PALETTE_COLORS, PALETTE_BORDERS } from "../../lib/constants.js";
import { rpnColor, randomCoord, uid } from "../../lib/utils.js";
import { DEMO_DIAGRAM } from "../../data/defaults.js";

export function BlockDiagram({diagram,onChange,entries,readOnly}){
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
