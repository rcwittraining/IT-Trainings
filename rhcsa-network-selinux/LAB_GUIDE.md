# Network, SELinux and Privilege Challenge

**Provider:** RCW IT Training  
**Platform:** RHEL 10 practice system  
**Assessment:** 7 state-validated objectives, 100 points  
**Certificate:** Linux Challenge Champion, signed by Pradeep Raju

## Purpose

Prepare a service host without disabling security controls. The challenge separates persistent IP configuration, packet-filter policy, SELinux port authorization, file contexts, service booleans and privileged access.

This is an **RHCSA-aligned preparation exercise**. It is not an official exam environment, a list of guaranteed exam tasks, or a promise of certification success. Compare this practice with the current official EX200 objectives.

## Scenario

An internal web workload will use:

- Hostname: `server1.example.com`
- Interface/connection: `ens160`
- IPv4 address: `192.0.2.50/24`
- Gateway: `192.0.2.1`
- DNS: `192.0.2.53`
- Web root: `/srv/examweb`
- Standard HTTP plus custom TCP port `8081`
- Operations group/user: `ops` and `operator`

The example addresses belong to a documentation range and do not represent a live network.

## Step-by-step workflow

### 1. Inspect the existing network and SELinux state — 10 points

```bash
nmcli device status
nmcli connection show
getenforce
```

The objective requires both network and SELinux inspection.

### 2. Configure the persistent network identity — 20 points

```bash
nmcli con mod ens160 ipv4.method manual
nmcli con mod ens160 ipv4.addresses 192.0.2.50/24
nmcli con mod ens160 ipv4.gateway 192.0.2.1
nmcli con mod ens160 ipv4.dns 192.0.2.53
nmcli con up ens160
hostnamectl set-hostname server1.example.com
```

The evaluator checks the complete connection state and active hostname, not command spelling.

### 3. Open only the required traffic — 15 points

```bash
firewall-cmd --permanent --add-service=http
firewall-cmd --permanent --add-port=8081/tcp
firewall-cmd --reload
firewall-cmd --list-all
```

Both permanent and active runtime policy must contain the entries.

### 4. Authorize the custom SELinux port — 15 points

Keep enforcing mode and add the port label:

```bash
setenforce 1
semanage port -a -t http_port_t -p tcp 8081
semanage port -l
getenforce
```

Do not solve an SELinux denial by disabling SELinux.

### 5. Persist and apply the web-root context — 15 points

```bash
mkdir -p /srv/examweb
semanage fcontext -a -t httpd_sys_content_t '/srv/examweb(/.*)?'
restorecon -Rv /srv/examweb
semanage fcontext -l
```

`semanage fcontext` creates the persistent rule; `restorecon` applies it to the path.

### 6. Apply the required service boolean — 10 points

```bash
setsebool -P httpd_can_network_connect on
getsebool httpd_can_network_connect
```

The `-P` flag represents persistence across reboot.

### 7. Delegate controlled operator access — 15 points

```bash
groupadd ops
useradd operator
usermod -aG ops operator
chage -M 90 operator
id operator
chage -l operator
vi /etc/sudoers.d/operator
```

Enter the requested sudo rule:

```text
operator ALL=(ALL) ALL
```

Validate it before considering the policy ready:

```bash
visudo -cf /etc/sudoers.d/operator
```

The evaluator requires the group, user membership, 90-day maximum password age, valid policy content and a successful modeled syntax check.

## Final verification checklist

```bash
nmcli connection show
hostnamectl
firewall-cmd --list-all
getenforce
semanage port -l
semanage fcontext -l
getsebool httpd_can_network_connect
id operator
chage -l operator
visudo -cf /etc/sudoers.d/operator
```

## Troubleshooting

- **Network objective remains incomplete:** verify all four IPv4 values, reactivate `ens160` and set the full hostname.
- **Firewall objective remains incomplete:** permanent entries do not affect runtime until `firewall-cmd --reload`.
- **Port objective remains incomplete:** use SELinux type `http_port_t`, protocol `tcp`, port `8081`, and keep enforcing mode.
- **Context objective remains incomplete:** create the directory, include `(/.*)?` in the persistent rule and run recursive `restorecon`.
- **Privilege objective remains incomplete:** create both identities, append group membership, set 90 days and run `visudo -cf` after saving.
- **Editing:** `vi /path` opens the lab editor. Use **i Insert**, edit the text, then **:wq Save & quit**.

## Security principles

- Treat network addressing, firewall rules and SELinux policy as independent controls.
- Make the narrowest policy change that satisfies the workload.
- Prefer persistent, auditable rules over temporary workarounds.
- Validate sudo policy before leaving the current privileged session.
- Review delegated privileges regularly and remove access that is no longer needed.

## Scoring and certificate

The live score reflects the currently validated modeled state; breaking a completed configuration can remove its points until it is repaired. Completing all objectives produces a final score of **100/100** and an RCW IT Training PDF certificate certifying **Linux Challenge Champion**, signed by **Pradeep Raju**.
