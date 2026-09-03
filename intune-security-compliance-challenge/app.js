/**
 * Microsoft Intune: Endpoint Security & Zero-Trust Compliance Challenge Lab
 * Developed for RCW IT Training (www.rcwittraining.in)
 * Author: Pradeep Raju (Senior Enterprise Infrastructure Architect)
 */

(function () {
  'use strict';

  const state = {
    currentView: 'overview',
    complianceRate: 35,
    devices: [
      { id: 'dev-1', name: 'RCW-FIN-01', user: 'lisa.ray@contoso-rcw.com', bitlocker: 'Disabled', defender: 'Real-time OFF', os: '10.0.22000 (Outdated)', status: 'Non-Compliant' },
      { id: 'dev-2', name: 'RCW-EXEC-02', user: 'david.miller@contoso-rcw.com', bitlocker: 'Disabled', defender: 'Enabled', os: '10.0.22621', status: 'Non-Compliant' },
      { id: 'dev-3', name: 'RCW-HR-03', user: 'sarah.jenkins@contoso-rcw.com', bitlocker: 'Disabled', defender: 'Enabled', os: '10.0.22631', status: 'Non-Compliant' },
      { id: 'dev-4', name: 'RCW-DEV-04', user: 'ken.tanaka@contoso-rcw.com', bitlocker: 'Enabled (128-bit)', defender: 'Tamper OFF', os: '10.0.22631', status: 'Non-Compliant' },
      { id: 'dev-5', name: 'RCW-MKT-05', user: 'elena.rostova@contoso-rcw.com', bitlocker: 'Disabled', defender: 'Real-time OFF', os: '10.0.22000 (Outdated)', status: 'Non-Compliant' },
      { id: 'dev-6', name: 'RCW-SEC-01', user: 'pradeep.raju@contoso-rcw.com', bitlocker: 'Enforced (256-bit)', defender: 'Enabled', os: '10.0.22631.3880', status: 'Compliant' },
      { id: 'dev-7', name: 'RCW-OPS-07', user: 'james.wilson@contoso-rcw.com', bitlocker: 'Enforced (256-bit)', defender: 'Enabled', os: '10.0.22631.3880', status: 'Compliant' }
    ],
    policies: {
      bitlockerEnforced: false,
      defenderEnforced: false,
      conditionalAccessEnforced: false,
      remediationRun: false,
      incidentResolved: false
    }
  };

  // DOM Elements
  const navLinks = document.querySelectorAll('.sidebar-link');
  const viewPanels = document.querySelectorAll('.content-view');
  const viewTitle = document.getElementById('viewTitle');
  const breadcrumbText = document.getElementById('breadcrumbText');
  const scoreEl = document.getElementById('challengeScore');
  const dockFill = document.getElementById('dockFill');
  const compRateEl = document.getElementById('compRate');

  // Navigation
  function switchView(viewId) {
    state.currentView = viewId;
    viewPanels.forEach(p => p.style.display = (p.id === `view-${viewId}`) ? 'block' : 'none');
    navLinks.forEach(l => l.classList.toggle('active', l.dataset.view === viewId));

    const titles = {
      overview: 'Security Incident Overview — SOC Alert #INC-8092',
      bitlocker: 'Endpoint Security — Disk Encryption (BitLocker)',
      defender: 'Endpoint Security — Microsoft Defender Antivirus',
      ca: 'Microsoft Entra ID — Conditional Access Policies',
      remediation: 'Intune Proactive Remediations — Automated Scripts',
      devices: 'Devices Triage & Live Health Monitor',
      standards: 'CIS & NIST Zero-Trust Compliance Standards'
    };
    if (viewTitle) viewTitle.textContent = titles[viewId] || 'Microsoft Intune';
    if (breadcrumbText) breadcrumbText.textContent = titles[viewId] || 'Overview';

    render();
  }

  // Render Data
  function render() {
    updateScore();

    // Render Devices Table
    const tbody = document.getElementById('triageTableBody');
    if (tbody) {
      tbody.innerHTML = state.devices.map(d => `
        <tr>
          <td><strong>${d.name}</strong></td>
          <td>${d.user}</td>
          <td><span class="pill ${d.bitlocker.includes('Enforced') ? 'pill-success' : 'pill-error'}">${d.bitlocker}</span></td>
          <td><span class="pill ${d.defender === 'Enabled' ? 'pill-success' : 'pill-error'}">${d.defender}</span></td>
          <td><code>${d.os}</code></td>
          <td><span class="pill ${d.status === 'Compliant' ? 'pill-success' : 'pill-error'}">● ${d.status}</span></td>
        </tr>
      `).join('');
    }

    if (compRateEl) compRateEl.textContent = `${state.complianceRate}%`;
  }

  // Score & Progress Calculation
  function updateScore() {
    let score = 0;
    if (state.policies.bitlockerEnforced) score += 20;
    if (state.policies.defenderEnforced) score += 20;
    if (state.policies.conditionalAccessEnforced) score += 20;
    if (state.policies.remediationRun) score += 20;
    if (state.policies.incidentResolved) score += 20;

    if (scoreEl) scoreEl.textContent = `${score}/100`;
    if (dockFill) dockFill.style.width = `${score}%`;

    updateMissionBadge('m-1', state.policies.bitlockerEnforced);
    updateMissionBadge('m-2', state.policies.defenderEnforced);
    updateMissionBadge('m-3', state.policies.conditionalAccessEnforced);
    updateMissionBadge('m-4', state.policies.remediationRun);
    updateMissionBadge('m-5', state.policies.incidentResolved);
  }

  function updateMissionBadge(id, completed) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle('completed', completed);
      el.classList.toggle('pending', !completed);
      el.innerHTML = `${completed ? '✓' : '○'} ${el.dataset.label}`;
    }
  }

  // Modal Controls
  window.openModal = function (id) {
    const m = document.getElementById(id);
    if (m) m.classList.add('active');
  };

  window.closeModal = function (id) {
    const m = document.getElementById(id);
    if (m) m.classList.remove('active');
  };

  // MISSION 1: Enforce BitLocker
  window.applyBitlockerPolicy = function (e) {
    e.preventDefault();
    state.policies.bitlockerEnforced = true;
    closeModal('modalBitlocker');
    showNotification('Success: BitLocker Silent 256-bit AES-XTS policy deployed to All Corporate Devices.');
    checkFleetHealth();
  };

  // MISSION 2: Enforce Defender
  window.applyDefenderPolicy = function (e) {
    e.preventDefault();
    state.policies.defenderEnforced = true;
    closeModal('modalDefender');
    showNotification('Success: Microsoft Defender Real-Time & Tamper Protection baseline deployed.');
    checkFleetHealth();
  };

  // MISSION 3: Enforce Conditional Access
  window.applyCAPolicy = function (e) {
    e.preventDefault();
    state.policies.conditionalAccessEnforced = true;
    closeModal('modalCA');
    showNotification('Success: Zero-Trust Conditional Access rule active: Non-compliant devices blocked from M365.');
    checkFleetHealth();
  };

  // MISSION 4: Proactive Remediation
  window.runRemediation = function () {
    const logBox = document.getElementById('remediationLog');
    const runBtn = document.getElementById('runRemBtn');
    if (runBtn) runBtn.disabled = true;
    if (logBox) logBox.style.display = 'block';

    const logs = [
      '[+] Initializing Intune Proactive Remediation Agent...',
      '[+] Querying WMI & BitLocker CSP (Get-BitLockerVolume -MountPoint C:)...',
      '[!] Detected 5 unencrypted disks and 2 disabled Defender RTP instances.',
      '[+] Triggering automated remediation script: Enable-BitLocker -EncryptionMethod XtsAes256...',
      '[+] Escrowing BitLocker 48-digit Recovery Keys to Microsoft Entra ID...',
      '[+] Re-enabling Defender Real-time Protection & Tamper Protection...',
      '[✓] Remediation completed successfully across 100% of fleet.'
    ];

    let i = 0;
    const interval = setInterval(() => {
      if (i < logs.length) {
        logBox.innerHTML += `<div style="margin-bottom:4px;color:#38bdf8;">${logs[i]}</div>`;
        logBox.scrollTop = logBox.scrollHeight;
        i++;
      } else {
        clearInterval(interval);
        state.policies.remediationRun = true;
        checkFleetHealth();
      }
    }, 900);
  };

  // MISSION 5: Global Sync & Resolve Incident
  window.triggerGlobalSync = function () {
    if (!state.policies.bitlockerEnforced || !state.policies.defenderEnforced || !state.policies.remediationRun) {
      alert('⚠️ Please complete Missions 1, 2, and 4 before running global compliance evaluation.');
      return;
    }

    // Remediate all devices
    state.devices.forEach(d => {
      d.bitlocker = 'Enforced (256-bit)';
      d.defender = 'Enabled';
      d.os = '10.0.22631.3880';
      d.status = 'Compliant';
    });

    state.complianceRate = 100;
    state.policies.incidentResolved = true;

    const alertBanner = document.getElementById('socAlertBanner');
    if (alertBanner) {
      alertBanner.style.background = '#dff6dd';
      alertBanner.style.borderLeftColor = '#107c41';
      alertBanner.innerHTML = '<strong>🎉 INCIDENT RESOLVED (SOC #INC-8092)</strong><p>All corporate endpoints are 100% Zero-Trust Compliant. BitLocker encryption verified and M365 Conditional Access secured.</p>';
    }

    render();
    showNotification('🎉 Challenge Completed! 100/100 Points Awarded — Skill Passport Updated!');
  };

  function checkFleetHealth() {
    let rate = 35;
    if (state.policies.bitlockerEnforced) rate += 20;
    if (state.policies.defenderEnforced) rate += 20;
    if (state.policies.remediationRun) rate += 25;
    state.complianceRate = Math.min(rate, 100);
    render();
  }

  function showNotification(text) {
    const n = document.createElement('div');
    n.style.cssText = 'position:fixed;bottom:70px;right:20px;background:#107c41;color:#fff;padding:12px 20px;border-radius:4px;box-shadow:0 5px 15px rgba(0,0,0,0.3);z-index:9999;font-size:13px;font-weight:600;';
    n.textContent = text;
    document.body.appendChild(n);
    setTimeout(() => n.remove(), 4000);
  }

  // Init
  document.addEventListener('DOMContentLoaded', () => {
    navLinks.forEach(l => {
      l.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(l.dataset.view);
      });
    });
    switchView('overview');
  });

})();
