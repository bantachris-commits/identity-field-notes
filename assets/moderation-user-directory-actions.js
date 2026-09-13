(()=>{
 function wire(){
  const sb=window.IFNCommunityAuth?.getClient();if(!sb)return;
  document.querySelectorAll('[data-save-user]').forEach(btn=>btn.addEventListener('click',async()=>{
   const c=btn.closest('[data-directory-user]'),id=c?.dataset.directoryUser,out=c?.querySelector('[data-user-result]');if(!c||!id||!out)return;
   const role=c.querySelector('[data-user-role]')?.value||'member',flair=c.querySelector('[data-user-flair]')?.value.trim()||'';
   try{
    out.textContent='Saving…';
    const rr=await sb.rpc('set_community_role',{p_user_id:id,p_role:role});if(rr.error)throw rr.error;
    const fr=await sb.rpc('set_community_flair',{p_user_id:id,p_flair:flair});if(fr.error)throw fr.error;
    out.textContent='Saved.';setTimeout(()=>window.IFNUserDirectoryRead?.load(),250);
   }catch(err){out.textContent=err.message||String(err)}
  }));
 }
 document.addEventListener('ifn:user-directory-ready',wire);window.IFNUserDirectoryActions={wire};
})();