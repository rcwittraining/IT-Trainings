# Autofs Configuration

**RHCSA Certification Practice · Task 38 of 62 · File Systems**

## Purpose

Configure an indirect automount so project exports appear beneath /projects only when accessed.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Autofs package state inspected |
| Configure and activate the autofs map | 60 | Indirect master map created, Project map created, Autofs enabled and started |
| Validate the resulting state | 20 | On-demand project mount validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
rpm -q autofs
```

```bash
printf '/projects /etc/auto.projects\n' > /etc/auto.master.d/projects.autofs
```

```bash
printf 'alpha -rw,sync files.lab.example:/exports/alpha\n' > /etc/auto.projects
```

```bash
systemctl enable --now autofs
```

```bash
ls /projects/alpha && mount | grep '/projects/alpha'
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
