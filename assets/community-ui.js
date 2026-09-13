(() => {
  const e=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const dt=s=>new Date(s).toLocaleString("en-US",{month:"short",day:"numeric",hour:"numeric",minute:"2-digit"});

  async function setup(articleId){
    const host=document.querySelector("#giscusHost");
    if(!host)return;
    host.innerHTML='<div data-auth></div><div data-compose></div><div data-thread><p class="fine">Loading discussion…</p></div>';
    await window.IFNCommunityAuth.renderAuth(host.querySelector("[data-auth]"));
    const user=await window.IFNCommunityAuth.getUser();
    const compose=host.querySelector("[data-compose]");
    if(user){
      compose.innerHTML='<form data-post><textarea name="body" rows="4" maxlength="8000" required placeholder="Add field experience, evidence, a correction, or a useful disagreement…"></textarea><button class="btn" type="submit">Post to the field</button><span class="fine" data-status></span></form>';
      compose.querySelector("form").addEventListener("submit",async ev=>{
        ev.preventDefault();const status=ev.currentTarget.querySelector("[data-status]");
        try{status.textContent="Posting…";await window.IFNCommunityData.post(articleId,new FormData(ev.currentTarget).get("body"));ev.currentTarget.reset();status.textContent="Posted.";await draw()}catch(err){status.textContent=err.message}
      });
    }else compose.innerHTML='<p class="fine">Read freely. Sign in with Google or an email magic link to post.</p>';

    async function draw(){
      const out=host.querySelector("[data-thread]");
      try{
        const {comments,profiles}=await window.IFNCommunityData.thread(articleId);
        if(!comments.length){out.innerHTML='<div class="empty"><strong>No comments yet.</strong><br>Be the first practitioner to add something useful.</div>';return}
        out.innerHTML=comments.map(c=>{const p=profiles.get(c.user_id)||{};return `<article class="ifn-comment"><div class="ifn-comment-head"><strong>${e(p.display_name||"Identity practitioner")}</strong><span class="fine">${dt(c.created_at)}</span></div>${p.headline?`<div class="fine">${e(p.headline)}</div>`:""}<p>${e(c.body).replace(/\n/g,"<br>")}</p></article>`}).join("");
      }catch(err){out.innerHTML=`<div class="empty">${e(err.message)}</div>`}
    }
    await draw();
  }

  window.setupComments=setup;
  window.setupCommunity=()=>setup("community-general");
})();
