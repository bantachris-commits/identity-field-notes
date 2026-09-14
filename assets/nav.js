(()=>{
  function directLink(nav,href){return [...nav.children].find(x=>x.matches?.(`a[href="${href}"]`))}
  function installNavRhythm(){
    if(document.querySelector('#ifn-nav-rhythm'))return;
    const s=document.createElement('style');
    s.id='ifn-nav-rhythm';
    s.textContent='@media(min-width:901px){header .nav>nav{gap:0}header .nav>nav>a:not(.btn),header .nav>nav>details.nav-more>summary{padding-left:8px;padding-right:8px;white-space:nowrap}header .nav>nav>details.nav-more{margin:0}header .nav>nav>.btn.small{margin-left:10px;white-space:nowrap}}';
    document.head.appendChild(s);
  }
  function ensureDesktop(){
    const nav=document.querySelector('header nav');
    if(!nav)return;
    let today=directLink(nav,'index.html#stories');
    if(!today){today=document.createElement('a');today.href='index.html#stories';today.textContent="Today's Digest";nav.insertBefore(today,nav.firstChild)}
    const radar=directLink(nav,'radar.html');if(radar)radar.textContent='Latest Articles';
    const archive=directLink(nav,'archive.html');
    const more=[...nav.children].find(x=>x.matches?.('details.nav-more'));
    const summary=more?.querySelector('summary');if(summary){summary.textContent='More ▼';summary.style.fontWeight='600'}
    const menu=more?.querySelector('.nav-menu');
    if(menu){
      let archiveMore=menu.querySelector('a[href="archive.html"]');
      if(!archiveMore){archiveMore=document.createElement('a');archiveMore.href='archive.html';archiveMore.textContent='Archive';menu.insertBefore(archiveMore,menu.firstChild)}
      if(archive)archive.remove();
    }
  }
  function ensureMobile(){
    document.querySelectorAll('.mobile-nav .nav-menu').forEach(menu=>{
      let today=menu.querySelector('a[href="index.html#stories"]');
      if(!today){today=document.createElement('a');today.href='index.html#stories';today.textContent="Today's Digest";menu.insertBefore(today,menu.firstChild)}
      const radar=menu.querySelector('a[href="radar.html"]');if(radar)radar.textContent='Latest Articles';
      const archive=menu.querySelector('a[href="archive.html"]');if(archive){archive.textContent='Archive';menu.appendChild(archive)}
    });
  }
  function renameRadar(){
    if(location.pathname.endsWith('radar.html')){
      document.title='Latest Articles — Identity Field Notes';
      const hero=document.querySelector('.hero.compact');
      if(hero){const e=hero.querySelector('.eyebrow'),h=hero.querySelector('h1');if(e)e.textContent='CURRENT READING QUEUE';if(h)h.textContent='Latest Articles.'}
    }
    const preview=document.querySelector('#radarPreview');
    const section=preview?.closest('section');
    if(section){const h=section.querySelector('.section-head h2'),p=section.querySelector('.section-head p'),a=section.querySelector('.section-head a');if(h)h.textContent='Latest Articles';if(p)p.textContent='Fast-moving identity-security links before they earn a full Field Note.';if(a)a.textContent='View latest articles →'}
  }
  function boot(){installNavRhythm();ensureDesktop();ensureMobile();renameRadar();setTimeout(()=>{ensureDesktop();ensureMobile()},400)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();