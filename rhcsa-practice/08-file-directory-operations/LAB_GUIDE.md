# File and Directory Operations

**RHCSA Certification Practice · Task 08 of 62 · Essential Tools**

## Purpose

Prepare a release workspace, preserve a configuration copy, promote the candidate artifact, and remove the obsolete staging item.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Release directory tree created |
| Build and clean the release workspace | 60 | Configuration copied with metadata, Candidate artifact promoted, Obsolete file removed |
| Validate the resulting state | 20 | Release tree validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
mkdir -p /srv/releases/2026-08/config
```

```bash
cp -a /etc/example.conf /srv/releases/2026-08/config/
```

```bash
mv /var/tmp/app.candidate /srv/releases/2026-08/app.bin
```

```bash
rm -f /srv/releases/2026-08/config/obsolete.conf
```

```bash
find /srv/releases/2026-08 -maxdepth 2 -type f -print
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
