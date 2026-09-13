(() => {
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const dt=s=>new Date(s).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
  const text=s=>esc(s).replace(/\n/g,"<br>");

  async function setup(articleId){
    const host=document.querySelector("#giscusHost");
    if(!host)return;
    host.innerHTML='<div data-auth></div><div data-compose></div><div data-thread><p class="fine">Loading discussion…</p></div>';
    await IFNCommunityAuth.renderAuth(host.querySelector("[data-auth]"));
    const user=await IFNCommunityAuth.getUser(),compose=host.querySelector("[data-compose]");
    if(user){
      compose.innerHTML='<form class="ifn-compose" data-new-comment><textarea name="body" rows="4" maxlength="8000" required placeholder="Add field experience, evidence, a correction, or a useful disagreement…"></textarea><button class="btn" type="submit">Comment on this note</button><span class="fine" data-status></span></form>';
      compose.querySelector("form").addEventListener("submit",async ev=>{
        ev.preventDefault();const form=ev.currentTarget,status=form.querySelector("[data-status]");
        try{status.textContent="Posting…";await IFNCommunityData.create(articleId,{body:new FormData(form).get("body"),kind:"comment"});form.reset();status.textContent="Posted.";await draw()}catch(err){status.textContent=err.message}
      });
    }else compose.innerHTML='<p class="fine ifn-discussion-intro">Reading is public. Sign in to comment or reply.</p>';

    async function draw(){
      const out=host.querySelector("[data-thread]");
      try{
        const {comments,profiles}=await IFNCommunityData.thread(articleId);
        const roots=comments.filter(c=>!c.parent_id),replies=comments.filter(c=>c.parent_id);
        if(!roots.length){out.innerHTML='<div class="empty"><strong>No comments yet.</strong><br>Be the first practitioner to add something useful.</div>';return}
        out.innerHTML=roots.map(c=>{
          const p=profiles.get(c.user_id)||{},kids=replies.filter(r=>r.parent_id===c.id);
          return `<article class="ifn-comment"><div class="ifn-comment-head"><strong>${esc(p.display_name||"Identity practitioner")}</strong><span class="fine">${dt(c.created_at)}</span></div>${p.headline?`<div class="fine">${esc(p.headline)}</div>`:""}<div class="ifn-comment-body">${text(c.body)}</div>${user?`<button class="ifn-reply-toggle" type="button" data-reply-toggle="${c.id}">Reply</button><form class="ifn-reply-form" data-reply-form="${c.id}" hidden><textarea name="body" rows="3" maxlength="8000" required placeholder="Reply to this comment…"></textarea><button class="btn small" type="submit">Post reply</button><span class="fine" data-status></span></form>`:""}${kids.length?`<div class="ifn-replies">${kids.map(r=>{const rp=profiles.get(r.user_id)||{};return `<div class="ifn-reply"><div class="ifn-comment-head"><strong>${esc(rp.display_name||"Identity practitioner")}</strong><span class="fine">${dt(r.created_at)}</span></div>${rp.headline?`<div class="fine">${esc(rp.headline)}</div>`:""}<div class="ifn-comment-body">${text(r.body)}</div></div>`}).join("")}</div>`:""}</article>`
        }).join("");
        wireReplies(out);
      }catch(err){out.innerHTML=`<div class="empty">${esc(err.message)}</div>`}
    }

    function wireReplies(out){
      out.querySelectorAll("[data-reply-toggle]").forEach(b=>b.addEventListener("click",()=>{const f=out.querySelector(`[data-reply-form="${b.dataset.replyToggle}"]`);if(f)f.hidden=!f.hidden}));
      out.querySelectorAll("[data-reply-form]").forEach(form=>form.addEventListener("submit",async ev=>{
        ev.preventDefault();const f=ev.currentTarget,status=f.querySelector("[data-status]");
        try{status.textContent="Posting…";await IFNCommunityData.create(articleId,{body:new FormData(f).get("body"),parentId:f.dataset.replyForm,kind:"reply"});f.reset();await draw()}catch(err){status.textContent=err.message}
      }));
    }
    await draw();
  }

  window.setupComments=setup;
})();
