/**
 * Microsoft Intune: Windows Autopilot Hands-on Lab & Console Replica Engine
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
        serial: 'RCW-T14-10029',
        model: 'Lenovo ThinkPad T14 Gen 4',
        hash: 'v-991823ab...[Hardware Hash]',
        groupTag: 'CORP-STANDARD',
        profile: 'Standard-OOBE-Default',
        assignedUser: 'pradeep.raju@contoso-rcw.com',
        status: 'Assigned'
      }
    ],
    espSettings: {
      showProgress: true,
      blockUntilReady: true,
      timeoutMinutes: 60,
      customMessage: 'Contact IT Support at support@contoso-rcw.com'
    },
    compliancePolicies: [
      {
        id: 'comp-baseline',
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
        name: 'RCW-WIN-1002',
        user: 'pradeep.raju@contoso-rcw.com',
        os: 'Windows 11 23H2 (10.0.22631.3880)',
        compliance: 'Compliant',
        lastSync: 'Just now',
        serial: 'RCW-T14-10029',
        bitlocker: 'Enforced (XTS-AES 256)'
      }
    ],
    exercises: {
      espConfigured: false,
      profileCreated: false,
      deviceImported: false,
      complianceCreated: false,
      oobeDeployed: false
    }
  };

  // --- DOM ELEMENTS ---
  const navItems = document.querySelectorAll('.nav-tree-item');
  const viewPanels = document.querySelectorAll('.work-view');
  const viewTitle = document.getElementById('viewTitle');
  const breadcrumbCurrent = document.getElementById('breadcrumbCurrent');
  const scoreValue = document.getElementById('scoreValue');
  const labFill = document.getElementById('labFill');

  // --- NAVIGATION ---
  function navigate(viewId) {
    state.currentView = viewId;
    viewPanels.forEach(p => p.style.display = (p.id === `view-${viewId}`) ? 'block' : 'none');
    navItems.forEach(n => n.classList.toggle('active', n.dataset.view === viewId));

    const titles = {
      dashboard: 'Dashboard',
      profiles: 'Windows Autopilot Deployment Profiles',
      devices: 'Windows Autopilot Devices',
      esp: 'Enrollment Status Page (ESP)',
      compliance: 'Compliance Policies — Windows 10/11',
      'all-devices': 'All Managed Devices',
      oobe: 'Windows 11 Virtual Autopilot Deployment Runner',
      guide: 'Lab Exercises & Zero-Trust Compliance Reference'
    };
    if (viewTitle) viewTitle.textContent = titles[viewId] || 'Microsoft Intune';
    if (breadcrumbCurrent) breadcrumbCurrent.textContent = titles[viewId] || 'Overview';

    render();
  }

  // --- RENDER ---
  function render() {
    updateScore();

    // Profiles Grid
    const profileTbody = document.getElementById('profileGridBody');
    if (profileTbody) {
      profileTbody.innerHTML = state.profiles.map(p => `
        <tr>
          <td><strong>${p.name}</strong></td>
          <td><span class="tag-pill tag-blue">${p.type}</span></td>
          <td>${p.joinType}</td>
          <td><code>${p.namingTemplate}</code></td>
          <td>${p.userAccount}</td>
          <td>${p.assignedGroup}</td>
        </tr>
      `).join('');
    }

    // Devices Grid
    const devTbody = document.getElementById('deviceGridBody');
    if (devTbody) {
      devTbody.innerHTML = state.devices.map(d => `
        <tr>
          <td><strong>${d.serial}</strong></td>
          <td>${d.model}</td>
          <td><span class="badge-replica">${d.groupTag}</span></td>
          <td>${d.profile}</td>
          <td>${d.assignedUser}</td>
          <td><span class="tag-pill tag-green">${d.status}</span></td>
        </tr>
      `).join('');
    }

    // Compliance Grid
    const compTbody = document.getElementById('complianceGridBody');
    if (compTbody) {
      compTbody.innerHTML = state.compliancePolicies.map(c => `
        <tr>
          <td><strong>${c.name}</strong></td>
          <td>${c.platform}</td>
          <td><span class="tag-pill ${c.bitlocker === 'Required' ? 'tag-green' : 'tag-warn'}">${c.bitlocker}</span></td>
          <td><span class="tag-pill ${c.secureBoot === 'Required' ? 'tag-green' : 'tag-warn'}">${c.secureBoot}</span></td>
          <td><span class="tag-pill ${c.tpm === 'Required' ? 'tag-green' : 'tag-warn'}">${c.tpm}</span></td>
          <td><code>${c.minOS}</code></td>
        </tr>
      `).join('');
    }

    // All Managed Devices Grid
    const allDevTbody = document.getElementById('allDevicesGridBody');
    if (allDevTbody) {
      allDevTbody.innerHTML = state.enrolledDevices.map(ed => `
        <tr>
          <td><strong>${ed.name}</strong></td>
          <td>${ed.user}</td>
          <td>${ed.os}</td>
          <td><span class="tag-pill ${ed.compliance === 'Compliant' ? 'tag-green' : 'tag-red'}">● ${ed.compliance}</span></td>
          <td>${ed.bitlocker}</td>
          <td>${ed.lastSync}</td>
        </tr>
      `).join('');
    }
  }

  // --- SCORING ENGINE ---
  function updateScore() {
    let score = 0;
    if (state.exercises.espConfigured) score += 20;
    if (state.exercises.profileCreated) score += 20;
    if (state.exercises.deviceImported) score += 20;
    if (state.exercises.complianceCreated) score += 20;
    if (state.exercises.oobeDeployed) score += 20;

    if (scoreValue) scoreValue.textContent = `${score}/100`;
    if (labFill) labFill.style.width = `${score}%`;

    updateTaskBadge('ex-1', state.exercises.espConfigured);
    updateTaskBadge('ex-2', state.exercises.profileCreated);
    updateTaskBadge('ex-3', state.exercises.deviceImported);
    updateTaskBadge('ex-4', state.exercises.complianceCreated);
    updateTaskBadge('ex-5', state.exercises.oobeDeployed);
  }

  function updateTaskBadge(id, done) {
    const el = document.getElementById(id);
    if (el) {
      el.classList.toggle('done', done);
      el.classList.toggle('todo', !done);
      el.innerHTML = `${done ? '✓' : '○'} ${el.dataset.label}`;
    }
  }

  // --- MODAL DIALOGS ---
  window.openDialog = function (id) {
    const d = document.getElementById(id);
    if (d) d.classList.add('active');
  };

  window.closeDialog = function (id) {
    const d = document.getElementById(id);
    if (d) d.classList.remove('active');
  };

  // --- EXERCISE ACTIONS ---

  // Ex 1: Save ESP Settings
  window.saveESP = function (e) {
    e.preventDefault();
    state.exercises.espConfigured = true;
    render();
    notify('Success: Enrollment Status Page (ESP) policy configured and enforced.');
  };

  // Ex 2: Create Deployment Profile
  window.createProfile = function (e) {
    e.preventDefault();
    const name = document.getElementById('newProfName').value || 'ZeroTrust-Windows11-Autopilot';
    const join = document.getElementById('newProfJoin').value;
    const template = document.getElementById('newProfTemplate').value || 'RCW-WIN-%RAND:4%';
    const userType = document.getElementById('newProfUser').value;

    state.profiles.unshift({
      id: 'prof-' + Date.now(),
      name: name,
      type: 'User-Driven',
      joinType: join,
      userAccount: userType,
      namingTemplate: template,
      eula: 'Hide',
      privacy: 'Hide',
      assignedGroup: 'All Corporate Laptops'
    });

    state.exercises.profileCreated = true;
    closeDialog('dlgProfile');
    render();
    notify('Success: Autopilot Deployment Profile created and targeted to All Corporate Laptops.');
  };

  // Ex 3: Import Hardware Hash
  window.importHardware = function (e) {
    e.preventDefault();
    const serial = document.getElementById('newDevSerial').value || 'RCW-X1-88910';
    const model = document.getElementById('newDevModel').value || 'Dell Latitude 9440 2-in-1';
    const tag = document.getElementById('newDevTag').value || 'CORP-SECURE';

    state.devices.unshift({
      serial: serial,
      model: model,
      hash: 'v-ca9910e14...[Hardware Hash Escrowed]',
      groupTag: tag,
      profile: state.profiles[0].name,
      assignedUser: 'sophia.davis@contoso-rcw.com',
      status: 'Assigned'
    });

    state.exercises.deviceImported = true;
    closeDialog('dlgImport');
    render();
    notify('Success: Hardware hash imported. Device registered and profile assigned.');
  };

  // Ex 4: Create Compliance Policy
  window.createCompliance = function (e) {
    e.preventDefault();
    const name = document.getElementById('newCompName').value || 'ZeroTrust-CIS-Windows11-Baseline';
    const bitlocker = document.getElementById('newCompBitlocker').value;
    const secureBoot = document.getElementById('newCompSecureBoot').value;
    const tpm = document.getElementById('newCompTPM').value;
    const minOS = document.getElementById('newCompMinOS').value || '10.0.22631.3880';

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

    state.exercises.complianceCreated = true;
    closeDialog('dlgCompliance');
    render();
    notify('Success: Zero-Trust Compliance Policy created and assigned.');
  };

  // Ex 5: Launch Windows 11 Autopilot Virtual Runner
  window.runAutopilotOOBE = function () {
    const oobeView = document.getElementById('oobeInteractiveStage');
    const startBtn = document.getElementById('btnStartOobe');
    if (startBtn) startBtn.style.display = 'none';
    if (oobeView) oobeView.style.display = 'block';

    const steps = [
      { text: 'Booting Windows 11 Enterprise Out-of-Box Experience...', node: 'node-1' },
      { text: 'Detecting Autopilot Profile for Tenant contoso-rcw.onmicrosoft.com...', node: 'node-2' },
      { text: 'Authenticating User (sophia.davis@contoso-rcw.com) with Microsoft Entra ID...', node: 'node-3' },
      { text: 'ESP Device Preparation: Applying Intune Management Extension & Certificates...', node: 'node-4' },
      { text: 'ESP Device Setup: Enforcing Silent BitLocker XTS-AES 256 & TPM 2.0...', node: 'node-5' },
      { text: 'Zero-Trust Compliance Health Evaluation: Secure Boot & OS Build Attested...', node: 'node-6' },
      { text: '🎉 Autopilot Provisioning Complete! Device is 100% Compliant and Ready for Use.', node: 'node-7' }
    ];

    let stepIdx = 0;
    const timer = setInterval(() => {
      if (stepIdx < steps.length) {
        document.getElementById('oobeDynamicText').textContent = steps[stepIdx].text;
        const nodeEl = document.getElementById(steps[stepIdx].node);
        if (nodeEl) {
          nodeEl.classList.remove('pending');
          nodeEl.classList.add('done');
          nodeEl.innerHTML = `✓ ${nodeEl.dataset.label}`;
        }
        stepIdx++;
      } else {
        clearInterval(timer);
        state.exercises.oobeDeployed = true;

        state.enrolledDevices.unshift({
          name: 'RCW-WIN-8891',
          user: 'sophia.davis@contoso-rcw.com',
          os: 'Windows 11 23H2 (10.0.22631.3880)',
          compliance: 'Compliant',
          lastSync: 'Just now',
          serial: 'RCW-X1-88910',
          bitlocker: 'Enforced (XTS-AES 256)'
        });

        render();
        notify('🎉 Congratulations! 100/100 points scored on Windows Autopilot Hands-on Lab!');
      }
    }, 1300);
  };

  function notify(msg) {
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
        navigate(n.dataset.view);
      });
    });
    navigate('dashboard');
  });

})();
