# Shell Script Positional Inputs

**RHCSA Certification Practice · Task 18 of 62 · Shell Scripting**

## Purpose

Create a report helper that requires a username and output path as its first two arguments, then writes identity details to that destination.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Input account confirmed |
| Process positional script inputs | 60 | Required script content saved, Input-processing script made executable, Input-processing script syntax validated |
| Validate the resulting state | 20 | Argument-driven output validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
getent passwd appsvc
```

Edit `/usr/local/bin/user-report` with content that satisfies the mission. One valid example is:

```bash
#!/bin/bash
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Usage: $0 USER OUTPUT" >&2
  exit 2
fi
id "$1" > "$2"
```

```bash
chmod 0755 /usr/local/bin/user-report
```

```bash
bash -n /usr/local/bin/user-report
```

```bash
/usr/local/bin/user-report appsvc /var/tmp/appsvc.id && test -s /var/tmp/appsvc.id
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
