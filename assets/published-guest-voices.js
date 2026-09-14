(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const httpUrl=s=>{try{const u=new URL(String(s??'').trim());return ['http:','https:'].includes(u.protocol)?u.href:''}catch(e){return''}};
  const fmt=s=>new Date(`${String(s).slice(0,10)}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const isStaticGuest=a=>a?.contentType==='guest'||a?.humanWritten===true;

  async function staticGuests(){
    try{const r=await fetch('data/articles.json',{cache:'no-store'});if(!r.ok)return[];return (await r.json()).filter(isStaticGuest).map(a=>({kind:'static',date:a.date,title:a.title,dek:a.dek||'',author:a.author||{},href:`article.html?id=${encodeURIComponent(a.id)}`}));}catch(e){return[]}
  }

  async function approvedGuests(){
    const cfg=window.IFN_CONFIG?.community;
    if(!cfg?.supabaseUrl||!cfg?.supabaseKey)return[];
    const url=`${cfg.supabaseUrl}/rest/v1/published_guest_voices?select=submission_id,title,author_name,author_role,author_url,pitch,body,published_at,updated_at&order=published_at.desc`;
    try{
      const r=await fetch(url,{headers:{apikey:cfg.supabaseKey,Accept:'application/json'},cache:'no-store'});
      if(!r.ok)throw new Error(`Guest Voices API ${r.status}`);
      return (await r.json()).map(x=>({kind:'submission',date:String(x.published_at||x.updated_at).slice(0,10),title:x.title,dek:x.pitch||String(x.body||'').slice(0,240),author:{name:x.author_name,role:x.author_role,url:httpUrl(x.author_url)},href:`guest-submission.html?id=${encodeURIComponent(x.submission_id)}`}));
    }catch(e){console.warn('Could not load approved Guest Voices',e);return[]}
  }

  function card(x){
    const authorUrl=httpUrl(x.author?.url);
    const name=authorUrl?`<a href="${esc(authorUrl)}" target="_blank" rel="noopener noreferrer"><strong>${esc(x.author.name||'Guest contributor')}</strong></a>`:`<strong>${esc(x.author?.name||'Guest contributor')}</strong>`;
    return `<article class="card guest-card"><div class="eyebrow">HUMAN-WRITTEN · ${fmt(x.date)}</div><h3><a href="${x.href}">${esc(x.title)}</a></h3><div class="author-line"><span>BY ${name}</span>${x.author?.role?`<span>${esc(x.author.role)}</span>`:''}</div>${x.dek?`<p>${esc(x.dek)}</p>`:''}<div class="card-foot"><a class="readmore" href="${x.href}">Read guest voice →</a></div></article>`;
  }

  async function boot(){
    const [staticItems,approvedItems]=await Promise.all([staticGuests(),approvedGuests()]);
    const items=[...approvedItems,...staticItems].sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    const page=document.querySelector('#guestVoicesList');
    if(page)page.innerHTML=items.length?items.map(card).join(''):'<div class="empty"><strong>Guest Voices is open.</strong><br><br>Real practitioners only. No invented contributors.</div>';
    const preview=document.querySelector('#guestVoicesPreview');
    if(preview)preview.innerHTML=items.length?items.slice(0,3).map(card).join(''):'<div class="card guest-card"><div class="eyebrow">HUMANS WANTED</div><h3>Not every useful thought needs a model.</h3><p>Guest Voices is open to identity practitioners with something useful to say.</p><a class="readmore" href="guest-voices.html">How it works →</a></div>';
    document.querySelector('#guestPreview')?.remove();
  }

  if(document.readyState==='complete')boot();else window.addEventListener('load',boot,{once:true});
})();
