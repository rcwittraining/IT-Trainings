# Create and Edit Text Files

**RHCSA Certification Practice · Task 07 of 62 · Essential Tools**

## Purpose

Replace an outdated login banner, correct its environment label, and prove that the exact approved line is present.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Existing banner inspected |
| Create and revise the approved banner | 60 | Banner file created with approved text, Environment label edited in place |
| Validate the resulting state | 20 | Final banner text validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
sed -n '1,20p' /etc/motd
```

```bash
printf 'Authorized development access only\n' > /etc/motd
```

```bash
sed -i 's/development/production/' /etc/motd
```

```bash
grep -Fx 'Authorized production access only' /etc/motd
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
