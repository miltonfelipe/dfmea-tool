export function CommentBubble({comments,onClick}){
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
