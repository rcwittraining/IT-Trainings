# Lab 3 — Defender advanced hunting: cross-domain query to working detection

**Provider:** RCW IT Training
**Series:** Microsoft Defender security labs (Lab 3 of 5)
**Level:** Advanced practitioner / hunt and detection engineering
**Estimated time:** 80–100 minutes
**Delivery:** Offline, browser-local. A self-contained KQL subset engine runs your query against synthetic tables.
**Lab URL:** [Open the lab](./)

> Console replica for teaching, not Microsoft software; no affiliation, endorsement or logo. Every row of data is fabricated.

## Contents
1. Learning objectives · 2. Scenario · 3. The KQL subset · 4. Marking · 5. Procedure · 6. Expected results · 7. Traps · 8. Evidence and access · 9. Troubleshooting · 10. Control alignment · 11. References

## Learning objectives

- bound a hunt query in time and explain why the bound exists (cost, retention, reproducibility);
- pivot from an identity event to endpoint telemetry on a defensible key;
- materialise a JSON field before filtering on it, and know what that costs;
- build a baseline so an anomaly is a claim with something to compare against;
- turn a hunt into a custom detection with severity, category, tactic, frequency, lookback, alert limit and remediation that all agree;
- suppress a known false positive with scope, expiry and an owner instead of muting the detection;
- save the query with documentation a reviewer can pick up cold.

## Scenario

Simulated clock **2026-08-28T09:00Z**. A service account authenticates at an odd hour, child processes appear on the same device minutes later, and outbound connections to `203.0.113.64` follow on TCP/443 — with one jittered interval you must not average away. Tables available to the query pane: `DeviceProcessEvents`, `IdentityLogonEvents`, `DeviceLogonEvents`, `DeviceNetworkEvents`, `DeviceRegistryEvents`, `EmailEvents`. Role: hunt analyst (simulated).

## The KQL subset

`shared/kql-lite.js` is a deliberate subset, and **the engine that grades you is the engine the sample rows were produced with**:

- supported: `where` (`==`, `!=`, `=~`, `contains`, `has`, `in`, `startswith`, `matches regex`, `and`/`or`/`not`), `project`, `project-away`, `project-rename`, `extend`, `summarize` (with `by`, aliasing, `dcount()`), `count`, `distinct`, `order by`, `take`/`limit`, `join kind:=`, `union`, `render timepivot`, `parse_json()`, `bin()`, `ago()`/`datetime()`;
- not supported: `mv-expand`, `datatable`, `externaldata`, `serialize`, `let x = 'string'` as a table, window functions, `make-series`, wildcard `search`;
- known behaviours worth knowing before you debug: `count` names its column `Count`; `summarize … by` requires an alias; `matches regex` behaves substring-like.

## Marking

| # | Objective | Pts | Core check |
| --- | --- | --- | --- |
| 1 | Bounded counting on the right table | 10 | `DeviceProcessEvents` in a bounded window, aggregated to **1 row with Count 8**, plus why the window exists (retention named) |
| 2 | Cross-domain pivot from identity to endpoint | 20 | **3 rows** from the identity-side pivot, the means of pivoting chosen deliberately, and the key justified |
| 3 | Materialise a JSON field before filtering it | 15 | `extend` with `parse_json()` on `AdditionalFields` **before** the filter, **2 rows**, and the cost stated |
| 4 | Hourly baseline of the beacon | 15 | Binned hourly aggregation over `DeviceNetworkEvents` (**2 rows**), peak hour **08:00 UTC** read from your own result, `dcount()` vs `count()` explained |
| 5 | Custom detection design and safety settings | 20 | Bounded, aggregated detection query plus severity High, category Command and control, tactic TA0011, hourly run, last-hour lookback, 10-device alert limit, no automatic remediation on first run |
| 6 | Scoped, expiring alert suppression | 10 | Alert tuning (not the detection), scope = alert name + product + the two device groups, expiry, a named owning role, what must still alert, 80-character change record naming expiry and owner |
| 7 | Saved query, incident and handover note | 10 | Query name with folder, incident created from the result set, redacted export of the current results with query and run time, four hygiene items, 180-character note stating the window and what is *not* proven |

Total 100 points.

## Procedure

1. **Objective 1 (10).** Query view → start from `DeviceProcessEvents`, filter the parent process inside a bounded window and `summarize` the count. Answer the follow-up with the row count you actually got.
2. **Objective 2 (20).** Pivot the identity logon to endpoint activity. Say which join key you used and why the other candidate is unreliable, and what the co-occurrence proves.
3. **Objective 3 (15).** `AdditionalFields` is JSON *text*. `extend` the parsed field, then filter on it. A raw `where AdditionalFields has '…'` text-matches and fails grading — that difference is the lesson.
4. **Objective 4 (15).** Baseline the beacon hourly with `summarize … by bin(Timestamp, 1h)` (or `render timepivot`). Keep the jittered hour: if averaging erases it, you have deleted the anomaly.
5. **Objective 5 (20).** Detection view → write the detection query (bounded **and** aggregated — a detection alerts per returned row), then fill the rule form so severity, category, tactic, frequency, lookback, limit and remediation agree with each other.
6. **Objective 6 (10).** Suppression view → create an alert-tuning entry with a determination, a reason, a scope narrower than the queue, an expiry and an owning role; state what must still alert.
7. **Objective 7 (10).** Save the query with a folder-qualified name, raise the incident from the results, set the export scope, tick the handover items, and write the note.

## Expected results

- Q1 returns exactly **1 row, `Count` = 8** inside the window; the same query unbounded returns more, which is why the window is graded.
- Q2 → **3 rows**; using the account key alone changes the count and is recorded.
- Q3 → **2 rows**, only when `extend`/`parse_json()` precedes the `where`.
- Q4 → **2 binned rows**; peak hour **08:00 UTC**; answering from expectation instead of the grid fails objective 4 by design.
- Detection → `High`, `Command and control`, `TA0011`, hourly, last hour, 10 devices by highest count, no auto-remediation, and a query that already contains `summarize`.
- Suppression → alert tuning, scoped to two device groups, expiring, owner named, `tuneKeep` = the same name with different command line/path/parent still alerts.

## Traps the lab records

1. Hunting across all time and calling the total "the scope".
2. Pivoting on a key that is not populated on both sides and getting a plausible, wrong row count.
3. Text-matching a JSON field — it survives until the field changes shape, then fails silently.
4. A rule whose severity, category and tactic disagree with what the query inspects, or a lookback that overlaps the schedule.
5. Muting the detection instead of tuning the alert, or a suppression with no expiry and no owner.
6. An export of 30 days of unredacted results attached to a ticket, instead of the current redacted result set with the query and run time.

## Evidence and access

`Lab guide` → **Export evidence pack** (JSON, redacted by default) contains every query you ran and the rows each returned — you can re-run them against the same engine to reproduce the counts. One `localStorage` key per lab; no cookies, no analytics, no external requests. Keyboard-first grids with roving focus, labelled live regions, skip link, 3:1 focus outline, forced colours, reduced motion, print view with tabs expanded.

| Symptom | Cause |
| --- | --- |
| "No rows returned" | The window excludes the events, or the field does not exist on that table. Check the schema card. |
| Right rows, failed objective | The check compares aggregations (`Count` value, `dcount`), not only the row count. |
| Detection query refused | It is unbounded, or it emits one row per event instead of one per actor. |

## Control alignment

**NIST SP 800-61r3** §3.2 (detection and analysis, continuous monitoring). **ISO/IEC 27001:2022 A.8.15–A.8.16** (logging, monitoring activities) and **A.5.24–A.5.28** (incident management) for the handover. **MITRE ATT&CK** T1059.001/.003, T1047, T1071.001, T1078.004, T1486. **CIS Controls v8.1** IG1 functions 8, 13, 16, 17. Educational alignment only; this is not a certification exam and not Microsoft training.

## References

`learn.microsoft.com/defender-xdr/advanced-hunting-cross-domain-queries` · `.../advanced-hunting-schema-tables` · `.../advanced-hunting-alerts` · `.../advanced-hunting-best-practices` · `learn.microsoft.com/defender-endpoint/investigate-alerts` · `learn.microsoft.com/defender-endpoint-false-positives-negatives` · `learn.microsoft.com/defender-xdr/configure-analytics-rules`
