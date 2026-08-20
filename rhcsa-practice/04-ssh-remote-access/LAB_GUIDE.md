# Secure Shell Remote Access

**RHCSA Certification Practice · Task 04 of 62 · Essential Tools**

## Purpose

Connect from the administration host to serverb using the assigned key and verify the remote identity without enabling password authentication.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Assigned public key fingerprint inspected |
| Establish key-based remote shell access | 60 | Remote command executed with the assigned key |
| Validate the resulting state | 20 | Remote identity validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
ssh-keygen -lf /home/admin/.ssh/id_ed25519.pub
```

```bash
ssh -i /home/admin/.ssh/id_ed25519 opsadmin@serverb.lab 'hostname'
```

```bash
ssh -i /home/admin/.ssh/id_ed25519 opsadmin@serverb.lab 'id -u'
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
