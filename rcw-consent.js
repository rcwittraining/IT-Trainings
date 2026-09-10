/*
 * RCW IT Training privacy helper.
 *
 * Google AdSense tags remain static on the pages selected for monetisation so
 * Google can evaluate and serve ads. Consent and regional privacy choices are
 * handled by the Google-certified CMP published in AdSense Privacy &
 * messaging; this file deliberately does not invent a second consent banner,
 * inject an AdSense tag, or add a measurement script.
 */
(function () {
  "use strict";

  var PRIVACY_POLICY_URL = "/privacy.html#privacy-choices";
  var PRIVACY_PROMPT_QUEUED = "__rcwPrivacyPromptQueued";

  // Create the supported Google Privacy & Messaging callback queue before a
  // static AdSense tag is parsed. The account owner must publish the CMP for
  // this queue to receive CONSENT_API_READY.
  window.googlefc = window.googlefc || {};
  window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];

  function queuePrivacyPromptFromUrl() {
    var params = new URLSearchParams(window.location.search);
    if (params.get("privacy-settings") !== "1" || window[PRIVACY_PROMPT_QUEUED]) {
      return;
    }

    window[PRIVACY_PROMPT_QUEUED] = true;
    window.googlefc.callbackQueue.push({
      "CONSENT_API_READY": function () {
        if (window.googlefc && typeof window.googlefc.showRevocationMessage === "function") {
          window.googlefc.showRevocationMessage();
        }
      }
    });
  }

  function privacyEnhancedSource(url) {
    return String(url).replace(
      "//www.youtube.com/",
      "//www.youtube-nocookie.com/"
    );
  }

  function wrapYouTubeEmbeds() {
    var frames = document.querySelectorAll(
      'iframe[src*="youtube.com/embed/"], iframe[src*="youtube-nocookie.com/embed/"], iframe[data-rcw-src*="youtube.com/embed/"], iframe[data-rcw-src*="youtube-nocookie.com/embed/"]'
    );

    frames.forEach(function (frame) {
      if (frame.dataset.rcwWrapped === "1") {
        return;
      }
      frame.dataset.rcwWrapped = "1";
      var source = frame.getAttribute("src") || frame.getAttribute("data-rcw-src");
      if (!source) {
        return;
      }

      var holder = document.createElement("div");
      holder.className = "rcw-video-consent";
      holder.style.cssText = "background:#081a33;color:#dce9f6;padding:24px;text-align:center;border-radius:10px;min-height:160px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px";
      holder.innerHTML = '<strong>YouTube video</strong><span>Load the video only if you want to connect to YouTube.</span><button type="button" style="background:#18b6d9;border:0;border-radius:6px;color:#03101f;cursor:pointer;font-weight:700;padding:10px 16px">Load video</button>';

      var button = holder.querySelector("button");
      button.addEventListener("click", function () {
        frame.setAttribute("src", privacyEnhancedSource(source));
        frame.style.display = "";
        holder.replaceWith(frame);
      });

      frame.replaceWith(holder);
    });
  }

  function init() {
    queuePrivacyPromptFromUrl();
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", wrapYouTubeEmbeds);
    } else {
      wrapYouTubeEmbeds();
    }
  }

  window.rcwConsent = {
    privacyPolicyUrl: PRIVACY_POLICY_URL,
    // Kept as a compatibility surface for older page scripts. Consent itself
    // is intentionally owned by Google's published CMP, not browser storage.
    getConsent: function () {
      return null;
    }
  };

  init();
}());
