/* ==========================================================================
   RCW IT Training - consent layer (rcw-consent.js)  v1.0
   --------------------------------------------------------------------------
   Drop-in cookie/consent gate for the static site (GitHub Pages friendly).
     1) Google AdSense  - the ad script is injected ONLY after "Accept all".
     2) YouTube embeds  - click-to-load placeholders + youtube-nocookie.com.

   INSTALL (see COMPLIANCE-REPORT.md):
     1) REMOVE the current adsbygoogle <script> tag from the page <head>.
     2) ADD   <script src="rcw-consent.js"></script>  in the <head>
        (on every page that shows ads or an embedded video - or site-wide).
     3) Done. The banner appears until a choice is made; a small gear button
        re-opens the choice afterwards.
   =========================================================================== */
(function () {
  "use strict";

  /* ---- configuration ------------------------------------------------------ */
  var ADSENSE_CLIENT = "ca-pub-8225059092422989";  /* your AdSense client id  */
  var STORAGE_KEY = "rcw_consent_v1";              /* accepted | essential    */
  var POLICY_URL = "privacy.html#privacy-choices";

  /* ---- consent state ------------------------------------------------------- */
  function getConsent() {
    try { return localStorage.getItem(STORAGE_KEY) || ""; } catch (e) { return ""; }
  }
  function setConsent(value) {
    try { localStorage.setItem(STORAGE_KEY, value); } catch (e) {}
    hideBanner();
    applyConsent();
  }

  /* ---- AdSense: injected only on full consent ------------------------------- */
  var adsLoaded = false;
  function loadAdsense() {
    if (adsLoaded || !ADSENSE_CLIENT) return;
    adsLoaded = true;
    var s = document.createElement("script");
    s.async = true;
    s.crossOrigin = "anonymous";
    s.src = "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=" + ADSENSE_CLIENT;
    document.head.appendChild(s);
  }

  /* ---- YouTube: click-to-load placeholders ---------------------------------- */
  function nocookie(url) {
    return String(url).replace("//www.youtube.com/", "//www.youtube-nocookie.com/");
  }

  function wrapVideos() {
    var frames = document.querySelectorAll('iframe[src*="youtube.com/embed"]');
    Array.prototype.forEach.call(frames, function (frame) {
      if (frame.getAttribute("data-rcw-gated")) return;      /* already wrapped */
      frame.setAttribute("data-rcw-gated", "1");
      frame.setAttribute("data-rcw-src", frame.src);
      frame.style.display = "none";

      var holder = document.createElement("div");
      holder.setAttribute("data-rcw-holder", "1");
      holder.style.cssText = "position:relative;width:100%;max-width:640px;" +
        "background:#eaf7ff;border:1px solid #b7dcf5;border-radius:10px;" +
        "padding:32px 16px;text-align:center;font-family:inherit;color:#153b61;";
      holder.innerHTML =
        '<div style="font-weight:700;margin-bottom:6px;">&#9654; YouTube video</div>' +
        '<div style="font-size:13px;color:#2c3a58;margin-bottom:12px;">Videos are served by ' +
        'YouTube, which may set cookies. See our <a href="' + POLICY_URL + '">privacy policy</a>.</div>' +
        '<button type="button" style="background:#076dc9;color:#fff;border:0;border-radius:8px;' +
        'padding:9px 18px;font-weight:700;font-size:14px;cursor:pointer;">Load video</button>';
      holder.querySelector("button").addEventListener("click", function () {
        frame.src = nocookie(frame.getAttribute("data-rcw-src"));
        frame.style.display = "";
        if (holder.parentNode) holder.parentNode.removeChild(holder);
      });
      frame.parentNode.insertBefore(holder, frame);
    });
  }

  /* on "Accept all": reveal every gated video immediately (privacy-enhanced mode) */
  function revealAll() {
    var frames = document.querySelectorAll("iframe[data-rcw-src]");
    Array.prototype.forEach.call(frames, function (frame) {
      if (frame.style.display === "none") {
        frame.src = nocookie(frame.getAttribute("data-rcw-src"));
        frame.style.display = "";
        var holder = frame.previousSibling;
        if (holder && holder.getAttribute && holder.getAttribute("data-rcw-holder") === "1" &&
            holder.parentNode) {
          holder.parentNode.removeChild(holder);
        }
      }
    });
  }

  /* ---- banner + settings re-opener ------------------------------------------ */
  var banner = null;
  function buildBanner() {
    banner = document.createElement("div");
    banner.setAttribute("role", "region");
    banner.setAttribute("aria-label", "Cookie consent");
    banner.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99999;" +
      "background:#0a234a;color:#fff;font-family:inherit;font-size:14px;" +
      "box-shadow:0 -4px 18px rgba(0,0,0,.25);";
    var inner = document.createElement("div");
    inner.style.cssText = "max-width:1080px;margin:0 auto;padding:12px 18px;display:flex;" +
      "flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;";
    var text = document.createElement("div");
    text.style.cssText = "flex:1 1 380px;line-height:1.5;";
    text.innerHTML = "We use cookies for the embedded YouTube player and, with your " +
      "consent, Google AdSense advertising. See our " +
      '<a href="' + POLICY_URL + '" style="color:#9cc9f5;">privacy &amp; cookie policy</a>.';
    var actions = document.createElement("div");
    actions.style.cssText = "flex:0 0 auto;display:flex;gap:8px;";
    function makeBtn(label, primary) {
      var b = document.createElement("button");
      b.type = "button";
      b.textContent = label;
      b.style.cssText = "border-radius:8px;padding:9px 16px;font-weight:700;font-size:13.5px;" +
        "cursor:pointer;" + (primary
          ? "background:#fff;color:#0a234a;border:0;"
          : "background:transparent;color:#fff;border:1px solid #5a86b8;");
      return b;
    }
    var accept = makeBtn("Accept all", true);
    accept.addEventListener("click", function () { setConsent("accepted"); });
    var essential = makeBtn("Essential only", false);
    essential.addEventListener("click", function () { setConsent("essential"); });
    actions.appendChild(accept);
    actions.appendChild(essential);
    inner.appendChild(text);
    inner.appendChild(actions);
    banner.appendChild(inner);
    document.body.appendChild(banner);
  }

  function hideBanner() {
    if (banner && banner.parentNode) banner.parentNode.removeChild(banner);
    banner = null;
    if (!document.querySelector("[data-rcw-reopen]")) {
      var gear = document.createElement("button");
      gear.type = "button";
      gear.setAttribute("data-rcw-reopen", "1");
      gear.setAttribute("aria-label", "Cookie settings");
      gear.title = "Cookie settings";
      gear.innerHTML = "&#9881;";
      gear.style.cssText = "position:fixed;right:12px;bottom:12px;z-index:99998;width:38px;" +
        "height:38px;border-radius:50%;border:1px solid #b7dcf5;background:#eaf7ff;" +
        "color:#076dc9;font-size:18px;cursor:pointer;line-height:1;";
      gear.addEventListener("click", function () {
        try { localStorage.removeItem(STORAGE_KEY); } catch (e) {}
        location.reload();
      });
      document.body.appendChild(gear);
    }
  }

  /* ---- apply + init ----------------------------------------------------------- */
  function applyConsent() {
    wrapVideos();
    if (getConsent() === "accepted") {
      loadAdsense();
      revealAll();
    }
    if (getConsent()) hideBanner();
  }

  function init() {
    function ready() {
      applyConsent();
      if (!getConsent()) buildBanner();
    }
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", ready);
    } else {
      ready();
    }
  }

  window.rcwConsent = { get: getConsent };   /* public hook for your own code */

  init();
})();
