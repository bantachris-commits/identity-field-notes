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
    repo: "bantachris-commits/identity-field-notes",
    repoId: "R_kgDOUYDzQw",
    category: "General",
    // Add the General discussion category node ID after the one-time Giscus setup.
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
// shared theme layers used by every page on the site.
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

  if(!document.querySelector('link[data-ifn-jurassic]')){
    const jurassic=document.createElement("link");
    jurassic.rel="stylesheet";
    jurassic.href="assets/jurassic.css";
    jurassic.dataset.ifnJurassic="true";
    document.head.appendChild(jurassic);
  }

  if(!document.querySelector('link[data-ifn-jurassic-brand]')){
    const brand=document.createElement("link");
    brand.rel="stylesheet";
    brand.href="assets/jurassic-brand.css";
    brand.dataset.ifnJurassicBrand="true";
    document.head.appendChild(brand);
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
