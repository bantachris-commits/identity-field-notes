(()=>{
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const fmt=s=>new Date(`${s}T12:00:00`).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  const href=x=>`market-note.html?id=${encodeURIComponent(x.id)}`;
  let notes=[];

  function card(x){
    return `<article class="card market-archive-card" data-market-search="${esc([x.title,x.dek,...(x.tags||[])].join(' ').toLowerCase())}" data-market-tags="${esc((x.tags||[]).join('|').toLowerCase())}"><div class="eyebrow">MARKET ARCHIVE · ${fmt(x.date)}</div><h3><a href="${href(x)}">${esc(x.title)}</a></h3><p>${esc(x.dek)}</p><div class="tags">${(x.tags||[]).map(t=>`<a class="tag" href="archive.html?tag=${encodeURIComponent(t)}">${esc(t)}</a>`).join('')}</div><div class="card-foot"><a class="readmore" href="${href(x)}">Read market note →</a></div></article>`;
  }

  function filterArchive(){
    const host=document.querySelector('#marketArchiveList');
    if(!host)return;
    const q=(document.querySelector('#archiveSearch')?.value||'').trim().toLowerCase();
    const tag=(document.querySelector('#tagFilter')?.value||'').trim().toLowerCase();
    host.querySelectorAll('.market-archive-card').forEach(el=>{
      const matchQ=!q||el.dataset.marketSearch.includes(q);
      const matchTag=!tag||(el.dataset.marketTags||'').split('|').includes(tag);
      el.hidden=!(matchQ&&matchTag);
    });
    const section=document.querySelector('#marketArchiveSection');
    if(section)section.hidden=![...host.children].some(x=>!x.hidden);
  }

  function installArchive(){
    const list=document.querySelector('#archiveList');
    if(!list||document.querySelector('#marketArchiveSection'))return;
    const section=document.createElement('section');
    section.id='marketArchiveSection';
    section.innerHTML=`<div class="section-head"><div><h2>Market Backfill</h2><p>Durable acquisitions, platform shifts and control-model changes that still shape identity architecture after the headline cycle ends.</p></div></div><div class="cards" id="marketArchiveList">${notes.map(card).join('')}</div>`;
    list.before(section);
    document.querySelector('#archiveSearch')?.addEventListener('input',filterArchive);
    document.querySelector('#tagFilter')?.addEventListener('change',()=>setTimeout(filterArchive));
    filterArchive();
  }

  function installHome(){
    const host=document.querySelector('#archivePreview');
    if(!host||!notes.length)return false;
    const weak=host.querySelector('a[href*="2026-09-11-machine-identities"]')?.closest('.card');
    const replacement=document.createElement('article');
    replacement.className='card market-archive-card';
    replacement.innerHTML=card(notes[0]).replace(/^<article[^>]*>|<\/article>$/g,'');
    if(weak)weak.replaceWith(replacement);
    else if(host.children.length<3)host.appendChild(replacement);
    return true;
  }

  async function boot(){
    try{notes=await fetch('data/market-archive.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw new Error(r.status);return r.json()});}
    catch(e){return;}
    notes.sort((a,b)=>String(b.date).localeCompare(String(a.date)));
    if(document.querySelector('#archiveList'))installArchive();
    if(document.querySelector('#archivePreview')){
      let tries=0;const timer=setInterval(()=>{tries++;if(installHome()||tries>30)clearInterval(timer)},100);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
