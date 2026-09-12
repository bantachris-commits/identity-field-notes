(()=>{
  const THEMES=["field","dark","matrix","jurassic"];
  const LABELS={field:"Field",dark:"Dark",matrix:"Matrix",jurassic:"Park"};
  const STORAGE_KEY="ifn-theme";
  let rain=null;

  function currentTheme(){return document.documentElement.dataset.theme||"field"}
  function themeColor(theme){return theme==="matrix"?"#000400":theme==="dark"?"#11171c":theme==="jurassic"?"#b73527":"#102934"}

  function setFavicon(theme){
    const icon=document.querySelector('link[rel~="icon"]');
    if(icon)icon.href=theme==="jurassic"?"assets/favicon-jurassic.svg":"assets/favicon.svg";
  }

  function setGiscusTheme(theme){
    const iframe=document.querySelector("iframe.giscus-frame");
    if(!iframe)return;
    const light=theme==="field"||theme==="jurassic";
    iframe.contentWindow?.postMessage({giscus:{setConfig:{theme:light?"light":"dark"}}},"https://giscus.app");
  }

  function updateButtons(theme){
    document.querySelectorAll("[data-theme-choice]").forEach(btn=>{
      const active=btn.dataset.themeChoice===theme;
      btn.setAttribute("aria-pressed",active?"true":"false");
      btn.title=active?`${LABELS[theme]} mode active`:`Switch to ${LABELS[btn.dataset.themeChoice]} mode`;
    });
  }

  function applyTheme(theme,{persist=true}={}){
    if(!THEMES.includes(theme))theme="field";
    document.documentElement.dataset.theme=theme;
    if(persist){try{localStorage.setItem(STORAGE_KEY,theme)}catch(e){}}
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute("content",themeColor(theme));
    setFavicon(theme);
    updateButtons(theme);
    if(theme==="matrix")startRain(); else stopRain();
    setGiscusTheme(theme);
  }

  function switcherMarkup(){
    const wrap=document.createElement("div");
    wrap.className="theme-switcher";
    wrap.setAttribute("role","group");
    wrap.setAttribute("aria-label","Display theme");
    THEMES.forEach(theme=>{
      const btn=document.createElement("button");
      btn.type="button";
      btn.dataset.themeChoice=theme;
      btn.textContent=LABELS[theme];
      btn.addEventListener("click",()=>applyTheme(theme));
      wrap.appendChild(btn);
    });
    return wrap;
  }

  function installControls(){
    const desktop=document.querySelector("header nav");
    if(desktop&&!desktop.querySelector(".theme-switcher")){
      const sw=switcherMarkup();
      const digest=[...desktop.children].find(x=>x.matches?.('a[href="#digest"]'));
      desktop.insertBefore(sw,digest||null);
    }
    document.querySelectorAll(".mobile-nav .nav-menu").forEach(menu=>{
      if(!menu.querySelector(".theme-switcher"))menu.appendChild(switcherMarkup());
    });
    updateButtons(currentTheme());
  }

  function startRain(){
    if(rain||window.matchMedia("(prefers-reduced-motion: reduce)").matches)return;
    let canvas=document.getElementById("matrix-rain");
    if(!canvas){canvas=document.createElement("canvas");canvas.id="matrix-rain";canvas.setAttribute("aria-hidden","true");document.body.appendChild(canvas)}
    const ctx=canvas.getContext("2d");
    const chars="01アイデンティティPAMIAMIGA<>[]{}/*+-=AUTHZNHIITDR";
    let width=0,height=0,cols=0,drops=[],last=0,raf=0;
    const fontSize=15;
    function resize(){
      const dpr=Math.min(window.devicePixelRatio||1,2);
      width=window.innerWidth;height=window.innerHeight;
      canvas.width=Math.floor(width*dpr);canvas.height=Math.floor(height*dpr);
      canvas.style.width=width+"px";canvas.style.height=height+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
      cols=Math.ceil(width/fontSize);
      drops=Array.from({length:cols},()=>Math.random()<.22?-Math.floor(Math.random()*60):-999);
    }
    function draw(ts){
      if(currentTheme()!=="matrix")return;
      raf=requestAnimationFrame(draw);
      rain.raf=raf;
      if(ts-last<65)return;
      last=ts;
      ctx.fillStyle="rgba(0,4,0,.11)";ctx.fillRect(0,0,width,height);
      ctx.font=`${fontSize}px "Cascadia Mono",Consolas,monospace`;
      for(let i=0;i<drops.length;i++){
        if(drops[i]===-999){if(Math.random()<.0018)drops[i]=-Math.floor(Math.random()*25);continue}
        const ch=chars[Math.floor(Math.random()*chars.length)];
        const y=drops[i]*fontSize;
        const bright=Math.random()>.93;
        ctx.fillStyle=bright?"rgba(190,255,199,.78)":"rgba(38,255,99,.45)";
        ctx.fillText(ch,i*fontSize,y);
        drops[i]++;
        if(y>height+80&&Math.random()>.965)drops[i]=-999;
      }
    }
    resize();window.addEventListener("resize",resize,{passive:true});
    rain={canvas,raf:null,resize};
    raf=requestAnimationFrame(draw);rain.raf=raf;
  }

  function stopRain(){
    if(rain?.raf)cancelAnimationFrame(rain.raf);
    if(rain?.resize)window.removeEventListener("resize",rain.resize);
    const canvas=document.getElementById("matrix-rain");
    if(canvas){const ctx=canvas.getContext("2d");ctx?.clearRect(0,0,canvas.width,canvas.height)}
    rain=null;
  }

  const observer=new MutationObserver(()=>setGiscusTheme(currentTheme()));
  function boot(){
    installControls();
    applyTheme(currentTheme(),{persist:false});
    if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
