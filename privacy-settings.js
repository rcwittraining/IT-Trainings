(function () {
  "use strict";

  function showStatus(message) {
    var status = document.getElementById("privacy-settings-status");
    if (!status) return;
    status.hidden = false;
    status.textContent = message;
    status.focus();
  }

  function openGooglePrivacySettings(control, attempt) {
    var googlefc = window.googlefc;
    if (googlefc && Array.isArray(googlefc.callbackQueue) &&
        typeof googlefc.showRevocationMessage === "function") {
      googlefc.callbackQueue.push(googlefc.showRevocationMessage);
      return;
    }

    if (attempt < 10) {
      window.setTimeout(function () {
        openGooglePrivacySettings(control, attempt + 1);
      }, 100);
      return;
    }

    var destination = control.getAttribute("href") || "privacy.html#privacy-choices";
    if (/privacy\.html$/i.test(window.location.pathname)) {
      showStatus("The site consent panel is not available yet. It becomes available after the Google privacy message is published. You can still manage ad personalization using the Google Ads Settings link below.");
      return;
    }
    window.location.href = destination;
  }

  document.addEventListener("click", function (event) {
    var target = event.target;
    var control = target && typeof target.closest === "function" ?
      target.closest("[data-privacy-settings]") : null;
    if (!control) return;
    event.preventDefault();
    openGooglePrivacySettings(control, 0);
  });
})();
