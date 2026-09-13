(() => {
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const dt=s=>new Date(s).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
  const text=s=>esc(s).replace(/\n/g,"<br>");

  function load(src){return new Promise((resolve,reject)=>{const s=document.createElement("script");s.src=src;s.onload=resolve;s.onerror=reject;document.head.appendChild(s)})}
  async function deps(){
    if(!window.supabase?.createClient)await load("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
    if(!window.google?.accounts?.id)await load("https://accounts.google.com/gsi/client");
    if(!window.IFNCommunityAuth)await load("assets/community-auth.js?v=20260913-2");
    if(!window.IFNCommunityData)await load("assets/community-data.js?v=20260913-2");
  }
  async function articleId(){
    const q=new URLSearchParams(location.search).get("id");
    if(q)return q;
    const data=await fetch("data/articles.json",{cache:"no-store"}).then(r=>r.json());
    const guest=a=>a?.contentType==="guest"||a?.humanWritten===true;
    return (data.find(x=>x.featured&&!guest(x))||data.find(x=>!guest(x))||data[0])?.id||null;
  }

  async function setup(){
    try{await deps()}catch(e){return}
    const id=await articleId();
    const stories=[...document.querySelectorAll("#stories > .story")];
    if(!id||!stories.length)return;
    const user=await IFNCommunityAuth.getUser();
    for(let i=0;i<stories.length;i++)await install(stories[i],`${id}::story-${i+1}`,user);
  }

  async function install(story,threadId,user){
    if(story.querySelector("[data-story-discussion]"))return;
    const panel=document.createElement("details");
    panel.className="story-discussion";
    panel.dataset.storyDiscussion="true";
    panel.innerHTML='<summary><span>Discuss this story</span><span class="story-discussion-count" data-count>Loading…</span></summary><div class="story-discussion-body"><div class="story-discussion-compose"></div><div class="story-discussion-thread"><p class="fine">Loading discussion…</p></div></div>';
    story.appendChild(panel);
    const compose=panel.querySelector(".story-discussion-compose");
    if(user){
      compose.innerHTML='<form class="ifn-compose"><textarea name="body" rows="3" maxlength="8000" required placeholder="Add context, evidence, field experience, or a useful disagreement…"></textarea><button class="btn small" type="submit">Add comment</button><span class="fine" data-status></span></form>';
      compose.querySelector("form").addEventListener("submit",async ev=>{ev.preventDefault();const f=ev.currentTarget,s=f.querySelector("[data-status]");try{s.textContent="Posting…";await IFNCommunityData.create(threadId,{body:new FormData(f).get("body"),kind:"comment"});f.reset();s.textContent="Posted.";await draw(panel,threadId,user)}catch(err){s.textContent=err.message}});
    }else{
      compose.innerHTML='<div class="story-discussion-signin"><p class="fine">Reading is public. Sign in to comment or reply.</p><button class="btn small alt" type="button" data-story-signin>Sign in to comment</button><div data-story-auth></div></div>';
      compose.querySelector("[data-story-signin]").addEventListener("click",async ev=>{ev.currentTarget.remove();await IFNCommunityAuth.renderAuth(compose.querySelector("[data-story-auth]"))});
    }
    await draw(panel,threadId,user);
  }

  async function draw(panel,threadId,user){
    const out=panel.querySelector(".story-discussion-thread"),count=panel.querySelector("[data-count]");
    try{
      const {comments,profiles}=await IFNCommunityData.thread(threadId);
      count.textContent=comments.length?`${comments.length} comment${comments.length===1?"":"s"}`:"Start discussion";
      const roots=comments.filter(c=>!c.parent_id),replies=comments.filter(c=>c.parent_id);
      if(!roots.length){out.innerHTML='<div class="story-discussion-empty">No comments yet. You can be first.</div>';return}
      out.innerHTML=roots.map(c=>{const p=profiles.get(c.user_id)||{},kids=replies.filter(r=>r.parent_id===c.id);return `<article class="ifn-comment"><div class="ifn-comment-head"><strong>${esc(p.display_name||"Identity practitioner")}</strong><span class="fine">${dt(c.created_at)}</span></div>${p.headline?`<div class="fine">${esc(p.headline)}</div>`:""}<div class="ifn-comment-body">${text(c.body)}</div>${user?`<button class="ifn-reply-toggle" type="button" data-reply-toggle="${c.id}">Reply</button><form class="ifn-reply-form" data-reply-form="${c.id}" hidden><textarea name="body" rows="3" maxlength="8000" required placeholder="Reply to this comment…"></textarea><button class="btn small" type="submit">Post reply</button><span class="fine" data-status></span></form>`:""}${kids.length?`<div class="ifn-replies">${kids.map(r=>{const rp=profiles.get(r.user_id)||{};return `<div class="ifn-reply"><div class="ifn-comment-head"><strong>${esc(rp.display_name||"Identity practitioner")}</strong><span class="fine">${dt(r.created_at)}</span></div><div class="ifn-comment-body">${text(r.body)}</div></div>`}).join("")}</div>`:""}</article>`}).join("");
      out.querySelectorAll("[data-reply-toggle]").forEach(b=>b.addEventListener("click",()=>{const f=out.querySelector(`[data-reply-form="${b.dataset.replyToggle}"]`);if(f)f.hidden=!f.hidden}));
      out.querySelectorAll("[data-reply-form]").forEach(f=>f.addEventListener("submit",async ev=>{ev.preventDefault();const form=ev.currentTarget,s=form.querySelector("[data-status]");try{s.textContent="Posting…";await IFNCommunityData.create(threadId,{body:new FormData(form).get("body"),parentId:form.dataset.replyForm,kind:"reply"});form.reset();await draw(panel,threadId,user)}catch(err){s.textContent=err.message}}));
    }catch(err){count.textContent="Discussion unavailable";out.innerHTML=`<div class="story-discussion-empty">${esc(err.message)}</div>`}
  }

  window.IFNStoryDiscussions={setup};
})();