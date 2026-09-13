(()=>{
  const THEMES=["field","dark","matrix","jurassic","relic"];
  const SWITCHER_THEMES=["field","dark","relic","jurassic"];
  const LABELS={field:"Field",dark:"Dark",matrix:"Matrix",jurassic:"Jurassic",relic:"Jungle Cruise"};
  const STORAGE_KEY="ifn-theme";
  const PRE_SECRET_KEY="ifn-pre-matrix-theme";
  const JUNGLE_JOKES=[
    "Please keep your hands, hats, and access tokens inside the boat at all times.",
    "Why did the service account cross the river? It had standing privileges on the other side.",
    "Our password rotation is a lot like this river. Eventually, it comes back around.",
    "That orphaned account is fine. It is just looking for its parent group.",
    "Least privilege is important out here. The crocodiles call it portion control.",
    "We tried role mining in the jungle. Mostly we found old groups nobody remembers creating.",
    "If the SSO bridge looks questionable, don't worry. We have several more questionable bridges ahead.",
    "The good news is the privileged account is vaulted. The bad news is nobody remembers where the vault is.",
    "Our identity governance program has excellent visibility. We can clearly see the backlog from here.",
    "Never trust a quiet service account. That's usually when they're plotting something scheduled for 2 a.m."
  ];
  let rain=null;

  function currentTheme(){return document.documentElement.dataset.theme||"field"}
  function savedTheme(){
    let theme=currentTheme();
    try{const saved=localStorage.getItem(STORAGE_KEY);if(THEMES.includes(saved))theme=saved}catch(e){}
    return THEMES.includes(theme)?theme:"field";
  }
  function themeColor(theme){return theme==="matrix"?"#000400":theme==="dark"?"#11171c":theme==="jurassic"?"#d61f27":theme==="relic"?"#694126":"#102934"}

  function ensureRelicStyles(){
    if(document.querySelector('link[data-ifn-relic]'))return;
    const css=document.createElement("link");
    css.rel="stylesheet";
    css.href="assets/relic.css?v=20260913-2";
    css.dataset.ifnRelic="true";
    document.head.appendChild(css);
  }

  function setFavicon(theme){
    const icon=document.querySelector('link[rel~="icon"]');
    if(!icon)return;
    icon.href=theme==="jurassic"?"assets/favicon-jurassic.svg":theme==="relic"?"assets/favicon-relic.svg":"assets/favicon.svg";
  }

  function setGiscusTheme(theme){
    const iframe=document.querySelector("iframe.giscus-frame");
    if(!iframe)return;
    const light=theme==="field"||theme==="jurassic"||theme==="relic";
    iframe.contentWindow?.postMessage({giscus:{setConfig:{theme:light?"light":"dark"}}},"https://giscus.app");
  }

  function updateButtons(theme){
    document.querySelectorAll("[data-theme-choice]").forEach(btn=>{
      const active=btn.dataset.themeChoice===theme;
      btn.setAttribute("aria-pressed",active?"true":"false");
      btn.title=active?`${LABELS[theme]} mode active`:`Switch to ${LABELS[btn.dataset.themeChoice]} mode`;
    });
    const secret=document.querySelector("[data-secret-matrix]");
    if(secret){
      const active=theme==="matrix";
      secret.setAttribute("aria-pressed",active?"true":"false");
      secret.title=active?"Escape the matrix":"An oddly placed relic";
    }
  }

  function installJungleJokes(theme){
    const existing=document.querySelector("[data-jungle-jokes]");
    if(theme!=="relic"){
      existing?.remove();
      return;
    }
    if(existing)return;
    const main=document.querySelector("main");
    if(!main)return;
    const picks=[...JUNGLE_JOKES].sort(()=>Math.random()-.5).slice(0,3);
    const box=document.createElement("aside");
    box.className="jungle-jokes";
    box.dataset.jungleJokes="true";
    const eyebrow=document.createElement("div");
    eyebrow.className="eyebrow";
    eyebrow.textContent="SKIPPER'S LOG // QUESTIONABLE IDENTITY WISDOM";
    const title=document.createElement("strong");
    title.textContent="Today's river-certified dad jokes";
    box.append(eyebrow,title);
    picks.forEach(joke=>{
      const p=document.createElement("p");
      p.textContent=joke;
      box.appendChild(p);
    });
    const after=main.children[0];
    if(after?.nextSibling)main.insertBefore(box,after.nextSibling); else main.appendChild(box);
  }

  function applyTheme(theme,{persist=true}={}){
    if(!THEMES.includes(theme))theme="field";
    document.documentElement.dataset.theme=theme;
    if(persist){try{localStorage.setItem(STORAGE_KEY,theme)}catch(e){}}
    const meta=document.querySelector('meta[name="theme-color"]');
    if(meta)meta.setAttribute("content",themeColor(theme));
    setFavicon(theme);
    updateButtons(theme);
    installJungleJokes(theme);
    if(theme==="matrix")startRain(); else stopRain();
    setGiscusTheme(theme);
  }

  function switcherMarkup(){
    const wrap=document.createElement("div");
    wrap.className="theme-switcher";
    wrap.setAttribute("role","group");
    wrap.setAttribute("aria-label","Display theme");
    SWITCHER_THEMES.forEach(theme=>{
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

  function installSecretMatrix(){
    if(document.querySelector("[data-secret-matrix]"))return;
    const wrap=document.createElement("div");
    wrap.className="secret-relic-wrap";
    const btn=document.createElement("button");
    btn.type="button";
    btn.className="secret-relic";
    btn.dataset.secretMatrix="true";
    btn.setAttribute("aria-label","Toggle secret display mode");
    btn.setAttribute("aria-pressed","false");
    const img=document.createElement("img");
    img.src="assets/favicon-relic.svg";
    img.alt="";
    img.setAttribute("aria-hidden","true");
    btn.appendChild(img);
    btn.addEventListener("click",()=>{
      if(currentTheme()==="matrix"){
        let restore="field";
        try{restore=localStorage.getItem(PRE_SECRET_KEY)||"field"}catch(e){}
        if(!SWITCHER_THEMES.includes(restore))restore="field";
        applyTheme(restore);
      }else{
        try{localStorage.setItem(PRE_SECRET_KEY,currentTheme())}catch(e){}
        applyTheme("matrix");
      }
    });
    wrap.appendChild(btn);
    document.body.appendChild(wrap);
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
    ensureRelicStyles();
    installControls();
    installSecretMatrix();
    applyTheme(savedTheme(),{persist:false});
    if(document.body)observer.observe(document.body,{childList:true,subtree:true});
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
