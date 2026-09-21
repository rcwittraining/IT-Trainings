---
description: Create a Linux user with useradd -m, set a password, grant sudo through the wheel group with usermod -aG and verify with id — plus the flags that quietly break accounts.
---

# What you are actually doing when you "create a user"

A Linux account is not one thing; it is at least four things that have to agree with each other:

- a line in `/etc/passwd` (name, UID, primary GID, home directory, login shell),
- a line in `/etc/shadow` (the hashed password and ageing rules),
- a primary group in `/etc/group`, usually with the same name as the user,
- a home directory, populated from `/etc/skel`, owned by the new UID.

`useradd` writes all four in one go — **if** you ask it to. This lab runs on `user-node-01` where the current `/etc/passwd` shows `root`, `student` (UID 1000) and `operator` (UID 1001). You will add a fourth account, `anna`, give her a password, put her in the `wheel` group so she can use `sudo`, and prove it worked.

# Step 1 — `useradd -m anna`

The `-m` flag creates the home directory. Leave it out and the account exists but `/home/anna` does not; the first login then fails with `Could not chdir to home directory` and a confusing shell in `/`. On RHEL-family systems `CREATE_HOME yes` in `/etc/login.defs` makes `-m` the default, but Debian and Ubuntu do **not** create the home unless you pass `-m` — which is why the habit is worth building.

Other flags you will use in real life:

- `-c "Anna Kumar"` — the comment / GECOS field, which is what shows up in `finger` and the GUI login screen.
- `-s /bin/bash` — the login shell. Debian defaults to `/bin/sh`; set this explicitly on servers where people actually log in.
- `-u 1502` — pin a UID when the account must match another machine (NFS home directories break silently if UIDs differ between hosts).
- `-G wheel` — supplementary groups at creation time, so step 3 becomes unnecessary.

# Step 2 — `passwd anna`

A freshly created account is **locked**: the shadow field contains `!` and nobody can log in with a password. `passwd anna` prompts twice, hashes the password (SHA-512 or yescrypt depending on the distribution) and writes it to `/etc/shadow`. Only root can set another user's password without knowing the old one.

Two things to know for exams and audits:

- `passwd -l anna` locks the account again without deleting it — the right move when someone leaves.
- `chage -l anna` shows the ageing policy. `chage -d 0 anna` forces a password change at next login, which is what you want after handing someone a temporary password.

# Step 3 — `usermod -aG wheel anna`

`wheel` is the group that `/etc/sudoers` on RHEL, Fedora and Rocky allows to run any command with `sudo` (on Debian/Ubuntu the equivalent group is `sudo`). Adding a user to it is a one-liner, but the flags matter more than anywhere else in this lab:

> **`-aG`, never `-G` alone.** `usermod -G wheel anna` *replaces* Anna's supplementary group list with just `wheel`. If she was also in `developers` and `docker`, she has just been removed from both — and nothing warns you. The `-a` (append) flag is what makes it additive.

I have watched this exact mistake take an engineer out of the `docker` group on a production host at 2 a.m. Type `-aG` until it is muscle memory.

# Step 4 — `id anna`

`id` prints the UID, primary GID and every supplementary group. You are looking for `groups=1002(anna),10(wheel)`. If `wheel` is missing, step 3 did not apply. If the user's *existing* shell session does not see the new group, that is normal — group membership is read at login, so Anna needs to log out and back in (or run `newgrp wheel`).

For a fuller check on a real system:

```
getent passwd anna        # confirms the passwd entry (works with LDAP/SSSD too)
getent group wheel        # confirms membership from the group side
ls -ld /home/anna         # home exists and is owned by anna:anna
sudo -l -U anna           # what sudo will actually let her run
```

# Cleaning up properly

When an account is retired, `userdel -r anna` removes the passwd/shadow/group entries **and** the home directory and mail spool. Plain `userdel` leaves `/home/anna` behind owned by an orphaned UID — which is exactly the situation the *User Lifecycle and Orphaned Home* challenge on this site makes you fix.

# How this maps to RHCSA

The EX200 objectives "Create, delete, and modify local user accounts", "Change passwords and adjust password aging" and "Create, delete, and modify local groups and group memberships" are all exercised here. In the exam you will not be told which flags to use, so the point of this lab is to make the correct flags automatic.
