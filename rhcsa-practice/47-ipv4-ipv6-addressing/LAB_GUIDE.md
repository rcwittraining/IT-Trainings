# IPv4 and IPv6 Addressing

**RHCSA Certification Practice · Task 47 of 62 · Networking**

## Purpose

Configure the operations connection with the assigned static IPv4 and IPv6 addresses, gateways, and automatic activation.

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives](https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
| Assess the starting state | 20 | Network devices inspected |
| Configure persistent dual-stack addressing | 60 | Static IPv4 configuration applied, Static IPv6 configuration applied, Connection set to autostart and activated |
| Validate the resulting state | 20 | Persistent dual-stack configuration validated |

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

```bash
nmcli device status
```

```bash
nmcli connection modify Operations ipv4.method manual ipv4.addresses 10.24.8.40/24 ipv4.gateway 10.24.8.1
```

```bash
nmcli connection modify Operations ipv6.method manual ipv6.addresses 2001:db8:24:8::40/64 ipv6.gateway 2001:db8:24:8::1
```

```bash
nmcli connection modify Operations connection.autoconnect yes && nmcli connection up Operations
```

```bash
nmcli -f ipv4.addresses,ipv6.addresses,connection.autoconnect connection show Operations
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
