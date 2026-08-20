# SELinux Port Labels

**RHCSA Certification Practice · Task 61 of 62 · Security**

## Purpose

Allow the web service domain to bind the approved nonstandard TLS port by adding a persistent SELinux port mapping.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Existing HTTP port labels inspected |
| Configure the nonstandard SELinux port label | 60 | Nonstandard HTTP port label added |
| Validate the resulting state | 20 | SELinux port mapping validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
semanage port -l | grep '^http_port_t'
```

```bash
semanage port -a -t http_port_t -p tcp 9443
```

```bash
semanage port -l | grep '^http_port_t' | grep 9443
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
