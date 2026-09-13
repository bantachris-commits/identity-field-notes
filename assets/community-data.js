(() => {
  async function thread(articleId) {
    const sb = window.IFNCommunityAuth?.getClient();
    if (!sb) throw new Error("Community service unavailable.");
    const r = await sb.from("comments").select("id,parent_id,user_id,body,kind,created_at").eq("article_id",articleId).eq("status","published").order("created_at",{ascending:true});
    if (r.error) throw r.error;
    const comments = r.data || [];
    const ids = [...new Set(comments.map(x=>x.user_id).filter(Boolean))];
    let profiles = [];
    if (ids.length) {
      const p = await sb.from("profiles").select("id,display_name,avatar_url,headline").in("id",ids);
      profiles = p.data || [];
    }
    return {comments, profiles:new Map(profiles.map(p=>[p.id,p]))};
  }

  async function post(articleId, body, parentId) {
    const sb = window.IFNCommunityAuth?.getClient();
    const user = await window.IFNCommunityAuth?.getUser();
    if (!sb || !user) throw new Error("Sign in before posting.");
    const text = String(body || "").trim();
    if (!text) throw new Error("Write something first.");
    const r = await sb.from("comments").insert({article_id:articleId,parent_id:parentId||null,user_id:user.id,body:text,kind:"comment"});
    if (r.error) throw r.error;
  }

  window.IFNCommunityData = {thread,post};
})();
