(function () {
  'use strict';

  var C = window.RCW_RHCSA_PRACTICE;
  var Core = window.RCWPracticeCore;
  if (!C || !Core) {
    document.body.textContent = 'This practice task could not be loaded.';
    return;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }

  function objectiveMarkup() {
    return C.objectives.map(function (objective) {
      return '<li class="objective" data-objective="' + escapeHtml(objective.id) + '">' +
        '<span class="objective-check" aria-hidden="true">✓</span><div><strong>' + escapeHtml(objective.title) +
        '</strong><p>' + escapeHtml(objective.detail) + '</p></div><b>' + objective.points + '</b></li>';
    }).join('');
  }

  document.body.innerHTML =
    '<header class="topbar"><a class="brand" href="../"><span>RCW</span><strong>IT Training</strong></a>' +
      '<div class="task-context"><span>RHCSA Certification Practice</span><b>Task ' + String(C.number).padStart(2, '0') + ' / ' + C.total + '</b></div>' +
      '<a class="catalogue-link" href="../../">All labs</a></header>' +
    '<main class="app-shell">' +
      '<section class="screen start-screen active" id="startScreen">' +
        '<div class="start-copy"><p class="eyebrow">' + escapeHtml(C.domain) + ' · ' + escapeHtml(C.technology) + '</p>' +
        '<h1>' + escapeHtml(C.title) + '</h1><p class="scenario">' + escapeHtml(C.scenario) + '</p>' +
        '<div class="alignment"><span aria-hidden="true">◎</span><p><strong>Original task-level practice</strong>' + escapeHtml(C.officialAlignment) + ' Configuration is evaluated from modeled state, not command text alone.</p></div>' +
        '<label class="name-field" for="learnerName"><span>Your name for the score report and certificate</span><input id="learnerName" type="text" maxlength="60" autocomplete="name" placeholder="Enter your full name"><small id="nameError"></small></label>' +
        '<button class="button primary large" id="startTask" type="button">Start independent task <span>→</span></button></div>' +
        '<aside class="task-brief"><p>Task briefing</p><div><strong>100</strong><span>Points</span></div><div><strong>' + C.objectives.length + '</strong><span>State objectives</span></div><div><strong>Public</strong><span>No sign-in</span></div><hr><p class="brief-note">Inspect. Implement. Validate. Your progress remains revocable until the required state is present.</p></aside>' +
      '</section>' +
      '<section class="screen lab-screen" id="labScreen">' +
        '<div class="lab-head"><div><p class="eyebrow">Task ' + String(C.number).padStart(2, '0') + ' · ' + escapeHtml(C.domain) + '</p><h1>' + escapeHtml(C.title) + '</h1></div>' +
        '<div class="score-cluster"><span><b id="scoreValue">0</b>/100</span><div class="score-track"><i id="scoreFill"></i></div></div></div>' +
        '<div class="workspace">' +
          '<aside class="mission-panel"><div class="panel-title"><span>Mission objectives</span><button id="openGuide" type="button">Guide</button></div><p class="mission-scenario">' + escapeHtml(C.scenario) + '</p><ol id="objectiveList">' + objectiveMarkup() + '</ol>' +
          '<div class="mission-actions"><button class="button primary" id="endAttempt" type="button">End attempt &amp; view score</button><button class="text-button" id="resetTask" type="button">Reset task state</button></div></aside>' +
          '<section class="terminal-card" aria-label="Practice terminal"><div class="terminal-bar"><div class="lights"><i></i><i></i><i></i></div><span>root@app01 · modeled RHEL 10 terminal</span><button id="clearTerminal" type="button">Clear</button></div>' +
          '<div class="terminal-output" id="terminalOutput" role="log" aria-live="polite"></div>' +
          '<form class="command-line" id="commandForm"><label for="commandInput">[root@app01 ~]#</label><input id="commandInput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" aria-label="Terminal command"></form>' +
          '<div class="terminal-foot"><span>Type <kbd>help</kbd> for practice controls</span><span id="completeIndicator">0 of ' + C.objectives.length + ' objectives</span></div></section>' +
        '</div>' +
      '</section>' +
      '<section class="screen result-screen" id="resultScreen"><div class="result-summary"><p class="eyebrow">Final score report</p><h1 id="resultHeading">Attempt evaluated</h1><p id="resultMessage"></p><div class="score-ring"><strong id="finalScore">0</strong><span>/100</span></div><div class="result-objectives" id="resultObjectives"></div><div class="result-buttons"><button class="button primary" id="returnTask" type="button">Return to task</button><a class="button secondary" href="../">Choose another task</a></div></div>' +
      '<section class="certificate-panel" id="certificatePanel" hidden><div class="certificate-head"><div><p class="eyebrow">Achievement unlocked</p><h2>Linux Challenge Champion</h2></div><span>PDF ready</span></div><canvas id="certificateCanvas" width="1400" height="990" aria-label="Certificate preview"></canvas><div class="certificate-actions"><button class="button primary" id="downloadCertificate" type="button">Download PDF certificate</button><button class="button secondary" id="printCertificate" type="button">Print certificate</button></div><p>Issued by RCW IT Training · Signed by Pradeep Raju</p></section></section>' +
    '</main>' +
    '<dialog id="guideDialog" class="guide-dialog"><form method="dialog"><button class="dialog-close" aria-label="Close guide">×</button></form><p class="eyebrow">Learner guide</p><h2>' + escapeHtml(C.title) + '</h2><p>' + escapeHtml(C.scenario) + '</p><h3>How this task is evaluated</h3><ul>' + C.objectives.map(function (obj) { return '<li><strong>' + escapeHtml(obj.title) + ' · ' + obj.points + ' points</strong><br>' + escapeHtml(obj.detail) + '</li>'; }).join('') + '</ul>' +
      (C.editableFiles.length ? '<h3>Modeled file editor</h3><p>Open the required path from the terminal with <code>vi ' + escapeHtml(C.editableFiles[0].path) + '</code> or <code>nano ' + escapeHtml(C.editableFiles[0].path) + '</code>.</p>' : '') +
      '<h3>Practice method</h3><ol><li>Inspect the supplied state before changing it.</li><li>Use supported administrative commands to create the required state.</li><li>Run an explicit validation command, then review your score.</li></ol><p class="guide-links"><a href="LAB_GUIDE.md" target="_blank" rel="noopener">Open the complete workflow guide</a><a href="' + escapeHtml(C.officialObjectivesUrl) + '" target="_blank" rel="noopener noreferrer">Official EX200 objectives</a></p></dialog>' +
    '<dialog id="editorDialog" class="editor-dialog"><div class="editor-bar"><span>Modeled editor · <b id="editorPath"></b></span><button id="closeEditor" type="button" aria-label="Close editor">×</button></div><textarea id="editorText" spellcheck="false" aria-label="File contents"></textarea><div class="editor-actions"><span id="editorStatus">INSERT</span><button class="button secondary" id="discardEditor" type="button">Discard</button><button class="button primary" id="saveEditor" type="button">Save file</button></div></dialog>' +
    '<div class="toast" id="toast" role="status" aria-live="polite"></div>';

  var session = Core.createSession(C);
  var learner = '';
  var activeFile = '';
  var commandCursor = 0;
  var completedAnnounced = false;
  var recorded = false;

  function byId(id) { return document.getElementById(id); }
  var screens = [byId('startScreen'), byId('labScreen'), byId('resultScreen')];

  function switchScreen(target) {
    screens.forEach(function (screen) { screen.classList.toggle('active', screen === target); });
    window.scrollTo(0, 0);
  }

  function toast(message) {
    var node = byId('toast');
    node.textContent = message;
    node.classList.add('show');
    window.clearTimeout(toast.timer);
    toast.timer = window.setTimeout(function () { node.classList.remove('show'); }, 2600);
  }

  function line(text, kind, command) {
    var output = byId('terminalOutput');
    if (command) {
      var prompt = document.createElement('div');
      prompt.className = 'terminal-line command';
      prompt.textContent = '[root@app01 ~]# ' + command;
      output.appendChild(prompt);
    }
    if (text !== '') {
      var block = document.createElement('pre');
      block.className = 'terminal-line ' + (kind || 'normal');
      block.textContent = text;
      output.appendChild(block);
    }
    output.scrollTop = output.scrollHeight;
  }

  function updateState() {
    var states = Core.objectiveState(session);
    var currentScore = Core.score(session);
    byId('scoreValue').textContent = currentScore;
    byId('scoreFill').style.width = currentScore + '%';
    var completeCount = 0;
    states.forEach(function (state) {
      var item = document.querySelector('[data-objective="' + state.id + '"]');
      if (item) item.classList.toggle('complete', state.complete);
      if (state.complete) completeCount += 1;
    });
    byId('completeIndicator').textContent = completeCount + ' of ' + states.length + ' objectives';
    if (currentScore === 100 && !completedAnnounced) {
      completedAnnounced = true;
      line('All required state checks now pass. End the attempt to view your final score and certificate.', 'success');
      toast('All objectives complete — 100/100');
    }
    if (currentScore < 100) completedAnnounced = false;
  }

  function startTask() {
    var input = byId('learnerName');
    var value = input.value.trim().replace(/\s+/g, ' ');
    if (value.length < 2) {
      byId('nameError').textContent = 'Enter at least two characters.';
      input.focus();
      return;
    }
    learner = value.slice(0, 60);
    byId('nameError').textContent = '';
    switchScreen(byId('labScreen'));
    line('RCW IT Training — RHCSA Certification Practice\nTask ' + String(C.number).padStart(2, '0') + '/' + C.total + ': ' + C.title + '\n\nThis is a focused, stateful simulation. Type objectives to review score checks.', 'system');
    byId('commandInput').focus();
  }

  function openDialog(node) {
    if (typeof node.showModal === 'function') node.showModal();
    else node.setAttribute('open', '');
  }

  function closeDialog(node) {
    if (typeof node.close === 'function') node.close();
    else node.removeAttribute('open');
  }

  function openEditor(path) {
    activeFile = path;
    byId('editorPath').textContent = path;
    byId('editorText').value = session.files[path] || '';
    byId('editorStatus').textContent = 'INSERT';
    openDialog(byId('editorDialog'));
    byId('editorText').focus();
  }

  function runCommand(raw) {
    var command = String(raw || '').trim();
    if (!command) return;
    var result = Core.execute(session, command);
    if (result.kind === 'clear') {
      byId('terminalOutput').innerHTML = '';
    } else {
      var kind = result.kind === 'success' ? 'success' : (result.kind === 'unknown' || result.kind === 'blocked' ? 'error' : 'normal');
      line(result.output, kind, command);
    }
    if (result.kind === 'editor') openEditor(result.path);
    if (result.kind === 'guide') openDialog(byId('guideDialog'));
    if (result.kind === 'reset') {
      completedAnnounced = false;
      toast('Task state reset');
    }
    commandCursor = session.history.length;
    updateState();
  }

  function saveEditor() {
    var result = Core.saveFile(session, activeFile, byId('editorText').value);
    closeDialog(byId('editorDialog'));
    line(result.output, result.ok ? 'success' : 'error');
    updateState();
  }

  function resetTask() {
    if (!window.confirm('Reset all modeled state and terminal history for this task?')) return;
    var result = Core.execute(session, 'reset');
    byId('terminalOutput').innerHTML = '';
    line(result.output, 'system');
    completedAnnounced = false;
    updateState();
    byId('commandInput').focus();
  }

  function dateText() {
    return new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  function recordCompletion() {
    if (recorded) return;
    recorded = true;
    try {
      var key = 'rcw_rhcsa_practice_progress';
      var progress = JSON.parse(localStorage.getItem(key) || '{}');
      progress[C.id] = { score: 100, completedAt: new Date().toISOString() };
      localStorage.setItem(key, JSON.stringify(progress));
    } catch (ignore) { /* Local progress is optional. */ }
    try {
      if (window.RCWPassport && typeof window.RCWPassport.record === 'function') {
        window.RCWPassport.record({ type: 'lab', name: C.title, score: 100, total: 100, xp: 100, activity: 'Completed ' + C.title, skill: 'RHCSA RHEL 10' });
      }
    } catch (ignorePassport) { /* Passport recording must not interrupt results. */ }
  }

  function showResults() {
    var states = Core.objectiveState(session);
    var finalScore = Core.score(session);
    byId('finalScore').textContent = finalScore;
    byId('resultHeading').textContent = finalScore === 100 ? 'Task completed' : 'Attempt evaluated';
    byId('resultMessage').textContent = finalScore === 100
      ? learner + ', every required state check passes. Your certificate is ready.'
      : learner + ', your current system state earned ' + finalScore + ' points. Return to the task to complete the remaining checks.';
    byId('resultObjectives').innerHTML = states.map(function (state) {
      return '<div class="result-row ' + (state.complete ? 'complete' : '') + '"><span>' + (state.complete ? '✓' : '○') + '</span><p><strong>' + escapeHtml(state.title) + '</strong><small>' + state.points + ' points</small></p></div>';
    }).join('');
    byId('certificatePanel').hidden = finalScore !== 100;
    byId('returnTask').textContent = finalScore === 100 ? 'Review completed task' : 'Return and continue';
    if (finalScore === 100) {
      drawCertificate(byId('certificateCanvas').getContext('2d'));
      loadPortrait().then(function (portrait) { if (portrait) drawCertificate(byId('certificateCanvas').getContext('2d'), portrait); });
      recordCompletion();
    }
    switchScreen(byId('resultScreen'));
  }

  function certificateCode() {
    var seed = C.slug + '-' + learner + '-' + new Date().toISOString().slice(0, 10);
    var hash = 2166136261;
    for (var index = 0; index < seed.length; index += 1) { hash ^= seed.charCodeAt(index); hash = Math.imul(hash, 16777619); }
    return 'RCW-LCC-' + (hash >>> 0).toString(16).toUpperCase().padStart(8, '0');
  }

  function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
    var words = text.split(/\s+/), lines = [], current = '';
    words.forEach(function (word) {
      var test = current ? current + ' ' + word : word;
      if (ctx.measureText(test).width > maxWidth && current) { lines.push(current); current = word; }
      else current = test;
    });
    if (current) lines.push(current);
    lines.forEach(function (item, index) { ctx.fillText(item, x, y + index * lineHeight); });
  }

  function drawCertificate(ctx, portrait) {
    var gradient = ctx.createLinearGradient(0, 0, 1400, 990);
    gradient.addColorStop(0, '#fffdf6'); gradient.addColorStop(1, '#eef6ff');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1400, 990);
    ctx.strokeStyle = '#09295a'; ctx.lineWidth = 12; ctx.strokeRect(24, 24, 1352, 942);
    ctx.strokeStyle = '#d6a720'; ctx.lineWidth = 3; ctx.strokeRect(46, 46, 1308, 898);
    ctx.strokeStyle = '#7da3cf'; ctx.lineWidth = 1; ctx.strokeRect(57, 57, 1286, 876);
    ctx.textAlign = 'left'; ctx.fillStyle = '#0b2f63'; ctx.font = '900 58px Arial'; ctx.fillText('RCW', 100, 134);
    ctx.font = '800 25px Arial'; ctx.fillText('IT TRAINING', 230, 112); ctx.fillStyle = '#56708e'; ctx.font = '500 18px Arial'; ctx.fillText('Practice · Learn · Grow', 230, 139);
    ctx.fillStyle = '#d6a720'; ctx.fillRect(100, 162, 1200, 3);
    ctx.textAlign = 'center'; ctx.fillStyle = '#517194'; ctx.font = '800 21px Arial'; ctx.fillText('CERTIFICATE OF ACHIEVEMENT', 700, 227);
    ctx.fillStyle = '#0b2f63'; ctx.font = 'italic 700 57px Georgia'; ctx.fillText('Linux Challenge Champion', 700, 303);
    ctx.fillStyle = '#66768b'; ctx.font = '400 22px Arial'; ctx.fillText('This certificate is proudly presented to', 700, 359);
    ctx.fillStyle = '#172945'; ctx.font = '700 ' + (learner.length > 30 ? 44 : 54) + 'px Georgia'; ctx.fillText(learner, 700, 429);
    ctx.strokeStyle = '#d6a720'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(390, 450); ctx.lineTo(1010, 450); ctx.stroke();
    ctx.fillStyle = '#66768b'; ctx.font = '400 21px Arial'; ctx.fillText('for successfully completing the', 700, 500);
    ctx.fillStyle = '#0b2f63'; ctx.font = '800 ' + (C.certificateLabTitle.length > 48 ? 24 : 29) + 'px Arial'; ctx.fillText(C.certificateLabTitle, 700, 550);
    ctx.fillStyle = '#53657d'; ctx.font = '400 20px Arial'; wrapCanvasText(ctx, C.certificateStatement, 700, 601, 900, 30);
    ctx.fillStyle = '#edf4fb'; ctx.fillRect(330, 674, 740, 70); ctx.strokeStyle = '#c8daec'; ctx.strokeRect(330, 674, 740, 70);
    ctx.fillStyle = '#536b87'; ctx.font = '700 18px Arial'; ctx.fillText('FINAL SCORE', 500, 716);
    ctx.fillStyle = '#0a356b'; ctx.font = '900 30px Arial'; ctx.fillText('100 / 100', 700, 718);
    ctx.fillStyle = '#536b87'; ctx.font = '700 18px Arial'; ctx.fillText(C.objectives.length + ' OBJECTIVES', 900, 716);
    ctx.textAlign = 'left'; ctx.fillStyle = '#203956'; ctx.font = '700 21px Arial'; ctx.fillText(dateText(), 110, 842);
    ctx.fillStyle = '#718096'; ctx.font = '400 15px Arial'; ctx.fillText('Date of completion', 110, 868);
    if (portrait) {
      ctx.save(); ctx.beginPath(); ctx.arc(1035, 834, 59, 0, Math.PI * 2); ctx.clip();
      var ratio = Math.max(118 / portrait.width, 118 / portrait.height), width = portrait.width * ratio, height = portrait.height * ratio;
      ctx.drawImage(portrait, 1035 - width / 2, 834 - height * 0.31, width, height); ctx.restore();
      ctx.strokeStyle = '#d6a720'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(1035, 834, 61, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillStyle = '#0b2f63'; ctx.beginPath(); ctx.arc(1035, 834, 59, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.font = '800 25px Arial'; ctx.fillText('PR', 1035, 844);
    }
    ctx.textAlign = 'left'; ctx.fillStyle = '#172945'; ctx.font = 'italic 700 25px Georgia'; ctx.fillText('Pradeep Raju', 1115, 819);
    ctx.fillStyle = '#5d6f86'; ctx.font = '500 16px Arial'; ctx.fillText('Founder & Senior Architect', 1115, 846); ctx.fillText('RCW IT Training', 1115, 871);
    ctx.textAlign = 'center'; ctx.fillStyle = '#7890aa'; ctx.font = '500 14px monospace'; ctx.fillText('Certificate ID: ' + certificateCode(), 700, 918);
  }

  function loadPortrait() {
    return new Promise(function (resolve) {
      var image = new Image(); image.onload = function () { resolve(image); }; image.onerror = function () { resolve(null); }; image.src = C.portrait;
    });
  }

  function binaryStringToBytes(value) {
    var bytes = new Uint8Array(value.length);
    for (var index = 0; index < value.length; index += 1) bytes[index] = value.charCodeAt(index) & 255;
    return bytes;
  }

  function safeSlug(value) {
    return String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'learner';
  }

  async function downloadPdf() {
    var button = byId('downloadCertificate'), original = button.textContent;
    button.disabled = true; button.textContent = 'Preparing PDF…';
    try {
      var portrait = await loadPortrait(); drawCertificate(byId('certificateCanvas').getContext('2d'), portrait);
      var jpeg = byId('certificateCanvas').toDataURL('image/jpeg', 0.92), jpegBinary = atob(jpeg.split(',')[1]);
      var content = 'q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ\n', objects = [];
      objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
      objects[2] = '<< /Type /Pages /Kids [3 0 R] /Count 1 >>';
      objects[3] = '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>';
      objects[4] = '<< /Type /XObject /Subtype /Image /Width 1400 /Height 990 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ' + jpegBinary.length + ' >>\nstream\n' + jpegBinary + '\nendstream';
      objects[5] = '<< /Length ' + content.length + ' >>\nstream\n' + content + 'endstream';
      var pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n', offsets = [0];
      for (var number = 1; number <= 5; number += 1) { offsets[number] = pdf.length; pdf += number + ' 0 obj\n' + objects[number] + '\nendobj\n'; }
      var xref = pdf.length; pdf += 'xref\n0 6\n0000000000 65535 f \n';
      for (var item = 1; item <= 5; item += 1) pdf += String(offsets[item]).padStart(10, '0') + ' 00000 n \n';
      pdf += 'trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n' + xref + '\n%%EOF';
      var blob = new Blob([binaryStringToBytes(pdf)], { type: 'application/pdf' }), link = document.createElement('a'), href = URL.createObjectURL(blob);
      link.href = href; link.download = 'RCW-' + C.slug + '-' + safeSlug(learner) + '.pdf'; document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(function () { URL.revokeObjectURL(href); }, 1000); toast('PDF certificate prepared');
    } catch (error) {
      console.error(error); window.alert('The PDF could not be created. Please use Print certificate instead.');
    } finally {
      button.disabled = false; button.textContent = original;
    }
  }

  function printCertificate() {
    var data = byId('certificateCanvas').toDataURL('image/png'), popup = window.open('', '_blank');
    if (!popup) { window.alert('Allow pop-ups to print the certificate.'); return; }
    popup.opener = null;
    popup.document.title = 'RCW IT Training Certificate';
    popup.document.body.style.margin = '0';
    var image = popup.document.createElement('img');
    image.alt = 'RCW IT Training completion certificate';
    image.style.display = 'block'; image.style.width = '100%'; image.style.height = 'auto';
    image.addEventListener('load', function () { popup.focus(); popup.print(); }, { once: true });
    popup.document.body.appendChild(image); image.src = data;
  }

  byId('startTask').addEventListener('click', startTask);
  byId('learnerName').addEventListener('keydown', function (event) { if (event.key === 'Enter') startTask(); });
  byId('commandForm').addEventListener('submit', function (event) {
    event.preventDefault(); var input = byId('commandInput'), value = input.value; input.value = ''; runCommand(value);
  });
  byId('commandInput').addEventListener('keydown', function (event) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    commandCursor += event.key === 'ArrowUp' ? -1 : 1;
    commandCursor = Math.max(0, Math.min(session.history.length, commandCursor));
    byId('commandInput').value = commandCursor < session.history.length ? session.history[commandCursor] : '';
  });
  byId('clearTerminal').addEventListener('click', function () { byId('terminalOutput').innerHTML = ''; byId('commandInput').focus(); });
  byId('openGuide').addEventListener('click', function () { openDialog(byId('guideDialog')); });
  byId('endAttempt').addEventListener('click', showResults);
  byId('returnTask').addEventListener('click', function () { switchScreen(byId('labScreen')); byId('commandInput').focus(); });
  byId('resetTask').addEventListener('click', resetTask);
  byId('saveEditor').addEventListener('click', saveEditor);
  byId('discardEditor').addEventListener('click', function () { closeDialog(byId('editorDialog')); });
  byId('closeEditor').addEventListener('click', function () { closeDialog(byId('editorDialog')); });
  byId('downloadCertificate').addEventListener('click', downloadPdf);
  byId('printCertificate').addEventListener('click', printCertificate);
}());
