(() => {
  document.addEventListener("ifn:moderation-ready",ev=>{
    if(ev.detail?.role!=="admin")return;
    const sb=window.IFNCommunityAuth?.getClient();
    document.querySelectorAll("[data-user-tools]").forEach(btn=>btn.addEventListener("click",async()=>{
      const card=btn.closest("[data-user-id]");
      const userId=card.dataset.userId;
      const result=card.querySelector("[data-mod-result]");
      const choice=prompt("User action: 24h, 7d, permanent, or unban")?.trim().toLowerCase();
      if(!choice)return;
      const reason=prompt("Reason / moderator note")||"";
      try{
        result.textContent="Applying…";
        if(choice==="unban"){
          const {error}=await sb.rpc("unban_community_user",{p_user_id:userId,p_reason:reason||null});
          if(error)throw error;
        }else{
          let until=null;
          if(choice==="24h")until=new Date(Date.now()+24*3600000).toISOString();
          else if(choice==="7d")until=new Date(Date.now()+7*24*3600000).toISOString();
          else if(choice!=="permanent")throw new Error("Use 24h, 7d, permanent, or unban.");
          const {error}=await sb.rpc("ban_community_user",{p_user_id:userId,p_reason:reason||null,p_banned_until:until});
          if(error)throw error;
        }
        result.textContent="Saved.";
      }catch(err){result.textContent=err.message;}
    }));
  });
})();
