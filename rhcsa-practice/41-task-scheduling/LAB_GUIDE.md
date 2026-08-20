# At, Cron and Systemd Timer Scheduling

**RHCSA Certification Practice · Task 41 of 62 · System Maintenance**

## Purpose

Schedule one maintenance command once, one recurring report through cron, and enable the supplied systemd cleanup timer.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | One-time task queue inspected |
| Configure all three scheduling mechanisms | 60 | One-time key rotation scheduled, Recurring cron report scheduled, Systemd cleanup timer enabled |
| Validate the resulting state | 20 | All scheduling mechanisms validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
atq
```

```bash
echo '/usr/local/sbin/rotate-key' | at 23:30
```

```bash
(crontab -l 2>/dev/null; echo '15 2 * * * /usr/local/sbin/daily-report') | crontab -
```

```bash
systemctl enable --now cache-clean.timer
```

```bash
atq && crontab -l && systemctl list-timers cache-clean.timer
```

## Verification

Use the final validation command shown above, then select **End attempt and view score**. A complete state earns 100 points and unlocks the RCW IT Training **Linux Challenge Champion** certificate.

## Certificate

The downloadable PDF certificate is issued by **RCW IT Training**, signed by **Pradeep Raju**, and identifies this original RHCSA practice task.

## Safe practice principles

- Work only in an isolated practice system or approved training environment.
- Inspect before changing state and validate after every persistent change.
- Prefer persistent configuration where the task requires survival across reboot.
- Back up configuration data before destructive storage, identity, firewall, or boot changes.
- Do not apply simulated addresses, credentials, repository URLs, or device names to production systems.
