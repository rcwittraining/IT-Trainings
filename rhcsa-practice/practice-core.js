(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.RCWPracticeCore = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function normalizeCommand(value) {
    return String(value || '')
      .trim()
      .replace(/\s+/g, ' ');
  }

  function createSession(config) {
    var files = {};
    (config.editableFiles || []).forEach(function (file) {
      files[file.path] = file.initial || '';
    });
    return {
      config: config,
      facts: Object.create(null),
      files: files,
      history: [],
      startedAt: Date.now()
    };
  }

  function objectiveState(session) {
    return session.config.objectives.map(function (objective) {
      var complete = objective.requires.every(function (fact) {
        return session.facts[fact] === true;
      });
      return {
        id: objective.id,
        title: objective.title,
        detail: objective.detail,
        points: objective.points,
        complete: complete
      };
    });
  }

  function score(session) {
    return objectiveState(session).reduce(function (total, objective) {
      return total + (objective.complete ? objective.points : 0);
    }, 0);
  }

  function isComplete(session) {
    return score(session) === 100;
  }

  function unmetLabels(session, facts) {
    return facts.filter(function (fact) { return session.facts[fact] !== true; })
      .map(function (fact) { return session.config.facts[fact] || fact; });
  }

  function execute(session, rawCommand) {
    var command = normalizeCommand(rawCommand);
    if (!command) return { kind: 'empty', output: '', score: score(session), complete: isComplete(session) };
    session.history.push(command);

    if (command === 'help') {
      return {
        kind: 'help',
        output: 'Practice commands: objectives, score, history, clear, reset, guide.\nUse the mission and learner guide for system commands.',
        score: score(session), complete: isComplete(session)
      };
    }
    if (command === 'objectives') {
      return {
        kind: 'objectives',
        output: objectiveState(session).map(function (item) {
          return (item.complete ? '[complete] ' : '[pending]  ') + item.title + ' — ' + item.points + ' pts';
        }).join('\n'),
        score: score(session), complete: isComplete(session)
      };
    }
    if (command === 'score') {
      return { kind: 'score', output: 'Current score: ' + score(session) + '/100', score: score(session), complete: isComplete(session) };
    }
    if (command === 'history') {
      return { kind: 'history', output: session.history.map(function (item, index) { return String(index + 1).padStart(3, ' ') + '  ' + item; }).join('\n'), score: score(session), complete: isComplete(session) };
    }
    if (command === 'clear') {
      return { kind: 'clear', output: '', score: score(session), complete: isComplete(session) };
    }
    if (command === 'reset') {
      var fresh = createSession(session.config);
      session.facts = fresh.facts;
      session.files = fresh.files;
      session.history = [];
      session.startedAt = fresh.startedAt;
      return { kind: 'reset', output: 'Practice system reset to its initial state.', score: 0, complete: false };
    }
    if (command === 'guide') {
      return { kind: 'guide', output: 'Opening the learner guide…', score: score(session), complete: isComplete(session) };
    }

    var editorMatch = command.match(/^(?:vi|vim|nano)\s+(\/\S+)$/);
    if (editorMatch && Object.prototype.hasOwnProperty.call(session.files, editorMatch[1])) {
      return { kind: 'editor', path: editorMatch[1], output: 'Opening modeled editor for ' + editorMatch[1], score: score(session), complete: isComplete(session) };
    }
    var catMatch = command.match(/^cat\s+(\/\S+)$/);
    if (catMatch && Object.prototype.hasOwnProperty.call(session.files, catMatch[1])) {
      return { kind: 'file', output: session.files[catMatch[1]] || '', score: score(session), complete: isComplete(session) };
    }

    var action = (session.config.actions || []).find(function (candidate) {
      try {
        var matcher = new RegExp(candidate.pattern);
        return matcher.test(command) || (/^sudo\s+/.test(command) && matcher.test(command.replace(/^sudo\s+/, '')));
      } catch (error) { return false; }
    });
    if (!action) {
      return {
        kind: 'unknown',
        output: 'bash: ' + command.split(' ')[0] + ': command or arguments not recognised in this focused practice system.\nType help or open the learner guide.',
        score: score(session), complete: isComplete(session)
      };
    }

    var unmet = unmetLabels(session, action.requires || []);
    if (unmet.length) {
      return {
        kind: 'blocked',
        output: 'State check failed. Complete first:\n- ' + unmet.join('\n- '),
        score: score(session), complete: isComplete(session)
      };
    }

    (action.unsets || []).forEach(function (fact) { delete session.facts[fact]; });
    (action.sets || []).forEach(function (fact) { session.facts[fact] = true; });
    return {
      kind: 'success',
      output: action.output || 'Command completed successfully.',
      score: score(session),
      complete: isComplete(session),
      changed: clone(action.sets || [])
    };
  }

  function saveFile(session, path, content) {
    var file = (session.config.editableFiles || []).find(function (candidate) { return candidate.path === path; });
    if (!file) return { ok: false, output: 'That path is not editable in this task.', score: score(session), complete: isComplete(session) };
    var text = String(content || '');
    session.files[path] = text;
    var missing = (file.patterns || []).filter(function (pattern) {
      try { return !(new RegExp(pattern, 'm')).test(text); }
      catch (error) { return true; }
    });
    if (missing.length) {
      (file.sets || []).forEach(function (fact) { delete session.facts[fact]; });
      return {
        ok: false,
        output: path + ' saved, but required script structures are still missing. Review the mission and validate the script.',
        score: score(session), complete: isComplete(session)
      };
    }
    (file.sets || []).forEach(function (fact) { session.facts[fact] = true; });
    return {
      ok: true,
      output: path + ' saved and its required structure is present.',
      score: score(session), complete: isComplete(session)
    };
  }

  function snapshot(session) {
    return { facts: clone(session.facts), files: clone(session.files), score: score(session), objectives: objectiveState(session) };
  }

  return Object.freeze({
    normalizeCommand: normalizeCommand,
    createSession: createSession,
    execute: execute,
    saveFile: saveFile,
    objectiveState: objectiveState,
    score: score,
    isComplete: isComplete,
    snapshot: snapshot
  });
}));
