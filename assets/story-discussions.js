(() => {
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const dt=s=>new Date(s).toLocaleString("en-US",{month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit"});
  const text=s=>esc(s).replace(/\n/g,"<br>");

  async function setup(){
    const articleId=new URLSearchParams(location.search).get("id");
    const stories=[...document.querySelectorAll("#stories > .story")];
    if(!articleId||!stories.length||!window.IFNCommunityAuth||!window.IFNCommunityData)return;
    const user=await IFNCommunityAuth.getUser();

    for(let i=0;i<stories.length;i++){
      const story=stories[i];
      if(story.querySelector("[data-story-discussion]"))continue;
      const threadId=`${articleId}::story-${i+1}`;
      const section=document.createElement("section");
      section.className="story-discussion";
      section.dataset.storyDiscussion="true";
      section.innerHTML=`<div class="eyebrow">PRACTITIONER DISCUSSION</div><div class="story-discussion-compose"></div><div class="story-discussion-thread"><p class="fine">Loading discussion…</p></div>`;
      story.appendChild(section);

      const compose=section.querySelector(".story-discussion-compose");
      if(user){
        compose.innerHTML='<form class="ifn-compose"><textarea name="body" rows="3" maxlength="8000" required placeholder="Comment on this story…"></textarea><button class="btn small" type="submit">Add comment</button><span class="fine" data-status></span></form>';
        compose.querySelector("form").addEventListener("submit",async ev=>{
          ev.preventDefault();const form=ev.currentTarget,status=form.querySelector("[data-status]");
          try{status.textContent="Posting…";await IFNCommunityData.create(threadId,{body:new FormData(form).get("body"),kind:"comment"});form.reset();status.textContent="Posted.";await draw(section,threadId,user)}catch(err){status.textContent=err.message}
        });
      }else{
        compose.innerHTML='<p class="fine">Reading is public. <a href="#field-discussion">Sign in below</a> to comment or reply.</p>';
      }
      await draw(section,threadId,user);
    }
  }

  async function draw(section,threadId,user){
    const out=section.querySelector(".story-discussion-thread");
    try{
      const {comments,profiles}=await IFNCommunityData.thread(threadId);
      const roots=comments.filter(c=>!c.parent_id),replies=comments.filter(c=>c.parent_id);
      if(!roots.length){out.innerHTML='<div class="story-discussion-empty">No comments yet.</div>';return}
      out.innerHTML=roots.map(c=>{
        const p=profiles.get(c.user_id)||{},kids=replies.filter(r=>r.parent_id===c.id);
        return `<article class="ifn-comment"><div class="ifn-comment-head"><strong>${esc(p.display_name||"Identity practitioner")}</strong><span class="fine">${dt(c.created_at)}</span></div>${p.headline?`<div class="fine">${esc(p.headline)}</div>`:""}<div class="ifn-comment-body">${text(c.body)}</div>${user?`<button class="ifn-reply-toggle" type="button" data-reply-toggle="${c.id}">Reply</button><form class="ifn-reply-form" data-reply-form="${c.id}" hidden><textarea name="body" rows="3" maxlength="8000" required placeholder="Reply to this comment…"></textarea><button class="btn small" type="submit">Post reply</button><span class="fine" data-status></span></form>`:""}${kids.length?`<div class="ifn-replies">${kids.map(r=>{const rp=profiles.get(r.user_id)||{};return `<div class="ifn-reply"><div class="ifn-comment-head"><strong>${esc(rp.display_name||"Identity practitioner")}</strong><span class="fine">${dt(r.created_at)}</span></div>${rp.headline?`<div class="fine">${esc(rp.headline)}</div>`:""}<div class="ifn-comment-body">${text(r.body)}</div></div>`}).join("")}</div>`:""}</article>`;
      }).join("");
      out.querySelectorAll("[data-reply-toggle]").forEach(b=>b.addEventListener("click",()=>{const f=out.querySelector(`[data-reply-form="${b.dataset.replyToggle}"]`);if(f)f.hidden=!f.hidden}));
      out.querySelectorAll("[data-reply-form]").forEach(form=>form.addEventListener("submit",async ev=>{
        ev.preventDefault();const f=ev.currentTarget,status=f.querySelector("[data-status]");
        try{status.textContent="Posting…";await IFNCommunityData.create(threadId,{body:new FormData(f).get("body"),parentId:f.dataset.replyForm,kind:"reply"});f.reset();await draw(section,threadId,user)}catch(err){status.textContent=err.message}
      }));
    }catch(err){out.innerHTML=`<div class="story-discussion-empty">${esc(err.message)}</div>`}
  }

  window.IFNStoryDiscussions={setup};
})();
