import { initials } from "../lib/utils.js";

export function UserAvatar({user,size=28}){
  return <div className="user-avatar" style={{width:size,height:size,fontSize:size*0.4,background:user.color+"33",color:user.color,border:`1px solid ${user.color}44`}}>{initials(user.name)}</div>;
}
