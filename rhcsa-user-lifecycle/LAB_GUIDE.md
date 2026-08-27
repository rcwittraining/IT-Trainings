# User Lifecycle and Orphaned Home Challenge

- **Provider:** RCW IT Training
- **Platform:** RHEL 10 practice system
- **Assessment:** 7 state-validated objectives, 100 points
- **Certificate:** Linux Challenge Champion, signed by Pradeep Raju

## Purpose

Practise the complete user-account handover lifecycle: inspect an existing identity, remove that account without deleting its data, create a replacement, change its attributes with `usermod`, and repair orphaned ownership.

This is an **RHCSA-aligned preparation exercise**. It is **not an official exam environment**, a list of guaranteed exam tasks, or a promise of certification success. Compare this practice with the current official EX200 objectives.

## Scenario

The departing `legacyops` user owns `/home/legacyops`, including handover records and application settings that must not be erased. Replace that identity with:

- User: `opsadmin`
- UID: `1701`
- Primary group: `opsadmin`
- Login shell: `/bin/bash`
- Assigned home: `/home/legacyops`
- Supplementary groups: `wheel` and `developers`

The replacement must not leave an unused `/home/opsadmin` directory. All files beneath the preserved home must belong to `opsadmin:opsadmin` when the work is complete.

## Step-by-step workflow

### 1. Inspect before changing anything — 10 points

Review both the account database and home ownership:

```bash
getent passwd legacyops
id legacyops
ls -ld /home/legacyops
ls -l /home/legacyops
```

This establishes the UID, primary group, supplementary membership, home path, shell and current ownership.

### 2. Delete the old user while preserving the home — 15 points

```bash
userdel legacyops
```

Do **not** use `userdel -r`: `-r` removes the home directory and its contents. The assessment requires every supplied handover artifact to survive.

After deletion, inspect the orphaned ownership:

```bash
ls -ld /home/legacyops
find /home -nouser -o -nogroup
```

The numeric UID and GID remain on disk even though their account and group names no longer resolve.

### 3. Create the replacement account — 15 points

Create `opsadmin` with the required UID and shell, but do not create its default home:

```bash
useradd -M -u 1701 -s /bin/bash opsadmin
```

`-M` is important because the preserved working directory already exists elsewhere. Verify the new identity:

```bash
getent passwd opsadmin
id opsadmin
```

### 4. Redirect the user to the preserved home — 15 points

Change the home-directory attribute without moving data over the existing directory:

```bash
usermod -d /home/legacyops opsadmin
```

Do not add `-m` in this handover. The target already contains retained data; the task is to point the account at it, not move a newly created home onto it.

### 5. Repair all ownership — 20 points

Assign the directory and every retained child to the replacement user and primary group:

```bash
chown -R opsadmin:opsadmin /home/legacyops
```

A non-recursive `chown` changes only the top directory and leaves child files orphaned, so recursive repair is required.

### 6. Modify supplementary groups safely — 15 points

Append both required groups:

```bash
usermod -aG wheel,developers opsadmin
```

`-aG` appends supplementary memberships. Using `-G` without `-a` replaces the current supplementary-group list and can unintentionally remove access.

### 7. Verify the final state — 10 points

```bash
getent passwd opsadmin
id opsadmin
ls -ld /home/legacyops
ls -l /home/legacyops
find /home -nouser -o -nogroup
```

The final orphan scan should report no entries. The passwd record must show `/home/legacyops` and `/bin/bash`; `id` must show UID `1701`, primary group `opsadmin`, plus `wheel` and `developers`.

## Final verification checklist

- `legacyops` no longer exists.
- `/home/legacyops` and all supplied content remain.
- `opsadmin` was created with UID `1701` and shell `/bin/bash`.
- `/home/opsadmin` was not created.
- `opsadmin` uses `/home/legacyops` as its home.
- Every retained item is owned by `opsadmin:opsadmin`.
- `wheel` and `developers` are supplementary groups for `opsadmin`.
- The final orphan scan is empty.

## Troubleshooting

- **The preserve objective cannot complete:** if `userdel -r legacyops` was used, the required data is gone. Reset the practice session and repeat without `-r`.
- **The create objective remains incomplete:** confirm UID `1701`, `/bin/bash`, and the absence of `/home/opsadmin`. If necessary, remove an incorrect new account with `userdel -r opsadmin` and create it again.
- **The redirect objective remains incomplete:** use `usermod -d /home/legacyops opsadmin` without `-m`.
- **The ownership objective remains incomplete:** use `chown -R`; changing only the directory is insufficient.
- **The group objective remains incomplete:** append both groups in a successful `usermod -aG` operation.
- **The verification objective remains incomplete:** rerun `getent passwd opsadmin`, `id opsadmin`, and the orphan scan after repairs.

## Security and operations principles

- Separate identity retirement from data-retention decisions.
- Inventory and classify retained data before deleting an account.
- Avoid broad or destructive deletion options when business data must survive.
- Reassign both user and group ownership recursively.
- Use least privilege for supplementary groups and review them periodically.
- Verify that no unresolved UID or GID remains in the managed home tree.

## Scoring and certificate

The live score reflects the currently validated modeled state; breaking a completed configuration can remove its points until it is repaired. Completing all objectives produces a final score of **100/100** and an RCW IT Training PDF certificate certifying **Linux Challenge Champion**, signed by **Pradeep Raju**.
