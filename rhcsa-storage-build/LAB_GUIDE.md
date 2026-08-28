# Persistent Storage Build Challenge

**Provider:** RCW IT Training  
**Platform:** RHEL 10 practice system  
**Assessment:** 6 state-validated objectives, 100 points  
**Certificate:** Linux Challenge Champion, signed by Pradeep Raju

## Purpose

Build persistent storage from an unused disk instead of practicing isolated commands. The challenge models the complete path from a GPT partition through LVM, XFS, `/etc/fstab`, mounting and swap activation.

This is an **RHCSA-aligned preparation exercise**. It is not an official exam environment, a list of guaranteed exam tasks, or a promise of certification success. Always compare your preparation with the current official EX200 objectives.

## Scenario

`server1` has:

- `/dev/sda` — operating-system disk; do not modify it.
- `/dev/sdc` — unused 12 GiB practice disk.
- `/etc/fstab` — existing root and boot entries that must remain intact.

Required result:

1. Inspect block devices and filesystem signatures.
2. Create an 8 GiB GPT partition at `/dev/sdc1`.
3. Build `vg_exam` on the new physical volume.
4. Create and format a 4 GiB `lv_reports` logical volume with XFS.
5. Persist `/reports` using `UUID=RCW-REPORTS` and mount it.
6. Create, persist and activate a 1 GiB `lv_swap` logical volume.

## Step-by-step workflow

### 1. Inventory before changing anything — 10 points

```bash
lsblk -f
blkid
```

Confirm that `/dev/sdc` is the unused disk. In a real system, selecting the wrong disk can destroy data.

### 2. Create the GPT partition — 15 points

```bash
parted -s /dev/sdc mklabel gpt
parted -s /dev/sdc mkpart primary 1MiB 8193MiB
parted /dev/sdc print
```

The modeled result is `/dev/sdc1`, approximately 8 GiB.

### 3. Build the LVM foundation — 20 points

```bash
pvcreate /dev/sdc1
vgcreate vg_exam /dev/sdc1
pvs
vgs
```

### 4. Create the XFS reports volume — 20 points

```bash
lvcreate -n lv_reports -L 4G vg_exam
mkfs.xfs /dev/vg_exam/lv_reports
lvs
blkid
```

### 5. Persist and mount `/reports` — 20 points

```bash
mkdir -p /reports
vi /etc/fstab
```

Preserve the existing lines and add:

```text
UUID=RCW-REPORTS  /reports  xfs  defaults  0 0
```

Save the file, then apply and verify it:

```bash
mount -a
findmnt /reports
df -h
```

The challenge awards this objective only when the directory, valid UUID entry, XFS volume and active modeled mount all agree.

### 6. Add persistent swap — 15 points

```bash
lvcreate -n lv_swap -L 1G vg_exam
mkswap /dev/vg_exam/lv_swap
vi /etc/fstab
```

Add one persistent swap entry:

```text
/dev/vg_exam/lv_swap  swap  swap  defaults  0 0
```

Then activate and verify it:

```bash
swapon -a
swapon --show
```

## Final verification checklist

```bash
lsblk -f
pvs
vgs
lvs
findmnt /reports
swapon --show
cat /etc/fstab
```

A production verification should also include a controlled reboot and post-boot checks. The challenge proves modeled persistent state by requiring valid configuration plus successful application commands.

## Troubleshooting

- **`pvcreate` cannot find `/dev/sdc1`:** create the GPT label and partition first.
- **`vgcreate` reports an uninitialized device:** run `pvcreate /dev/sdc1`.
- **`mkfs.xfs` reports no logical volume:** verify the exact VG and LV names with `lvs`.
- **`mount -a` finds no valid entry:** check the UUID, mount point, filesystem type and six fstab fields.
- **`swapon -a` fails:** initialize the logical volume with `mkswap` and check the swap fstab entry.
- **Editing:** `vi /path` opens the lab editor. Use **i Insert**, edit the text, then **:wq Save & quit**.

## Safety notes for real systems

- Back up configuration files before editing.
- Confirm disk identity from multiple signals before partitioning.
- Never format a mounted or data-bearing volume.
- Run `mount -a` and `findmnt --verify` before rebooting after an fstab change.
- Keep a recovery path available when testing boot-persistent storage.

## Scoring and certificate

The live score reflects the currently validated modeled state; breaking a completed configuration can remove its points until it is repaired. Completing all objectives produces a final score of **100/100** and an RCW IT Training PDF certificate certifying **Linux Challenge Champion**, signed by **Pradeep Raju**.
