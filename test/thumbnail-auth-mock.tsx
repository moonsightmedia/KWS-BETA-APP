import {useSyncExternalStore} from 'react';
let user:null|{id:string}=null;
const listeners=new Set<()=>void>();
export function useAuth(){
 const current=useSyncExternalStore(listener=>{listeners.add(listener);return()=>listeners.delete(listener);},()=>user);
 return {user:current,loading:false,signIn:async()=>{user={id:'fixture-setter'};listeners.forEach(listener=>listener());}};
}
