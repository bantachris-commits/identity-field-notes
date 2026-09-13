(() => {
  const loadScript = src => new Promise((resolve, reject) => {
    const existing = [...document.scripts].find(s => s.src && s.src.includes(src.split('?')[0]));
    if (existing) {
      if (existing.dataset.ifnLoaded === "true" || (src.includes("supabase") && window.supabase) || (src.includes("gsi/client") && window.google?.accounts?.id)) return resolve();
      existing.addEventListener("load", resolve, {once:true});
      existing.addEventListener("error", reject, {once:true});
      return;
    }
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => { s.dataset.ifnLoaded = "true"; resolve(); };
    s.onerror = reject;
    document.head.appendChild(s);
  });

  const loadCss = href => {
    if (document.querySelector(`link[href^="${href}"]`)) return;
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = href;
    document.head.appendChild(l);
  };

  async function waitForCards() {
    for (let i = 0; i < 50; i++) {
      if (document.querySelector("#eventsList > .card")) return true;
      await new Promise(r => setTimeout(r, 100));
    }
    return false;
  }

  async function boot() {
    if (!document.querySelector("#eventsList")) return;
    loadCss("assets/community.css?v=20260913-6");
    try {
      if (!window.supabase?.createClient) await loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2");
      if (!window.google?.accounts?.id) await loadScript("https://accounts.google.com/gsi/client");
      if (!window.IFNCommunityAuth) await loadScript("assets/community-auth.js?v=20260913-2");
      if (!window.IFNCommunityData) await loadScript("assets/community-data.js?v=20260913-3");
      if (!window.IFNEventDiscussions) await loadScript("assets/event-discussions.js?v=20260913-1");
      if (await waitForCards()) await window.IFNEventDiscussions.setup();
    } catch (err) {
      console.warn("IFN event discussions failed to load", err);
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();
})();
