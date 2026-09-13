(()=>{
 async function add(){
  const sb=window.IFNCommunityAuth?.getClient();if(!sb)return;
  const r=await sb.from('submissions').select('id,author_role,author_url').eq('submission_type','guest_voice');if(r.error)return;
  (r.data||[]).forEach(x=>{const c=document.querySelector(`[data-submission-id="${x.id}"]`);if(!c||c.querySelector('[data-author-meta]'))return;const a=c.querySelector('.mod-actions');const d=document.createElement('div');d.dataset.authorMeta='true';d.className='submission-author-meta';d.innerHTML=(x.author_role?'<p class="fine"><strong>Role / company:</strong> '+safe(x.author_role)+'</p>':'')+(x.author_url?'<p><a class="readmore" target="_blank" rel="noopener noreferrer" href="'+attr(x.author_url)+'">Author / company page ↗</a></p>':'');if(d.innerHTML)a?.before(d)})
 }
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
 const attr=s=>safe(s);
 document.addEventListener('ifn:submissions-ready',add);
})();