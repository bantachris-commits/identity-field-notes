(() => {
  function load(src, key) {
    if (document.querySelector(`script[data-${key}]`)) return;
    const script = document.createElement("script");
    script.src = src;
    script.dataset[key] = "true";
    document.head.appendChild(script);
  }

  load("assets/guest-core-lite.js?v=20260913-1", "ifnGuestCore");
  load("assets/site-enhancements.js?v=20260913-1", "ifnSiteEnhancements");
  load("assets/nav.js?v=20260913-1", "ifnNav");
  load("assets/events-community-loader.js?v=20260913-1", "ifnEventsCommunity");
})();
