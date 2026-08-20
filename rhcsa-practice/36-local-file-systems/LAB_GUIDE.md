# VFAT, ext4 and XFS File Systems

**RHCSA Certification Practice · Task 36 of 62 · File Systems**

## Purpose

Prepare three training volumes with the required VFAT, ext4, and XFS formats, mount them, and verify each type.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Target devices inspected |
| Create and mount three local file-system types | 60 | VFAT file system created, ext4 file system created, XFS file system created, All three file systems mounted |
| Validate the resulting state | 20 | Mounted file-system types validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
lsblk -f /dev/vdb /dev/vdc /dev/vdd
```

```bash
mkfs.vfat -n TRANSFER /dev/vdb1
```

```bash
mkfs.ext4 -L ARCHIVE /dev/vdc1
```

```bash
mkfs.xfs -L APPDATA /dev/vdd1
```

```bash
mkdir -p /mnt/transfer /mnt/archive /mnt/appdata && mount /dev/vdb1 /mnt/transfer && mount /dev/vdc1 /mnt/archive && mount /dev/vdd1 /mnt/appdata
```

```bash
findmnt -no FSTYPE /mnt/transfer /mnt/archive /mnt/appdata
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
