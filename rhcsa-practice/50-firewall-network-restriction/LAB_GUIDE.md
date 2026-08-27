# Restrict Network Access

**RHCSA Certification Practice · Task 50 of 62 · Networking**

## Purpose

Limit SSH exposure to the internal operations subnet while leaving the public zone without SSH access.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Active firewall zones inspected |
| Restrict SSH to the approved source zone | 60 | Approved operations subnet assigned, SSH allowed in internal zone, SSH removed from public zone |
| Validate the resulting state | 20 | Runtime firewall restriction validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
firewall-cmd --get-active-zones
```

```bash
firewall-cmd --permanent --zone=internal --add-source=10.24.0.0/16
```

```bash
firewall-cmd --permanent --zone=internal --add-service=ssh
```

```bash
firewall-cmd --permanent --zone=public --remove-service=ssh
```

```bash
firewall-cmd --reload && firewall-cmd --zone=internal --list-all
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
