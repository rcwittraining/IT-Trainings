# Persistent System Journals

**RHCSA Certification Practice · Task 27 of 62 · Running Systems**

## Purpose

Convert a volatile journal configuration into persistent storage and flush the current runtime journal safely.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Persistent journal directory state inspected |
| Enable persistent journal storage | 60 | Persistent journal directory created, Journal directory ownership and mode set, Journal service restarted and runtime data flushed |
| Validate the resulting state | 20 | Persistent journal storage validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
test -d /var/log/journal
```

```bash
mkdir -p /var/log/journal
```

```bash
chown root:systemd-journal /var/log/journal && chmod 2755 /var/log/journal
```

```bash
systemctl restart systemd-journald && journalctl --flush
```

```bash
test -d /var/log/journal && journalctl --disk-usage
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
