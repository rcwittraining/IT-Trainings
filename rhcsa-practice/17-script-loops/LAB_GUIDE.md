# Shell Script Loops

**RHCSA Certification Practice · Task 17 of 62 · Shell Scripting**

## Purpose

Create a script that loops over three service log directories and produces one compressed archive for each directory.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Loop input directories inspected |
| Build the looping archive script | 60 | Required script content saved, Loop script made executable, Loop script syntax validated |
| Validate the resulting state | 20 | Loop output validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
ls -d /var/log/api /var/log/billing /var/log/worker
```

Edit `/usr/local/bin/archive-service-logs` with content that satisfies the mission. One valid example is:

```bash
#!/bin/bash
for service in api billing worker; do
  tar -czf "/backup/${service}.tgz" "/var/log/${service}"
done
```

```bash
chmod 0755 /usr/local/bin/archive-service-logs
```

```bash
bash -n /usr/local/bin/archive-service-logs
```

```bash
/usr/local/bin/archive-service-logs && ls /backup/api.tgz /backup/billing.tgz /backup/worker.tgz
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
