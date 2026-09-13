(()=>{
  async function renderMarketNote(){
    const id=new URLSearchParams(location.search).get('id');
    const data=await loadJSON('data/market-archive.json');
    const a=data.find(x=>x.id===id)||data[0];
    if(!a)return;
    document.title=`${a.title} — Identity Field Notes`;
    const hero=document.querySelector('#hero'),stories=document.querySelector('#stories');
    hero.innerHTML=`<div class="eyebrow">${esc(a.edition)}</div><h1>${esc(a.title)}</h1><p class="lede">${esc(a.dek)}</p><div class="meta"><span>${fmtDate(a.date)}</span><span>${esc(a.readTime)}</span><span>AI-assisted archive synthesis</span></div>${tags(a.tags)}<div class="transparency-box"><span class="stamp">MARKET ARCHIVE</span><p><strong>This is a backfilled market note, not breaking news.</strong> It connects durable identity-market moves to their original sources so older developments remain useful in context. Product claims remain vendor claims.</p></div>`;
    stories.innerHTML=a.stories.map(s=>story({...s,aiGenerated:true},false)).join('');
    setupNewsletter();
  }
  window.renderMarketNote=renderMarketNote;
})();
