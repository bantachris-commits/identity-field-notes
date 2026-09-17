
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const esc=s=>String(s??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
function safeHttpUrl(raw){try{const u=new URL(String(raw||"").trim());return (u.protocol==="http:"||u.protocol==="https:")?u.href:""}catch(e){return ""}}
function plainText(raw){let value=String(raw??"");const t=document.createElement("textarea");for(let i=0;i<4;i++){t.innerHTML=value;const decoded=t.value;if(decoded===value)break;value=decoded}return value.replace(/<[^>]*>/g," ").replace(/<[^>]*$/g," ").replace(/\\([\\`*_{}\[\]()#+.!>-])/g,"$1").replace(/!\[([^\]]*)\]\([^)]*\)/g,"$1").replace(/\[([^\]]+)\]\([^)]*\)/g,"$1").replace(/(^|\s)#{1,6}\s*/g," ").replace(/\*\*|__|`/g,"").replace(/\)(?=\s|$)/g,"").replace(/\s+/g," ").trim()}
const CORE_TOPICS=["PAM","IAM","IGA","NHI","ITDR","AUTHZ"];
async function loadJSON(p){const r=await fetch(p,{cache:"no-store"});if(!r.ok)throw new Error(`${p}: ${r.status}`);return r.json()}
function fmtDate(s){return new Date(s+"T12:00:00").toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"})}
function topicHref(t){return `archive.html?tag=${encodeURIComponent(t)}`}
function tags(a){return `<div class="tags">${(a||[]).map(x=>`<a class="tag" href="${topicHref(x)}">${esc(x)}</a>`).join("")}</div>`}
function articleHref(a){return `article.html?id=${encodeURIComponent(a.id)}`}
// Always share the dated IFN note, never the rotating homepage or source URL.
function noteShareUrl(a,index=null){
 const url=new URL(articleHref(a),"https://identityfieldnotes.com/");
 if(Number.isInteger(index)&&index>=0)url.hash=`story-${index+1}`;
 return url.href;
}
function shareTools(a,index=null){
 const specific=Number.isInteger(index)&&index>=0;
 const title=String((specific?a.stories?.[index]?.title:a.title)||a.title||"Identity Field Notes").replace(/[\r\n]+/g," ").trim();
 const url=noteShareUrl(a,index), label=specific?"Share this story":"Share this note";
 const linkedIn=`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
 const x=`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(`${title} | Identity Field Notes`)}`;
 const email=`mailto:?subject=${encodeURIComponent(`${title} | Identity Field Notes`)}&body=${encodeURIComponent(`${title}\n\nRead on Identity Field Notes:\n${url}`)}`;
 return `<div class="ifn-share" role="group" aria-label="${label}" data-share-url="${esc(url)}" data-share-title="${esc(title)}">
 <span class="ifn-share-label" aria-hidden="true">Share:</span>
 <button type="button" class="ifn-share-link" data-share-action="copy" aria-label="Copy IFN link: ${esc(title)}">Copy link</button>
 <a class="ifn-share-link" href="${esc(linkedIn)}" target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn: ${esc(title)} (opens a new tab)">LinkedIn ↗</a>
 <a class="ifn-share-link" href="${esc(x)}" target="_blank" rel="noopener noreferrer" aria-label="Share on X: ${esc(title)} (opens a new tab)">X ↗</a>
 <a class="ifn-share-link" href="${esc(email)}" aria-label="Share by email: ${esc(title)}">Email</a>
 ${typeof navigator.share==="function"?'<button type="button" class="ifn-share-link" data-share-action="native">More…</button>':""}
 <span class="ifn-share-status" role="status" aria-live="polite"></span>
 <input class="ifn-share-fallback" type="text" readonly hidden value="${esc(url)}" aria-label="IFN link to copy manually">
 </div>`;
}
async function handleShareClick(event){
 const button=event.target.closest?.("[data-share-action]");
 if(!button)return;
 const group=button.closest(".ifn-share");
 if(!group)return;
 const {shareUrl:url,shareTitle:title}=group.dataset;
 const status=group.querySelector(".ifn-share-status"),fallback=group.querySelector(".ifn-share-fallback");
 status.textContent="";
 fallback.hidden=true;
 try{
  if(button.dataset.shareAction==="native"&&typeof navigator.share==="function"){
   await navigator.share({title:`${title} | Identity Field Notes`,text:title,url});
  }else{
   if(!navigator.clipboard?.writeText)throw new Error("Clipboard unavailable");
   await navigator.clipboard.writeText(url);
   status.textContent="IFN link copied.";
  }
 }catch(error){
  if(error.name==="AbortError")return; // Closing the native share sheet is not an error.
  fallback.hidden=false;
  fallback.focus();
  fallback.select();
  status.textContent="Select and copy this IFN link.";
 }
}
function scrollToSharedStory(){
 if(!/^#story-[1-9]\d*$/.test(location.hash))return;
 const target=document.getElementById(location.hash.slice(1));
 if(!target)return;
 requestAnimationFrame(()=>{
  target.scrollIntoView({block:"start"});
  target.focus({preventScroll:true});
 });
}
document.addEventListener("click",handleShareClick);
window.addEventListener("hashchange",scrollToSharedStory);
function isGuest(a){return a?.contentType==="guest"||a?.humanWritten===true}
function disclosureBadges(s,human=false){return human?`<div class="story-tools"><span class="pill human">Human-written</span><span class="pill source">${esc(s.confidence||"Guest contribution")}</span></div>`:`<div class="story-tools"><span class="pill ai">AI summary</span><span class="pill source">${esc(s.confidence||"Source linked")}</span></div>`}
function story(s,human=false,a=null,index=0){const takeaway=human?"AUTHOR'S TAKE":"WHY IT MATTERS",url=safeHttpUrl(s.url);return `<article class="story ${human?'guest-story':''}"${a?` id="story-${index+1}" tabindex="-1"`:""}><div class="eyebrow">${esc(s.kicker)}</div><h2>${esc(s.title)}</h2>${disclosureBadges(s,human)}<p>${esc(s.summary)}</p><div class="why"><strong>${takeaway}</strong><div>${esc(s.why)}</div></div><div class="source-line">SOURCE // ${esc(s.source||"Original source")}</div>${url?`<p><a class="readmore" href="${esc(url)}" target="_blank" rel="noopener noreferrer">${human?'Author link':'Read the original source'} ↗</a></p>`:""}${a?shareTools(a,index):""}</article>`}
function authorLine(a){if(!a?.author?.name)return "";const url=safeHttpUrl(a.author.url),name=url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"><strong>${esc(a.author.name)}</strong></a>`:`<strong>${esc(a.author.name)}</strong>`;return `<div class="author-line"><span>BY ${name}</span>${a.author.role?`<span>${esc(a.author.role)}</span>`:""}</div>`}
function newsletterForm(){
 const c=window.IFN_CONFIG?.newsletter||{}, user=c.buttondownUsername?.trim();
 if(!user)return `<div class="giscus-placeholder"><strong>Email digest launching with the site.</strong><br>Until then, <a class="readmore" href="feed.xml">RSS is already wired up →</a></div>`;
 return `<form action="https://buttondown.com/api/emails/embed-subscribe/${encodeURIComponent(user)}" method="post"><input type="email" name="email" required placeholder="you@company.com" aria-label="Email address"><input type="hidden" value="1" name="embed">${c.tag?`<input type="hidden" name="tag" value="${esc(c.tag)}">`:""}<button class="btn" type="submit">Join the digest</button></form>`;
}
function setupNewsletter(){ $$("[data-newsletter]").forEach(x=>x.innerHTML=newsletterForm()) }
function setupAnalytics(){const d=window.IFN_CONFIG?.analytics?.plausibleDomain;if(!d)return;const s=document.createElement("script");s.defer=true;s.dataset.domain=d;s.src="https://plausible.io/js/script.js";document.head.appendChild(s)}
function setupTopicBar(){const host=$(".topline .shell");if(!host)return;const current=new URLSearchParams(location.search).get("tag")||"";host.classList.add("topic-links");host.innerHTML=CORE_TOPICS.map((t,i)=>`${i?'<span class="topic-sep" aria-hidden="true">·</span>':''}<a class="topic-link" href="${topicHref(t)}"${current.toLowerCase()===t.toLowerCase()?' aria-current="page"':''}>${t}</a>`).join("")+`<span class="topic-tail">// SIGNALS FROM THE IDENTITY SECURITY FIELD</span>`}
function setupGlobalNav(){const desktop=$("header nav");if(desktop&&!desktop.querySelector('a[href="guest-voices.html"]')){const a=document.createElement("a");a.href="guest-voices.html";a.textContent="Guest Voices";const more=desktop.querySelector(".nav-more");desktop.insertBefore(a,more||null)}$$('.mobile-nav .nav-menu').forEach(menu=>{if(!menu.querySelector('a[href="guest-voices.html"]')){const a=document.createElement("a");a.href="guest-voices.html";a.textContent="Guest Voices";const jobs=menu.querySelector('a[href="jobs.html"]');menu.insertBefore(a,jobs||null)}})}
async function renderHome(){
 const data=await loadJSON("data/articles.json"), a=data.find(x=>x.featured&&!isGuest(x))||data.find(x=>!isGuest(x))||data[0];
 $("#hero").innerHTML=`<div class="eyebrow">${esc(a.edition)}</div><h1>${esc(a.title)}</h1><p class="lede">${esc(a.dek)}</p><div class="meta"><span>${fmtDate(a.date)}</span><span>${esc(a.readTime)}</span><span>${esc(a.generatedBy||"AI-assisted")}</span></div>${tags(a.tags)}<div class="transparency-box"><span class="stamp">AI SLOP, WITH RECEIPTS</span><p><strong>Yes, AI did the reading and wrote the first pass.</strong> That is the point. Original sources are linked, AI-generated text is labeled, and the community can challenge or correct it. Use my credits so you don’t have to.</p></div>`;
 $("#stories").innerHTML=a.stories.map((s,i)=>story(s,false,a,i)).join("");
 scrollToSharedStory();
 $("#archivePreview").innerHTML=data.filter(x=>x.id!==a.id).slice(0,3).map(x=>`<article class="card ${isGuest(x)?'guest-card':''}"><div class="eyebrow">${isGuest(x)?'GUEST VOICE · ':''}${fmtDate(x.date)}</div><h3><a href="${articleHref(x)}">${esc(x.title)}</a></h3>${isGuest(x)?authorLine(x):''}<p>${esc(x.dek)}</p>${tags(x.tags)}<div class="card-foot"><a class="readmore" href="${articleHref(x)}">${isGuest(x)?'Read guest voice':'Read note'} →</a></div></article>`).join("")||`<div class="empty">More notes will appear here as the automation publishes.</div>`;
 const radar=await loadJSON("data/radar.json");$("#radarPreview").innerHTML=radar.slice(0,3).map(radarCard).join("");
 const guestHost=$("#guestVoicesPreview");if(guestHost)renderGuestVoices("#guestVoicesPreview",3);
 setupNewsletter();
}
function radarTiming(x){
  const stamp=x.firstSeenAt?new Date(x.firstSeenAt):null;
  const posted=stamp&&!Number.isNaN(stamp.getTime())
    ? `Added to IFN <time datetime="${esc(stamp.toISOString())}">${esc(new Intl.DateTimeFormat("en-US",{timeZone:"America/Denver",month:"short",day:"numeric",year:"numeric",hour:"numeric",minute:"2-digit",timeZoneName:"short"}).format(stamp))}</time>`
    : "Added time unavailable";
  const published=x.publishedDate?` · Source published ${fmtDate(x.publishedDate)}`:"";
  return `<div class="tiny">${posted}${published}</div>`;
}
function radarCard(x){const url=safeHttpUrl(x.url);return `<article class="radar-item"><div class="score">${esc(x.score??"—")}</div><div><div class="eyebrow">${esc(x.source)}</div>${radarTiming(x)}<h3>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(x.title)}</a>`:esc(x.title)}</h3><p>${esc(plainText(x.note||""))}</p>${tags(x.tags)}</div><time>AI relevance<br>score</time></article>`}
async function renderRadar(){const data=await loadJSON("data/radar.json");const list=$("#radarList");let current=data;const draw=()=>list.innerHTML=current.map(radarCard).join("")||`<div class="empty">Radar is clear.</div>`;draw();const q=$("#radarSearch");if(q)q.addEventListener("input",()=>{const s=q.value.toLowerCase();current=data.filter(x=>JSON.stringify(x).toLowerCase().includes(s));draw()})}
async function renderArchive(){const data=await loadJSON("data/articles.json"), list=$("#archiveList"), search=$("#archiveSearch"), filter=$("#tagFilter");const requested=new URLSearchParams(location.search).get("tag")||"";const allTags=[...new Set([...CORE_TOPICS,...data.flatMap(x=>x.tags||[])])].sort();filter.innerHTML=`<option value="">All topics</option>`+allTags.map(t=>`<option value="${esc(t)}">${esc(t)}</option>`).join("");const matched=allTags.find(t=>t.toLowerCase()===requested.toLowerCase());if(matched)filter.value=matched;function draw(){const q=search.value.toLowerCase(),tag=filter.value;const d=data.filter(x=>(!q||JSON.stringify(x).toLowerCase().includes(q))&&(!tag||(x.tags||[]).some(t=>t.toLowerCase()===tag.toLowerCase())));list.innerHTML=d.map(x=>`<div class="archive-item"><div class="eyebrow">${isGuest(x)?'GUEST VOICE · ':''}${fmtDate(x.date)}</div><div><h3><a href="${articleHref(x)}">${esc(x.title)}</a></h3>${isGuest(x)?authorLine(x):''}<p>${esc(x.dek)}</p>${tags(x.tags)}</div><div class="tiny">${esc(x.readTime)}</div></div>`).join("")||`<div class="empty">No notes match ${tag?`<strong>${esc(tag)}</strong>`:'that filter'} yet.</div>`}search.addEventListener("input",draw);filter.addEventListener("change",()=>{const u=new URL(location.href);if(filter.value)u.searchParams.set("tag",filter.value);else u.searchParams.delete("tag");history.replaceState({},"",u);draw();setupTopicBar()});draw()}
async function renderGuestVoices(selector="#guestVoicesList",limit=0){const host=$(selector);if(!host)return;const data=await loadJSON("data/articles.json");let guests=data.filter(isGuest);if(limit)guests=guests.slice(0,limit);host.innerHTML=guests.length?guests.map(x=>`<article class="card guest-card"><div class="eyebrow">HUMAN-WRITTEN · ${fmtDate(x.date)}</div><h3><a href="${articleHref(x)}">${esc(x.title)}</a></h3>${authorLine(x)}<p>${esc(x.dek)}</p>${tags(x.tags)}<div class="card-foot"><a class="readmore" href="${articleHref(x)}">Read guest voice →</a></div></article>`).join(""):`<div class="empty"><strong>No synthetic humans here.</strong><br><br>Guest Voices will appear when a real practitioner contributes a piece and puts their name behind it.</div>`}
async function renderEvents(){const data=await loadJSON("data/events.json");$("#eventsList").innerHTML=data.map(x=>{const url=safeHttpUrl(x.url);return `<article class="card ${x.sponsored?'sponsor-card':''}"><div class="eyebrow">${esc(x.type)} · ${fmtDate(x.date)}</div><h3>${esc(x.name)}</h3><p><strong>${esc(x.location)}</strong></p><p>${esc(x.focus)}</p>${url?`<a class="readmore" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Event site ↗</a>`:''}</article>`}).join("")}
async function renderTraining(){const data=await loadJSON("data/training.json");$("#trainingList").innerHTML=data.map(x=>{const url=safeHttpUrl(x.url);return `<article class="card ${x.sponsored?'sponsor-card':''}"><div class="eyebrow">${esc(x.provider)}</div><h3>${esc(x.title)}</h3><p><strong>${esc(x.level)}</strong></p><p>${esc(x.focus)}</p>${url?`<a class="readmore" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Training ↗</a>`:''}</article>`}).join("")}
async function renderSources(){const data=await loadJSON("data/sources.json");$("#sourcesBody").innerHTML=data.sources.map(x=>{const url=safeHttpUrl(x.url);return `<tr><td><strong>${esc(x.name)}</strong></td><td>${esc(x.category)}</td><td>${esc(x.priority)}</td><td>${x.rss?"RSS + web":"Web"}</td><td>${url?`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">Open ↗</a>`:'—'}</td></tr>`}).join("")}
async function renderJobs(){const data=await loadJSON("data/jobs.json");$("#jobsList").innerHTML=data.length?data.map(x=>{const url=safeHttpUrl(x.url);return `<article class="card ${x.sponsored?'sponsor-card':''}"><div class="eyebrow">${esc(x.company)}</div><h3>${esc(x.title)}</h3><p>${esc(x.location||'Remote')}</p><p>${esc(x.summary||'')}</p>${url?`<a class="readmore" href="${esc(url)}" target="_blank" rel="noopener noreferrer">View role ↗</a>`:''}</article>`}).join(""):`<div class="empty"><strong>No job board clutter yet.</strong><br><br>When this launches, employers can pay for clearly labeled identity-security job listings. Editorial coverage stays completely separate.</div>`}
async function renderArticle(){const id=new URLSearchParams(location.search).get("id"),data=await loadJSON("data/articles.json"),a=data.find(x=>x.id===id)||data[0],human=isGuest(a);document.title=`${a.title} — Identity Field Notes`;$("#hero").innerHTML=`<div class="eyebrow">${esc(a.edition)}</div><h1>${esc(a.title)}</h1><p class="lede">${esc(a.dek)}</p>${human?authorLine(a):''}<div class="meta"><span>${fmtDate(a.date)}</span><span>${esc(a.readTime)}</span><span>${human?'Human-written guest contribution':'AI-assisted / source-linked'}</span></div>${tags(a.tags)}<div class="transparency-box"><span class="stamp">${human?'HUMAN-WRITTEN':'DISCLOSURE'}</span><p>${esc(a.disclosure||(human?"Human-written guest contribution.":"AI-generated summary. Verify important details at the original source."))}</p></div>`;$("#stories").innerHTML=a.stories.map((s,i)=>story(s,human,a,i)).join("");scrollToSharedStory();setupComments(a.id);setupNewsletter()}
function setupComments(articleId){const host=$("#giscusHost");if(!host)return;const c=window.IFN_CONFIG?.comments||{};if(c.provider!=="giscus"||!c.repo||!c.repoId||!c.categoryId){host.innerHTML=`<div class="giscus-placeholder"><strong>Discussion board launching with the site.</strong><br>Article comments will be public, source-friendly and moderated for usefulness rather than agreement.</div>`;return}const s=document.createElement("script");s.src="https://giscus.app/client.js";s.async=true;s.crossOrigin="anonymous";Object.entries({repo:c.repo,"repo-id":c.repoId,category:c.category,"category-id":c.categoryId,mapping:c.mapping||"specific",term:articleId,"strict":"1",reactions:"1","emit-metadata":"0","input-position":"top",theme:"light",lang:"en",loading:"lazy"}).forEach(([k,v])=>s.setAttribute(`data-${k}`,v));host.appendChild(s)}
function setupCommunity(){setupComments("community-general")}
document.addEventListener("DOMContentLoaded",()=>{setupNewsletter();setupAnalytics();setupTopicBar();setupGlobalNav();if($("#guestVoicesList"))renderGuestVoices()});
