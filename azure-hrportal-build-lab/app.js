/* ============================================================
   RCW IT Training — "Build the HR Portal on Azure" Simulator
   100% GUI-based Azure Portal replica:
   + Create → form blades (tabs) → Review + create → deployment
   10 validated stages · scoring · hints · architecture map · certificate
   ============================================================ */
(function () {
'use strict';

var LS_KEY = 'rcw_azlab_v1';
var app = document.getElementById('app');
var st = null; // state

/* ---------------- state ---------------- */
function defaults() {
  return { name: '', stage: 0, points: 0, hints: [], resources: [], quiz: null, done: false };
}
function load() {
  try { st = JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { st = null; }
  if (!st || typeof st.stage !== 'number') st = defaults();
}
function save() { localStorage.setItem(LS_KEY, JSON.stringify(st)); }

function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
function $(s, el) { return (el || document).querySelector(s); }
function $all(s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); }
function toast(msg, err) {
  var t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : ''); t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(function () { t.remove(); }, 4500);
}

/* ============================================================
   STAGE DEFINITIONS — the architecture of the HR portal
   ============================================================ */
var REGION_OPTS = ['(select a region)', 'Central India', 'South India', 'East US', 'West Europe', 'Southeast Asia'];
var SUB = 'RCW Training Subscription (Pay-As-You-Go)';

function reqRegion(v) { return v === 'Central India' ? '' : 'Deploy in Central India — closest region to your Chennai users (low latency, data residency in India).'; }

var STAGES = [
  /* ---------- 1. Resource group ---------- */
  {
    id: 'rg', icon: '\ud83d\udcc1', title: 'Create the Resource Group',
    maps: 'Foundation — every HR-portal resource will live in this logical container.',
    why: '<b>Why:</b> A resource group is the unit of lifecycle, access control and billing. One RG per environment lets you delete or secure the whole HR portal in one action.',
    tasks: ['Create a resource group named <b>rcw-hrportal-rg</b>', 'Region: <b>Central India</b>'],
    hint: 'Name: rcw-hrportal-rg · Region: Central India',
    wizard: {
      title: 'Create a resource group', sub: 'Resource group \u00b7 Microsoft.Resources',
      tabs: [{
        name: 'Basics', fields: [
          { id: 'sub', label: 'Subscription', type: 'select', options: [SUB], help: 'All resources in a resource group are billed to one subscription.' },
          { id: 'name', label: 'Resource group name', type: 'text', placeholder: 'e.g. rcw-hrportal-rg',
            validate: function (v) {
              if (!v) return 'Resource group name is required.';
              if (!/^[-\w\.\(\)]+$/.test(v)) return 'Only alphanumerics, hyphens, underscores, periods and parentheses.';
              if (v !== 'rcw-hrportal-rg') return 'For this lab, use the standard name from the task list: rcw-hrportal-rg.';
              return '';
            } },
          { id: 'region', label: 'Region', type: 'select', options: REGION_OPTS, validate: reqRegion }
        ]
      }],
      resources: function (v) { return [{ id: 'rg', icon: '\ud83d\udcc1', name: v.name, type: 'Resource group', extra: v.region }]; }
    }
  },

  /* ---------- 2. Storage for GD videos ---------- */
  {
    id: 'storage', icon: '\ud83d\uddc4', title: 'Storage Account for GD video recordings',
    maps: 'HR portal feature: stores every candidate\u2019s group-discussion video.',
    why: '<b>Why:</b> Blob Storage is the standard home for large media like interview recordings. Public blob access must be <b>disabled</b> \u2014 recordings are personal data (DPDP Act/GDPR), so only the web app (via keys/SAS) may read them.',
    tasks: ['Create a storage account (lowercase letters/numbers only, e.g. <b>rcwhrvideos001</b>)', 'Performance <b>Standard</b>, redundancy <b>LRS</b>', 'On the Advanced tab: <b>disable</b> anonymous blob access', 'Create a blob container named <b>gd-recordings</b>'],
    hint: 'Name: rcwhrvideos001 · Standard · LRS · Anonymous access OFF · Container: gd-recordings',
    wizard: {
      title: 'Create a storage account', sub: 'Storage account \u00b7 Microsoft.Storage',
      tabs: [
        { name: 'Basics', fields: [
          { id: 'sub', label: 'Subscription', type: 'select', options: [SUB] },
          { id: 'rg', label: 'Resource group', type: 'select', options: ['rcw-hrportal-rg'] },
          { id: 'name', label: 'Storage account name', type: 'text', placeholder: '3\u201324 chars, lowercase letters & numbers only',
            validate: function (v) {
              if (!v) return 'Storage account name is required.';
              if (!/^[a-z0-9]{3,24}$/.test(v)) return 'Storage names allow ONLY lowercase letters and numbers, 3\u201324 characters (globally unique DNS name).';
              return '';
            } },
          { id: 'region', label: 'Region', type: 'select', options: REGION_OPTS, validate: reqRegion },
          { id: 'perf', label: 'Performance', type: 'radio', options: ['Standard', 'Premium'],
            validate: function (v) { return v === 'Standard' ? '' : 'Standard is sufficient (and far cheaper) for video blobs served by the portal.'; } },
          { id: 'redundancy', label: 'Redundancy', type: 'select', options: ['(select)', 'LRS \u2014 Locally-redundant', 'ZRS \u2014 Zone-redundant', 'GRS \u2014 Geo-redundant'],
            validate: function (v) { return v.indexOf('LRS') === 0 ? '' : 'Choose LRS for this lab \u2014 lowest cost; recordings are re-creatable practice data.'; } }
        ] },
        { name: 'Advanced', fields: [
          { id: 'anon', label: 'Allow enabling anonymous access on containers', type: 'toggle', def: true,
            validate: function (v) { return v ? 'COMPLIANCE: turn this OFF. Interview recordings are personal data \u2014 anonymous public access must be impossible.' : ''; } },
          { id: 'tls', label: 'Minimum TLS version', type: 'select', options: ['TLS 1.0', 'TLS 1.1', 'TLS 1.2'],
            validate: function (v) { return v === 'TLS 1.2' ? '' : 'Enforce TLS 1.2 \u2014 older TLS versions are non-compliant.'; } },
          { id: 'container', label: 'Blob container to create', type: 'text', placeholder: 'container name',
            validate: function (v) { return v === 'gd-recordings' ? '' : 'Create the container the portal code expects: gd-recordings.'; } }
        ] }
      ],
      resources: function (v) { return [{ id: 'storage', icon: '\ud83d\uddc4', name: v.name, type: 'Storage account', extra: 'Blob container: gd-recordings \u00b7 anonymous access disabled' }]; }
    }
  },

  /* ---------- 3. Azure SQL ---------- */
  {
    id: 'sql', icon: '\ud83d\udee2', title: 'Azure SQL Database for scores & users',
    maps: 'HR portal feature: candidates, HR ratings (5 GD criteria), scenario answers, audit log.',
    why: '<b>Why:</b> Relational data \u2014 users, sessions, manual GD ratings, scenario scores \u2014 belongs in Azure SQL. The admin login must not be a reserved name, and the password must meet complexity rules.',
    tasks: ['Create SQL server <b>rcw-hrportal-sql</b> with a non-reserved admin login', 'Strong password (8+ chars, 3 of 4 character classes)', 'Database name: <b>hrportaldb</b>', 'Allow Azure services to access the server'],
    hint: 'Server: rcw-hrportal-sql · Login: hradmin · Password: e.g. Rcw@Hr2026!x · DB: hrportaldb · Allow Azure services: ON',
    wizard: {
      title: 'Create SQL Database', sub: 'SQL Database \u00b7 Microsoft.Sql',
      tabs: [
        { name: 'Basics', fields: [
          { id: 'sub', label: 'Subscription', type: 'select', options: [SUB] },
          { id: 'rg', label: 'Resource group', type: 'select', options: ['rcw-hrportal-rg'] },
          { id: 'server', label: 'Server name', type: 'text', placeholder: 'lowercase letters, numbers, hyphens', suffix: '.database.windows.net',
            validate: function (v) {
              if (!v) return 'Server name is required.';
              if (!/^[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/.test(v)) return 'Lowercase letters, numbers and hyphens; cannot start/end with a hyphen.';
              if (v !== 'rcw-hrportal-sql') return 'For this lab use the standard server name: rcw-hrportal-sql.';
              return '';
            } },
          { id: 'admin', label: 'Server admin login', type: 'text', placeholder: 'not admin / sa / root\u2026',
            validate: function (v) {
              if (!v) return 'Admin login is required.';
              if (['admin', 'administrator', 'sa', 'root', 'guest', 'dbmanager'].indexOf(v.toLowerCase()) !== -1) return '\u201c' + v + '\u201d is a reserved login name in Azure SQL \u2014 pick something like hradmin.';
              return '';
            } },
          { id: 'pw', label: 'Password', type: 'password',
            validate: function (v) {
              if (!v || v.length < 8) return 'Minimum 8 characters.';
              var classes = (/[a-z]/.test(v) ? 1 : 0) + (/[A-Z]/.test(v) ? 1 : 0) + (/[0-9]/.test(v) ? 1 : 0) + (/[^A-Za-z0-9]/.test(v) ? 1 : 0);
              if (classes < 3) return 'Password must contain characters from at least 3 of: lowercase, uppercase, digits, symbols.';
              return '';
            } },
          { id: 'pw2', label: 'Confirm password', type: 'password',
            validate: function (v, all) { return v === all.pw ? '' : 'Passwords do not match.'; } },
          { id: 'db', label: 'Database name', type: 'text',
            validate: function (v) { return v === 'hrportaldb' ? '' : 'The portal\u2019s connection string expects the database name hrportaldb.'; } },
          { id: 'tier', label: 'Compute + storage', type: 'select', options: ['Basic (5 DTU) \u2014 \u20b9400/mo approx', 'Standard S0', 'Premium P1'] }
        ] },
        { name: 'Networking', fields: [
          { id: 'azaccess', label: 'Allow Azure services and resources to access this server', type: 'toggle', def: false,
            validate: function (v) { return v ? '' : 'Turn this ON \u2014 otherwise your App Service cannot reach the database.'; } },
          { id: 'publicip', label: 'Add current client IP address to firewall', type: 'toggle', def: false }
        ] }
      ],
      resources: function (v) { return [{ id: 'sql', icon: '\ud83d\udee2', name: v.server + '/' + v.db, type: 'SQL server + database', extra: 'Admin: ' + v.admin + ' \u00b7 Azure services allowed' }]; }
    }
  },

  /* ---------- 4. App Service ---------- */
  {
    id: 'webapp', icon: '\ud83c\udf10', title: 'App Service \u2014 host the HR portal web app',
    maps: 'HR portal feature: serves the candidate & HR portal (the site you already built).',
    why: '<b>Why:</b> App Service runs the Node.js portal with TLS, scaling and managed identity built in. Linux + Node 20 LTS matches the portal\u2019s runtime; a B1 plan is the cheapest tier with custom-domain + always-on support.',
    tasks: ['Create web app <b>rcw-hrportal-web</b> (Publish: Code)', 'Runtime <b>Node 20 LTS</b> on <b>Linux</b>, region Central India', 'App Service Plan: <b>Basic B1</b>'],
    hint: 'Name: rcw-hrportal-web · Code · Node 20 LTS · Linux · Central India · Basic B1',
    wizard: {
      title: 'Create Web App', sub: 'App Service \u00b7 Microsoft.Web',
      tabs: [{
        name: 'Basics', fields: [
          { id: 'sub', label: 'Subscription', type: 'select', options: [SUB] },
          { id: 'rg', label: 'Resource group', type: 'select', options: ['rcw-hrportal-rg'] },
          { id: 'name', label: 'Name', type: 'text', suffix: '.azurewebsites.net', placeholder: 'globally unique app name',
            validate: function (v) {
              if (!v) return 'App name is required.';
              if (!/^[A-Za-z0-9-]{2,60}$/.test(v)) return 'Letters, numbers and hyphens only (2\u201360 chars).';
              if (v !== 'rcw-hrportal-web') return 'For this lab use the standard app name: rcw-hrportal-web (the Entra redirect URI in stage 5 depends on it).';
              return '';
            } },
          { id: 'publish', label: 'Publish', type: 'radio', options: ['Code', 'Container'],
            validate: function (v) { return v === 'Code' ? '' : 'Choose Code \u2014 you deploy the Node.js sources directly, no container registry needed.'; } },
          { id: 'runtime', label: 'Runtime stack', type: 'select', options: ['(select)', 'Node 20 LTS', 'Node 18 LTS', '.NET 8', 'PHP 8.2', 'Python 3.12'],
            validate: function (v) { return v === 'Node 20 LTS' ? '' : 'The HR portal is a Node.js app \u2014 pick Node 20 LTS (current long-term-support).'; } },
          { id: 'os', label: 'Operating System', type: 'radio', options: ['Linux', 'Windows'],
            validate: function (v) { return v === 'Linux' ? '' : 'Linux is cheaper and the standard host for Node.js on App Service.'; } },
          { id: 'region', label: 'Region', type: 'select', options: REGION_OPTS, validate: reqRegion },
          { id: 'plan', label: 'Pricing plan', type: 'select', options: ['(select)', 'Free F1 (60 CPU-min/day)', 'Basic B1 (1 core, 1.75 GB)', 'Premium P1v3'],
            validate: function (v) { return v.indexOf('Basic B1') === 0 ? '' : 'Choose Basic B1 \u2014 Free F1 has no Always-On and daily CPU caps; Premium is overkill for a lab.'; } }
        ]
      }],
      resources: function (v) { return [
        { id: 'plan', icon: '\ud83d\udccb', name: 'rcw-hrportal-plan', type: 'App Service plan', extra: 'Linux \u00b7 Basic B1' },
        { id: 'webapp', icon: '\ud83c\udf10', name: v.name, type: 'App Service', extra: 'https://' + v.name + '.azurewebsites.net \u00b7 Node 20 LTS' }
      ]; }
    }
  },

  /* ---------- 5. Entra ID ---------- */
  {
    id: 'entra', icon: '\ud83e\udeaa', title: 'Microsoft Entra ID \u2014 candidate & HR sign-in',
    maps: 'HR portal feature: the two login types (candidate / HR) with role-based access.',
    why: '<b>Why:</b> Instead of storing passwords yourself, register the portal in Entra ID. App roles <b>HR</b> and <b>Candidate</b> are issued inside the sign-in token \u2014 the web app just reads the role claim. This is the compliant way to do logins.',
    tasks: ['Register an application named <b>hrportal-auth</b>', 'Single-tenant account type', 'Redirect URI: <b>https://rcw-hrportal-web.azurewebsites.net/auth/callback</b>', 'Create app roles <b>HR</b> and <b>Candidate</b>'],
    hint: 'Name: hrportal-auth · Single tenant · Redirect: https://rcw-hrportal-web.azurewebsites.net/auth/callback · both roles ticked',
    wizard: {
      title: 'Register an application', sub: 'App registration \u00b7 Microsoft Entra ID',
      tabs: [{
        name: 'Register', fields: [
          { id: 'name', label: 'Name', type: 'text', placeholder: 'user-facing app name',
            validate: function (v) { return v === 'hrportal-auth' ? '' : 'Use the standard registration name for this lab: hrportal-auth.'; } },
          { id: 'tenancy', label: 'Supported account types', type: 'radio',
            options: ['Accounts in this organizational directory only (Single tenant)', 'Accounts in any organizational directory (Multitenant)', 'Personal Microsoft accounts only'],
            validate: function (v) { return v.indexOf('Single tenant') !== -1 ? '' : 'Only RCW\u2019s own tenant should sign in \u2014 choose Single tenant.'; } },
          { id: 'redirect', label: 'Redirect URI (Web)', type: 'text', placeholder: 'https://\u2026/auth/callback',
            validate: function (v) {
              if (!v) return 'Redirect URI is required \u2014 Entra sends the sign-in token here.';
              if (v.indexOf('https://') !== 0) return 'Redirect URIs must use HTTPS (compliance: tokens in transit).';
              if (v !== 'https://rcw-hrportal-web.azurewebsites.net/auth/callback') return 'Point it at your web app from stage 4: https://rcw-hrportal-web.azurewebsites.net/auth/callback';
              return '';
            } }
        ] },
        { name: 'App roles', fields: [
          { id: 'roleHR', label: 'Create app role: HR (value \u201cHR\u201d, allowed member type: Users/Groups)', type: 'toggle', def: false,
            validate: function (v) { return v ? '' : 'Create the HR role \u2014 the portal shows the scoreboard only to tokens carrying this role.'; } },
          { id: 'roleCand', label: 'Create app role: Candidate (value \u201cCandidate\u201d)', type: 'toggle', def: false,
            validate: function (v) { return v ? '' : 'Create the Candidate role \u2014 recordings and scenario answers are gated by it.'; } }
        ] }
      ],
      resources: function (v) { return [{ id: 'entra', icon: '\ud83e\udeaa', name: v.name, type: 'App registration (Entra ID)', extra: 'Roles: HR, Candidate \u00b7 single tenant' }]; }
    }
  },

  /* ---------- 6. ACS ---------- */
  {
    id: 'acs', icon: '\ud83d\udcde', title: 'Azure Communication Services \u2014 live GD video rooms',
    maps: 'HR portal feature: the live multi-candidate group-discussion video call (and recording).',
    why: '<b>Why:</b> ACS provides the video-calling SDK the browser uses for a live GD room with several candidates, plus server-side call recording APIs. Data location <b>India</b> keeps media processing in-country (DPDP-friendly).',
    tasks: ['Create a Communication Services resource <b>rcw-hrportal-comms</b>', 'Data location: <b>India</b>'],
    hint: 'Name: rcw-hrportal-comms · Data location: India',
    wizard: {
      title: 'Create Communication Services', sub: 'Communication Services \u00b7 Microsoft.Communication',
      tabs: [{
        name: 'Basics', fields: [
          { id: 'sub', label: 'Subscription', type: 'select', options: [SUB] },
          { id: 'rg', label: 'Resource group', type: 'select', options: ['rcw-hrportal-rg'] },
          { id: 'name', label: 'Resource name', type: 'text',
            validate: function (v) { return v === 'rcw-hrportal-comms' ? '' : 'Use the standard name for this lab: rcw-hrportal-comms.'; } },
          { id: 'loc', label: 'Data location', type: 'select', options: ['(select)', 'United States', 'Europe', 'India', 'Asia Pacific'],
            validate: function (v) { return v === 'India' ? '' : 'Choose India \u2014 keeps call/media data processing in-country for DPDP compliance.'; } }
        ]
      }],
      resources: function (v) { return [{ id: 'acs', icon: '\ud83d\udcde', name: v.name, type: 'Communication Services', extra: 'Video calling + recording \u00b7 data location India' }]; }
    }
  },

  /* ---------- 7. Key Vault ---------- */
  {
    id: 'kv', icon: '\ud83d\udd11', title: 'Key Vault + Managed Identity \u2014 no secrets in code',
    maps: 'Compliance: SQL password & storage key never appear in code or app settings.',
    why: '<b>Why:</b> Secrets (SQL connection string, storage key) go into Key Vault. The web app gets a <b>system-assigned managed identity</b> and the <b>Key Vault Secrets User</b> RBAC role \u2014 so it reads secrets at runtime with zero credentials stored anywhere.',
    tasks: ['Create key vault <b>rcw-hrportal-kv</b> (RBAC permission model)', 'Enable the web app\u2019s system-assigned managed identity', 'Assign role <b>Key Vault Secrets User</b> to the web app', 'Add secrets <b>SqlConnectionString</b> and <b>StorageAccountKey</b>'],
    hint: 'Vault: rcw-hrportal-kv · RBAC model · identity ON · role Key Vault Secrets User · secrets SqlConnectionString + StorageAccountKey',
    wizard: {
      title: 'Create a key vault', sub: 'Key Vault \u00b7 Microsoft.KeyVault',
      tabs: [
        { name: 'Basics', fields: [
          { id: 'sub', label: 'Subscription', type: 'select', options: [SUB] },
          { id: 'rg', label: 'Resource group', type: 'select', options: ['rcw-hrportal-rg'] },
          { id: 'name', label: 'Key vault name', type: 'text', suffix: '.vault.azure.net',
            validate: function (v) {
              if (!v) return 'Vault name is required.';
              if (!/^[A-Za-z][A-Za-z0-9-]{1,22}[A-Za-z0-9]$/.test(v)) return '3\u201324 chars, letters/numbers/hyphens, must start with a letter.';
              if (v !== 'rcw-hrportal-kv') return 'Use the standard vault name for this lab: rcw-hrportal-kv.';
              return '';
            } },
          { id: 'region', label: 'Region', type: 'select', options: REGION_OPTS, validate: reqRegion },
          { id: 'model', label: 'Permission model', type: 'radio', options: ['Azure role-based access control (RBAC)', 'Vault access policy (legacy)'],
            validate: function (v) { return v.indexOf('RBAC') !== -1 ? '' : 'Choose RBAC \u2014 Microsoft\u2019s recommended model; access policies are legacy.'; } }
        ] },
        { name: 'Access', fields: [
          { id: 'msi', label: 'Enable system-assigned managed identity on rcw-hrportal-web', type: 'toggle', def: false,
            validate: function (v) { return v ? '' : 'Enable the managed identity \u2014 it is the web app\u2019s passwordless \u201cuser account\u201d in Entra ID.'; } },
          { id: 'role', label: 'Role assignment for the web app identity', type: 'select',
            options: ['(select)', 'Owner', 'Key Vault Administrator', 'Key Vault Secrets User', 'Reader'],
            validate: function (v) { return v === 'Key Vault Secrets User' ? '' : 'Least privilege: Secrets User can only READ secrets \u2014 Owner/Administrator would violate least-privilege compliance.'; } }
        ] },
        { name: 'Secrets', fields: [
          { id: 's1', label: 'Secret 1 name', type: 'text', placeholder: 'name expected by the portal code',
            validate: function (v) { return v === 'SqlConnectionString' ? '' : 'The portal reads a secret named exactly SqlConnectionString.'; } },
          { id: 's1v', label: 'Secret 1 value', type: 'password', placeholder: 'Server=tcp:rcw-hrportal-sql\u2026',
            validate: function (v) { return v ? '' : 'Enter any value \u2014 in real life, the ADO.NET string from the SQL blade.'; } },
          { id: 's2', label: 'Secret 2 name', type: 'text',
            validate: function (v) { return v === 'StorageAccountKey' ? '' : 'The portal reads a secret named exactly StorageAccountKey.'; } },
          { id: 's2v', label: 'Secret 2 value', type: 'password',
            validate: function (v) { return v ? '' : 'Enter any value \u2014 in real life, key1 from the storage account.'; } }
        ] }
      ],
      resources: function (v) { return [{ id: 'kv', icon: '\ud83d\udd11', name: v.name, type: 'Key vault', extra: 'RBAC \u00b7 2 secrets \u00b7 web app = Key Vault Secrets User' }]; }
    }
  },

  /* ---------- 8. Web app configuration ---------- */
  {
    id: 'config', icon: '\u2699', title: 'Configure the Web App \u2014 settings & transport security',
    maps: 'Wires everything together + enforces encryption in transit.',
    why: '<b>Why:</b> The app discovers its Key Vault through an app setting (no secret value \u2014 just the vault URI). HTTPS-only + TLS 1.2 + FTPS disabled are the standard App Service hardening trio auditors look for.',
    tasks: ['Add app setting <b>KEYVAULT_URI</b> = your vault URI', 'HTTPS Only: <b>On</b>', 'Minimum TLS version: <b>1.2</b>', 'FTP state: <b>Disabled</b>'],
    hint: 'KEYVAULT_URI = https://rcw-hrportal-kv.vault.azure.net · HTTPS Only ON · TLS 1.2 · FTPS Disabled',
    wizard: {
      title: 'rcw-hrportal-web \u2014 Configuration', sub: 'App Service \u00b7 Settings',
      tabs: [
        { name: 'Application settings', fields: [
          { id: 'k1', label: 'Setting name', type: 'text', placeholder: 'NAME',
            validate: function (v) { return v === 'KEYVAULT_URI' ? '' : 'The portal code looks for a setting named exactly KEYVAULT_URI.'; } },
          { id: 'v1', label: 'Setting value', type: 'text', placeholder: 'https://\u2026.vault.azure.net',
            validate: function (v) {
              if (!v) return 'Value required.';
              if (v.indexOf('https://') !== 0 || v.indexOf('.vault.azure.net') === -1) return 'Use the vault URI, e.g. https://rcw-hrportal-kv.vault.azure.net';
              return '';
            } }
        ] },
        { name: 'General settings', fields: [
          { id: 'https', label: 'HTTPS Only', type: 'toggle', def: false,
            validate: function (v) { return v ? '' : 'Turn HTTPS Only ON \u2014 camera access (getUserMedia) and token security both require it.'; } },
          { id: 'tls', label: 'Minimum Inbound TLS Version', type: 'select', options: ['1.0', '1.1', '1.2'],
            validate: function (v) { return v === '1.2' ? '' : 'TLS 1.0/1.1 are deprecated \u2014 compliance requires 1.2 minimum.'; } },
          { id: 'ftps', label: 'FTP state', type: 'select', options: ['All allowed', 'FTPS only', 'Disabled'],
            validate: function (v) { return v === 'Disabled' ? '' : 'Disable FTP entirely \u2014 you deploy via GitHub in stage 10, FTP is an attack surface.'; } }
        ] }
      ],
      resources: function () { return [{ id: 'config', icon: '\u2699', name: 'rcw-hrportal-web / config', type: 'App configuration', extra: 'KEYVAULT_URI \u00b7 HTTPS-only \u00b7 TLS 1.2 \u00b7 FTPS off' }]; }
    }
  },

  /* ---------- 9. Monitoring ---------- */
  {
    id: 'insights', icon: '\ud83d\udcc8', title: 'Application Insights + alert rule',
    maps: 'Operations: know when candidate uploads or logins start failing.',
    why: '<b>Why:</b> Application Insights traces every request of the HR portal. A metric alert on <b>Failed requests</b> emails you before candidates start calling \u2014 essential once real interviews run on this.',
    tasks: ['Create Application Insights <b>rcw-hrportal-insights</b> (workspace-based)', 'Create an alert rule: <b>Failed requests</b> greater than <b>5</b>', 'Action: email notification to a valid address'],
    hint: 'Name: rcw-hrportal-insights · Signal: Failed requests · Operator: Greater than · Threshold: 5 · your email',
    wizard: {
      title: 'Create Application Insights + alert', sub: 'Monitor \u00b7 Microsoft.Insights',
      tabs: [
        { name: 'Basics', fields: [
          { id: 'sub', label: 'Subscription', type: 'select', options: [SUB] },
          { id: 'rg', label: 'Resource group', type: 'select', options: ['rcw-hrportal-rg'] },
          { id: 'name', label: 'Name', type: 'text',
            validate: function (v) { return v === 'rcw-hrportal-insights' ? '' : 'Use the standard name for this lab: rcw-hrportal-insights.'; } },
          { id: 'ws', label: 'Log Analytics workspace', type: 'select', options: ['DefaultWorkspace-CentralIndia (new)'] },
          { id: 'region', label: 'Region', type: 'select', options: REGION_OPTS, validate: reqRegion }
        ] },
        { name: 'Alert rule', fields: [
          { id: 'signal', label: 'Signal name', type: 'select', options: ['(select)', 'Failed requests', 'Server response time', 'Availability', 'CPU percentage'],
            validate: function (v) { return v === 'Failed requests' ? '' : 'Alert on Failed requests \u2014 the direct signal that logins/uploads are breaking.'; } },
          { id: 'op', label: 'Operator', type: 'select', options: ['Greater than', 'Less than', 'Equals'],
            validate: function (v) { return v === 'Greater than' ? '' : 'You want to be alerted when failures EXCEED the threshold.'; } },
          { id: 'threshold', label: 'Threshold value', type: 'text', placeholder: 'e.g. 5',
            validate: function (v) { var n = +v; return (v !== '' && !isNaN(n) && n >= 1 && n <= 100) ? '' : 'Enter a sensible number of failed requests (1\u2013100), e.g. 5.'; } },
          { id: 'email', label: 'Action group \u2014 notification email', type: 'text', placeholder: 'you@rcwittraining.in',
            validate: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter a valid email address for the alert notification.'; } }
        ] }
      ],
      resources: function (v) { return [{ id: 'insights', icon: '\ud83d\udcc8', name: v.name, type: 'Application Insights', extra: 'Alert: Failed requests > ' + v.threshold + ' \u2192 ' + v.email }]; }
    }
  },

  /* ---------- 10. Deploy ---------- */
  {
    id: 'deploy', icon: '\ud83d\ude80', title: 'Deployment Center \u2014 ship the portal & go live',
    maps: 'Final step: continuous deployment of the HR portal code from GitHub.',
    why: '<b>Why:</b> Deployment Center connects the web app to your GitHub repo; every push to <b>main</b> builds and deploys automatically (GitHub Actions). After this, the knowledge check confirms you can defend each design decision.',
    tasks: ['Connect Deployment Center: source <b>GitHub</b>', 'Repository in <b>owner/repo</b> format', 'Branch: <b>main</b>', 'Pass the knowledge check (5 questions)'],
    hint: 'Source: GitHub · Repository: rcwittraining/hr-portal · Branch: main',
    wizard: {
      title: 'Deployment Center \u2014 rcw-hrportal-web', sub: 'App Service \u00b7 Deployment',
      tabs: [{
        name: 'Settings', fields: [
          { id: 'source', label: 'Source', type: 'select', options: ['(select)', 'GitHub', 'Bitbucket', 'Local Git', 'External Git'],
            validate: function (v) { return v === 'GitHub' ? '' : 'Your code lives on GitHub (rcwittraining) \u2014 choose GitHub for CI/CD via Actions.'; } },
          { id: 'repo', label: 'Repository (owner/repo)', type: 'text', placeholder: 'rcwittraining/hr-portal',
            validate: function (v) { return /^[\w.-]+\/[\w.-]+$/.test(v) ? '' : 'Use the owner/repo format, e.g. rcwittraining/hr-portal.'; } },
          { id: 'branch', label: 'Branch', type: 'text', placeholder: 'main',
            validate: function (v) { return v === 'main' ? '' : 'Deploy from the main branch \u2014 the default production branch.'; } }
        ]
      }],
      resources: function (v) { return [{ id: 'deploy', icon: '\ud83d\ude80', name: v.repo + ' @ ' + v.branch, type: 'GitHub Actions deployment', extra: 'CI/CD \u2192 https://rcw-hrportal-web.azurewebsites.net' }]; }
    }
  }
];

var QUIZ = [
  { q: 'A candidate finishes a group-discussion recording. Where does the video file itself end up?',
    opts: ['In the Azure SQL database as a BLOB column', 'In the gd-recordings container of the storage account', 'Inside the App Service file system', 'In Key Vault'], a: 1,
    why: 'Media goes to Blob Storage; SQL stores only the metadata/scores. App Service storage is ephemeral; Key Vault is for secrets only.' },
  { q: 'How does the portal know whether a signed-in user is HR or a candidate?',
    opts: ['It checks a users table password column', 'From the app role claim (HR / Candidate) inside the Entra ID token', 'By the URL they visit', 'From a cookie set manually by the admin'], a: 1,
    why: 'App roles defined on the Entra app registration are issued inside the token \u2014 the app just reads the claim.' },
  { q: 'Where does the running web app get the SQL connection string from?',
    opts: ['Hard-coded in server.js', 'An app setting containing the full connection string', 'Key Vault, read at runtime via its managed identity', 'A file in the GitHub repo'], a: 2,
    why: 'Secrets live in Key Vault; the managed identity + Key Vault Secrets User role lets the app read them with zero stored credentials.' },
  { q: 'Why did you disable anonymous blob access on the storage account?',
    opts: ['It reduces storage cost', 'Recordings are personal data \u2014 public URLs would breach DPDP/GDPR', 'It makes uploads faster', 'Azure requires it for LRS'], a: 1,
    why: 'Interview recordings are personal data. Only the app (keys/SAS) may access them \u2014 never the anonymous public.' },
  { q: 'What do HTTPS-Only + minimum TLS 1.2 on the web app guarantee?',
    opts: ['Encryption of data at rest', 'Faster page loads', 'Encryption in transit for every portal request (and camera API access)', 'Automatic backups'], a: 2,
    why: 'They enforce transport encryption \u2014 also required by browsers before getUserMedia (camera) is allowed.' }
];

/* ============================================================
   SIGN-IN
   ============================================================ */
function renderSignin() {
  document.title = 'Sign in \u00b7 Build the HR Portal on Azure';
  app.innerHTML =
  '<div class="login-bg"><div class="login-card">' +
    '<div class="logo"><span class="sq"><i></i><i></i><i></i><i></i></span> Microsoft Azure \u2014 RCW Build Lab</div>' +
    '<h1>Sign in</h1>' +
    '<div class="muted" style="margin-bottom:6px">Guided simulator: provision the full Azure architecture behind the HR Interview &amp; Assessment Portal \u2014 entirely through the portal GUI.</div>' +
    '<form id="f"><label>Your name <span class="req">*</span></label><input id="nm" placeholder="shown on your completion certificate" required>' +
    '<div style="margin-top:20px;display:flex;justify-content:flex-end"><button class="az" style="min-width:110px">Sign in</button></div></form>' +
    '<div class="hint"><b>What you will build (10 GUI stages)</b><br>Resource group \u2192 Storage (GD videos) \u2192 SQL (scores) \u2192 App Service \u2192 Entra ID logins \u2192 Communication Services (live GD) \u2192 Key Vault \u2192 Hardening \u2192 Monitoring \u2192 Deployment.<br>No commands \u2014 every step is point-and-click, validated like the real portal.</div>' +
    '<div class="login-links">Companion lab to the <a href="https://www.rcwittraining.in/azure-hr-interview-simulator/" target="_blank" rel="noopener">HR Portal simulator</a> \u00b7 RCW IT Training \u00b7 Azure Mini Project</div>' +
  '</div></div>';
  $('#f').onsubmit = function (e) {
    e.preventDefault();
    var n = $('#nm').value.trim();
    if (!n) return;
    st.name = n; save(); route();
  };
}

/* ============================================================
   SHELL
   ============================================================ */
var NAV = [
  { id: 'guide', ico: '\ud83e\udded', label: 'Lab guide (build stages)' },
  { id: 'resources', ico: '\ud83d\uddc3', label: 'All resources' },
  { id: 'arch', ico: '\ud83d\uddfa', label: 'Architecture map' },
  { id: 'cert', ico: '\ud83c\udfc5', label: 'Completion certificate' }
];
var navCollapsed = false;

function shell(active, title, icon, sub, cmds, body) {
  var initials = st.name.split(' ').map(function (w) { return w[0] || ''; }).slice(0, 2).join('').toUpperCase();
  document.title = title + ' \u00b7 Azure Build Lab';
  app.innerHTML =
  '<div class="topbar">' +
    '<div class="hamburger" id="hb">\u2630</div>' +
    '<div class="brand">Microsoft Azure <span class="light">| RCW HR-Portal Build Lab</span></div>' +
    '<div class="searchwrap"><input class="search" placeholder="Search resources, services, and docs (simulated)"></div>' +
    '<div class="tb-item"><span class="badge-score">\u2b50 ' + st.points + ' pts</span></div>' +
    '<div class="tb-item" id="signout" title="Sign out">Sign out</div>' +
    '<div class="tb-item"><div class="avatar">' + esc(initials || '?') + '</div></div>' +
  '</div>' +
  '<div class="sidenav' + (navCollapsed ? ' collapsed' : '') + '" id="sidenav">' +
    '<div class="nav-section"><div class="nav-label">Build lab</div>' +
      NAV.map(function (n) { return '<div class="nav-item' + (n.id === active ? ' active' : '') + '" data-nav="' + n.id + '"><span class="ico">' + n.ico + '</span><span>' + n.label + '</span></div>'; }).join('') +
    '</div>' +
    '<div class="nav-section"><div class="nav-label">Progress</div>' +
      '<div class="nav-item"><span class="ico">\ud83d\udcc5</span><span>Stage ' + Math.min(st.stage + 1, 10) + ' of 10' + (st.done ? ' \u2014 complete!' : '') + '</span></div>' +
      '<div class="nav-item" id="resetLab"><span class="ico">\u267b</span><span>Reset lab</span></div>' +
    '</div>' +
  '</div>' +
  '<div class="main' + (navCollapsed ? ' wide' : '') + '" id="main">' +
    '<div class="breadcrumb"><a href="#" onclick="return false">Home</a> &rsaquo; ' + esc(title) + '</div>' +
    '<div class="blade-head"><h1><span class="bicon">' + icon + '</span>' + esc(title) + '</h1><div class="sub">' + sub + '</div></div>' +
    (cmds && cmds.length ? '<div class="cmdbar">' + cmds.map(function (c, i) { return '<button class="cmd" data-cmd="' + i + '"' + (c.disabled ? ' disabled' : '') + '><span class="ci">' + c.ico + '</span>' + esc(c.label) + '</button>'; }).join('') + '</div>' : '') +
    '<div class="blade-body" id="blade">' + body + '</div>' +
  '</div>';
  $('#hb').onclick = function () {
    navCollapsed = !navCollapsed;
    $('#sidenav').classList.toggle('collapsed', navCollapsed);
    $('#main').classList.toggle('wide', navCollapsed);
  };
  $('#signout').onclick = function () { st.name = ''; save(); route(); };
  $('#resetLab').onclick = function () {
    if (confirm('Reset the lab? All progress, resources and points are cleared.')) { st = defaults(); save(); location.hash = ''; route(); }
  };
  $all('[data-nav]').forEach(function (el) { el.onclick = function () { location.hash = el.getAttribute('data-nav'); }; });
  if (cmds) $all('[data-cmd]').forEach(function (el) { el.onclick = function () { cmds[+el.getAttribute('data-cmd')].fn(); }; });
}

/* ============================================================
   LAB GUIDE (main blade)
   ============================================================ */
function railHTML() {
  return '<div class="progress-rail">' + STAGES.map(function (s, i) {
    var cls = i < st.stage ? 'done' : i === st.stage ? 'current' : 'locked';
    return '<div class="stage-chip ' + cls + '"><span class="num">' + (i < st.stage ? '\u2713' : (i + 1)) + '</span><span class="t">' + esc(s.title.split(' \u2014 ')[0].replace(/^Create (the )?/, '')) + '</span></div>';
  }).join('') + '</div>';
}

function renderGuide() {
  if (st.done) { location.hash = 'cert'; return renderCert(); }
  var s = STAGES[st.stage];
  var hinted = st.hints.indexOf(s.id) !== -1;
  shell('guide', 'Lab guide \u2014 Stage ' + (st.stage + 1) + ' of 10', '\ud83e\udded',
    'Build the complete Azure architecture behind the HR Interview &amp; Assessment Portal \u2014 point-and-click, exactly like the real portal.',
    [
      { ico: '\u2795', label: 'Create ' + s.title.split(' \u2014 ')[0].replace(/^Create (the )?/, '').toLowerCase(), fn: function () { openWizard(s); } },
      { ico: '\ud83d\udca1', label: hinted ? 'Hint (used)' : 'Show hint (\u22123 pts)', fn: function () { useHint(s); }, disabled: hinted },
      { ico: '\ud83d\uddc3', label: 'View created resources', fn: function () { location.hash = 'resources'; } }
    ],
    railHTML() +
    '<div class="task-panel">' +
      '<h2>' + s.icon + ' Stage ' + (st.stage + 1) + ': ' + esc(s.title) + '</h2>' +
      '<div class="muted" style="margin-bottom:4px">\ud83d\udd17 <b>HR-portal mapping:</b> ' + esc(s.maps) + '</div>' +
      '<div class="why">' + s.why + '</div>' +
      '<b style="font-size:12.5px">Your tasks \u2014 complete them in the create blade:</b>' +
      '<ul class="task-list">' + s.tasks.map(function (t) { return '<li>' + t + '</li>'; }).join('') + '</ul>' +
      (hinted ? '<div class="hinted">\ud83d\udca1 <b>Hint:</b> ' + esc(s.hint) + '</div>' : '') +
      '<div style="margin-top:14px"><button class="az" id="openWiz">\u2795 Open the create blade</button></div>' +
    '</div>' +
    '<div class="card"><h3>Blueprint \u2014 what you\u2019re building <span class="sub">(the architecture behind the HR portal you already used)</span></h3>' +
      '<div class="muted" style="line-height:1.8">Candidates &amp; HR sign in through <b>Entra ID</b> \u2192 the <b>App Service</b> web app serves the portal \u2192 GD video is recorded via <b>Communication Services</b> and stored in <b>Blob Storage</b> \u2192 scores &amp; ratings live in <b>Azure SQL</b> \u2192 secrets stay in <b>Key Vault</b> (managed identity) \u2192 <b>Application Insights</b> watches everything \u2192 code ships via <b>GitHub Actions</b>.</div>' +
    '</div>');
  $('#openWiz').onclick = function () { openWizard(s); };
}

function useHint(s) {
  if (st.hints.indexOf(s.id) !== -1) return;
  st.hints.push(s.id);
  st.points = Math.max(0, st.points - 3);
  save();
  toast('Hint unlocked (\u22123 points).');
  renderGuide();
}

/* ============================================================
   WIZARD ENGINE — the GUI create blade
   ============================================================ */
var wiz = null; // { stage, tab, values, errors }

function openWizard(stage) {
  var values = {};
  stage.wizard.tabs.forEach(function (t) {
    t.fields.forEach(function (f) {
      values[f.id] = f.type === 'toggle' ? !!f.def : (f.type === 'select' || f.type === 'radio') ? (f.options ? f.options[0] : '') : '';
    });
  });
  wiz = { stage: stage, tab: 0, values: values, errors: {} };
  drawWizard();
}

function drawWizard() {
  var s = wiz.stage, w = s.wizard;
  var tabs = w.tabs.map(function (t) { return t.name; }).concat(['Review + create']);
  var old = $('#wizbg'); if (old) old.remove();
  var bg = document.createElement('div');
  bg.id = 'wizbg';
  bg.innerHTML =
  '<div class="drawer-bg"></div>' +
  '<div class="drawer">' +
    '<div class="d-head"><h2>' + esc(w.title) + '</h2><div class="sub">' + esc(w.sub) + '</div></div>' +
    '<div class="d-tabs">' + tabs.map(function (t, i) { return '<div class="d-tab' + (i === wiz.tab ? ' active' : '') + '" data-wt="' + i + '">' + esc(t) + '</div>'; }).join('') + '</div>' +
    '<div class="d-body" id="dbody">' + (wiz.tab < w.tabs.length ? tabBody(w.tabs[wiz.tab]) : reviewBody()) + '</div>' +
    '<div class="d-foot">' +
      '<button class="az ghost" id="wprev"' + (wiz.tab === 0 ? ' disabled' : '') + '>&lsaquo; Previous</button>' +
      (wiz.tab < w.tabs.length
        ? '<button class="az" id="wnext">Next : ' + esc(tabs[wiz.tab + 1]) + ' &rsaquo;</button>'
        : '<button class="az" id="wcreate">Create</button>') +
      '<span style="flex:1"></span><button class="az ghost" id="wcancel">Cancel</button>' +
    '</div>' +
  '</div>';
  document.body.appendChild(bg);

  // collect field values live
  $all('[data-f]', bg).forEach(function (el) {
    var id = el.getAttribute('data-f');
    el.oninput = el.onchange = function () {
      wiz.values[id] = el.type === 'checkbox' ? el.checked : el.value;
    };
  });
  $all('[data-fr]', bg).forEach(function (el) { // radio groups
    el.onchange = function () { if (el.checked) wiz.values[el.getAttribute('data-fr')] = el.value; };
  });
  $all('[data-wt]', bg).forEach(function (el) {
    el.onclick = function () { wiz.tab = +el.getAttribute('data-wt'); drawWizard(); };
  });
  $('#wprev', bg).onclick = function () { if (wiz.tab > 0) { wiz.tab--; drawWizard(); } };
  $('#wcancel', bg).onclick = function () { bg.remove(); wiz = null; };
  var next = $('#wnext', bg);
  if (next) next.onclick = function () { wiz.tab++; drawWizard(); };
  var create = $('#wcreate', bg);
  if (create) create.onclick = attemptCreate;
}

function tabBody(tab) {
  return tab.fields.map(function (f) {
    var err = wiz.errors[f.id] ? '<div class="field-err">\u26a0 ' + esc(wiz.errors[f.id]) + '</div>' : '';
    var v = wiz.values[f.id];
    if (f.type === 'select') {
      return '<label>' + esc(f.label) + '</label><select data-f="' + f.id + '">' +
        f.options.map(function (o) { return '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>'; }).join('') + '</select>' +
        (f.help ? '<div class="muted" style="margin-top:3px">' + esc(f.help) + '</div>' : '') + err;
    }
    if (f.type === 'radio') {
      return '<label>' + esc(f.label) + '</label>' + f.options.map(function (o) {
        return '<label style="font-weight:400;display:flex;gap:8px;align-items:center;margin:4px 0"><input type="radio" name="r-' + f.id + '" data-fr="' + f.id + '" value="' + esc(o) + '"' + (o === v ? ' checked' : '') + ' style="width:auto;height:auto"> ' + esc(o) + '</label>';
      }).join('') + err;
    }
    if (f.type === 'toggle') {
      return '<label style="display:flex;gap:8px;align-items:center;font-weight:600;margin-top:12px"><input type="checkbox" data-f="' + f.id + '"' + (v ? ' checked' : '') + ' style="width:auto;height:auto"> ' + esc(f.label) + '</label>' + err;
    }
    var inp = '<input type="' + (f.type === 'password' ? 'password' : 'text') + '" data-f="' + f.id + '" value="' + esc(v) + '"' + (f.placeholder ? ' placeholder="' + esc(f.placeholder) + '"' : '') + '>';
    if (f.suffix) inp = '<div style="display:flex;align-items:center;gap:6px">' + inp + '<span class="muted" style="white-space:nowrap">' + esc(f.suffix) + '</span></div>';
    return '<label>' + esc(f.label) + '</label>' + inp + err;
  }).join('');
}

function reviewBody() {
  var w = wiz.stage.wizard;
  var rows = [];
  w.tabs.forEach(function (t) {
    rows.push('<div style="font-weight:600;font-size:12.5px;margin:12px 0 4px;color:var(--azure)">' + esc(t.name) + '</div>');
    t.fields.forEach(function (f) {
      var v = wiz.values[f.id];
      if (f.type === 'toggle') v = v ? 'Enabled' : 'Disabled';
      if (f.type === 'password') v = v ? '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022' : '(empty)';
      rows.push('<div class="review-row"><span class="k">' + esc(f.label) + '</span><span>' + esc(String(v)) + '</span></div>');
    });
  });
  var errCount = Object.keys(wiz.errors).length;
  return (errCount ? '<div class="notice">\u26a0 Validation failed \u2014 ' + errCount + ' issue(s) highlighted on the previous tabs. Fix them, then Create.</div>'
                   : '<div class="notice blue">\u2139 Running validation\u2026 exactly like the real portal, Create only succeeds when every setting passes.</div>') +
    rows.join('');
}

function attemptCreate() {
  var w = wiz.stage.wizard;
  wiz.errors = {};
  var firstBadTab = -1;
  w.tabs.forEach(function (t, ti) {
    t.fields.forEach(function (f) {
      if (f.validate) {
        var e = f.validate(wiz.values[f.id], wiz.values);
        if (e) { wiz.errors[f.id] = e; if (firstBadTab === -1) firstBadTab = ti; }
      }
    });
  });
  if (firstBadTab !== -1) {
    wiz.tab = firstBadTab;
    drawWizard();
    toast('Validation failed \u2014 fix the highlighted fields.', true);
    return;
  }
  // deploy animation
  var bg = $('#wizbg');
  $('.d-body', bg).innerHTML =
    '<div class="deploy-banner"><span class="spinner"></span> <b>Deployment in progress\u2026</b> &nbsp;Submitting to ' + esc(w.sub) + '</div>' +
    '<div class="muted" id="dlog" style="font-size:12px;line-height:2"></div>';
  $('.d-foot', bg).innerHTML = '';
  var log = ['Validating template\u2026', 'Creating resource(s) in rcw-hrportal-rg\u2026', 'Applying configuration\u2026', 'Finalizing\u2026'];
  var i = 0;
  var iv = setInterval(function () {
    if (i < log.length) { $('#dlog').innerHTML += '\u2713 ' + log[i++] + '<br>'; return; }
    clearInterval(iv);
    finishStage();
  }, 550);
}

function finishStage() {
  var s = wiz.stage;
  var made = s.wizard.resources(wiz.values);
  made.forEach(function (r) { st.resources.push(r); });
  st.points += 10;
  st.stage += 1;
  save();
  var bg = $('#wizbg');
  $('.d-body', bg).innerHTML =
    '<div class="deploy-banner ok">\u2705 <b>Your deployment is complete</b> &nbsp;\u2014 +10 points</div>' +
    made.map(function (r) { return '<div class="review-row"><span class="k"><span class="res-ico">' + r.icon + '</span></span><span><b>' + esc(r.name) + '</b><br><span class="muted">' + esc(r.type) + ' \u00b7 ' + esc(r.extra) + '</span></span></div>'; }).join('');
  $('.d-foot', bg).innerHTML = '<button class="az" id="wgo">' + (st.stage >= STAGES.length ? 'Continue to knowledge check' : 'Go to next stage') + '</button>';
  $('#wgo').onclick = function () {
    bg.remove(); wiz = null;
    if (st.stage >= STAGES.length) renderQuiz(); else renderGuide();
  };
  toast('\u2705 Stage complete \u2014 +10 points!');
}

/* ============================================================
   QUIZ (after stage 10)
   ============================================================ */
function renderQuiz() {
  if (st.quiz && st.quiz.doneAt) { st.done = true; save(); location.hash = 'cert'; return renderCert(); }
  var answers = (st.quiz && st.quiz.answers) || {};
  shell('guide', 'Knowledge check', '\ud83d\udcdd', 'Five questions \u2014 prove you can defend each design decision. +2 points per correct answer.', null,
    railHTML() +
    '<div class="task-panel"><h2>\ud83d\udcdd Final knowledge check</h2>' +
    QUIZ.map(function (q, qi) {
      return '<div style="margin:16px 0 4px;font-weight:600;font-size:13px">' + (qi + 1) + '. ' + esc(q.q) + '</div>' +
        q.opts.map(function (o, oi) {
          var sel = answers[qi] === oi;
          return '<label class="quiz-opt' + (sel ? ' sel' : '') + '"><input type="radio" name="q' + qi + '" data-q="' + qi + '" value="' + oi + '"' + (sel ? ' checked' : '') + '>' + esc(o) + '</label>';
        }).join('');
    }).join('') +
    '<div style="margin-top:16px"><button class="az" id="qsubmit">Submit answers</button></div></div>');
  $all('[data-q]').forEach(function (el) {
    el.onchange = function () {
      answers[+el.getAttribute('data-q')] = +el.value;
      st.quiz = { answers: answers }; save();
      $all('input[name="q' + el.getAttribute('data-q') + '"]').forEach(function (r) { r.closest('.quiz-opt').classList.toggle('sel', r.checked); });
    };
  });
  $('#qsubmit').onclick = function () {
    if (Object.keys(answers).length < QUIZ.length) return toast('Answer all ' + QUIZ.length + ' questions first.', true);
    var correct = 0;
    QUIZ.forEach(function (q, qi) { if (answers[qi] === q.a) correct++; });
    st.points += correct * 2;
    st.quiz = { answers: answers, correct: correct, doneAt: Date.now() };
    st.done = true;
    save();
    showQuizResult(correct);
  };
}

function showQuizResult(correct) {
  shell('guide', 'Knowledge check \u2014 results', '\ud83d\udcdd', 'Review the explanations, then collect your certificate.', null,
    '<div class="deploy-banner ok">\u2705 <b>' + correct + ' / ' + QUIZ.length + ' correct</b> \u2014 +' + (correct * 2) + ' points. Lab complete!</div>' +
    QUIZ.map(function (q, qi) {
      var mine = st.quiz.answers[qi];
      return '<div class="card"><div style="font-weight:600;font-size:13px;margin-bottom:8px">' + (qi + 1) + '. ' + esc(q.q) + '</div>' +
        q.opts.map(function (o, oi) {
          var cls = oi === q.a ? 'right' : (oi === mine ? 'wrong' : '');
          return '<div class="quiz-opt ' + cls + '">' + esc(o) + (oi === q.a ? ' \u2713' : (oi === mine ? ' \u2717 (your answer)' : '')) + '</div>';
        }).join('') +
        '<div class="muted" style="margin-top:8px">\ud83d\udca1 ' + esc(q.why) + '</div></div>';
    }).join('') +
    '<div style="margin-top:14px"><button class="az" id="gocert">\ud83c\udfc5 View my certificate</button></div>');
  $('#gocert').onclick = function () { location.hash = 'cert'; };
}

/* ============================================================
   ALL RESOURCES
   ============================================================ */
function renderResources() {
  shell('resources', 'All resources', '\ud83d\uddc3', 'Everything you have provisioned so far \u2014 like the real All resources blade.',
    [{ ico: '\u21bb', label: 'Refresh', fn: renderResources }],
    (st.resources.length
      ? '<div class="card"><table class="az"><tr><th></th><th>Name</th><th>Type</th><th>Resource group</th><th>Details</th></tr>' +
        st.resources.map(function (r) {
          return '<tr><td style="width:34px"><span class="res-ico">' + r.icon + '</span></td><td><b>' + esc(r.name) + '</b></td><td>' + esc(r.type) + '</td><td class="muted">rcw-hrportal-rg</td><td class="muted">' + esc(r.extra) + '</td></tr>';
        }).join('') + '</table></div>'
      : '<div class="card muted">No resources yet \u2014 head to the Lab guide and create your resource group.</div>'));
}

/* ============================================================
   ARCHITECTURE MAP
   ============================================================ */
function renderArch() {
  var has = {};
  st.resources.forEach(function (r) { has[r.id] = true; });
  function node(x, y, w, id, icon, label) {
    var on = has[id];
    return '<g><rect x="' + x + '" y="' + y + '" rx="6" width="' + w + '" height="52" fill="' + (on ? '#eff6fc' : '#f6f6f6') + '" stroke="' + (on ? '#0078d4' : '#d0d0d0') + '" stroke-width="1.6"/>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + 22) + '" text-anchor="middle" font-size="15">' + icon + (on ? ' \u2713' : '') + '</text>' +
      '<text x="' + (x + w / 2) + '" y="' + (y + 40) + '" text-anchor="middle" font-size="10.5" fill="' + (on ? '#0078d4' : '#a0a0a0') + '" font-weight="600">' + label + '</text></g>';
  }
  function edge(x1, y1, x2, y2, on) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + (on ? '#0078d4' : '#d8d8d8') + '" stroke-width="1.6" marker-end="url(#arr)"/>';
  }
  var svg =
  '<svg viewBox="0 0 860 420" style="min-width:760px;width:100%;height:auto" xmlns="http://www.w3.org/2000/svg">' +
    '<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="#9ab8d4"/></marker></defs>' +
    '<text x="20" y="26" font-size="13" font-weight="700" fill="#323130">HR Interview &amp; Assessment Portal \u2014 Azure architecture (lights up as you build)</text>' +
    node(20, 60, 130, 'users', '\ud83d\udc65', 'Candidates + HR') +
    node(220, 60, 150, 'entra', '\ud83e\udeaa', 'Entra ID sign-in') +
    node(440, 60, 170, 'webapp', '\ud83c\udf10', 'App Service (portal)') +
    node(680, 60, 160, 'deploy', '\ud83d\ude80', 'GitHub Actions CI/CD') +
    node(220, 180, 150, 'acs', '\ud83d\udcde', 'Communication Svcs') +
    node(440, 180, 170, 'kv', '\ud83d\udd11', 'Key Vault + MSI') +
    node(680, 180, 160, 'insights', '\ud83d\udcc8', 'App Insights') +
    node(220, 300, 150, 'storage', '\ud83d\uddc4', 'Blob: gd-recordings') +
    node(440, 300, 170, 'sql', '\ud83d\udee2', 'Azure SQL: hrportaldb') +
    node(680, 300, 160, 'rg', '\ud83d\udcc1', 'rcw-hrportal-rg') +
    edge(150, 86, 218, 86, has.entra) +
    edge(370, 86, 438, 86, has.webapp) +
    edge(680, 86, 612, 86, has.deploy) +
    edge(480, 112, 320, 180, has.acs) +
    edge(525, 112, 525, 178, has.kv) +
    edge(570, 112, 720, 178, has.insights) +
    edge(295, 232, 295, 298, has.storage) +
    edge(525, 232, 525, 298, has.sql) +
  '</svg>';
  var builtCount = Object.keys(has).length;
  shell('arch', 'Architecture map', '\ud83d\uddfa', 'The full design lights up blue as each stage completes.', null,
    '<div class="card"><h3>Live architecture <span class="sub">' + builtCount + ' component group(s) provisioned</span></h3><div class="arch">' + svg + '</div>' +
    '<div class="muted" style="margin-top:10px;line-height:1.8"><b>Data flows:</b> Users authenticate via Entra ID (role claim HR/Candidate) \u2192 App Service serves the portal \u2192 live GD video runs on Communication Services and recordings land in the private gd-recordings blob container \u2192 ratings &amp; scores persist in Azure SQL \u2192 the app reads its secrets from Key Vault using its managed identity \u2192 Application Insights alerts on failed requests \u2192 GitHub Actions deploys every push to main.</div></div>');
}

/* ============================================================
   CERTIFICATE
   ============================================================ */
function renderCert() {
  var max = 100 + QUIZ.length * 2;
  var body;
  if (!st.done) {
    body = '<div class="card muted">Finish all 10 stages and the knowledge check to unlock your certificate. You are on stage ' + (st.stage + 1) + ' of 10.</div>';
  } else {
    body =
    '<div class="cert" id="certBox">' +
      '<div style="font-size:30px">\ud83c\udfc5</div>' +
      '<h2>Certificate of Completion</h2>' +
      '<div class="muted">RCW IT Training \u2014 Azure Mini Project</div>' +
      '<div class="name">' + esc(st.name) + '</div>' +
      '<div style="font-size:13px;margin:6px 0">successfully designed and provisioned the complete Azure architecture for the</div>' +
      '<div style="font-weight:700;font-size:15px;color:var(--azure)">HR Interview &amp; Assessment Portal</div>' +
      '<div class="muted" style="margin-top:10px">Resource Group \u00b7 Blob Storage \u00b7 Azure SQL \u00b7 App Service \u00b7 Entra ID \u00b7 Communication Services \u00b7 Key Vault \u00b7 App Insights \u00b7 GitHub Actions</div>' +
      '<div style="margin-top:14px"><span class="badge-score" style="font-size:14px">Score: ' + st.points + ' / ' + max + '</span></div>' +
      '<div class="muted" style="margin-top:10px">' + new Date().toLocaleDateString('en-IN', { dateStyle: 'long' }) + ' \u00b7 www.rcwittraining.in</div>' +
    '</div>' +
    '<div style="margin-top:14px" class="flexrow">' +
      '<button class="az" onclick="window.print()">\ud83d\udda8 Print / save as PDF</button>' +
      '<button class="az ghost" id="again">\u267b Retake the lab</button>' +
    '</div>';
  }
  shell('cert', 'Completion certificate', '\ud83c\udfc5', st.done ? 'Congratulations \u2014 architecture complete!' : 'Locked until the lab is finished.', null, body);
  var again = $('#again');
  if (again) again.onclick = function () {
    if (confirm('Reset the lab and start again?')) { var nm = st.name; st = defaults(); st.name = nm; save(); location.hash = ''; route(); }
  };
}

/* ============================================================
   ROUTER
   ============================================================ */
function route() {
  if (!st.name) return renderSignin();
  var h = location.hash.replace('#', '');
  if (st.stage >= STAGES.length && !st.done && h !== 'resources' && h !== 'arch' && h !== 'cert') return renderQuiz();
  ({ guide: renderGuide, resources: renderResources, arch: renderArch, cert: renderCert }[h] || renderGuide)();
}
window.addEventListener('hashchange', route);
load();
route();
})();
