window.IFN_CONFIG = {
  siteName: "Identity Field Notes",
  siteUrl: "https://identityfieldnotes.com",
  tagline: "AI-driven identity news. I burn the tokens so you don't have to.",
  newsletter: {
    provider: "buttondown",
    // Set this after creating the newsletter. No secret is exposed in the browser.
    buttondownUsername: "",
    tag: "website"
  },
  comments: {
    provider: "giscus",
    // Fill these after enabling GitHub Discussions and installing Giscus.
    repo: "",
    repoId: "",
    category: "Field Discussion",
    categoryId: "",
    mapping: "specific"
  },
  analytics: {
    // privacy-friendly option; leave empty to disable
    plausibleDomain: ""
  },
  contact: {
    editorialEmail: "",
    sponsorshipEmail: ""
  }
};

// Theme bootstrap. Apply the saved theme before first paint, then load the
// shared theme layer used by every page on the site.
(()=>{
  const valid=new Set(["field","dark","matrix","jurassic"]);
  let saved="field";
  try{saved=localStorage.getItem("ifn-theme")||"field"}catch(e){}
  document.documentElement.dataset.theme=valid.has(saved)?saved:"field";

  if(!document.querySelector('link[data-ifn-theme]')){
    const css=document.createElement("link");
    css.rel="stylesheet";
    css.href="assets/theme.css";
    css.dataset.ifnTheme="true";
    document.head.appendChild(css);
  }

  if(!document.querySelector('script[data-ifn-theme]')){
    const js=document.createElement("script");
    js.src="assets/theme.js";
    js.dataset.ifnTheme="true";
    document.head.appendChild(js);
  }

  if(!document.querySelector('script[data-ifn-guests]')){
    const guests=document.createElement("script");
    guests.src="assets/guest.js";
    guests.dataset.ifnGuests="true";
    document.head.appendChild(guests);
  }
})();
