// RCW IT Training — shared Skill Passport recorder
// Load this before each lab's app.js:  <script src="../passport.js"></script>
// Then call on completion:  RCWPassport.record({ type: "lab"|"quiz", name: "...", xp: 40, activity: 3 });
// Progress is stored in localStorage under "rcw_passport" and read by skill-passport.html.
(function () {
  "use strict";

  var KEY = "rcw_passport";

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

  function save(S) {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {}
  }

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

    if (opts.name && typeof opts.name === "string") S.name = opts.name.trim();

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
    return S;
  }

  window.RCWPassport = { record: record, fresh: fresh };
})();
