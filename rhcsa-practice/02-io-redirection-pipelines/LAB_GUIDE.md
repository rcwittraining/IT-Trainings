# I/O Redirection and Pipelines

**RHCSA Certification Practice · Task 02 of 62 · Essential Tools**

## Purpose

Build a compact health report while keeping standard output and errors in separate evidence files for the night operations team.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Report created with output redirection |
| Build the redirected operations report | 60 | Journal errors appended without overwriting, Pipeline processed report output, Standard error redirected separately |
| Validate the resulting state | 20 | Redirection result validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
printf 'node=app01\n' > /var/tmp/health.report
```

```bash
journalctl -p err -b >> /var/tmp/health.report
```

```bash
grep -E 'node|error' /var/tmp/health.report | wc -l
```

```bash
grep token /root/private 2> /var/tmp/health.errors
```

```bash
test -s /var/tmp/health.report && test -e /var/tmp/health.errors
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
