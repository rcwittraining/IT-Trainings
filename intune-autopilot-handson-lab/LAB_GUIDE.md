# Microsoft Intune: Windows Autopilot Hands-on Lab & Console Replica
*Comprehensive Enterprise Architecture, Guided Exercises, and Zero-Trust Compliance*

---

## 🧭 Overview

This hands-on lab delivers an **exact console replica** of the Microsoft Intune admin center (`intune.microsoft.com`), enabling Cloud and Endpoint engineers to configure and experience end-to-end **Windows Autopilot Zero-Touch Deployment** adhering strictly to **Zero-Trust Device Compliance Standards**.

---

## 🎯 5 Hands-on Lab Exercises:

### 1. Exercise 1: Enrollment Status Page (ESP)
* Configure the default or custom ESP to block device usage until all security profiles and required applications are installed.
* Set the failure timeout to 60 minutes and configure custom support error messages.

### 2. Exercise 2: Windows Autopilot Deployment Profile
* Configure **User-Driven Microsoft Entra Join** (Cloud-Native Zero Trust).
* Set standard user account privilege (least privilege enforcement).
* Define automated computer naming template: `RCW-WIN-%RAND:4%`.
* Hide EULA and OEM registration screens.

### 3. Exercise 3: Autopilot Hardware Hash CSV Import
* Register device serial numbers, PKID, and 4k hardware hashes.
* Assign Group Tag `CORP-SECURE` for dynamic Microsoft Entra ID group membership.

### 4. Exercise 4: Zero-Trust Device Compliance Baseline
* **BitLocker:** Required with XTS-AES 256-bit encryption.
* **Hardware Security:** TPM 2.0 & UEFI Secure Boot required.
* **Operating System Baseline:** Minimum Build `10.0.22631.3880` (Windows 11 23H2).
* **Endpoint Protection:** Microsoft Defender Antivirus Real-time Protection required.

### 5. Exercise 5: Virtual Windows 11 Autopilot OOBE Studio
* Launch the simulated first boot on an unboxed laptop.
* Observe the live ESP phases: Device Preparation -> Device Setup -> Account Setup -> BitLocker Key Escrow -> Zero-Trust Compliance Evaluation.

---

## 📜 Standards & References
* **CIS Microsoft Intune Benchmark v3.0**
* **NIST SP 800-171 Rev 2**
* **Microsoft Zero-Trust Architecture Reference Framework**
