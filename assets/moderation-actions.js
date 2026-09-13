(() => {
  document.addEventListener("ifn:moderation-ready",()=>{
    const sb=window.IFNCommunityAuth?.getClient();
    document.querySelectorAll("[data-mod-state]").forEach(btn=>btn.addEventListener("click",async()=>{
      const card=btn.closest("[data-comment-id]");
      const result=card.querySelector("[data-mod-result]");
      const reason=prompt("Optional moderation note")||"";
      try{
        result.textContent="Saving…";
        const {error}=await sb.rpc("moderate_comment",{p_comment_id:card.dataset.commentId,p_status:btn.dataset.modState,p_reason:reason||null});
        if(error)throw error;
        result.textContent="Saved. Refreshing…";
        setTimeout(()=>location.reload(),250);
      }catch(err){result.textContent=err.message;}
    }));
  });
})();
