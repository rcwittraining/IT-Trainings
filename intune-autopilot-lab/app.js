/**
 * Microsoft Intune Autopilot & Zero-Trust Compliance Lab Engine
 * Developed for RCW IT Training (www.rcwittraining.in)
 * Author: Pradeep Raju (Senior Enterprise Infrastructure Architect)
 */

(function () {
  'use strict';

  // --- STATE ---
  const state = {
    currentView: 'dashboard',
    profiles: [
      {
        id: 'prof-default',
        name: 'Standard-OOBE-Default',
        type: 'User-Driven',
        joinType: 'Microsoft Entra joined',
        userAccount: 'Standard',
        namingTemplate: 'DESKTOP-%RAND:5%',
        eula: 'Show',
        privacy: 'Show',
        assignedGroup: 'All Devices'
      }
    ],
    devices: [
      {
        serial: 'RCW-X1-99201',
        model: 'Lenovo ThinkPad X1 Carbon Gen 11',
        hash: 'v-aa8910e14c81...[Hardware Hash]',
        groupTag: 'VIP-EXEC',
        profile: 'Standard-OOBE-Default',
        assignedUser: 'pradeep.raju@contoso-rcw.com',
        status: 'Assigned'
      }
    ],
    compliancePolicies: [
      {
        id: 'comp-win10-default',
        name: 'Default Built-in Windows Compliance',
        platform: 'Windows 10 and later',
        bitlocker: 'Not Configured',
        secureBoot: 'Not Configured',
        tpm: 'Not Configured',
        defender: 'Not Configured',
        minOS: 'None',
        assignedGroup: 'All Users'
      }
    ],
    enrolledDevices: [
      {
        name: 'RCW-WIN-9920',
        user: 'pradeep.raju@contoso-rcw.com',
        os: 'Windows 11 23H2 (10.0.22631.3880)',
        compliance: 'Compliant',
        lastSync: 'Just now',
        serial: 'RCW-X1-99201',
        bitlocker: 'Enforced (XTS-AES 256)'
      }
    ],
    tasks: {
      profileCreated: false,
      deviceImported: false,
      complianceCreated: false,
      oobeRun: false,
      complianceVerified: false
    }
  };

  // --- DOM ELEMENTS ---
  const views = document.querySelectorAll('.view-panel');
  const navItems = document.querySelectorAll('.nav-item');
  const viewTitle = document.getElementById('currentViewTitle');
  const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
  const scoreValue = document.getElementById('scoreValue');
  const progressFill = document.getElementById('progressFill');

  // --- ROUTING ---
  function navigateTo(viewId) {
    state.currentView = viewId;
    views.forEach(v => v.style.display = (v.id === `view-${viewId}`) ? 'block' : 'none');
    navItems.forEach(n => {
      n.classList.toggle('active', n.dataset.view === viewId);
    });

    const titles = {
      dashboard: 'Dashboard',
      autopilot: 'Windows Autopilot Deployment Profiles',
      devices: 'Windows Autopilot Devices',
      compliance: 'Compliance Policies — Windows 10/11',
      'all-devices': 'All Managed Devices',
      oobe: 'Windows 11 Autopilot Virtual Machine Runner',
      guide: 'Lab Guide & Compliance Standards'
    };
    if (viewTitle) viewTitle.textContent = titles[viewId] || 'Microsoft Intune';
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = titles[viewId] || 'Overview';

    renderView();
  }

  // --- RENDER VIEWS ---
  function renderView() {
    updateScore();

    // Render Profiles Table
    const profileTbody = document.getElementById('profileTableBody');
    if (profileTbody) {
      profileTbody.innerHTML = state.profiles.map(p => `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td><span class="status-pill status-assigned">${p.type}</span></td>
          <td>${p.joinType}</td>
          <td><code>${p.namingTemplate}</code></td>
          <td>${p.userAccount}</td>
          <td>${p.assignedGroup}</td>
        </tr>
      `).join('');
    }

    // Render Autopilot Devices Table
    const devTbody = document.getElementById('deviceTableBody');
    if (devTbody) {
      devTbody.innerHTML = state.devices.map(d => `
        <tr>
          <td><strong>${d.serial}</strong></td>
          <td>${d.model}</td>
          <td><span class="badge-sim">${d.groupTag}</span></td>
          <td>${d.profile}</td>
          <td>${d.assignedUser}</td>
          <td><span class="status-pill status-compliant">${d.status}</span></td>
        </tr>
      `).join('');
    }

    // Render Compliance Table
    const compTbody = document.getElementById('complianceTableBody');
    if (compTbody) {
      compTbody.innerHTML = state.compliancePolicies.map(c => `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.platform}</td>
          <td><span class="status-pill ${c.bitlocker === 'Required' ? 'status-compliant' : 'status-pending'}">${c.bitlocker}</span></td>
          <td><span class="status-pill ${c.secureBoot === 'Required' ? 'status-compliant' : 'status-pending'}">${c.secureBoot}</span></td>
          <td><span class="status-pill ${c.tpm === 'Required' ? 'status-compliant' : 'status-pending'}">${c.tpm}</span></td>
          <td><code>${c.minOS}</code></td>
        </tr>
      `).join('');
    }

    // Render All Devices Table
    const allDevTbody = document.getElementById('allDevicesTableBody');
    if (allDevTbody) {
      allDevTbody.innerHTML = state.enrolledDevices.map(ed => `
        <tr>
          <td><strong>${ed.name}</strong></td>
          <td>${ed.user}</td>
          <td>${ed.os}</td>
          <td><span class="status-pill ${ed.compliance === 'Compliant' ? 'status-compliant' : 'status-pending'}">● ${ed.compliance}</span></td>
          <td>${ed.bitlocker}</td>
          <td>${ed.lastSync}</td>
        </tr>
      `).join('');
    }
  }

  // --- SCORE CALCULATION ---
  function updateScore() {
    let score = 0;
    if (state.tasks.profileCreated) score += 20;
    if (state.tasks.deviceImported) score += 20;
    if (state.tasks.complianceCreated) score += 25;
    if (state.tasks.oobeRun) score += 20;
    if (state.tasks.complianceVerified) score += 15;

    if (scoreValue) scoreValue.textContent = `${score}/100`;
    if (progressFill) progressFill.style.width = `${score}%`;

    // Update Task Checklist UI
    updateTaskItem('task-1', state.tasks.profileCreated);
    updateTaskItem('task-2', state.tasks.deviceImported);
    updateTaskItem('task-3', state.tasks.complianceCreated);
    updateTaskItem('task-4', state.tasks.oobeRun);
    updateTaskItem('task-5', state.tasks.complianceVerified);
  }

  function updateTaskItem(id, completed) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle('completed', completed);
      const icon = el.querySelector('.task-icon');
      if (icon) icon.textContent = completed ? '✓' : '○';
    }
  }

  // --- MODAL CONTROLS ---
  window.openModal = function (modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('active');
  };

  window.closeModal = function (modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('active');
  };

  // --- ACTIONS ---

  // 1. Create Autopilot Profile
  window.submitProfile = function (e) {
    e.preventDefault();
    const name = document.getElementById('profName').value || 'Corporate-ZeroTrust-Autopilot';
    const join = document.getElementById('profJoinType').value;
    const template = document.getElementById('profTemplate').value || 'RCW-WIN-%RAND:4%';
    const userType = document.getElementById('profUserType').value;

    state.profiles.unshift({
      id: 'prof-' + Date.now(),
      name: name,
      type: 'User-Driven',
      joinType: join,
      userAccount: userType,
      namingTemplate: template,
      eula: 'Hide',
      privacy: 'Hide',
      assignedGroup: 'Corporate-Laptops'
    });

    state.tasks.profileCreated = true;
    closeModal('modalProfile');
    renderView();
    showToast('Success: Autopilot Deployment Profile created and assigned to Corporate-Laptops.');
  };

  // 2. Import Hardware Hash
  window.submitImport = function (e) {
    e.preventDefault();
    const serial = document.getElementById('devSerial').value || 'RCW-WIN11-8842';
    const model = document.getElementById('devModel').value || 'Dell Latitude 7440';
    const tag = document.getElementById('devTag').value || 'CORP-SECURE';

    state.devices.unshift({
      serial: serial,
      model: model,
      hash: 'v-b8192cf4a...[Hardware Hash Attached]',
      groupTag: tag,
      profile: state.profiles[0].name,
      assignedUser: 'alex.wilson@contoso-rcw.com',
      status: 'Assigned'
    });

    state.tasks.deviceImported = true;
    closeModal('modalImport');
    renderView();
    showToast('Success: Hardware hash imported. Device registered and profile assigned.');
  };

  // 3. Create Compliance Policy
  window.submitCompliance = function (e) {
    e.preventDefault();
    const name = document.getElementById('compName').value || 'ZeroTrust-Windows11-Compliance';
    const bitlocker = document.getElementById('compBitlocker').value;
    const secureBoot = document.getElementById('compSecureBoot').value;
    const tpm = document.getElementById('compTPM').value;
    const minOS = document.getElementById('compMinOS').value || '10.0.22631.3880';

    state.compliancePolicies.unshift({
      id: 'comp-' + Date.now(),
      name: name,
      platform: 'Windows 10 and later',
      bitlocker: bitlocker,
      secureBoot: secureBoot,
      tpm: tpm,
      defender: 'Required',
      minOS: minOS,
      assignedGroup: 'All Corporate Devices'
    });

    state.tasks.complianceCreated = true;
    closeModal('modalCompliance');
    renderView();
    showToast('Success: Zero-Trust Compliance Policy created and assigned.');
  };

  // 4. Run OOBE Virtual Machine Simulator
  window.startOOBE = function () {
    const oobeView = document.getElementById('oobeInteractive');
    const startBtn = document.getElementById('startOobeBtn');
    if (startBtn) startBtn.style.display = 'none';
    if (oobeView) oobeView.style.display = 'block';

    const steps = [
      { text: 'Booting Windows 11 Out-of-Box Experience (OOBE)...', stepId: 'step-1' },
      { text: 'Querying Microsoft Autopilot Cloud Service (Hardware Hash Match)...', stepId: 'step-2' },
      { text: 'Authenticating with Microsoft Entra ID (alex.wilson@contoso-rcw.com)...', stepId: 'step-3' },
      { text: 'Enrolling into Microsoft Intune MDM & Applying Device Preparation...', stepId: 'step-4' },
      { text: 'Enforcing BitLocker XTS-AES 256 Encryption & TPM Key Escrow...', stepId: 'step-5' },
      { text: 'Evaluating Zero-Trust Compliance (Secure Boot, TPM 2.0, OS Build)...', stepId: 'step-6' },
      { text: '🎉 Autopilot Provisioning Complete! Device is Compliant and Ready.', stepId: 'step-7' }
    ];

    let current = 0;
    const interval = setInterval(() => {
      if (current < steps.length) {
        document.getElementById('oobeStatusText').textContent = steps[current].text;
        const checkEl = document.getElementById(steps[current].stepId);
        if (checkEl) {
          checkEl.classList.remove('pending');
          checkEl.classList.add('done');
          checkEl.innerHTML = `✓ ${checkEl.dataset.label}`;
        }
        current++;
      } else {
        clearInterval(interval);
        state.tasks.oobeRun = true;
        state.tasks.complianceVerified = true;

        // Add newly provisioned laptop to enrolled devices
        state.enrolledDevices.unshift({
          name: 'RCW-WIN-8842',
          user: 'alex.wilson@contoso-rcw.com',
          os: 'Windows 11 23H2 (10.0.22631.3880)',
          compliance: 'Compliant',
          lastSync: 'Just now',
          serial: 'RCW-WIN11-8842',
          bitlocker: 'Enforced (XTS-AES 256)'
        });

        renderView();
        showToast('🎉 Excellent! Device provisioned via Autopilot and evaluated as 100% Compliant!');
      }
    }, 1400);
  };

  function showToast(msg) {
    const t = document.createElement('div');
    t.style.cssText = 'position:fixed;bottom:70px;right:20px;background:#107c41;color:#fff;padding:12px 20px;border-radius:4px;box-shadow:0 5px 15px rgba(0,0,0,0.3);z-index:9999;font-size:13px;font-weight:600;';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  // Initialize
  document.addEventListener('DOMContentLoaded', () => {
    navItems.forEach(n => {
      n.addEventListener('click', (e) => {
        e.preventDefault();
        navigateTo(n.dataset.view);
      });
    });
    navigateTo('dashboard');
  });

})();
