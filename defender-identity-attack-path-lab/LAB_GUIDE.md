# Lab 4 — Identity attack paths: on-premises AD, tokens and containment order

**Provider:** RCW IT Training
**Series:** Microsoft Defender security labs (Lab 4 of 5)
**Level:** Advanced practitioner / identity and hybrid
**Estimated time:** 75–95 minutes
**Delivery:** Offline, browser-local console replica. No directory, no tenant, no network calls.
**Lab URL:** [Open the lab](./)

> Console replica for teaching. Not Microsoft software, no affiliation or endorsement, no Microsoft logo. Identities, hosts and events are fabricated; the domain is a reserved example domain.

## Contents
1. Learning objectives · 2. Scenario · 3. Simulated boundary · 4. Marking · 5. Procedure · 6. Expected results · 7. Traps · 8. Evidence and access · 9. Troubleshooting · 10. Control alignment · 11. References

## Learning objectives

- separate real identity risk from log noise, including clock skew and false-positive handling;
- read an attack-path graph as a statement of *possibility*, and name the edge worth cutting;
- prove or disprove a directory replication enquiry (`GetChangesAll` / `GetChangesInSchema`) in KQL;
- contain a risky user in the order that actually removes access, cloud and on-premises;
- protect coverage: approvals for exclusions and the discipline that makes a honeytoken a control;
- harden the path with prioritised mitigations and a **governed** exception;
- write the report a board can read: what is confirmed, what is indicated, and which clock is running.

## Scenario

Simulated clock **2026-09-02T06:00Z**, the tail of the night shift. Five alerts are in the identity queue: **ALT-4401** Kerberoasting from `svc_backup` (214 service tickets in six minutes across three SPNs, T1558.003), **ALT-4402** directory enumeration from `DC-01$` including the *Protected Users* membership (T1087.002), **ALT-4403** a DSync enquiry — `GetChangesAll` on the domain naming context by **`it.admin.k`** from a server (T1003.006), **ALT-4404** the honeytoken `svc_honey01` taking an NTLM authentication attempt from `203.0.113.97` (T1187), and **ALT-4405** a scheduled backup-agent enumeration that matches a change record. Four belong to one story; the fifth must be *handled*, not buried.

`DC-03` has a **four-minute clock skew**, which poisons every Kerberos-tolerance argument in the timeline. The attack-path graph puts **EDGE-3 — `it.admin.k` → `APP-SRV-01` via unconstrained delegation on an unsupported application**, already used in the alert chain — on the route to the domain; **EDGE-5** is the crown jewel but cannot be cut before the batch job behind it is fixed. Mitigations on the path are largely undeployed (LAPS included). Role: identity analyst (simulated).

## Simulated boundary

Real behaviour modelled: the identity alert queue with product/status columns; the attack-path surface with exposure level, mitigations and limits; the directory hunt against on-premises telemetry (`IdentityDirectoryEvents`); the user page with risk state, sessions, refresh tokens, sign-in block on both sides and method re-registration; sensor health on domain controllers; exclusions and honeytoken accounts; hardening recommendations with accepted risk; the incident page where confirmed and indicated are separated.
Simplified: nothing is disabled for real, "sessions revoked" and "sign-in blocked" return simulated results, and directory events are static rows rather than a live DC capture. Plan and licensing limits (e.g. on-premises data retention) are stated in the view rather than enforced.

## Marking

| # | Objective | Pts | Core check |
| --- | --- | --- | --- |
| 1 | Identity alert triage and correlation | 10 | Four related alerts, the fifth handled as false positive with determination and a narrow suppression; skew handled by fixing NTP and stating the reliability caveat; 90-character correlation argument that names the honeytoken hit |
| 2 | Attack-path reading and the edge to cut | 15 | Exactly **EDGE-3**, the end state and the business reason it cannot be walked today, and the blind spots of graph models (SID history, non-joined and ADFS-only identities) |
| 3 | Prove the replication enquiry in KQL | 10 | Bounded `IdentityDirectoryEvents` query returning **2 rows**, first account with **2** requests, verify the expected source host before disabling anything, aggregation choice justified |
| 4 | Risky-user containment in the correct order | 20 | Nine-step sequence with the two traps refused, both sides blocked, MFA re-registration justified, four account-hygiene items, 160-character note naming refresh tokens and the on-premises action |
| 5 | Exclusions and detection coverage integrity | 10 | One narrow exclusion approved with a review date, honeytoken constructed as a control (never signed in, no mailbox, documented, routed to a human), DC sensor health and exclusions documented |
| 6 | Hardening the path with a governed exception | 20 | Four mitigations selected (**MIT-1, MIT-2, MIT-3, MIT-7**), NTLM audit-then-enforce on tier-0, `krbtgt` reset **twelve hours apart, twice**, gMSA vs dMSA, one accepted exception with owner, expiry and a monitoring compensating control |
| 7 | Regulatory, executive and evidence record | 15 | NIS2 essential-entity clocks, GDPR Article 33 triggered on risk, the right people told with the confirmed/indicated split preserved, 200-character executive summary |

Total 100 points.

## Procedure

1. **Intake (10).** Alert queue → select the four related alerts, decide the fifth, handle the skew honestly (fix NTP on `DC-03`, then caveat the timeline), and write the correlation argument. The honeytoken hit is the anchor; name it.
2. **Path (15).** Attack paths → select the one edge worth cutting now, state why the graph cannot answer "was it walked", and describe what the graph cannot see.
3. **Hunt (10).** Directory hunt → bound `IdentityDirectoryEvents`, filter the replication action, `summarize … by AccountName`. Then answer what you do before disabling: confirm the expected source host (`ADCONNECT-02`).
4. **Contain (20).** User page → run the operations in order: confirm compromise → *then* dismiss risk → revoke sessions → revoke refresh tokens → disable the account → block on-premises sign-in → reset password both sides → require method re-registration. Hard delete is never step one. Fill the four hygiene checks and the note.
5. **Coverage (10).** Exclusions and honeytokens → approve only the narrow request with a review date, set the honeytoken up properly, and record sensor health on every DC after the change.
6. **Harden (20).** Recommendations → select MIT-1, MIT-2, MIT-3, MIT-7; answer the three design questions (NTLM, `krbtgt`, gMSA/dMSA); then write the exception for `APP-SRV-01` with an owner, an expiry and how it is monitored while open.
7. **Report (15).** Report view → clocks, notification duty, who is told what, and a summary that keeps "indicated" visible as indicated.

## Expected results

- Objective 1: alerts `ALT-4401`–`ALT-4404` only; false positive *with* determination and a scoped suppression; skew answered by fixing NTP plus a caveat.
- Objective 3: exactly **2 rows**, the top account with **2** requests; the migration host's benign `GetChangesAll` pattern is separated from the anomalous source.
- Objective 4: order matters — revocation before disable, disable before password reset, re-registration last; `Delete the user` and `Dismiss risk` before containment are recorded as violations and must be reset.
- Objective 6: `krbtgt` reset twice, 12 hours apart, with tier-0 sessions ended; mitigations **MIT-1, MIT-2, MIT-3, MIT-7** with tier-0 sessions ended; NTLM audit-then-enforce starting at tier-0; the exception is accepted with monitoring, not "we'll fix it all tonight".
- Objective 7: NIS2 (24 h / 72 h / one month), Article 33 on risk, and a summary that contains "honeytoken" and "not confirmed".

## Traps the lab records

1. Closing all five alerts to clear the queue, or suppressing the category instead of the alert.
2. Trusting timestamps on a host with a four-minute skew instead of fixing the clock source.
3. Disabling the migration account because the row count looked identical to the anomalous one.
4. Resetting the password and calling the account contained — sessions and refresh tokens live on.
5. A single `krbtgt` reset, which leaves tickets usable for the default lifetime.
6. "No exceptions, we fix everything" as an answer that hides the one host that cannot be fixed this sprint.
7. Dropping the unverified claim from the report to make it read cleanly.

## Evidence and access

`Lab guide` → **Export evidence pack** (JSON, redacted by default) carries the sequence, the graph selection, the query text and results, the exception wording and the audit trail. State lives in a single `localStorage` key; `Reset lab state` clears this lab only. Grids use roving focus; sequences are real buttons in a labelled group with an announced state; forced colours, reduced motion and a print view are supported.

| Symptom | Cause |
| --- | --- |
| Sequence marked out of order | A step precedes its prerequisite; reset the sequence and re-run it (the violation stays recorded, as in a real action centre). |
| Hunt objective fails with 2 rows | You filtered on `ActionType ==` but did not aggregate by account, or your window pulled the benign row in. |
| Report refuses | The summary lacks the anchor words, or the exception fields are incomplete in objective 6. |

## Control alignment

**NIST SP 800-61r3** §3.2–§3.4. **ISO/IEC 27001:2022 A.5.15–A.5.18** (access control, privileged access), **A.8.15–A.8.16** (logging, monitoring), **A.5.24–A.5.28** (incident management). **MITRE ATT&CK** T1003.006, T1558.003, T1550.003, T1078.002, T1562.001, T1090.002, T1484.001, T1207. **CIS Controls v8.1** 5, 6, 14, 16. Regulatory: **NIS2 Art. 23(4)** and **GDPR Art. 33/34** — this tenant is an essential entity, not a financial entity under DORA. Educational mapping only; not a compliance opinion.

## References

`learn.microsoft.com/defender-identity/` (attack path analysis, sensor health) · `learn.microsoft.com/defender-xdr/advanced-hunting-identitydirectoryevents-table` · `learn.microsoft.com/defender-xdr/advanced-hunting-cross-domain-queries` · `learn.microsoft.com/defender-identity/defender-identity-attack-path` · NIST SP 800-61r3 · ISO/IEC 27001:2022 Annex A · MITRE ATT&CK Enterprise
