(() => {
  const cfg = () => window.IFN_CONFIG?.community || {};
  const GOOGLE_CLIENT_ID = "367776249426-5mlmbnh1u52ddumpjtou1bth7otcjadu.apps.googleusercontent.com";
  let client;

  function getClient() {
    if (client) return client;
    const c = cfg();
    if (!window.supabase?.createClient || !c.supabaseUrl || !c.supabaseKey) return null;
    client = window.supabase.createClient(c.supabaseUrl, c.supabaseKey);
    return client;
  }

  async function getUser() {
    const sb = getClient();
    if (!sb) return null;
    const { data } = await sb.auth.getUser();
    return data.user || null;
  }

  async function googleSignIn(host) {
    const sb = getClient();
    if (!sb || !window.google?.accounts?.id) return;
    const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
    const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const nonce = [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2,"0")).join("");
    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      nonce,
      use_fedcm_for_prompt: true,
      callback: async response => {
        const { error } = await sb.auth.signInWithIdToken({provider:"google", token:response.credential, nonce:raw});
        if (error) return alert(error.message);
        location.reload();
      }
    });
    window.google.accounts.id.renderButton(host,{theme:"outline",size:"large",shape:"pill",text:"signin_with"});
  }

  async function renderAuth(host) {
    const sb = getClient();
    if (!host || !sb) return;
    const user = await getUser();
    if (user) {
      host.innerHTML = `<div class="community-auth-state"><strong>Signed in as ${window.esc ? esc(user.user_metadata?.full_name || user.email) : user.email}</strong> <button class="btn small alt" type="button" data-ifn-signout>Sign out</button></div>`;
      host.querySelector("[data-ifn-signout]")?.addEventListener("click",async()=>{await sb.auth.signOut();location.reload()});
      return;
    }
    host.innerHTML = `<div class="community-auth-box"><div data-google-login></div><div class="fine">or use an email magic link</div><form data-magic-link><input name="email" type="email" required placeholder="you@company.com" aria-label="Email address"><button class="btn small" type="submit">Email me a sign-in link</button></form><div class="fine" data-auth-status></div></div>`;
    await googleSignIn(host.querySelector("[data-google-login]"));
    host.querySelector("[data-magic-link]")?.addEventListener("submit",async e=>{
      e.preventDefault();
      const email = new FormData(e.currentTarget).get("email");
      const status = host.querySelector("[data-auth-status]");
      const { error } = await sb.auth.signInWithOtp({email,options:{emailRedirectTo:location.href.split("#")[0]}});
      status.textContent = error ? error.message : "Check your email for the sign-in link.";
    });
  }

  window.IFNCommunityAuth = { getClient, getUser, renderAuth };
})();
