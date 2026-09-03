# Microsoft Intune: Endpoint Security & Zero-Trust Compliance Challenge
*Enterprise Incident Triage, BitLocker Remediation, and CIS Benchmark Enforcement*

---

## 🧭 Challenge Scenario: SOC Alert #INC-8092

Your enterprise Security Operations Center (SOC) detected that 65% of executive and finance Windows 11 laptops are failing device compliance audits.

### Specific Vulnerabilities:
1. **BitLocker Inactive:** 5 laptops have unencrypted drives holding sensitive corporate financial data.
2. **Defender RTP Disabled:** 2 users disabled Real-Time Protection locally.
3. **No Conditional Access Safeguards:** Non-compliant devices are still able to access Microsoft 365 Exchange Online and OneDrive.

---

## 🎯 The 5 Challenge Missions:

1. **Mission 1: Deploy Silent BitLocker 256-bit AES-XTS Encryption**  
   Configure Microsoft Intune Endpoint Security > Disk Encryption to silently enforce encryption with TPM 2.0 and key escrow to Microsoft Entra ID.

2. **Mission 2: Deploy Microsoft Defender for Endpoint Baseline**  
   Lock down Real-Time Protection (RTP), Cloud Protection, and Tamper Protection.

3. **Mission 3: Enforce Zero-Trust Conditional Access**  
   Configure Microsoft Entra ID Conditional Access to require compliant devices for all Microsoft 365 apps.

4. **Mission 4: Execute Proactive Remediations**  
   Run automated PowerShell CSP scripts to detect unencrypted drives and trigger silent BitLocker encryption on-the-fly.

5. **Mission 5: Re-Evaluate Global Compliance & Close SOC Incident**  
   Verify that all corporate endpoints reach 100% compliant status.

---

## 📜 Compliance Standards Referenced
* **CIS Microsoft Intune Benchmark v3.0** (Sections 2.3.1 & 2.3.2)
* **NIST SP 800-171 Rev 2** (Controlled Unclassified Information)
* **Microsoft Zero-Trust Architecture** (Verify explicitly, use least privilege, assume breach)
