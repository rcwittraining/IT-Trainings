# Command Output in Shell Scripts

**RHCSA Certification Practice · Task 19 of 62 · Shell Scripting**

## Purpose

Create a snapshot helper that captures the current host, timestamp, and uptime using command substitution in a structured report.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Source command output inspected |
| Process command output inside a script | 60 | Required script content saved, Snapshot script made executable, Snapshot script syntax validated |
| Validate the resulting state | 20 | Captured command output validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
hostname -f
```

Edit `/usr/local/bin/host-snapshot` with content that satisfies the mission. One valid example is:

```bash
#!/bin/bash
output=/var/tmp/host.snapshot
printf 'host=%s\ntime=%s\nuptime=%s\n' "$(hostname -f)" "$(date -Is)" "$(uptime -p)" > "$output"
```

```bash
chmod 0755 /usr/local/bin/host-snapshot
```

```bash
bash -n /usr/local/bin/host-snapshot
```

```bash
/usr/local/bin/host-snapshot && grep -E '^(host|time|uptime)=' /var/tmp/host.snapshot
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
