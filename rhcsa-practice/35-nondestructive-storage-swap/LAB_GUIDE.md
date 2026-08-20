# Non-destructive Storage and Swap

**RHCSA Certification Practice · Task 35 of 62 · Local Storage**

## Purpose

Add a 1 GiB swap logical volume to the running system without disturbing existing data and make it persistent.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Volume-group free space inspected |
| Add persistent swap non-destructively | 60 | Swap logical volume created, Logical volume formatted as swap, New swap activated online, Swap activation made persistent |
| Validate the resulting state | 20 | Active swap validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
vgs vgsystem -o vg_name,vg_free
```

```bash
lvcreate -L 1G -n lvswap vgsystem
```

```bash
mkswap /dev/vgsystem/lvswap
```

```bash
swapon /dev/vgsystem/lvswap
```

```bash
printf '/dev/vgsystem/lvswap none swap defaults 0 0\n' >> /etc/fstab
```

```bash
swapon --show | grep lvswap
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
