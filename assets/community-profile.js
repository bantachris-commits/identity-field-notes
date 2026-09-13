(() => {
  const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));
  const auth=window.IFNCommunityAuth;
  if(!auth?.renderAuth)return;
  const baseRender=auth.renderAuth;

  async function getProfile(userId){
    const sb=auth.getClient();
    const {data,error}=await sb.from("profiles").select("id,display_name,headline,avatar_url").eq("id",userId).maybeSingle();
    if(error)throw error;
    return data||null;
  }

  async function getRole(userId){
    const sb=auth.getClient();
    const {data,error}=await sb.from("community_roles").select("role").eq("user_id",userId).maybeSingle();
    if(error)throw error;
    return data?.role||null;
  }

  async function updateDisplayName(name){
    const sb=auth.getClient(),user=await auth.getUser();
    if(!sb||!user)throw new Error("Sign in first.");
    const displayName=String(name||"").trim();
    if(displayName.length<2||displayName.length>40)throw new Error("Public name must be 2 to 40 characters.");
    const {error}=await sb.from("profiles").update({display_name:displayName,updated_at:new Date().toISOString()}).eq("id",user.id);
    if(error)throw error;
    return displayName;
  }

  auth.renderAuth=async host=>{
    await baseRender(host);
    const user=await auth.getUser();
    if(!user||!host)return;
    let profile=null,role=null;
    try{[profile,role]=await Promise.all([getProfile(user.id),getRole(user.id)])}catch(err){}
    const publicName=profile?.display_name||user.user_metadata?.full_name||user.user_metadata?.name||"Identity practitioner";
    const strong=host.querySelector(".community-auth-state strong");
    if(strong)strong.textContent=`Posting as ${publicName}`;
    const state=host.querySelector(".community-auth-state");
    if(!state)return;
    const controls=document.createElement("div");
    controls.className="ifn-profile-controls";
    controls.innerHTML=`<button class="btn small alt" type="button" data-edit-name>Edit public name</button>${role?`<a class="btn small alt" href="moderate.html">Moderation</a>`:""}<form class="ifn-name-form" data-name-form hidden><label class="fine">Public name / pseudonym</label><input name="display_name" minlength="2" maxlength="40" required value="${esc(publicName)}"><button class="btn small" type="submit">Save name</button><span class="fine" data-name-status></span></form>`;
    state.appendChild(controls);
    const form=controls.querySelector("[data-name-form]");
    controls.querySelector("[data-edit-name]")?.addEventListener("click",()=>{form.hidden=!form.hidden});
    form?.addEventListener("submit",async ev=>{ev.preventDefault();const status=form.querySelector("[data-name-status]");try{await updateDisplayName(new FormData(form).get("display_name"));status.textContent="Saved.";setTimeout(()=>location.reload(),300)}catch(err){status.textContent=err.message}});
  };

  auth.getProfile=getProfile;
  auth.getRole=getRole;
  auth.updateDisplayName=updateDisplayName;
})();
