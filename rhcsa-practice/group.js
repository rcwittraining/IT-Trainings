(function () {
  'use strict';
  var tasks = window.RCW_RHCSA_PRACTICE_TASKS || [];
  var search = document.getElementById('taskSearch');
  var nav = document.getElementById('domainNav');
  var groups = document.getElementById('taskGroups');
  var count = document.getElementById('taskCount');
  var empty = document.getElementById('emptyState');
  var activeDomain = 'All domains';
  var progress = {};
  try { progress = JSON.parse(localStorage.getItem('rcw_rhcsa_practice_progress') || '{}'); }
  catch (ignore) { progress = {}; }

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }

  function domains() {
    var list = ['All domains'];
    tasks.forEach(function (task) { if (list.indexOf(task.domain) === -1) list.push(task.domain); });
    return list;
  }

  function renderNav() {
    nav.innerHTML = domains().map(function (domain) {
      var total = domain === 'All domains' ? tasks.length : tasks.filter(function (task) { return task.domain === domain; }).length;
      return '<button type="button" class="domain-button' + (activeDomain === domain ? ' active' : '') + '" data-domain="' + escapeHtml(domain) + '"><span>' + escapeHtml(domain) + '</span><b>' + total + '</b></button>';
    }).join('');
    Array.prototype.forEach.call(nav.querySelectorAll('[data-domain]'), function (button) {
      button.addEventListener('click', function () {
        activeDomain = button.getAttribute('data-domain'); renderNav(); renderTasks();
      });
    });
  }

  function filteredTasks() {
    var term = search.value.trim().toLowerCase();
    return tasks.filter(function (task) {
      var matchesDomain = activeDomain === 'All domains' || task.domain === activeDomain;
      var text = (task.title + ' ' + task.domain + ' ' + task.technology + ' ' + task.number).toLowerCase();
      return matchesDomain && (!term || text.indexOf(term) !== -1);
    });
  }

  function renderTasks() {
    var visible = filteredTasks(), completed = visible.filter(function (task) { return progress[task.id] && progress[task.id].score === 100; }).length;
    count.textContent = visible.length + (visible.length === 1 ? ' task' : ' tasks') + (completed ? ' · ' + completed + ' completed on this device' : '');
    empty.hidden = visible.length !== 0;
    var grouped = [];
    visible.forEach(function (task) {
      var existing = grouped.find(function (item) { return item.domain === task.domain; });
      if (!existing) { existing = { domain: task.domain, tasks: [] }; grouped.push(existing); }
      existing.tasks.push(task);
    });
    groups.innerHTML = grouped.map(function (group) {
      return '<section class="task-group"><div class="group-heading"><div><span>' + escapeHtml(group.domain) + '</span><p>' + group.tasks.length + ' focused task' + (group.tasks.length === 1 ? '' : 's') + '</p></div><i></i></div><div class="task-grid">' + group.tasks.map(function (task) {
        var done = progress[task.id] && progress[task.id].score === 100;
        return '<article class="task-card' + (done ? ' complete' : '') + '"><div class="task-number">' + String(task.number).padStart(2, '0') + '</div><div class="task-body"><p>' + escapeHtml(task.technology) + '</p><h3><a href="' + escapeHtml(task.url) + '">' + escapeHtml(task.title) + '</a></h3><div><span>100 points</span><span>Independent</span>' + (done ? '<strong>✓ Completed</strong>' : '') + '</div></div><span class="task-arrow" aria-hidden="true">→</span></article>';
      }).join('') + '</div></section>';
    }).join('');
  }

  search.addEventListener('input', renderTasks);
  renderNav();
  renderTasks();
}());
