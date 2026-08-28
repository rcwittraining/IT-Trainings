# File Permission Troubleshooting

**RHCSA Certification Practice · Task 40 of 62 · File Systems**

## Purpose

The application service cannot read its configuration. Trace every path component, correct ownership and mode, and test access as the service identity.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Every path component inspected |
| Diagnose and repair the access path | 60 | File ACL and effective permissions inspected, Configuration ownership repaired recursively, Directory and file modes repaired |
| Validate the resulting state | 20 | Service-account access validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
namei -l /srv/app/config/settings.ini
```

```bash
getfacl /srv/app/config/settings.ini
```

```bash
chown -R appsvc:appteam /srv/app/config
```

```bash
chmod 0750 /srv/app /srv/app/config && chmod 0640 /srv/app/config/settings.ini
```

```bash
su -s /bin/bash appsvc -c 'test -r /srv/app/config/settings.ini'
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
