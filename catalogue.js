(function () {
  'use strict';

  var PRACTICE_GROUP = 'RHCSA Certification Practice';
  var allLabs = Array.isArray(window.RCW_CATALOGUE) ? window.RCW_CATALOGUE.slice() : [];
  var expandedGroups = Object.create(null);
  var elements = {
    list: document.getElementById('labList'), search: document.getElementById('labSearch'), count: document.getElementById('resultCount'),
    empty: document.getElementById('emptySearch'), technology: document.getElementById('technologyFilter'), type: document.getElementById('typeFilter'),
    group: document.getElementById('groupFilter'), subcategory: document.getElementById('subcategoryFilter'), sort: document.getElementById('sortFilter'),
    tabs: document.getElementById('groupTabs'), active: document.getElementById('activeFilter'), clear: document.getElementById('clearFilters'),
    practice: document.getElementById('filterRhcsa'), incident: document.getElementById('filterIncidentResponse'), total: document.getElementById('catalogueTotal'), technologies: document.getElementById('technologyTotal')
  };

  function safeText(value) {
    return String(value == null ? '' : value).replace(/[&<>'"]/g, function (char) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char];
    });
  }

  function safeAccent(value) {
    return /^#[0-9a-f]{3,8}$/i.test(String(value || '')) ? value : '#1261a6';
  }

  function unique(field, source) {
    var values = [];
    (source || allLabs).forEach(function (lab) {
      var value = lab[field];
      if (value && values.indexOf(value) === -1) values.push(value);
    });
    return values;
  }

  function populate(select, values, allLabel, selected) {
    select.innerHTML = '<option value="">' + safeText(allLabel) + '</option>' + values.slice().sort(function (a, b) { return a.localeCompare(b); }).map(function (value) {
      return '<option value="' + safeText(value) + '">' + safeText(value) + '</option>';
    }).join('');
    if (selected && values.indexOf(selected) !== -1) select.value = selected;
  }

  function populateSubcategories() {
    var selected = elements.subcategory.value;
    var source = elements.technology.value ? allLabs.filter(function (lab) { return lab.technology === elements.technology.value; }) : allLabs;
    var values = unique('subcategory', source);
    populate(elements.subcategory, values, 'All subcategories', selected);
  }

  function groupOrder() {
    return unique('group');
  }

  function renderTabs() {
    var groups = groupOrder();
    var current = elements.group.value;
    elements.tabs.innerHTML = '<button class="group-tab' + (!current ? ' active' : '') + '" type="button" data-group=""><span>All groups</span><b>' + allLabs.length + '</b></button>' + groups.map(function (group) {
      var total = allLabs.filter(function (lab) { return lab.group === group; }).length;
      return '<button class="group-tab' + (current === group ? ' active' : '') + '" type="button" data-group="' + safeText(group) + '"><span>' + safeText(group) + '</span><b>' + total + '</b></button>';
    }).join('');
    Array.prototype.forEach.call(elements.tabs.querySelectorAll('[data-group]'), function (button) {
      button.addEventListener('click', function () {
        elements.group.value = button.getAttribute('data-group'); expandedGroups = Object.create(null); renderTabs(); render();
      });
    });
  }

  function launcherUrl(lab) {
    return './open.html?lab=' + encodeURIComponent(lab.id);
  }

  function card(lab) {
    var isPractice = lab.group === PRACTICE_GROUP;
    return '<article class="catalogue-card' + (isPractice ? ' practice' : '') + '" style="--accent:' + safeAccent(lab.accent) + '">' +
      '<div class="card-top"><span class="card-badge">' + safeText(lab.badge) + '</span><span class="card-type">' + safeText(lab.contentType) + '</span></div>' +
      '<h4>' + safeText(lab.title) + '</h4><div class="card-meta"><span>' + safeText(lab.technology) + '</span><span>' + safeText(lab.subcategory) + '</span></div>' +
      '<a class="card-open" href="' + safeText(launcherUrl(lab)) + '" target="_blank" rel="noopener noreferrer" aria-label="Open ' + safeText(lab.title) + ' in a new tab"><span>' + (lab.contentType === 'Restricted Tool' ? 'Request access' : 'Open free ' + (lab.contentType === 'Simulator' ? 'simulator' : 'activity')) + '</span><span>↗</span></a></article>';
  }

  function filteredLabs() {
    var term = elements.search.value.trim().toLowerCase();
    var filtered = allLabs.filter(function (lab) {
      var haystack = [lab.title, lab.category, lab.technology, lab.subcategory, lab.contentType, lab.group].join(' ').toLowerCase();
      return (!term || haystack.indexOf(term) !== -1) &&
        (!elements.technology.value || lab.technology === elements.technology.value) &&
        (!elements.type.value || lab.contentType === elements.type.value) &&
        (!elements.group.value || lab.group === elements.group.value) &&
        (!elements.subcategory.value || lab.subcategory === elements.subcategory.value);
    });
    if (elements.sort.value === 'az') filtered.sort(function (a, b) { return a.title.localeCompare(b.title); });
    if (elements.sort.value === 'technology') filtered.sort(function (a, b) { return (a.technology + a.title).localeCompare(b.technology + b.title); });
    return filtered;
  }

  function render() {
    var filtered = filteredLabs();
    var hasFocusedFilter = Boolean(elements.search.value.trim() || elements.technology.value || elements.type.value || elements.group.value || elements.subcategory.value || elements.sort.value !== 'featured');
    elements.count.innerHTML = '<strong>' + filtered.length + '</strong> of ' + allLabs.length + ' free public activities';
    var activeLabels = [elements.group.value, elements.technology.value, elements.type.value, elements.subcategory.value].filter(Boolean);
    elements.active.textContent = activeLabels.length ? activeLabels.join(' · ') : 'All catalogue groups';
    elements.empty.style.display = filtered.length ? 'none' : 'block';

    var grouped = [];
    filtered.forEach(function (lab) {
      var group = grouped.find(function (entry) { return entry.name === lab.group; });
      if (!group) { group = { name: lab.group, labs: [] }; grouped.push(group); }
      group.labs.push(lab);
    });
    if (elements.sort.value === 'featured') {
      var order = groupOrder(); grouped.sort(function (a, b) { return order.indexOf(a.name) - order.indexOf(b.name); });
    }

    elements.list.innerHTML = grouped.map(function (group) {
      var limit = hasFocusedFilter || expandedGroups[group.name] ? group.labs.length : 6;
      var visible = group.labs.slice(0, limit);
      var remaining = group.labs.length - visible.length;
      var groupLink = group.name === PRACTICE_GROUP ? '<a href="rhcsa-practice/">Series overview →</a>' : (group.name === 'Incident Response' ? '<a href="incident-response-freshers/">Incident desk →</a>' : '');
      return '<section class="catalogue-group"><header class="catalogue-group-head"><div><h3>' + safeText(group.name) + '</h3><span>' + group.labs.length + ' ' + (group.labs.length === 1 ? 'activity' : 'activities') + '</span></div><i></i>' + groupLink + '</header>' +
        '<div class="catalogue-grid">' + visible.map(card).join('') + '</div>' +
        (remaining ? '<button class="show-group" type="button" data-expand="' + safeText(group.name) + '">Show ' + remaining + ' more in ' + safeText(group.name) + '</button>' : '') + '</section>';
    }).join('');

    Array.prototype.forEach.call(elements.list.querySelectorAll('[data-expand]'), function (button) {
      button.addEventListener('click', function () { expandedGroups[button.getAttribute('data-expand')] = true; render(); });
    });
    renderTabs();
  }

  function initialiseFilters() {
    populate(elements.technology, unique('technology'), 'All technologies', elements.technology.value);
    populate(elements.type, unique('contentType'), 'All content types', elements.type.value);
    populate(elements.group, unique('group'), 'All catalogue groups', elements.group.value);
    populateSubcategories();
    elements.total.textContent = allLabs.length;
    elements.technologies.textContent = unique('technology').length;
    renderTabs(); render();
  }

  function clearFilters() {
    elements.search.value = ''; elements.technology.value = ''; elements.type.value = ''; elements.group.value = ''; elements.subcategory.value = ''; elements.sort.value = 'featured';
    expandedGroups = Object.create(null); populateSubcategories(); renderTabs(); render(); elements.search.focus();
  }

  [elements.type, elements.group, elements.subcategory, elements.sort].forEach(function (select) {
    select.addEventListener('change', function () { expandedGroups = Object.create(null); render(); });
  });
  elements.technology.addEventListener('change', function () { expandedGroups = Object.create(null); populateSubcategories(); render(); });
  elements.search.addEventListener('input', function () { expandedGroups = Object.create(null); render(); });
  elements.clear.addEventListener('click', clearFilters);
  elements.practice.addEventListener('click', function () {
    elements.group.value = PRACTICE_GROUP; expandedGroups = Object.create(null); renderTabs(); render();
    document.querySelector('.catalogue-controls').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  if (elements.incident) {
    elements.incident.addEventListener('click', function () {
      elements.group.value = 'Incident Response'; expandedGroups = Object.create(null); renderTabs(); render();
      document.querySelector('.catalogue-controls').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  async function refreshPublishedCatalogue() {
    try {
      var response = await fetch('./simulators.json?v=' + Date.now(), { cache: 'no-store' });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      var payload = await response.json(), published = Array.isArray(payload) ? payload : payload.simulators;
      if (!Array.isArray(published) || !published.length) throw new Error('Invalid catalogue format');
      var valid = published.filter(function (item) {
        return item && item.id && item.title && item.targetUrl && item.contentType && item.technology && item.subcategory && item.group;
      });
      if (valid.length !== published.length) throw new Error('Incomplete catalogue metadata');
      allLabs = valid; initialiseFilters();
    } catch (error) {
      console.warn('Using the bundled public catalogue because the JSON refresh was unavailable.', error);
    }
  }

  initialiseFilters();
  refreshPublishedCatalogue();
}());
