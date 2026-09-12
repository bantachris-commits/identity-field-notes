(()=>{
  const isGuest=a=>a?.contentType==="guest"||a?.humanWritten===true;
  const esc=s=>String(s??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const fmtDate=s=>new Date(s+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
  let articlesPromise=null;
  function articles(){return articlesPromise||(articlesPromise=fetch("data/articles.json",{cache:"no-store"}).then(r=>r.json()))}

  function injectNav(){
    document.querySelectorAll(".nav-menu").forEach(menu=>{
      if(menu.querySelector('a[href="guest-voices.html"]'))return;
      const a=document.createElement("a");a.href="guest-voices.html";a.textContent="Guest Voices";
      const sponsor=menu.querySelector('a[href="sponsor.html"]');
      menu.insertBefore(a,sponsor||null);
    });
  }

  function guestCard(a){
    const author=a.author||{};
    return `<article class="card guest-card"><div class="eyebrow">HUMAN-WRITTEN · ${fmtDate(a.date)}</div><h3><a href="article.html?id=${encodeURIComponent(a.id)}">${esc(a.title)}</a></h3><div class="author-line"><strong>${esc(author.name||"Guest contributor")}</strong>${author.role?`<span>${esc(author.role)}</span>`:""}</div><p>${esc(a.dek||"")}</p><div class="card-foot"><a class="readmore" href="article.html?id=${encodeURIComponent(a.id)}">Read guest voice →</a></div></article>`;
  }

  async function renderGuestPage(){
    const host=document.querySelector("#guestVoicesList");if(!host)return;
    const data=(await articles()).filter(isGuest).sort((a,b)=>b.date.localeCompare(a.date));
    host.innerHTML=data.length?data.map(guestCard).join(""):`<div class="empty"><strong>Guest Voices is open, but I’m not inventing contributors to make the page look busy.</strong><br><br>This section is reserved for real identity practitioners, researchers, architects, operators and other humans with something useful to say. Guest pieces will also appear in the main article feed and will always be clearly labeled HUMAN-WRITTEN.</div>`;
  }

  async function injectHomeSection(){
    if(!document.querySelector("#archivePreview")||document.querySelector("#guestPreview"))return;
    const data=(await articles()).filter(isGuest).sort((a,b)=>b.date.localeCompare(a.date));
    const section=document.createElement("section");section.className="shell";section.id="guestPreview";
    section.innerHTML=`<div class="section-head"><div><h2>Guest Voices</h2><p>Real humans. Real field experience. No robot byline.</p></div><a href="guest-voices.html">All guest voices →</a></div><div class="cards ${data.length===1?'two':''}">${data.length?data.slice(0,3).map(guestCard).join(""):`<div class="card guest-card"><div class="eyebrow">HUMANS WANTED</div><h3>Not every useful thought needs to come from a model.</h3><p>Guest Voices is for practitioners, researchers and operators who want to add an original article, hard-earned lesson, counterpoint or field note to the feed.</p><a class="readmore" href="guest-voices.html">How Guest Voices works →</a></div>`}</div>`;
    const community=[...document.querySelectorAll("main > section.shell")].find(x=>x.querySelector("h2")?.textContent.trim()==="Community layer");
    if(community)community.before(section);else document.querySelector("main")?.appendChild(section);
  }

  async function annotateFeeds(){
    const data=await articles();const guests=new Map(data.filter(isGuest).map(a=>[a.id,a]));if(!guests.size)return;
    const decorate=()=>{
      document.querySelectorAll('a[href^="article.html?id="]').forEach(link=>{
        let id;try{id=new URL(link.href,location.href).searchParams.get("id")}catch(e){return}
        const a=guests.get(id);if(!a)return;
        const card=link.closest(".card,.archive-item");if(!card||card.querySelector(".human-feed-label"))return;
        const label=document.createElement("div");label.className="eyebrow human-feed-label";label.textContent=`HUMAN-WRITTEN // ${a.author?.name||"Guest contributor"}`;
        const h=card.querySelector("h3");if(h)h.before(label);
        card.classList.add("guest-card");
      });
    };
    decorate();
    const obs=new MutationObserver(decorate);obs.observe(document.body,{childList:true,subtree:true});
    setTimeout(()=>obs.disconnect(),8000);
  }

  async function enhanceGuestArticle(){
    if(!location.pathname.endsWith("article.html"))return;
    const id=new URLSearchParams(location.search).get("id");
    const a=(await articles()).find(x=>x.id===id&&isGuest(x));if(!a)return;
    let tries=0;
    const apply=()=>{
      const hero=document.querySelector("#hero");if(!hero?.querySelector("h1")){if(tries++<50)setTimeout(apply,100);return}
      const author=a.author||{};
      const meta=hero.querySelector(".meta");if(meta){const spans=meta.querySelectorAll("span");if(spans[2])spans[2].textContent="HUMAN-WRITTEN"}
      hero.querySelector(".transparency-box")?.remove();
      if(!hero.querySelector(".author-line")){
        const line=document.createElement("div");line.className="author-line";
        line.innerHTML=`<span class="pill human">HUMAN-WRITTEN</span><strong>${esc(author.name||"Guest contributor")}</strong>${author.role?`<span>${esc(author.role)}</span>`:""}${author.url?`<a href="${esc(author.url)}" target="_blank" rel="noopener noreferrer">About the author ↗</a>`:""}`;
        (hero.querySelector(".meta")||hero.querySelector(".lede"))?.after(line);
      }
      document.querySelectorAll(".story-tools .pill.ai").forEach(p=>{p.className="pill human";p.textContent="Human contribution"});
      document.querySelectorAll(".story .why strong").forEach(x=>{if(x.textContent.trim()==="WHY IT MATTERS")x.textContent="AUTHOR'S TAKE"});
    };
    apply();
  }

  function boot(){injectNav();renderGuestPage();injectHomeSection();annotateFeeds();enhanceGuestArticle()}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})();
