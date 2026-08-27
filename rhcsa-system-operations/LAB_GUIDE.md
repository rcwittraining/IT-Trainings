# Boot, Timers and Recovery Challenge

**Provider:** RCW IT Training  
**Platform:** RHEL 10 practice system  
**Assessment:** 6 state-validated objectives, 100 points  
**Certificate:** Linux Challenge Champion, signed by Pradeep Raju

## Purpose

Create a durable server operations baseline by working across boot targets, time synchronization, journal persistence, native systemd scheduling and bootloader generation.

This is an **RHCSA-aligned preparation exercise**. It is not an official exam environment, a list of guaranteed exam tasks, or a promise of certification success. Check the current official EX200 objectives as part of your study plan.

## Scenario

A cloned RHEL 10 host currently uses workstation-style defaults. Operations requires:

- `multi-user.target` as the persistent default.
- `chronyd` synchronized to `time.example.net`.
- persistent journal storage.
- a daily, persistent `rhcsa-report.timer`.
- a five-second GRUB timeout applied to the generated boot configuration.

Configuration content alone is insufficient. The corresponding reload, restart, enable or generator action must apply it.

## Step-by-step workflow

### 1. Inspect boot health and exercise rescue mode — 10 points

```bash
systemctl get-default
journalctl -b -p err
systemctl isolate rescue.target
systemctl isolate multi-user.target
```

Read current state before changing it. The challenge then requires a manual transition into `rescue.target` and a return to `multi-user.target`. On a real remote host, isolating rescue mode can stop networking and your session; perform that exercise from a console or another tested recovery path.

### 2. Persist the server target — 15 points

```bash
systemctl set-default multi-user.target
systemctl get-default
```

`set-default` changes the next-boot target without switching the current target.

### 3. Configure synchronized time — 20 points

```bash
vi /etc/chrony.conf
```

Keep the useful existing directives and add:

```text
server time.example.net iburst
```

Apply and verify:

```bash
systemctl enable --now chronyd
systemctl restart chronyd
chronyc sources
```

The objective requires the correct source, enabled and active service, a restart after editing, and a source inspection.

### 4. Make journal storage persistent — 15 points

```bash
mkdir -p /var/log/journal
systemctl restart systemd-journald
journalctl --disk-usage
```

The directory is part of the persistent-journal convention. Restarting journald applies the storage condition in this modeled host.

### 5. Create the daily systemd timer — 25 points

Create the service unit:

```bash
vi /etc/systemd/system/rhcsa-report.service
```

Use:

```ini
[Unit]
Description=Write the RHCSA operations report

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/rhcsa-report
```

Create the timer:

```bash
vi /etc/systemd/system/rhcsa-report.timer
```

Use:

```ini
[Unit]
Description=Run the RHCSA report daily

[Timer]
OnCalendar=daily
Persistent=true
Unit=rhcsa-report.service

[Install]
WantedBy=timers.target
```

Apply, enable and inspect:

```bash
systemctl daemon-reload
systemctl enable --now rhcsa-report.timer
systemctl list-timers
```

`Persistent=true` allows a missed calendar event to run after the host becomes available again. The objective validates both files, the daemon-reload snapshot and timer state.

### 6. Apply the GRUB timeout — 15 points

```bash
vi /etc/default/grub
```

Change the existing timeout line to exactly:

```text
GRUB_TIMEOUT=5
```

Generate the BIOS boot configuration:

```bash
grub2-mkconfig -o /boot/grub2/grub.cfg
```

The modeled generator captures the current defaults. Editing the file again afterward would make the generated state stale until the command is repeated.

## Final verification checklist

```bash
systemctl get-default
systemctl is-enabled chronyd
chronyc sources
journalctl --disk-usage
systemctl status rhcsa-report.timer
systemctl list-timers
cat /etc/default/grub
```

On real hardware, the correct GRUB output path may depend on firmware and platform layout. Confirm the supported RHEL 10 procedure for the host instead of blindly copying a path.

## Troubleshooting

- **Chrony objective remains incomplete:** verify `server time.example.net iburst`, restart the service and run `chronyc sources`.
- **Journal objective remains incomplete:** create `/var/log/journal`, restart `systemd-journald`, then inspect disk usage.
- **Timer does not validate:** check section names and directives exactly, run `systemctl daemon-reload`, then enable the `.timer` unit.
- **GRUB objective remains incomplete:** check `GRUB_TIMEOUT=5` and regenerate the requested output.
- **Editing:** `vi /path` opens the lab editor. Use **i Insert**, edit the text, then **:wq Save & quit**.

## Operational safety

- Keep an active recovery session when changing boot behavior remotely.
- Validate unit syntax and review dependencies before enabling custom services.
- Do not remove unrelated GRUB parameters.
- Maintain reliable time because logs, certificates and incident timelines depend on it.
- Rehearse boot recovery on non-production systems.

## Scoring and certificate

The live score reflects the currently validated modeled state; breaking a completed configuration can remove its points until it is repaired. Completing all objectives produces a final score of **100/100** and an RCW IT Training PDF certificate certifying **Linux Challenge Champion**, signed by **Pradeep Raju**.
