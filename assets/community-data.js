(() => {
  const auth=()=>window.IFNCommunityAuth;

  async function thread(articleId){
    const sb=auth()?.getClient();
    if(!sb) throw new Error("Community service unavailable.");
    const r=await sb.from("comments").select("id,parent_id,user_id,title,body,kind,created_at").eq("article_id",articleId).eq("status","published").order("created_at",{ascending:true});
    if(r.error) throw r.error;
    const comments=r.data||[];
    const ids=[...new Set(comments.map(x=>x.user_id).filter(Boolean))];
    let profiles=[];
    if(ids.length){
      const p=await sb.from("profiles").select("id,display_name,avatar_url,headline").in("id",ids);
      if(p.error) throw p.error;
      profiles=p.data||[];
    }
    return {comments,profiles:new Map(profiles.map(p=>[p.id,p]))};
  }

  async function create(articleId,{body,parentId=null,kind="comment",title=null}={}){
    const sb=auth()?.getClient();
    const user=await auth()?.getUser();
    if(!sb||!user) throw new Error("Sign in before posting.");
    const text=String(body||"").trim();
    const heading=String(title||"").trim();
    if(!text) throw new Error("Write something first.");
    if(kind==="post"&&!heading) throw new Error("Give the post a title.");
    const payload={article_id:articleId,parent_id:parentId||null,user_id:user.id,title:heading||null,body:text,kind};
    const r=await sb.from("comments").insert(payload);
    if(r.error) throw r.error;
  }

  window.IFNCommunityData={thread,create};
})();
