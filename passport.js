// RCW IT Training — shared Skill Passport recorder + sync
// Load before each lab's app.js:  <script src="../passport.js"></script>
// On completion call:  RCWPassport.record({ type:"lab"|"quiz", name:"...", xp:40, activity:3 });
// Progress is stored in localStorage ("rcw_passport") and read by skill-passport.html.
//
// Backend (for cross-device sync + public share pages). Two pluggable options:
//   A) Supabase (free, no server)  -> set SUPABASE_URL + SUPABASE_KEY below
//   B) Custom HTTP API (the Node server.js) -> set API_BASE below
// If neither is set, the passport is local-only (same device).

(function () {
  "use strict";

  var KEY = "rcw_passport";
  var REMOTE_KEY = "rcw_passport_remote";

  // ============================================================
  // 👉 CONFIG — fill these in (only ONE backend is needed).
  // ============================================================
  var SUPABASE_URL = "__SUPABASE_URL__"; // e.g. "https://abcdefgh.supabase.co"
  var SUPABASE_KEY = "__SUPABASE_KEY__"; // the "anon" public key (safe to expose)
  var API_BASE = "";                     // custom HTTP API base (optional)

  var PUBLIC_PAGE = "https://www.rcwittraining.in/p.html?id="; // where public pages are served

  window.RCW_API_BASE = window.RCW_API_BASE || API_BASE;
  window.RCW_SUPABASE_URL = window.RCW_SUPABASE_URL || SUPABASE_URL;
  window.RCW_SUPABASE_KEY = window.RCW_SUPABASE_KEY || SUPABASE_KEY;

  function hasSupabase() {
    var u = window.RCW_SUPABASE_URL, k = window.RCW_SUPABASE_KEY;
    return u && k && u.indexOf("__") === -1 && k.indexOf("__") === -1;
  }
  function hasApi() { return !!window.RCW_API_BASE; }

  // ---------- passport model ----------
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
    push().catch(function () {}); // background sync
    return S;
  }

  function randomToken() {
    var a = new Uint8Array(16);
    (window.crypto || { getRandomValues: function (b) { for (var i = 0; i < b.length; i++) b[i] = Math.floor(Math.random() * 256); } }).getRandomValues(a);
    return Array.prototype.map.call(a, function (x) { return ("0" + x.toString(16)).slice(-2); }).join("");
  }

  // ---------- Supabase transport ----------
  function supabaseRPC(fn, body) {
    var url = window.RCW_SUPABASE_URL + "/rest/v1/rpc/" + fn;
    return fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": window.RCW_SUPABASE_KEY,
        "Authorization": "Bearer " + window.RCW_SUPABASE_KEY
      },
      body: JSON.stringify(body)
    });
  }

  function supabaseGet(id) {
    var url = window.RCW_SUPABASE_URL + "/rest/v1/passports?id=eq." + encodeURIComponent(id) + "&select=data,updated_at";
    return fetch(url, {
      headers: { "apikey": window.RCW_SUPABASE_KEY, "Authorization": "Bearer " + window.RCW_SUPABASE_KEY }
    });
  }

  // ---------- sync ----------
  function push() {
    var r = getRemote();
    if (!r) return Promise.resolve(null);
    if (hasSupabase()) {
      return supabaseRPC("upsert_passport", { p_id: r.id, p_token: r.token, p_data: load() })
        .then(function (res) { return res.ok ? r : null; });
    }
    if (hasApi()) {
      return fetch(window.RCW_API_BASE + "/api/passport", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: r.id, token: r.token, passport: load() })
      }).then(function (res) { return res.ok ? r : null; });
    }
    return Promise.resolve(null);
  }

  function pull() {
    var r = getRemote();
    if (!r) return Promise.resolve(null);
    if (hasSupabase()) {
      return supabaseGet(r.id).then(function (res) {
        if (!res.ok) return null;
        return res.json().then(function (rows) {
          if (!rows || !rows.length || !rows[0].data) return null;
          var data = rows[0].data;
          data.updatedAt = rows[0].updated_at ? new Date(rows[0].updated_at).getTime() : null;
          return data;
        });
      });
    }
    if (hasApi()) {
      return fetch(window.RCW_API_BASE + "/api/passport/" + r.id)
        .then(function (res) { return res.ok ? res.json() : null; });
    }
    return Promise.resolve(null);
  }

  function syncCreate() {
    if (!hasSupabase() && !hasApi()) return Promise.reject(new Error("Backend not configured"));
    if (hasSupabase()) {
      var token = randomToken();
      return supabaseRPC("upsert_passport", { p_id: null, p_token: token, p_data: load() })
        .then(function (res) {
          if (!res.ok) throw new Error("Sync failed (" + res.status + ")");
          return res.json();
        })
        .then(function (newId) {
          if (!newId) throw new Error("Could not create passport");
          setRemote({ id: newId, token: token });
          return { id: newId, token: token };
        });
    }
    return fetch(window.RCW_API_BASE + "/api/passport", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passport: load() })
    }).then(function (res) {
      if (!res.ok) throw new Error("Sync failed (" + res.status + ")");
      return res.json();
    }).then(function (r) {
      setRemote({ id: r.id, token: r.token });
      return r;
    });
  }

  function syncRefresh() {
    return pull().then(function (fresh) {
      if (fresh && fresh.updatedAt) {
        var S = load();
        if (!S.updatedAt || fresh.updatedAt > S.updatedAt) save(fresh);
      }
      return push();
    });
  }

  function getCode() {
    var r = getRemote();
    return r ? r.id + "." + r.token : "";
  }

  function restoreFromCode(code) {
    if (!code || code.indexOf(".") === -1) return Promise.reject(new Error("Invalid sync code"));
    var parts = code.trim().split(".");
    setRemote({ id: parts[0], token: parts.slice(1).join(".") });
    return pull().then(function (fresh) {
      if (!fresh) throw new Error("Could not find that passport");
      save(fresh);
      return fresh;
    });
  }

  function publicUrl(r) {
    if (!r) return "";
    if (hasSupabase()) return PUBLIC_PAGE + r.id;
    if (hasApi()) return window.RCW_API_BASE + "/p/" + r.id;
    return "";
  }

  window.RCWPassport = {
    record: record, fresh: fresh, load: load, save: save,
    getRemote: getRemote, setRemote: setRemote,
    hasSupabase: hasSupabase, hasApi: hasApi,
    push: push, pull: pull,
    syncCreate: syncCreate, syncRefresh: syncRefresh,
    getCode: getCode, restoreFromCode: restoreFromCode,
    publicUrl: publicUrl
  };
})();
