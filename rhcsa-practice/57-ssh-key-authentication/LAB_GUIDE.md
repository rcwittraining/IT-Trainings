# SSH Key-based Authentication

**RHCSA Certification Practice · Task 57 of 62 · Security**

## Purpose

Create a modern key pair for the administrator, install it on serverb, and prove that password authentication is unnecessary.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Existing key state inspected |
| Establish verified key-only SSH access | 60 | ED25519 key pair created, Public key installed on remote account |
| Validate the resulting state | 20 | Passwordless key authentication validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
test -e /home/admin/.ssh/id_ed25519
```

```bash
ssh-keygen -t ed25519 -N '' -f /home/admin/.ssh/id_ed25519
```

```bash
ssh-copy-id -i /home/admin/.ssh/id_ed25519.pub admin@serverb.lab
```

```bash
ssh -o PasswordAuthentication=no admin@serverb.lab 'id -un'
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
