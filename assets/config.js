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
