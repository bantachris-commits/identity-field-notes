(() => {
  async function init(){
    const host=document.querySelector("#guestSubmission"),d=window.IFNSubmissionsData,a=window.IFNCommunityAuth;if(!host||!d)return;
    const user=await d.user();
    if(!user){host.innerHTML='<p class="fine">Sign in to submit a Guest Voice.</p><div data-submit-auth></div>';await a?.renderAuth(host.querySelector("[data-submit-auth]"));return;}
    host.innerHTML='<form class="submission-form"><label>Public byline<input name="author_name" required maxlength="120"></label><label>Role / company<input name="author_role" maxlength="160" placeholder="e.g. IAM Architect at Example Co."></label><label>Personal, professional, or company link<input name="author_url" type="url" maxlength="500" placeholder="https://..."></label><label>Title<input name="title" required maxlength="180"></label><label>Pitch<textarea name="pitch" rows="4" required maxlength="3000"></textarea></label><label>Draft or notes<textarea name="body" rows="8" maxlength="12000"></textarea></label><button class="btn" type="submit">Submit Guest Voice</button><span class="fine" data-status></span></form>';
    const form=host.querySelector("form");form.addEventListener("submit",async ev=>{ev.preventDefault();const f=new FormData(form),s=form.querySelector("[data-status]");try{s.textContent="Submitting…";await d.create({submission_type:"guest_voice",author_name:f.get("author_name"),author_role:f.get("author_role"),author_url:f.get("author_url"),title:f.get("title"),pitch:f.get("pitch"),body:f.get("body")});form.reset();s.textContent="Submitted for editorial review."}catch(err){s.textContent=err.message||String(err)}});
  }
  window.IFNGuestSubmit={init};
})();
