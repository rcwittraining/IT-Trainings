# Archive and Compression Operations

**RHCSA Certification Practice · Task 06 of 62 · Essential Tools**

## Purpose

Package application configuration with gzip, inspect a bzip2 reference archive, and restore it into an isolated validation directory.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Archive source size inspected |
| Create, inspect and restore compressed archives | 60 | gzip-compressed archive created, bzip2 archive contents inspected, bzip2 archive restored in isolation |
| Validate the resulting state | 20 | Created archive validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
du -sh /srv/app
```

```bash
tar -czf /backup/app-etc.tar.gz -C /srv/app etc
```

```bash
tar -tjf /backup/reference.tar.bz2
```

```bash
mkdir -p /restore/reference && tar -xjf /backup/reference.tar.bz2 -C /restore/reference
```

```bash
tar -tzf /backup/app-etc.tar.gz | grep -q '^etc/'
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
