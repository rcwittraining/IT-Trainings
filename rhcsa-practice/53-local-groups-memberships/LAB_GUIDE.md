# Local Groups and Memberships

**RHCSA Certification Practice · Task 53 of 62 · Users and Groups**

## Purpose

Create the platform group, append the analyst without losing current memberships, remove a stale member, and retire an empty legacy group.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Relevant group state inspected |
| Manage groups and supplementary membership | 60 | Platform group created, Analyst appended to platform group, Stale group membership removed, Empty legacy group deleted |
| Validate the resulting state | 20 | Final group membership state validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
getent group platform oldproject
```

```bash
groupadd -g 3300 platform
```

```bash
usermod -aG platform analyst1
```

```bash
gpasswd -d former oldproject
```

```bash
groupdel oldproject
```

```bash
id analyst1 | grep platform && ! getent group oldproject
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
