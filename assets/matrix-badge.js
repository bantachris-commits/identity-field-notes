(() => {
  let client=null, loading=null;
  const SUPABASE_JS='https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0';

  function loadSupabase(){
    if(window.supabase?.createClient)return Promise.resolve();
    if(loading)return loading;
    loading=new Promise((resolve,reject)=>{
      const existing=[...document.scripts].find(s=>s.src?.includes('@supabase/supabase-js'));
      if(existing){if(window.supabase?.createClient)return resolve();existing.addEventListener('load',resolve,{once:true});existing.addEventListener('error',reject,{once:true});return}
      const s=document.createElement('script');
      s.src=SUPABASE_JS;
      s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
    return loading;
  }

  async function sessionClient(){
    if(window.IFNCommunityAuth?.getClient)return window.IFNCommunityAuth.getClient();
    const cfg=window.IFN_CONFIG?.community;
    if(!cfg?.supabaseUrl||!cfg?.supabaseKey)return null;
    await loadSupabase();
    if(!client)client=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey);
    return client;
  }

  async function claim(){
    try{
      const sb=await sessionClient();
      if(!sb)return;
      const {data,error}=await sb.auth.getUser();
      if(error||!data?.user)return;
      const result=await sb.rpc('claim_matrix_badge');
      if(result.error)console.warn('IFN Matrix badge could not be claimed',result.error.message);
    }catch(err){
      console.warn('IFN Matrix badge check failed',err);
    }
  }

  function bind(button){
    if(!button||button.dataset.matrixBadgeBound==='true')return;
    button.dataset.matrixBadgeBound='true';
    button.addEventListener('click',()=>setTimeout(()=>{
      if(document.documentElement.dataset.theme==='matrix')claim();
    },0));
  }

  function scan(){bind(document.querySelector('[data-secret-matrix]'))}
  const observer=new MutationObserver(scan);
  function boot(){scan();observer.observe(document.body,{childList:true,subtree:true})}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
