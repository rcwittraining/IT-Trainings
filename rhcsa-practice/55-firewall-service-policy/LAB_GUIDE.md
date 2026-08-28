# Firewalld Service and Rich Rules

**RHCSA Certification Practice · Task 55 of 62 · Security**

## Purpose

Publish the application TLS port and restrict its administrative endpoint with a persistent rich rule.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Current public-zone policy inspected |
| Configure persistent application firewall policy | 60 | Application TLS port allowed persistently, Source-restricted administration rule added, Persistent policy loaded into runtime |
| Validate the resulting state | 20 | Runtime firewall policy validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
firewall-cmd --zone=public --list-all
```

```bash
firewall-cmd --permanent --zone=public --add-port=8443/tcp
```

```bash
firewall-cmd --permanent --zone=public --add-rich-rule='rule family=ipv4 source address=10.24.8.0/24 port port=9443 protocol=tcp accept'
```

```bash
firewall-cmd --reload
```

```bash
firewall-cmd --zone=public --query-port=8443/tcp && firewall-cmd --zone=public --list-rich-rules
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
