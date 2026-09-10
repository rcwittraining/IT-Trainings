/* Open the consent controls supplied by Google's published Privacy & Messaging CMP. */
(function () {
  "use strict";

  var PROMPT_URL = "/index.html?privacy-settings=1#privacy-choices";
  var QUEUED = "__rcwPrivacyPromptQueued";

  function ensureGoogleFc() {
    window.googlefc = window.googlefc || {};
    window.googlefc.callbackQueue = window.googlefc.callbackQueue || [];
    return window.googlefc;
  }

  function requestGoogleSettings() {
    var googlefc = ensureGoogleFc();

    if (typeof googlefc.showRevocationMessage === "function") {
      googlefc.showRevocationMessage();
      return true;
    }

    if (!window[QUEUED]) {
      window[QUEUED] = true;
      googlefc.callbackQueue.push({
        "CONSENT_API_READY": function () {
          if (window.googlefc && typeof window.googlefc.showRevocationMessage === "function") {
            window.googlefc.showRevocationMessage();
          }
        }
      });
    }

    return true;
  }

  function routeToPublishedCmp() {
    // Privacy/legal pages do not load AdSense, so the CMP API may not exist on
    // them. The homepage initializes the callback queue before its AdSense tag.
    window.location.href = PROMPT_URL;
  }

  function openSettings(event) {
    event.preventDefault();
    var hasAdSenseTag = !!document.querySelector(
      'script[src*="pagead2.googlesyndication.com/pagead/js/adsbygoogle.js"]'
    );

    if (hasAdSenseTag) {
      requestGoogleSettings();
    } else {
      routeToPublishedCmp();
    }
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    var link = target && typeof target.closest === "function" ?
      target.closest("[data-privacy-settings]") : null;
    if (link) {
      openSettings(event);
    }
  });
}());
