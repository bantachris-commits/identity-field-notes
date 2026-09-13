(()=>{
 const e=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
 const d=s=>s?new Date(s).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'}):'Never';
 async function load(){
  const app=document.querySelector('#modApp'),sb=window.IFNCommunityAuth?.getClient();if(!app||!sb)return;
  let sec=document.querySelector('#userDirectory');if(!sec){sec=document.createElement('section');sec.id='userDirectory';sec.innerHTML='<div class="section-head"><div><h2>User directory</h2><p>Promote moderators/admins and assign public community flair.</p></div></div><div id="userDirectoryList"></div>';app.appendChild(sec)}
  const h=sec.querySelector('#userDirectoryList');h.innerHTML='<p class="fine">Loading users…</p>';
  const r=await sb.rpc('list_community_users');if(r.error){h.innerHTML='<div class="empty">'+e(r.error.message)+'</div>';return}
  h.innerHTML=(r.data||[]).map(u=>'<article class="mod-item user-directory-card" data-directory-user="'+e(u.user_id)+'"><div class="ifn-thread-meta"><span class="pill source">'+e(u.community_role||'member')+'</span>'+(u.flair?'<span class="ifn-flair">'+e(u.flair)+'</span>':'')+'</div><h3>'+e(u.display_name||'Identity practitioner')+'</h3><p class="fine">'+e(u.email||'')+'</p>'+(u.headline?'<p>'+e(u.headline)+'</p>':'')+'<p class="fine">Joined '+d(u.joined_at)+' · Last sign-in '+d(u.last_sign_in_at)+'</p><div class="user-admin-fields"><label>Role<select data-user-role><option value="member"'+(!u.community_role?' selected':'')+'>Member</option><option value="moderator"'+(u.community_role==='moderator'?' selected':'')+'>Moderator</option><option value="admin"'+(u.community_role==='admin'?' selected':'')+'>Admin</option></select></label><label>Public flair<input data-user-flair maxlength="50" value="'+e(u.flair||'')+'" placeholder="e.g. Founding Member"></label></div><div class="mod-actions"><button class="btn small" type="button" data-save-user>Save role & flair</button></div><span class="fine" data-user-result></span></article>').join('')||'<div class="empty">No community users yet.</div>';
  document.dispatchEvent(new CustomEvent('ifn:user-directory-ready'));
 }
 document.addEventListener('ifn:moderation-ready',ev=>{if(ev.detail?.role==='admin')load()});window.IFNUserDirectoryRead={load};
})();