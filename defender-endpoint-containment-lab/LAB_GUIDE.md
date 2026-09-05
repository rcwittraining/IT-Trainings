# Lab 2 — Defender for Endpoint: device triage, live response and containment

**Provider:** RCW IT Training
**Series:** Microsoft Defender security labs (Lab 2 of 5)
**Level:** Advanced practitioner
**Estimated time:** 75–95 minutes
**Delivery:** Offline, browser-local console replica. No tenant, no agent, no network calls.
**Lab URL:** [Open the lab](./)

> Reproduces the look and wording of the Microsoft Defender portal for teaching. Not Microsoft software; no affiliation or endorsement; no Microsoft logo. All identifiers are synthetic.

## Contents
1. Learning objectives · 2. Scenario · 3. Simulated boundary · 4. Marking · 5. Procedure · 6. Expected results · 7. Traps · 8. Evidence and access · 9. Troubleshooting · 10. Control alignment · 11. References

## Learning objectives

- scope an endpoint incident across the device list and read the asset context before acting;
- read a device timeline and a process tree well enough to name the parent that matters;
- prove lateral movement with a bounded hash query instead of assuming it;
- run live response in an order that preserves evidence, with approval recorded before anything destructive;
- choose isolation versus containment against business impact, and say why in the record;
- turn exposure-management findings into remediation or a *governed* exception;
- verify recovery and close the device work with an auditable note.

## Scenario

Simulated clock **2026-08-21T10:00Z**. The lab device is **FIN-WKS-0777**; the same page shows **FIN-WKS-0342**, **FIN-WKS-0421**, **HR-WKS-0110** and **PAY-SRV-0007**, so your scope decision is visible to the reviewer. A signed binary performs information gathering, an outbound connection follows, and a file with SHA-1 `f3a4c2d18b7e4a0c9d55e1b0a6c4f2d9e8b71a3c` appears on more than one host. Role: **Arjun Nair, Endpoint engineering** — a simulated account in a simulated tenant.

## Simulated boundary

Real behaviour modelled: the device list with health and EDR-blocked columns; timeline with event-type filters; process-tree drawer; live response console with a per-OS verb set and an approval gate before destructive verbs; isolation options and scope; the action record; exposure-management recommendations with risk and accepted-risk states; the recovery checks at the end.
Simplified: no agent connects, commands return canned synthetic output drawn from the same tables the KQL pane queries, and retention limits are described rather than enforced. Plan 1 / Plan 2 capability limits are surfaced as notes instead of hidden behaviour.

## Marking

| # | Objective | Pts | Core check |
| --- | --- | --- | --- |
| 1 | Scope and asset context | 10 | Correct device, data classification, business impact and the tags that change the plan |
| 2 | Device timeline and process-tree reading | 15 | The pivot process, whether blocking *should* have fired, and a timeline note that reads as a sequence |
| 3 | Blast radius by hash, in a bounded window | 15 | KQL over `DeviceFileEvents` filtered by the SHA-1 that returns exactly the affected devices |
| 4 | Live response session with evidence-first sequencing | 20 | Three real commands run, collection before mutation, approval recorded, unsigned-binary handling |
| 5 | Isolation versus containment | 10 | Action chosen against a stated reason, scope declared, rollback owner named |
| 6 | Vulnerability remediation and a governed exception | 15 | The right recommendations selected for remediation, the rest handled as an exception with owner, expiry and compensating control |
| 7 | Verification and closure of the device work | 15 | Re-scan, sensor health, peer devices, custody note, residual risk stated |

Total 100 points.

## Procedure

1. **Scope (10).** Devices → select the lab device, state classification and impact, and read/apply the tags. Tags change what approval you owe; they are not decoration.
2. **Timeline (15).** Timeline → filter event types, open the process tree, name the parent that matters, and answer the two questions that decide the rest of the lab: should blocking have fired here, and what does the absence of a peer alert *not* prove.
3. **Hunt (15).** Advanced hunting → bound the query and filter on the SHA-1 above. It must return exactly the three hosts that carry the loader, and no more.
4. **Live response (20).** Live response → actually run at least `collect-investigation-package`, a `get-file` on the loader path, and `run-av-scan`. Record the approver and change reference before any destructive verb, and treat the unsigned binary as a decision, not a discovery.
5. **Isolation (10).** Response actions → pick isolation or containment, declare the scope, name the rollback owner, and write the reason the business will read.
6. **Exposure management (15).** Recommendations → select **exactly REC-2 and REC-4** for remediation; the remainder is handled as an exception with a compensating control and an expiry date.
7. **Verify (15).** Closure → collect the verification evidence from what you ran, state the residual risk, and write the custody note.

## Expected results

- The hash query returns **3 rows** (three devices). Including the host that only has the benign copy, or counting events instead of devices, fails.
- Live response: collection verbs must precede `delete-file`, `restart-computer`, `stop-service` or any `put-file`. A destructive verb without a recorded approval is refused and flagged — reset the session to retry, and the flag stays on the record.
- The unsigned/unknown binary is handled as an explicit approval decision (`lr-unapproved-binary`), not slipped through.
- Exposure management: **REC-2 and REC-4** only. Verification text is graded on content, so paste from your own run.

## Traps the lab records

1. Removing, killing or downloading before the first collection command — on a live sensor that is unrecoverable.
2. A destructive verb with no approver or change reference.
3. Isolating a shared or high-impact host because it shares the hash, with no scope statement.
4. Reading "no alert on the other devices" as "the other devices are clean".
5. Accepting a risk without an owner, an expiry, or a compensating control.
6. Writing closure text that the verification you performed does not support.

## Evidence and access

`Lab guide` → **Export evidence pack** (JSON, redacted by default: the command sequence, timeline notes, selections, audit trail). One `localStorage` key holds state; `Reset lab state` clears this lab only. Keyboard: roving focus in grids, tabs on the WAI-ARIA pattern, Escape closes drawers, every form message is announced. Forced colours, reduced motion and a print view with expanded panels are supported.

| Symptom | Cause |
| --- | --- |
| "Expected 3 rows — got N" | No SHA-1 filter, or events counted instead of devices. Group with `summarize by DeviceId`. |
| Command refused | Approval not recorded, or the verb is destructive and comes before collection. |
| Objective 6 will not close | Selection is not exactly REC-2 and REC-4, or the exception fields are incomplete. |

## Control alignment

**NIST SP 800-61r3** §3.3–§3.4 (containment, eradication, recovery). **ISO/IEC 27001:2022 A.8.16–A.8.17** (monitoring, clock reliability for timeline reasoning), **A.8.8** and **A.5.9** (asset and privileged-access management), **A.8.19** (installation in operational environments) for the exception. **MITRE ATT&CK** T1059, T1082, T1021, T1078, T1486. **CIS Controls v8.1** 8 (Audit Log Management), 10 (Malware Defences), 12 (Network Operations Management). Educational mapping only.

## References

`learn.microsoft.com/defender-endpoint/respond-machine-alerts` · `learn.microsoft.com/defender-endpoint/live-response` · `learn.microsoft.com/defender-endpoint/investigate-alerts` · `learn.microsoft.com/defender-endpoint/fix-or-mitigate-security-recommendations` · `learn.microsoft.com/defender-xdr/advanced-hunting-devicefileevents-table`
