(() => {
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const fmt=s=>s?new Date(s).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"}):"";

  async function load(){
    const a=window.IFNCommunityAuth;
    const sb=a?.getClient();
    const user=await a?.getUser();
    const gate=document.querySelector("#modGate");
    const app=document.querySelector("#modApp");
    if(!sb||!user){
      gate.innerHTML='<p>Sign in with your moderator account.</p><div id="modAuth"></div>';
      await a?.renderAuth(document.querySelector("#modAuth"));
      return;
    }
    const role=await a.getRole?.(user.id);
    if(!role){gate.innerHTML='<div class="empty"><strong>Moderator access required.</strong></div>';return;}
    gate.remove();
    app.hidden=false;
    document.querySelector("#modRole").textContent=role;
    const cr=await sb.from("comments").select("id,article_id,parent_id,user_id,title,body,kind,status,created_at").order("created_at",{ascending:false}).limit(150);
    if(cr.error)throw cr.error;
    const comments=cr.data||[];
    const ids=[...new Set(comments.map(x=>x.user_id).filter(Boolean))];
    let profiles=[];
    if(ids.length){const pr=await sb.from("profiles").select("id,display_name,headline").in("id",ids);profiles=pr.data||[];}
    const pmap=new Map(profiles.map(p=>[p.id,p]));
    const out=document.querySelector("#moderationList");
    out.innerHTML=comments.length?comments.map(c=>{const p=pmap.get(c.user_id)||{};return `<article class="mod-item" data-comment-id="${esc(c.id)}" data-user-id="${esc(c.user_id)}"><div class="ifn-thread-meta"><span class="pill source">${esc(c.status)}</span><span class="pill source">${esc(c.kind)}</span><span class="fine">${fmt(c.created_at)}</span></div><h3>${esc(c.title||c.article_id||"Community reply")}</h3><p><strong>${esc(p.display_name||"Identity practitioner")}</strong>${p.headline?` · ${esc(p.headline)}`:""}</p><p>${esc(c.body)}</p><div class="mod-actions"><button class="btn small alt" data-mod-state="hidden">Hide</button><button class="btn small alt" data-mod-state="published">Restore</button><button class="btn small alt" data-mod-state="deleted">Delete</button>${role==="admin"?'<button class="btn small alt" data-user-tools>User controls</button>':''}</div><div class="fine" data-mod-result></div></article>`}).join(""):'<div class="empty">No community content yet.</div>';
    document.dispatchEvent(new CustomEvent("ifn:moderation-ready",{detail:{role}}));
  }

  window.IFNModerationRead={load};
})();
