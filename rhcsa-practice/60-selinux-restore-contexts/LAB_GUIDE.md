# Restore Default SELinux Contexts

**RHCSA Certification Practice · Task 60 of 62 · Security**

## Purpose

Repair web content copied with the wrong label by restoring the policy-defined default context recursively.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Incorrect file contexts identified |
| Restore policy-defined file contexts | 60 | Persistent context mapping added, Default contexts restored recursively |
| Validate the resulting state | 20 | Restored context validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
ls -lZ /srv/web
```

```bash
semanage fcontext -a -t httpd_sys_content_t '/srv/web(/.*)?'
```

```bash
restorecon -Rv /srv/web
```

```bash
matchpathcon -V /srv/web/index.html
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
