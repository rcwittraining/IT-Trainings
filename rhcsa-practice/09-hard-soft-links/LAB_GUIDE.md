# Hard and Symbolic Links

**RHCSA Certification Practice · Task 09 of 62 · Essential Tools**

## Purpose

Provide a same-filesystem recovery name for a policy file and a stable symbolic path for the current application release.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Source inode inspected |
| Create hard and symbolic links | 60 | Hard recovery link created, Stable symbolic release link created |
| Validate the resulting state | 20 | Both link types validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
stat -c '%i %n' /srv/policy/current.conf
```

```bash
ln /srv/policy/current.conf /srv/policy/current.conf.recovery
```

```bash
ln -s /srv/releases/app-4.2 /opt/app-current
```

```bash
test /srv/policy/current.conf -ef /srv/policy/current.conf.recovery && test -L /opt/app-current
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
