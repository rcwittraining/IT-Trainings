# Grep and Regular Expressions

**RHCSA Certification Practice · Task 03 of 62 · Essential Tools**

## Purpose

An order service log mixes routine probes with dated warnings and errors. Extract only actionable, correctly formatted events for review.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Extended regular expression tested |
| Filter actionable events with regular expressions | 60 | Routine events excluded into a report |
| Validate the resulting state | 20 | Filtered report validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
grep -En '^(ERROR|WARN)[[:space:]]+[0-9]{4}-[0-9]{2}-[0-9]{2}' /var/log/orders.log
```

```bash
grep -Ev 'healthcheck|127\.0\.0\.1' /var/log/orders.log > /var/tmp/orders-actionable.log
```

```bash
grep -Eq '^(ERROR|WARN)' /var/tmp/orders-actionable.log
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
