---
description: RHCSA practice task 10 — restrict a payroll export so only the owner can write and the auditors group can read: stat, chgrp, chmod 0640 and verification, explained.
---

# The scenario

A payroll export at `/srv/payroll/export.csv` was written by a script running as root and left with mode `666` — readable *and writable by every user on the system*. The requirement is the classic one from a security review: the owner may modify it, the `auditors` group may read it, and nobody else may touch it. In numbers, that is **0640**, group **auditors**.

This is the exact shape of a permissions item on the EX200: a file exists, its ownership or mode is wrong, and you must fix it and prove it. Speed comes from knowing the four commands cold; marks come from *verifying* rather than assuming.

# Read before you write: `stat -c '%U:%G %a %n'`

`ls -l` shows permissions as `-rw-rw-rw-`, which is fine for eyeballing but slow to compare. `stat` with a format string gives you the octal mode directly:

```
stat -c '%U:%G %a %n' /srv/payroll/export.csv
root:root 666 /srv/payroll/export.csv
```

- `%U:%G` — owner and group **names**.
- `%a` — mode in octal (`%A` gives the symbolic form if you prefer it).
- `%n` — the file name, useful when you stat several paths at once.

Doing this first is not ceremony. On the real exam it catches the two things that ruin a task: a file that is not where the question implies, and a mode that already has setuid/setgid bits you did not expect to preserve.

# Fix the group: `chgrp auditors /srv/payroll/export.csv`

`chgrp` changes only the group-owner. You could also write `chown :auditors file` or `chown root:auditors file`; all three are equivalent here. Use `chgrp` when you want to be explicit that the user-owner must not change — it removes a whole class of typo (`chown auditors file` would make *auditors* the user-owner, which fails because it is a group, but `chown auditor file` with a real user named `auditor` would silently succeed).

If the group does not exist yet, `chgrp` fails with `invalid group`. Create it with `groupadd auditors` and re-run. In this task the group already exists.

# Fix the mode: `chmod 0640 /srv/payroll/export.csv`

Octal modes read left to right as **special / user / group / other**:

- **0** — no setuid, setgid or sticky bit. Writing the leading zero is a habit worth keeping; on some systems `chmod 640` on a file that had setgid set would *keep* the setgid bit, whereas `chmod 0640` always clears it.
- **6** = `rw-` — owner can read and write.
- **4** = `r--` — group can read.
- **0** = `---` — others get nothing.

You could reach the same result symbolically with `chmod u=rw,g=r,o= file`. Symbolic mode is safer for *adjusting* (`g+r`), octal is faster for *setting* a known target — and exam tasks almost always give you a known target.

# Verify: `stat -c '%G %a'`

```
stat -c '%G %a' /srv/payroll/export.csv
auditors 640
```

That one line is your evidence. The lab marks the task complete only when the verification command runs *after* the fixes — the same discipline that keeps you from losing points on the exam because you "knew" a command had worked.

# Traps around this task

- **The directory matters too.** A member of `auditors` still cannot read the file if `/srv/payroll` lacks the execute (search) bit for them. Check with `stat -c '%a' /srv/payroll`; `750` with group `auditors` is a sensible pairing.
- **`umask` will not save you.** It only shapes *new* files. Existing files need `chmod`.
- **ACLs override what you see.** A `+` at the end of the `ls -l` mode string (`-rw-r-----+`) means an ACL is present; `getfacl` shows the real picture. This task has no ACL, but the RHCSA does test them — see the *Access Control Lists* practice task.
- **SELinux is a separate gate.** Correct mode and group are necessary but not sufficient if the file's SELinux context is wrong for the service reading it. `ls -Z` is your friend; it is covered in the SELinux tasks later in this series.

# Command summary

```
stat -c '%U:%G %a %n' /srv/payroll/export.csv   # observe
chgrp auditors /srv/payroll/export.csv           # group-owner
chmod 0640 /srv/payroll/export.csv               # owner rw, group r, other none
stat -c '%G %a' /srv/payroll/export.csv          # prove it
```
