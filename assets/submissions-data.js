(() => {
  const SOURCE_LABELS={company_recruiter:"Company recruiter",third_party_recruiter:"Third-party recruiter",employee:"Employee",practitioner_find:"Random practitioner find"};
  const auth=()=>window.IFNCommunityAuth;
  async function user(){return auth()?.getUser()}
  function client(){return auth()?.getClient()}
  async function create(payload){const sb=client(),u=await user();if(!sb||!u)throw new Error("Sign in before submitting.");const r=await sb.from("submissions").insert({...payload,user_id:u.id,status:"pending"});if(r.error)throw r.error;}
  async function approvedJobs(){const sb=client();if(!sb)return[];const r=await sb.from("submissions").select("id,title,company,location,url,summary,source_type,created_at").eq("submission_type","job").eq("status","approved").order("created_at",{ascending:false});if(r.error)throw r.error;return r.data||[];}
  window.IFNSubmissionsData={SOURCE_LABELS,user,client,create,approvedJobs};
})();
