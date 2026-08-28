# GPT Partition Management

**RHCSA Certification Practice · Task 30 of 62 · Local Storage**

## Purpose

Initialise the empty data disk with GPT and create a correctly aligned 2 GiB partition for application data.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Target disk inspected |
| Create the GPT partition layout | 60 | GPT disk label created, Aligned data partition created, Kernel partition table refreshed |
| Validate the resulting state | 20 | GPT partition layout validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
lsblk -f /dev/vdb
```

```bash
parted /dev/vdb --script mklabel gpt
```

```bash
parted /dev/vdb --script mkpart primary 1MiB 2049MiB
```

```bash
partprobe /dev/vdb
```

```bash
lsblk -o NAME,SIZE,TYPE /dev/vdb
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
