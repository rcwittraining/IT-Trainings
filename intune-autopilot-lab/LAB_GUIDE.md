# Microsoft Intune: Windows Autopilot & Zero-Trust Compliance Lab Guide
*Enterprise Architecture, Configuration Standards, and Step-by-Step Practice*

---

## 🧭 Overview

This hands-on lab allows IT administrators and Cloud Engineers to design, configure, and simulate a complete **Windows Autopilot Zero-Touch Deployment** adhering strictly to **Zero-Trust Device Compliance Standards**.

---

## 🎯 Key Learning Objectives

1. **Windows Autopilot Deployment Profile Configuration**:
   * Cloud-native **Microsoft Entra join** (formerly Azure AD Join).
   * Configuring user rights to **Standard User** (enforcing least privilege).
   * Setting automated device naming patterns (e.g. `RCW-WIN-%RAND:4%`).

2. **Hardware Hash & Dynamic Group Assignment**:
   * Registering device serial numbers, PKID, and 4k hardware hashes with Group Tags (`CORP-SECURE`).

3. **Zero-Trust Compliance Baseline Standard**:
   * **BitLocker Drive Encryption:** Required with XTS-AES 256-bit algorithm and TPM key protector.
   * **Hardware Security:** TPM 2.0 and UEFI Secure Boot required.
   * **OS Baseline:** Minimum OS version `10.0.22631.3880` (Windows 11 23H2).
   * **Endpoint Protection:** Microsoft Defender Antivirus real-time monitoring enabled.

4. **Windows 11 Out-of-Box Experience (OOBE) Simulation**:
   * Simulating the end-user first boot experience, Enrollment Status Page (ESP) phases, policy enforcement, and live compliance verification.

---

## 🏆 Scoring & Certification Criteria

* **Task 1: Create Autopilot Profile (20 pts)**
* **Task 2: Import & Sync Hardware Hash (20 pts)**
* **Task 3: Configure Zero-Trust Compliance Policy (25 pts)**
* **Task 4: Run Windows 11 OOBE Provisioning (20 pts)**
* **Task 5: Verify Device Compliance in Intune (15 pts)**
* **Total Score:** 100/100 points
