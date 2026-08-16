// RCW IT Training — shared Skill Passport recorder + sync
// Load this before each lab's app.js:  <script src="../passport.js"></script>
// Then call on completion:  RCWPassport.record({ type: "lab"|"quiz", name: "...", xp: 40, activity: 3 });
// Progress is stored in localStorage under "rcw_passport" and read by skill-passport.html.
// When window.RCW_API_BASE is set (e.g. "https://rcw-passport-api.onrender.com"),
// the passport also syncs to the backend for cross-device + public /p/:id links.
(function () {
  "use strict";

  var KEY = "rcw_passport";
  var REMOTE_KEY = "rcw_passport_remote";

  // 👉 SET THE API BASE once deployed. Leave "" to run local-only (same device).
  var API_BASE = "";

  window.RCW_API_BASE = window.RCW_API_BASE || API_BASE;

  function fresh() {
    return {
      name: "Student", xp: 0, labs: 0, qs: 0, streak: 0, act: {},
      badges: { first: 0, five: 0, quiz: 0, streak7: 0, streak14: 0, beat: 0, elite: 0 }
    };
  }

  function load() {
    var S = null;
    try { S = JSON.parse(localStorage.getItem(KEY)); } catch (e) {}
    if (!S || typeof S !== "object" || !S.act) S = fresh();
    return S;
  }

  function save(S) { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} }

  function getRemote() { try { return JSON.parse(localStorage.getItem(REMOTE_KEY)); } catch (e) { return null; } }
  function setRemote(r) { try { localStorage.setItem(REMOTE_KEY, JSON.stringify(r)); } catch (e) {} }

  function todayKey() { return new Date().toISOString().slice(0, 10); }

  function recomputeBadges(S) {
    S.badges.first = S.labs >= 1 ? 1 : 0;
    S.badges.five = S.labs >= 5 ? 1 : 0;
    S.badges.quiz = S.qs >= 100 ? 1 : 0;
    S.badges.streak7 = S.streak >= 7 ? 1 : 0;
    S.badges.streak14 = S.streak >= 14 ? 1 : 0;
  }

  function record(opts) {
    opts = opts || {};
    var S = load();
    var type = opts.type === "quiz" ? "quiz" : "lab";

    if (opts.name && typeof opts.name === "string" && opts.name.trim()) S.name = opts.name.trim();

    if (type === "lab") {
      S.labs += 1;
      S.xp += (typeof opts.xp === "number" ? opts.xp : 40);
    } else {
      S.qs += (typeof opts.questions === "number" ? opts.questions : 20);
      S.xp += (typeof opts.xp === "number" ? opts.xp : 15);
    }

    var k = todayKey();
    var act = type === "lab" ? (typeof opts.activity === "number" ? opts.activity : 3) : 1;
    S.act[k] = (S.act[k] || 0) + act;

    var d = new Date(), streak = 0;
    while (S.act[d.toISOString().slice(0, 10)]) { streak++; d.setDate(d.getDate() - 1); }
    S.streak = streak;

    recomputeBadges(S);
    save(S);

    // best-effort background sync (fire-and-forget)
    push().catch(function () {});

    return S;
  }

  function apiBase() { return window.RCW_API_BASE || ""; }

  function push() {
    var base = apiBase();
    var r = getRemote();
    if (!base || !r) return Promise.resolve(null);
    return fetch(base + "/api/passport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: r.id, token: r.token, passport: load() })
    }).then(function (res) { return res.ok ? r : null; });
  }

  function pull() {
    var base = apiBase();
    var r = getRemote();
    if (!base || !r) return Promise.resolve(null);
    return fetch(base + "/api/passport/" + r.id)
      .then(function (res) { return res.ok ? res.json() : null; });
  }

  function syncCreate() {
    var base = apiBase();
    if (!base) return Promise.reject(new Error("API base not configured"));
    return fetch(base + "/api/passport", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passport: load() })
    }).then(function (res) {
      if (!res.ok) throw new Error("Sync failed (" + res.status + ")");
      return res.json();
    }).then(function (r) {
      setRemote({ id: r.id, token: r.token });
      return r;
    });
  }

  function syncRefresh() {
    // pull freshest copy, then push ours
    return pull().then(function (fresh) {
      if (fresh && fresh.updatedAt) {
        var S = load();
        if (!S.updatedAt || fresh.updatedAt > S.updatedAt) { save(fresh); }
      }
      return push();
    });
  }

  // Cross-device recovery: code = "id.token"
  function getCode() {
    var r = getRemote();
    return r ? r.id + "." + r.token : "";
  }

  function restoreFromCode(code) {
    if (!code || code.indexOf(".") === -1) return Promise.reject(new Error("Invalid sync code"));
    var parts = code.trim().split(".");
    var id = parts[0], token = parts.slice(1).join(".");
    setRemote({ id: id, token: token });
    return pull().then(function (fresh) {
      if (!fresh) throw new Error("Could not find that passport");
      save(fresh);
      return fresh;
    });
  }

  window.RCWPassport = {
    record: record,
    fresh: fresh,
    load: load,
    save: save,
    getRemote: getRemote,
    setRemote: setRemote,
    apiBase: apiBase,
    push: push,
    pull: pull,
    syncCreate: syncCreate,
    syncRefresh: syncRefresh,
    getCode: getCode,
    restoreFromCode: restoreFromCode
  };
})();
