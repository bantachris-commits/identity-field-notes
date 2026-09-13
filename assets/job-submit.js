(() => {
  async function init(){
    const host=document.querySelector("#jobSubmission"),d=window.IFNSubmissionsData,a=window.IFNCommunityAuth;if(!host||!d)return;
    const user=await d.user();
    if(!user){host.innerHTML='<p class="fine">Sign in to submit a job.</p><div data-submit-auth></div>';await a?.renderAuth(host.querySelector("[data-submit-auth]"));return;}
    host.innerHTML='<form class="submission-form" data-job-submit><label>Role title<input name="title" required maxlength="180"></label><label>Company<input name="company" required maxlength="180"></label><label>Location<input name="location" maxlength="180"></label><label>Job URL<input name="url" type="url" required></label><label>Submission source<select name="source_type" required><option value="">Choose one</option><option value="company_recruiter">Company recruiter</option><option value="third_party_recruiter">Third-party recruiter</option><option value="employee">Employee</option><option value="practitioner_find">Just a cool find by a random practitioner</option></select></label><label>Why it is relevant<textarea name="summary" rows="4" maxlength="2000"></textarea></label><button class="btn" type="submit">Submit job for review</button><span class="fine" data-status></span></form>';
    const form=host.querySelector("form");form.addEventListener("submit",async ev=>{ev.preventDefault();const f=new FormData(form),s=form.querySelector("[data-status]");try{s.textContent="Submitting…";await d.create({submission_type:"job",title:f.get("title"),company:f.get("company"),location:f.get("location"),url:f.get("url"),source_type:f.get("source_type"),summary:f.get("summary")});form.reset();s.textContent="Submitted for review."}catch(err){s.textContent=err.message||String(err)}});
  }
  window.IFNJobSubmit={init};
})();
