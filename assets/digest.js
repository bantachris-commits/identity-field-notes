(() => {
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));

  function formMarkup(){
    const c=window.IFN_CONFIG?.newsletter||{}, user=String(c.buttondownUsername||"").trim();
    if(!user)return '<p class="fine">Email signup is temporarily unavailable. RSS is still available.</p>';
    return `<form class="digest-modal-form" action="https://buttondown.com/api/emails/embed-subscribe/${encodeURIComponent(user)}" method="post"><label for="digestModalEmail">Email address</label><input id="digestModalEmail" type="email" name="email" required autocomplete="email" placeholder="you@company.com"><input type="hidden" value="1" name="embed">${c.tag?`<input type="hidden" name="tag" value="${esc(c.tag)}">`:""}<button class="btn" type="submit">Join the digest</button></form>`;
  }

  function ensureDialog(){
    let dialog=document.querySelector("#digestDialog");
    if(dialog)return dialog;
    dialog=document.createElement("dialog");
    dialog.id="digestDialog";
    dialog.className="digest-dialog";
    dialog.innerHTML=`<div class="digest-dialog-head"><div><div class="eyebrow">EMAIL DIGEST</div><h2>Get tomorrow's slop.</h2></div><button type="button" class="digest-close" aria-label="Close email signup">×</button></div><p>Source-linked identity news, cleaned up enough to be useful. No lead-gen maze.</p>${formMarkup()}`;
    document.body.appendChild(dialog);
    dialog.querySelector(".digest-close").addEventListener("click",()=>dialog.close());
    dialog.addEventListener("click",ev=>{if(ev.target===dialog)dialog.close()});
    return dialog;
  }

  function open(){
    const dialog=ensureDialog();
    if(typeof dialog.showModal==="function")dialog.showModal();
    else dialog.setAttribute("open","");
    setTimeout(()=>dialog.querySelector('input[type="email"]')?.focus(),0);
  }

  function boot(){
    ensureDialog();
    document.addEventListener("click",ev=>{
      const a=ev.target.closest?.('a[href="#digest"],a[href$="index.html#digest"]');
      if(!a)return;
      ev.preventDefault();
      open();
    });
  }

  window.IFNDigest={open};
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true}); else boot();
})();
