'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');

const ROOT = path.resolve(__dirname, '..');
const catalogue = JSON.parse(fs.readFileSync(path.join(ROOT, 'simulators.json'), 'utf8')).simulators;
const html = `<!doctype html><body>
  <div class="catalogue-controls"></div>
  <input id="labSearch"><select id="technologyFilter"><option value=""></option></select>
  <select id="typeFilter"><option value=""></option></select><select id="groupFilter"><option value=""></option></select>
  <select id="subcategoryFilter"><option value=""></option></select><select id="sortFilter"><option value="featured">Featured order</option><option value="az">A-Z</option><option value="technology">Technology</option></select>
  <div id="groupTabs"></div><button id="clearFilters"></button><button id="filterRhcsa"></button>
  <span id="catalogueTotal"></span><span id="technologyTotal"></span><p id="resultCount"></p><p id="activeFilter"></p>
  <div id="labList"></div><div id="emptySearch"></div>
</body>`;
const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'https://www.rcwittraining.in/' });
dom.window.HTMLElement.prototype.scrollIntoView = function () {};
dom.window.fetch = () => Promise.reject(new Error('offline test'));
dom.window.console.warn = () => {};
dom.window.RCW_CATALOGUE = catalogue;
dom.window.eval(fs.readFileSync(path.join(ROOT, 'catalogue.js'), 'utf8'));

const doc = dom.window.document;
const change = node => node.dispatchEvent(new dom.window.Event('change', { bubbles: true }));
const input = node => node.dispatchEvent(new dom.window.Event('input', { bubbles: true }));

assert.strictEqual(doc.getElementById('catalogueTotal').textContent, '180', 'catalogue total');
assert.strictEqual(Number(doc.getElementById('technologyTotal').textContent), new Set(catalogue.map(item => item.technology)).size, 'technology total');
assert.strictEqual(doc.querySelectorAll('.catalogue-group').length, new Set(catalogue.map(item => item.group)).size, 'initial grouped sections');
assert.ok(Array.from(doc.querySelectorAll('.catalogue-grid')).every(grid => grid.children.length <= 6), 'initial groups are compact');
assert.strictEqual(doc.querySelectorAll('.group-tab').length, new Set(catalogue.map(item => item.group)).size + 1, 'group quick filters');

// The featured RHCSA control exposes the complete independent 62-task group.
doc.getElementById('filterRhcsa').click();
assert.strictEqual(doc.getElementById('groupFilter').value, 'RHCSA Certification Practice', 'RHCSA group selection');
assert.strictEqual(doc.querySelectorAll('.catalogue-card').length, 62, 'all 62 practice task cards rendered');
assert.ok(Array.from(doc.querySelectorAll('.catalogue-card')).every(card => card.classList.contains('practice')), 'practice card treatment');
assert.ok(doc.getElementById('resultCount').textContent.includes('62'), 'RHCSA filtered result count');

// Clear, then validate technology and type filtering independently.
doc.getElementById('clearFilters').click();
const technology = doc.getElementById('technologyFilter');
technology.value = 'AWS'; change(technology);
assert.strictEqual(doc.querySelectorAll('.catalogue-card').length, catalogue.filter(item => item.technology === 'AWS').length, 'AWS technology filter');
const availableSubcategories = Array.from(doc.getElementById('subcategoryFilter').options).slice(1).map(option => option.value);
assert.deepStrictEqual(new Set(availableSubcategories), new Set(catalogue.filter(item => item.technology === 'AWS').map(item => item.subcategory)), 'technology-scoped subcategories');

doc.getElementById('clearFilters').click();
const type = doc.getElementById('typeFilter');
type.value = 'Simulator'; change(type);
assert.strictEqual(doc.querySelectorAll('.catalogue-card').length, 3, 'simulator content-type filter');

// Search covers title, technology, group and subcategory metadata.
doc.getElementById('clearFilters').click();
const search = doc.getElementById('labSearch');
search.value = 'SELinux'; input(search);
const expectedSearch = catalogue.filter(item => [item.title, item.category, item.technology, item.subcategory, item.contentType, item.group].join(' ').toLowerCase().includes('selinux'));
assert.strictEqual(doc.querySelectorAll('.catalogue-card').length, expectedSearch.length, 'metadata search');
assert.ok(Array.from(doc.querySelectorAll('.card-open')).every(link => link.href.includes('/open.html?lab=')), 'approved public launcher links');

console.log('Homepage catalogue grouping, compact initial view, RHCSA group, technology, type, dependent subcategory, search and launcher checks passed.');
