#!/usr/bin/env python3
"""Generate original RHCSA Certification Practice task labs.

The scenarios in this file are original RCW IT Training exercises mapped to the
publicly documented EX200/RHEL 10 skill areas. They do not reproduce exam items.
"""
from __future__ import annotations

import html
import json
import re
import shutil
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "rhcsa-practice"
TOTAL = 62
OFFICIAL_URL = "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam"


@dataclass(frozen=True)
class Step:
    command: str
    fact: str
    label: str
    output: str = "Command completed successfully."


def s(command: str, fact: str, label: str, output: str = "Command completed successfully.") -> Step:
    return Step(command, fact, label, output)


def shell_pattern(command: str) -> str:
    """Create a strict but whitespace-tolerant command matcher."""
    escaped = re.escape(command.strip())
    escaped = escaped.replace(r"\ ", r"\s+")
    return "^" + escaped + "$"


LABS = [
    # Understand and use essential tools (1-11)
    dict(slug="shell-command-syntax", title="Shell Command Syntax", domain="Essential Tools", technology="Shell Fundamentals", scenario="An operations handover requires a quick, auditable confirmation that you are on the correct host, using the intended identity, and can inspect the staging directory with valid shell syntax.", implement="Confirm the shell working context", steps=[
        s("pwd", "cwd_checked", "Current working directory inspected", "/root"),
        s("id", "identity_checked", "Effective identity inspected", "uid=0(root) gid=0(root) groups=0(root)"),
        s("ls -la /var/tmp", "directory_listed", "Staging directory listed with valid syntax", "total 8\ndrwxrwxrwt.  5 root root 4096 Aug 21 09:00 ."),
        s("test -d /var/tmp && echo SHELL_READY", "verified", "Shell task validated", "SHELL_READY"),
    ]),
    dict(slug="io-redirection-pipelines", title="I/O Redirection and Pipelines", domain="Essential Tools", technology="Shell Fundamentals", scenario="Build a compact health report while keeping standard output and errors in separate evidence files for the night operations team.", implement="Build the redirected operations report", steps=[
        s("printf 'node=app01\\n' > /var/tmp/health.report", "report_created", "Report created with output redirection"),
        s("journalctl -p err -b >> /var/tmp/health.report", "errors_appended", "Journal errors appended without overwriting"),
        s("grep -E 'node|error' /var/tmp/health.report | wc -l", "pipeline_used", "Pipeline processed report output", "7"),
        s("grep token /root/private 2> /var/tmp/health.errors", "stderr_redirected", "Standard error redirected separately"),
        s("test -s /var/tmp/health.report && test -e /var/tmp/health.errors", "verified", "Redirection result validated"),
    ]),
    dict(slug="grep-regular-expressions", title="Grep and Regular Expressions", domain="Essential Tools", technology="Text Processing", scenario="An order service log mixes routine probes with dated warnings and errors. Extract only actionable, correctly formatted events for review.", implement="Filter actionable events with regular expressions", steps=[
        s("grep -En '^(ERROR|WARN)[[:space:]]+[0-9]{4}-[0-9]{2}-[0-9]{2}' /var/log/orders.log", "pattern_tested", "Extended regular expression tested", "18:ERROR 2026-08-21 payment timeout\n31:WARN 2026-08-21 queue depth high"),
        s("grep -Ev 'healthcheck|127\\.0\\.0\\.1' /var/log/orders.log > /var/tmp/orders-actionable.log", "noise_removed", "Routine events excluded into a report"),
        s("grep -Eq '^(ERROR|WARN)' /var/tmp/orders-actionable.log", "verified", "Filtered report validated"),
    ]),
    dict(slug="ssh-remote-access", title="Secure Shell Remote Access", domain="Essential Tools", technology="Remote Administration", scenario="Connect from the administration host to serverb using the assigned key and verify the remote identity without enabling password authentication.", implement="Establish key-based remote shell access", steps=[
        s("ssh-keygen -lf /home/admin/.ssh/id_ed25519.pub", "key_inspected", "Assigned public key fingerprint inspected", "256 SHA256:RCWtrainingKey admin@app01 (ED25519)"),
        s("ssh -i /home/admin/.ssh/id_ed25519 opsadmin@serverb.lab 'hostname'", "remote_connected", "Remote command executed with the assigned key", "serverb.lab"),
        s("ssh -i /home/admin/.ssh/id_ed25519 opsadmin@serverb.lab 'id -u'", "verified", "Remote identity validated", "1701"),
    ]),
    dict(slug="multi-user-login-switch", title="Multi-user Login and Identity Switching", domain="Essential Tools", technology="Identity Operations", scenario="Review active sessions, switch into the application service account with its login environment, and confirm the resulting identity.", implement="Switch safely to the service identity", steps=[
        s("who", "sessions_inspected", "Active user sessions inspected", "admin    pts/0  2026-08-21 09:14 (10.24.8.21)"),
        s("su - appsvc", "login_shell_switched", "Login environment switched to appsvc", "Last login: Fri Aug 21 09:06:11 IST 2026"),
        s("id", "service_identity_checked", "Service identity and groups inspected", "uid=1805(appsvc) gid=1805(appsvc) groups=1805(appsvc),3001(appteam)"),
        s("whoami", "verified", "Effective user validated", "appsvc"),
    ]),
    dict(slug="archives-compression", title="Archive and Compression Operations", domain="Essential Tools", technology="Files and Archives", scenario="Package application configuration with gzip, inspect a bzip2 reference archive, and restore it into an isolated validation directory.", implement="Create, inspect and restore compressed archives", steps=[
        s("du -sh /srv/app", "source_sized", "Archive source size inspected", "38M\t/srv/app"),
        s("tar -czf /backup/app-etc.tar.gz -C /srv/app etc", "gzip_archive_created", "gzip-compressed archive created"),
        s("tar -tjf /backup/reference.tar.bz2", "bzip_archive_inspected", "bzip2 archive contents inspected", "reference/\nreference/manifest.txt"),
        s("mkdir -p /restore/reference && tar -xjf /backup/reference.tar.bz2 -C /restore/reference", "archive_restored", "bzip2 archive restored in isolation"),
        s("tar -tzf /backup/app-etc.tar.gz | grep -q '^etc/'", "verified", "Created archive validated"),
    ]),
    dict(slug="create-edit-text-files", title="Create and Edit Text Files", domain="Essential Tools", technology="Text Processing", scenario="Replace an outdated login banner, correct its environment label, and prove that the exact approved line is present.", implement="Create and revise the approved banner", steps=[
        s("sed -n '1,20p' /etc/motd", "banner_inspected", "Existing banner inspected", "Legacy development access"),
        s("printf 'Authorized development access only\\n' > /etc/motd", "banner_created", "Banner file created with approved text"),
        s("sed -i 's/development/production/' /etc/motd", "banner_edited", "Environment label edited in place"),
        s("grep -Fx 'Authorized production access only' /etc/motd", "verified", "Final banner text validated", "Authorized production access only"),
    ]),
    dict(slug="file-directory-operations", title="File and Directory Operations", domain="Essential Tools", technology="Files and Archives", scenario="Prepare a release workspace, preserve a configuration copy, promote the candidate artifact, and remove the obsolete staging item.", implement="Build and clean the release workspace", steps=[
        s("mkdir -p /srv/releases/2026-08/config", "tree_created", "Release directory tree created"),
        s("cp -a /etc/example.conf /srv/releases/2026-08/config/", "file_copied", "Configuration copied with metadata"),
        s("mv /var/tmp/app.candidate /srv/releases/2026-08/app.bin", "artifact_moved", "Candidate artifact promoted"),
        s("rm -f /srv/releases/2026-08/config/obsolete.conf", "obsolete_removed", "Obsolete file removed"),
        s("find /srv/releases/2026-08 -maxdepth 2 -type f -print", "verified", "Release tree validated", "/srv/releases/2026-08/config/example.conf\n/srv/releases/2026-08/app.bin"),
    ]),
    dict(slug="hard-soft-links", title="Hard and Symbolic Links", domain="Essential Tools", technology="Files and Archives", scenario="Provide a same-filesystem recovery name for a policy file and a stable symbolic path for the current application release.", implement="Create hard and symbolic links", steps=[
        s("stat -c '%i %n' /srv/policy/current.conf", "inode_inspected", "Source inode inspected", "524881 /srv/policy/current.conf"),
        s("ln /srv/policy/current.conf /srv/policy/current.conf.recovery", "hard_link_created", "Hard recovery link created"),
        s("ln -s /srv/releases/app-4.2 /opt/app-current", "soft_link_created", "Stable symbolic release link created"),
        s("test /srv/policy/current.conf -ef /srv/policy/current.conf.recovery && test -L /opt/app-current", "verified", "Both link types validated"),
    ]),
    dict(slug="standard-permissions", title="Standard Linux Permissions", domain="Essential Tools", technology="Permissions", scenario="Restrict a payroll export so only its owner can modify it and members of the audit group can read it.", implement="Apply the required owner, group and mode", steps=[
        s("stat -c '%U:%G %a %n' /srv/payroll/export.csv", "permissions_inspected", "Current ownership and mode inspected", "root:root 666 /srv/payroll/export.csv"),
        s("chgrp auditors /srv/payroll/export.csv", "group_assigned", "Audit group assigned"),
        s("chmod 0640 /srv/payroll/export.csv", "mode_applied", "Owner and group permissions corrected"),
        s("stat -c '%G %a' /srv/payroll/export.csv", "verified", "Final permissions validated", "auditors 640"),
    ]),
    dict(slug="system-documentation", title="System Documentation Research", domain="Essential Tools", technology="Documentation", scenario="Use installed documentation to identify the configuration file format and packaged examples for the system logging service.", implement="Locate authoritative local documentation", steps=[
        s("man -k systemd journal", "keyword_search_done", "Manual keyword search completed", "journald.conf (5) - Journal service configuration files"),
        s("man 5 journald.conf", "manual_opened", "Correct manual section consulted"),
        s("info coreutils 'File permissions'", "info_opened", "Info documentation consulted"),
        s("rpm -qd systemd | grep journald", "package_docs_listed", "Package documentation located", "/usr/share/man/man5/journald.conf.5.gz"),
        s("test -r /usr/share/man/man5/journald.conf.5.gz", "verified", "Local documentation path validated"),
    ]),

    # Manage software (12-15)
    dict(slug="rpm-repositories", title="RPM Repository Configuration", domain="Software Management", technology="RPM and DNF", scenario="Add the approved internal tools repository, enable it, refresh metadata, and confirm that DNF can see it.", implement="Configure the approved RPM repository", steps=[
        s("dnf repolist", "repos_inspected", "Existing RPM repositories inspected", "rhel-10-baseos\nrhel-10-appstream"),
        s("dnf config-manager --add-repo https://repo.lab.example/rhel10/tools.repo", "repo_added", "Internal repository definition added"),
        s("dnf config-manager --set-enabled training-tools", "repo_enabled", "Internal repository enabled"),
        s("dnf makecache", "metadata_refreshed", "Repository metadata refreshed"),
        s("dnf repolist --enabled | grep training-tools", "verified", "Enabled repository validated", "training-tools  RCW Training Tools"),
    ]),
    dict(slug="rpm-package-lifecycle", title="RPM Package Lifecycle", domain="Software Management", technology="RPM and DNF", scenario="Install the approved terminal multiplexer and remove an obsolete clear-text client from the managed host.", implement="Install and remove RPM packages", steps=[
        s("rpm -q tmux telnet", "packages_inspected", "Current package state inspected", "package tmux is not installed\ntelnet-0.17-95.el10.x86_64"),
        s("dnf install -y tmux", "package_installed", "Approved package installed"),
        s("dnf remove -y telnet", "package_removed", "Obsolete package removed"),
        s("rpm -q tmux && ! rpm -q telnet", "verified", "Final RPM package state validated", "tmux-3.4-7.el10.x86_64\npackage telnet is not installed"),
    ]),
    dict(slug="flatpak-repositories", title="Flatpak Repository Configuration", domain="Software Management", technology="Flatpak", scenario="Register the approved desktop application source without duplicating an existing remote, then verify its name and URL.", implement="Configure the approved Flatpak remote", steps=[
        s("flatpak remotes", "remotes_inspected", "Existing Flatpak remotes inspected", "Name    Options\nflathub system"),
        s("flatpak remote-add --if-not-exists training https://flatpak.lab.example/training.flatpakrepo", "remote_added", "Training Flatpak remote added idempotently"),
        s("flatpak remote-modify --enable training", "remote_enabled", "Training remote enabled"),
        s("flatpak remotes --columns=name,url | grep '^training'", "verified", "Flatpak remote validated", "training\thttps://flatpak.lab.example/repo/"),
    ]),
    dict(slug="flatpak-app-lifecycle", title="Flatpak Application Lifecycle", domain="Software Management", technology="Flatpak", scenario="Deploy the approved diagram application from the training remote and remove its retired predecessor.", implement="Install and remove Flatpak applications", steps=[
        s("flatpak list --app", "apps_inspected", "Installed Flatpak applications inspected", "Old Diagram Tool\torg.example.OldDiagram"),
        s("flatpak install -y training org.example.Diagram", "app_installed", "Approved Flatpak application installed"),
        s("flatpak uninstall -y org.example.OldDiagram", "app_removed", "Retired Flatpak application removed"),
        s("flatpak info org.example.Diagram", "verified", "Final Flatpak application state validated", "ID: org.example.Diagram\nOrigin: training\nInstallation: system"),
    ]),

    # Create simple shell scripts (16-19)
    dict(slug="script-conditionals", title="Shell Script Conditionals", domain="Shell Scripting", technology="Bash", scenario="Create a safe service-check helper that accepts a service name and returns a clear active or inactive result using a conditional.", implement="Build the conditional service-check script", editable=dict(path="/usr/local/bin/check-service", facts=["script_written"], patterns=[r"\bif\b", r"systemctl\s+is-active", r"\$1", r"\bthen\b", r"\belse\b", r"\bfi\b"], content="#!/bin/bash\nif systemctl is-active --quiet \"$1\"; then\n  echo \"$1 is active\"\nelse\n  echo \"$1 is inactive\"\nfi\n"), steps=[
        s("test -e /usr/local/bin/check-service", "target_inspected", "Script target inspected", "test: /usr/local/bin/check-service: no such file"),
        s("chmod 0755 /usr/local/bin/check-service", "script_executable", "Script made executable"),
        s("bash -n /usr/local/bin/check-service", "syntax_valid", "Script syntax validated"),
        s("/usr/local/bin/check-service sshd", "verified", "Conditional behavior validated", "sshd is active"),
    ]),
    dict(slug="script-loops", title="Shell Script Loops", domain="Shell Scripting", technology="Bash", scenario="Create a script that loops over three service log directories and produces one compressed archive for each directory.", implement="Build the looping archive script", editable=dict(path="/usr/local/bin/archive-service-logs", facts=["script_written"], patterns=[r"\bfor\b", r"\bin\b", r"\bdo\b", r"\bdone\b", r"tar\s+-czf"], content="#!/bin/bash\nfor service in api billing worker; do\n  tar -czf \"/backup/${service}.tgz\" \"/var/log/${service}\"\ndone\n"), steps=[
        s("ls -d /var/log/api /var/log/billing /var/log/worker", "sources_inspected", "Loop input directories inspected"),
        s("chmod 0755 /usr/local/bin/archive-service-logs", "script_executable", "Loop script made executable"),
        s("bash -n /usr/local/bin/archive-service-logs", "syntax_valid", "Loop script syntax validated"),
        s("/usr/local/bin/archive-service-logs && ls /backup/api.tgz /backup/billing.tgz /backup/worker.tgz", "verified", "Loop output validated", "/backup/api.tgz\n/backup/billing.tgz\n/backup/worker.tgz"),
    ]),
    dict(slug="script-inputs", title="Shell Script Positional Inputs", domain="Shell Scripting", technology="Bash", scenario="Create a report helper that requires a username and output path as its first two arguments, then writes identity details to that destination.", implement="Process positional script inputs", editable=dict(path="/usr/local/bin/user-report", facts=["script_written"], patterns=[r"\$1", r"\$2", r"id\s+", r"usage|Usage", r"-z|#"], content="#!/bin/bash\nif [ -z \"$1\" ] || [ -z \"$2\" ]; then\n  echo \"Usage: $0 USER OUTPUT\" >&2\n  exit 2\nfi\nid \"$1\" > \"$2\"\n"), steps=[
        s("getent passwd appsvc", "input_account_checked", "Input account confirmed", "appsvc:x:1805:1805:Application Service:/home/appsvc:/bin/bash"),
        s("chmod 0755 /usr/local/bin/user-report", "script_executable", "Input-processing script made executable"),
        s("bash -n /usr/local/bin/user-report", "syntax_valid", "Input-processing script syntax validated"),
        s("/usr/local/bin/user-report appsvc /var/tmp/appsvc.id && test -s /var/tmp/appsvc.id", "verified", "Argument-driven output validated"),
    ]),
    dict(slug="script-command-output", title="Command Output in Shell Scripts", domain="Shell Scripting", technology="Bash", scenario="Create a snapshot helper that captures the current host, timestamp, and uptime using command substitution in a structured report.", implement="Process command output inside a script", editable=dict(path="/usr/local/bin/host-snapshot", facts=["script_written"], patterns=[r"\$\(hostname", r"\$\(date", r"\$\(uptime", r">"], content="#!/bin/bash\noutput=/var/tmp/host.snapshot\nprintf 'host=%s\\ntime=%s\\nuptime=%s\\n' \"$(hostname -f)\" \"$(date -Is)\" \"$(uptime -p)\" > \"$output\"\n"), steps=[
        s("hostname -f", "host_checked", "Source command output inspected", "app01.lab.example"),
        s("chmod 0755 /usr/local/bin/host-snapshot", "script_executable", "Snapshot script made executable"),
        s("bash -n /usr/local/bin/host-snapshot", "syntax_valid", "Snapshot script syntax validated"),
        s("/usr/local/bin/host-snapshot && grep -E '^(host|time|uptime)=' /var/tmp/host.snapshot", "verified", "Captured command output validated", "host=app01.lab.example\ntime=2026-08-21T10:15:00+05:30\nuptime=up 3 days, 4 hours"),
    ]),

    # Operate running systems (20-29)
    dict(slug="normal-system-lifecycle", title="Normal Boot, Reboot and Shutdown", domain="Running Systems", technology="System Lifecycle", scenario="Demonstrate controlled reboot scheduling, cancellation, and normal shutdown handling on the isolated maintenance node.", implement="Use supported system lifecycle operations", steps=[
        s("systemctl list-jobs", "jobs_inspected", "Pending system jobs inspected", "No jobs running."),
        s("shutdown -r +5 'RCW maintenance validation'", "reboot_scheduled", "Normal reboot scheduled with notice", "Reboot scheduled for Fri 2026-08-21 10:30:00 IST"),
        s("shutdown -c", "reboot_cancelled", "Scheduled reboot safely cancelled"),
        s("systemctl poweroff", "shutdown_requested", "Normal system shutdown requested"),
        s("systemctl list-jobs --no-pager", "verified", "Lifecycle request state validated", "shutdown.target start waiting"),
    ]),
    dict(slug="manual-boot-targets", title="Manual Boot Targets", domain="Running Systems", technology="Systemd", scenario="Move an isolated host into rescue mode for maintenance, then return it to the normal multi-user target without changing the default target.", implement="Switch running systemd targets manually", steps=[
        s("systemctl get-default", "default_target_checked", "Configured default target inspected", "multi-user.target"),
        s("systemctl isolate rescue.target", "rescue_entered", "Running host isolated into rescue target"),
        s("systemctl isolate multi-user.target", "multi_user_restored", "Normal multi-user target restored"),
        s("systemctl is-active multi-user.target", "verified", "Active target validated", "active"),
    ]),
    dict(slug="interrupt-boot-recovery", title="Boot Interruption and Recovery", domain="Running Systems", technology="Boot Recovery", scenario="Use an authorised break-glass boot workflow to regain local administrative access and prepare SELinux relabelling.", implement="Complete the controlled boot-recovery workflow", steps=[
        s("grubby --info=DEFAULT", "boot_entry_inspected", "Default boot entry inspected", "kernel=/boot/vmlinuz-6.12.0-55.el10.x86_64"),
        s("mount -o remount,rw /sysroot", "sysroot_writable", "Installed system remounted read-write"),
        s("chroot /sysroot", "chroot_entered", "Installed system root entered"),
        s("passwd root", "root_password_reset", "Authorised root password reset", "passwd: all authentication tokens updated successfully."),
        s("touch /.autorelabel", "relabel_requested", "SELinux relabel requested"),
        s("test -e /.autorelabel", "verified", "Recovery persistence marker validated"),
    ]),
    dict(slug="process-identification-control", title="Process Identification and Control", domain="Running Systems", technology="Process Management", scenario="Identify the process consuming the most CPU, terminate the confirmed runaway worker gracefully, and prove it has exited.", implement="Locate and stop the runaway process", steps=[
        s("ps -eo pid,user,pcpu,pmem,comm --sort=-pcpu | head", "processes_ranked", "CPU-intensive processes ranked", "PID USER %CPU %MEM COMMAND\n4242 batch 98.6 4.1 report-worker"),
        s("kill -TERM 4242", "term_sent", "Graceful termination signal sent"),
        s("sleep 2", "grace_period_observed", "Grace period observed"),
        s("! ps -p 4242", "verified", "Runaway process exit validated"),
    ]),
    dict(slug="process-scheduling", title="Process Scheduling Adjustment", domain="Running Systems", technology="Process Management", scenario="Lower the CPU scheduling priority of a noncritical report renderer while leaving the process running.", implement="Adjust the running process priority", steps=[
        s("ps -o pid,ni,pri,comm -p 4310", "priority_inspected", "Current scheduling values inspected", "PID  NI PRI COMMAND\n4310  0  19 report-render"),
        s("renice -n 10 -p 4310", "priority_adjusted", "Nice value adjusted", "4310 (process ID) old priority 0, new priority 10"),
        s("ps -o pid,ni,pri,comm --no-headers -p 4310", "verified", "Adjusted scheduling state validated", "4310 10   9 report-render"),
    ]),
    dict(slug="tuning-profiles", title="System Tuning Profiles", domain="Running Systems", technology="Performance Tuning", scenario="Review the host recommendation and apply the approved virtual-machine tuning profile persistently.", implement="Select and verify a tuned profile", steps=[
        s("tuned-adm active", "active_profile_checked", "Current tuned profile inspected", "Current active profile: balanced"),
        s("tuned-adm recommend", "recommendation_checked", "Profile recommendation inspected", "virtual-guest"),
        s("tuned-adm profile virtual-guest", "profile_applied", "Approved tuning profile applied"),
        s("tuned-adm verify", "verified", "Active tuning profile validated", "Verification succeeded, current system settings match the preset profile."),
    ]),
    dict(slug="logs-journals-analysis", title="System Logs and Journal Analysis", domain="Running Systems", technology="Logging", scenario="Correlate boot errors with payment-service events from the incident window and verify journal integrity.", implement="Locate and interpret incident journal records", steps=[
        s("journalctl -b -p err", "boot_errors_reviewed", "Current-boot errors reviewed", "Aug 21 09:42:11 app01 payments[882]: upstream timeout"),
        s("journalctl -u payments.service --since '2026-08-21 09:40' --until '2026-08-21 09:50'", "service_window_reviewed", "Service incident window reviewed", "Aug 21 09:42:11 app01 payments[882]: upstream timeout after 30s"),
        s("journalctl --verify", "verified", "Journal integrity validated", "PASS: /var/log/journal/rcw/system.journal"),
    ]),
    dict(slug="persistent-journals", title="Persistent System Journals", domain="Running Systems", technology="Logging", scenario="Convert a volatile journal configuration into persistent storage and flush the current runtime journal safely.", implement="Enable persistent journal storage", steps=[
        s("test -d /var/log/journal", "journal_storage_checked", "Persistent journal directory state inspected", "test: /var/log/journal: no such file or directory"),
        s("mkdir -p /var/log/journal", "journal_directory_created", "Persistent journal directory created"),
        s("chown root:systemd-journal /var/log/journal && chmod 2755 /var/log/journal", "journal_permissions_set", "Journal directory ownership and mode set"),
        s("systemctl restart systemd-journald && journalctl --flush", "journal_flushed", "Journal service restarted and runtime data flushed"),
        s("test -d /var/log/journal && journalctl --disk-usage", "verified", "Persistent journal storage validated", "Archived and active journals take up 16.0M in the file system."),
    ]),
    dict(slug="network-service-control", title="Network Service Control", domain="Running Systems", technology="Systemd", scenario="Perform a controlled restart sequence for SSH service and confirm that the service returns to an active state.", implement="Stop, start and validate the network service", steps=[
        s("systemctl status sshd --no-pager", "service_status_checked", "Network service status inspected", "Active: active (running)"),
        s("systemctl stop sshd", "service_stopped", "Network service stopped"),
        s("systemctl start sshd", "service_started", "Network service started"),
        s("systemctl is-active sshd", "verified", "Network service state validated", "active"),
    ]),
    dict(slug="secure-file-transfer", title="Secure File Transfer", domain="Running Systems", technology="Remote Administration", scenario="Transfer the signed configuration bundle to serverb over SSH and verify integrity at the destination.", implement="Transfer and verify the protected artifact", steps=[
        s("sha256sum /var/tmp/app-config.tgz", "source_hash_recorded", "Source checksum recorded", "a91d54f2c80c15e6a272...  /var/tmp/app-config.tgz"),
        s("scp -p /var/tmp/app-config.tgz opsadmin@serverb.lab:/srv/incoming/", "artifact_transferred", "Artifact transferred securely with metadata"),
        s("ssh opsadmin@serverb.lab 'sha256sum /srv/incoming/app-config.tgz'", "verified", "Destination checksum validated", "a91d54f2c80c15e6a272...  /srv/incoming/app-config.tgz"),
    ]),

    # Configure local storage (30-35)
    dict(slug="gpt-partitions", title="GPT Partition Management", domain="Local Storage", technology="Partitions", scenario="Initialise the empty data disk with GPT and create a correctly aligned 2 GiB partition for application data.", implement="Create the GPT partition layout", steps=[
        s("lsblk -f /dev/vdb", "disk_inspected", "Target disk inspected", "NAME FSTYPE SIZE MOUNTPOINTS\nvdb         10G"),
        s("parted /dev/vdb --script mklabel gpt", "gpt_created", "GPT disk label created"),
        s("parted /dev/vdb --script mkpart primary 1MiB 2049MiB", "partition_created", "Aligned data partition created"),
        s("partprobe /dev/vdb", "partition_table_reloaded", "Kernel partition table refreshed"),
        s("lsblk -o NAME,SIZE,TYPE /dev/vdb", "verified", "GPT partition layout validated", "vdb 10G disk\n└─vdb1 2G part"),
    ]),
    dict(slug="physical-volumes", title="LVM Physical Volumes", domain="Local Storage", technology="LVM", scenario="Prepare the approved partition as a new LVM physical volume and retire an unused unassigned physical volume.", implement="Create and remove physical volumes", steps=[
        s("pvs -o pv_name,vg_name,pv_size", "pvs_inspected", "Physical volume inventory inspected", "/dev/vdc1  -  1.00g"),
        s("pvcreate /dev/vdb1", "pv_created", "New physical volume created"),
        s("pvremove -y /dev/vdc1", "old_pv_removed", "Unused physical volume removed"),
        s("pvs -o pv_name,vg_name | grep /dev/vdb1", "verified", "Physical volume state validated", "/dev/vdb1"),
    ]),
    dict(slug="volume-groups", title="LVM Volume Groups", domain="Local Storage", technology="LVM", scenario="Create the application volume group from the first approved PV, then add the second PV to expand its capacity.", implement="Create and extend the volume group", steps=[
        s("pvs", "available_pvs_checked", "Available physical volumes inspected", "/dev/vdb1\n/dev/vdc1"),
        s("vgcreate vgapp /dev/vdb1", "vg_created", "Application volume group created"),
        s("vgextend vgapp /dev/vdc1", "vg_extended", "Second physical volume assigned to the group"),
        s("vgs vgapp -o vg_name,pv_count,vg_size", "verified", "Volume group membership validated", "VG #PV VSize\nvgapp 2 3.99g"),
    ]),
    dict(slug="logical-volumes", title="LVM Logical Volume Lifecycle", domain="Local Storage", technology="LVM", scenario="Create the replacement application logical volume and delete the confirmed retired logical volume.", implement="Create and remove logical volumes", steps=[
        s("lvs -o lv_name,vg_name,lv_size", "lvs_inspected", "Logical volume inventory inspected", "lvold vgapp 512.00m"),
        s("lvcreate -L 2G -n lvapp vgapp", "lv_created", "Replacement logical volume created"),
        s("lvremove -y /dev/vgapp/lvold", "old_lv_removed", "Retired logical volume removed"),
        s("lvs vgapp/lvapp -o lv_name,lv_size --noheadings", "verified", "Logical volume state validated", "lvapp 2.00g"),
    ]),
    dict(slug="persistent-mount-identifiers", title="Persistent Mounts by UUID or Label", domain="Local Storage", technology="Persistent Mounts", scenario="Configure the existing XFS data volume to mount at boot using its UUID rather than a device name.", implement="Create a persistent identifier-based mount", steps=[
        s("blkid /dev/vgapp/lvdata", "uuid_discovered", "File-system UUID discovered", "/dev/mapper/vgapp-lvdata: UUID=7b5d-rcw-2026 TYPE=xfs"),
        s("mkdir -p /data", "mountpoint_created", "Persistent mount point created"),
        s("printf 'UUID=7b5d-rcw-2026 /data xfs defaults 0 0\\n' >> /etc/fstab", "fstab_updated", "UUID-based boot mount recorded"),
        s("mount -a", "fstab_tested", "Persistent mounts tested without reboot"),
        s("findmnt -no SOURCE,FSTYPE,TARGET /data", "verified", "Mounted file system validated", "/dev/mapper/vgapp-lvdata xfs /data"),
    ]),
    dict(slug="nondestructive-storage-swap", title="Non-destructive Storage and Swap", domain="Local Storage", technology="LVM and Swap", scenario="Add a 1 GiB swap logical volume to the running system without disturbing existing data and make it persistent.", implement="Add persistent swap non-destructively", steps=[
        s("vgs vgsystem -o vg_name,vg_free", "free_space_checked", "Volume-group free space inspected", "vgsystem 4.00g"),
        s("lvcreate -L 1G -n lvswap vgsystem", "swap_lv_created", "Swap logical volume created"),
        s("mkswap /dev/vgsystem/lvswap", "swap_formatted", "Logical volume formatted as swap"),
        s("swapon /dev/vgsystem/lvswap", "swap_activated", "New swap activated online"),
        s("printf '/dev/vgsystem/lvswap none swap defaults 0 0\\n' >> /etc/fstab", "swap_persisted", "Swap activation made persistent"),
        s("swapon --show | grep lvswap", "verified", "Active swap validated", "/dev/dm-3 partition 1024M 0B -2"),
    ]),

    # Create and configure file systems (36-40)
    dict(slug="local-file-systems", title="VFAT, ext4 and XFS File Systems", domain="File Systems", technology="Local File Systems", scenario="Prepare three training volumes with the required VFAT, ext4, and XFS formats, mount them, and verify each type.", implement="Create and mount three local file-system types", steps=[
        s("lsblk -f /dev/vdb /dev/vdc /dev/vdd", "devices_inspected", "Target devices inspected"),
        s("mkfs.vfat -n TRANSFER /dev/vdb1", "vfat_created", "VFAT file system created"),
        s("mkfs.ext4 -L ARCHIVE /dev/vdc1", "ext4_created", "ext4 file system created"),
        s("mkfs.xfs -L APPDATA /dev/vdd1", "xfs_created", "XFS file system created"),
        s("mkdir -p /mnt/transfer /mnt/archive /mnt/appdata && mount /dev/vdb1 /mnt/transfer && mount /dev/vdc1 /mnt/archive && mount /dev/vdd1 /mnt/appdata", "filesystems_mounted", "All three file systems mounted"),
        s("findmnt -no FSTYPE /mnt/transfer /mnt/archive /mnt/appdata", "verified", "Mounted file-system types validated", "vfat\next4\nxfs"),
    ]),
    dict(slug="nfs-mounts", title="NFS Network File Systems", domain="File Systems", technology="NFS", scenario="Mount the approved engineering export now and configure the same NFS mount to return after reboot.", implement="Create an active and persistent NFS mount", steps=[
        s("showmount -e files.lab.example", "exports_inspected", "Available NFS exports inspected", "/exports/engineering 10.24.0.0/16"),
        s("mkdir -p /engineering", "nfs_mountpoint_created", "NFS mount point created"),
        s("printf 'files.lab.example:/exports/engineering /engineering nfs4 defaults,_netdev 0 0\\n' >> /etc/fstab", "nfs_fstab_added", "Persistent NFS mount recorded"),
        s("mount /engineering", "nfs_mounted", "NFS export mounted"),
        s("findmnt -no SOURCE,FSTYPE /engineering", "verified", "NFS mount validated", "files.lab.example:/exports/engineering nfs4"),
    ]),
    dict(slug="autofs-indirect-maps", title="Autofs Configuration", domain="File Systems", technology="Autofs", scenario="Configure an indirect automount so project exports appear beneath /projects only when accessed.", implement="Configure and activate the autofs map", steps=[
        s("rpm -q autofs", "autofs_checked", "Autofs package state inspected", "autofs-5.1.9-12.el10.x86_64"),
        s("printf '/projects /etc/auto.projects\\n' > /etc/auto.master.d/projects.autofs", "master_map_created", "Indirect master map created"),
        s("printf 'alpha -rw,sync files.lab.example:/exports/alpha\\n' > /etc/auto.projects", "indirect_map_created", "Project map created"),
        s("systemctl enable --now autofs", "autofs_enabled", "Autofs enabled and started"),
        s("ls /projects/alpha && mount | grep '/projects/alpha'", "verified", "On-demand project mount validated", "README.md\nfiles.lab.example:/exports/alpha on /projects/alpha type nfs4"),
    ]),
    dict(slug="extend-logical-volume", title="Extend an Existing Logical Volume", domain="File Systems", technology="LVM and File Systems", scenario="Increase the nearly full XFS application volume by 2 GiB and grow its file system online in one controlled operation.", implement="Extend the LV and its file system", steps=[
        s("lvs /dev/vgapp/lvdata -o lv_size && df -hT /data", "capacity_inspected", "Logical volume and file-system capacity inspected", "LSize 4.00g\n/dev/mapper/vgapp-lvdata xfs 4.0G 3.6G 410M 90% /data"),
        s("lvextend -r -L +2G /dev/vgapp/lvdata", "lv_and_fs_extended", "Logical volume and file system extended online", "Size of logical volume vgapp/lvdata changed from 4.00 GiB to 6.00 GiB."),
        s("lvs /dev/vgapp/lvdata -o lv_size --noheadings && df -hT /data", "verified", "Extended capacity validated", "6.00g\n/dev/mapper/vgapp-lvdata xfs 6.0G 3.6G 2.4G 60% /data"),
    ]),
    dict(slug="permission-troubleshooting", title="File Permission Troubleshooting", domain="File Systems", technology="Permissions", scenario="The application service cannot read its configuration. Trace every path component, correct ownership and mode, and test access as the service identity.", implement="Diagnose and repair the access path", steps=[
        s("namei -l /srv/app/config/settings.ini", "path_permissions_traced", "Every path component inspected", "f: /srv/app/config/settings.ini\ndrwxr-xr-x root root /\ndrwxr-xr-x root root srv\ndrwx------ root root app"),
        s("getfacl /srv/app/config/settings.ini", "acl_inspected", "File ACL and effective permissions inspected"),
        s("chown -R appsvc:appteam /srv/app/config", "ownership_repaired", "Configuration ownership repaired recursively"),
        s("chmod 0750 /srv/app /srv/app/config && chmod 0640 /srv/app/config/settings.ini", "modes_repaired", "Directory and file modes repaired"),
        s("su -s /bin/bash appsvc -c 'test -r /srv/app/config/settings.ini'", "verified", "Service-account access validated"),
    ]),

    # Deploy, configure and maintain systems (41-46)
    dict(slug="task-scheduling", title="At, Cron and Systemd Timer Scheduling", domain="System Maintenance", technology="Task Scheduling", scenario="Schedule one maintenance command once, one recurring report through cron, and enable the supplied systemd cleanup timer.", implement="Configure all three scheduling mechanisms", steps=[
        s("atq", "at_queue_inspected", "One-time task queue inspected", "3 Fri Aug 21 23:00:00 2026 a root"),
        s("echo '/usr/local/sbin/rotate-key' | at 23:30", "at_job_created", "One-time key rotation scheduled"),
        s("(crontab -l 2>/dev/null; echo '15 2 * * * /usr/local/sbin/daily-report') | crontab -", "cron_job_created", "Recurring cron report scheduled"),
        s("systemctl enable --now cache-clean.timer", "timer_enabled", "Systemd cleanup timer enabled"),
        s("atq && crontab -l && systemctl list-timers cache-clean.timer", "verified", "All scheduling mechanisms validated"),
    ]),
    dict(slug="service-enable-boot", title="Service Startup and Boot Enablement", domain="System Maintenance", technology="Systemd", scenario="Start the application API immediately and ensure it starts automatically on future boots.", implement="Start and enable the managed service", steps=[
        s("systemctl status app-api.service --no-pager", "service_inspected", "Current service state inspected", "Loaded: loaded; disabled\nActive: inactive (dead)"),
        s("systemctl enable --now app-api.service", "service_enabled_started", "Service enabled and started"),
        s("systemctl is-enabled app-api.service && systemctl is-active app-api.service", "verified", "Boot and runtime service state validated", "enabled\nactive"),
    ]),
    dict(slug="default-boot-target", title="Default Boot Target", domain="System Maintenance", technology="Systemd", scenario="Configure the server to boot into the non-graphical multi-user target by default without disrupting the current session.", implement="Set the persistent default systemd target", steps=[
        s("systemctl get-default", "default_inspected", "Existing default target inspected", "graphical.target"),
        s("systemctl set-default multi-user.target", "default_changed", "Persistent default target changed", "Created symlink /etc/systemd/system/default.target → /usr/lib/systemd/system/multi-user.target."),
        s("readlink -f /etc/systemd/system/default.target", "verified", "New default boot target validated", "/usr/lib/systemd/system/multi-user.target"),
    ]),
    dict(slug="time-service-client", title="Time Service Client", domain="System Maintenance", technology="Time Synchronisation", scenario="Configure the host as a time-service client using the approved source and verify synchronisation health.", implement="Configure and validate the time client", steps=[
        s("timedatectl status", "time_state_inspected", "Current clock and synchronisation state inspected", "System clock synchronized: no\nNTP service: inactive"),
        s("printf 'server time.lab.example iburst\\n' >> /etc/chrony.conf", "time_source_added", "Approved time source configured"),
        s("systemctl enable --now chronyd", "chronyd_enabled", "Time client enabled and started"),
        s("chronyc sources -v", "source_health_checked", "Time source health inspected", "^* time.lab.example 2 6 377 12 +15us[+20us] +/- 3ms"),
        s("timedatectl show -p NTPSynchronized --value", "verified", "Clock synchronisation validated", "yes"),
    ]),
    dict(slug="software-install-update-sources", title="Software Installation and Updates", domain="System Maintenance", technology="RPM and DNF", scenario="Install one approved local RPM, update managed packages from configured remote sources, and review the resulting transaction.", implement="Install and update from approved sources", steps=[
        s("dnf repolist --enabled", "sources_inspected", "Enabled software sources inspected", "rhel-10-baseos\nrhel-10-appstream\ntraining-tools"),
        s("dnf install -y /var/tmp/rcw-agent-2.1-1.el10.x86_64.rpm", "local_rpm_installed", "Approved local RPM installed"),
        s("dnf update -y", "packages_updated", "Installed packages updated from repositories"),
        s("dnf history info last", "verified", "Latest software transaction validated", "Command Line : dnf update -y\nReturn-Code  : Success"),
    ]),
    dict(slug="bootloader-configuration", title="Bootloader Configuration", domain="System Maintenance", technology="Bootloader", scenario="Add persistent auditing to every installed kernel command line and confirm the setting across boot entries.", implement="Modify persistent bootloader kernel arguments", steps=[
        s("grubby --default-kernel", "default_kernel_checked", "Default kernel identified", "/boot/vmlinuz-6.12.0-55.el10.x86_64"),
        s("grubby --update-kernel=ALL --args='audit=1'", "kernel_args_updated", "Auditing argument added to all kernels"),
        s("grubby --info=ALL | grep -E '^args=.*audit=1'", "verified", "Bootloader arguments validated", "args=\"ro crashkernel=auto audit=1\""),
    ]),

    # Manage basic networking (47-50)
    dict(slug="ipv4-ipv6-addressing", title="IPv4 and IPv6 Addressing", domain="Networking", technology="NetworkManager", scenario="Configure the operations connection with the assigned static IPv4 and IPv6 addresses, gateways, and automatic activation.", implement="Configure persistent dual-stack addressing", steps=[
        s("nmcli device status", "interfaces_inspected", "Network devices inspected", "DEVICE TYPE STATE CONNECTION\nens192 ethernet connected Operations"),
        s("nmcli connection modify Operations ipv4.method manual ipv4.addresses 10.24.8.40/24 ipv4.gateway 10.24.8.1", "ipv4_configured", "Static IPv4 configuration applied"),
        s("nmcli connection modify Operations ipv6.method manual ipv6.addresses 2001:db8:24:8::40/64 ipv6.gateway 2001:db8:24:8::1", "ipv6_configured", "Static IPv6 configuration applied"),
        s("nmcli connection modify Operations connection.autoconnect yes && nmcli connection up Operations", "connection_activated", "Connection set to autostart and activated"),
        s("nmcli -f ipv4.addresses,ipv6.addresses,connection.autoconnect connection show Operations", "verified", "Persistent dual-stack configuration validated", "ipv4.addresses: 10.24.8.40/24\nipv6.addresses: 2001:db8:24:8::40/64\nconnection.autoconnect: yes"),
    ]),
    dict(slug="hostname-resolution", title="Hostname and Name Resolution", domain="Networking", technology="DNS and Hostnames", scenario="Assign the approved fully qualified hostname, provide an emergency local mapping, configure DNS, and verify resolution order.", implement="Configure hostname and resolution sources", steps=[
        s("hostnamectl status", "hostname_inspected", "Current hostname inspected", "Static hostname: localhost.localdomain"),
        s("hostnamectl set-hostname app01.lab.example", "hostname_set", "Approved static hostname configured"),
        s("printf '10.24.8.21 repo.lab.example repo\\n' >> /etc/hosts", "hosts_mapping_added", "Emergency local mapping added"),
        s("nmcli connection modify Operations ipv4.dns '10.24.8.10 10.24.8.11' && nmcli connection up Operations", "dns_configured", "Approved DNS servers configured"),
        s("getent hosts repo.lab.example", "verified", "Hostname resolution validated", "10.24.8.21 repo.lab.example repo"),
    ]),
    dict(slug="network-autostart", title="Network Service Autostart", domain="Networking", technology="NetworkManager", scenario="Ensure the management connection and NetworkManager service recover automatically after boot.", implement="Enable persistent network startup", steps=[
        s("nmcli connection show Management", "connection_inspected", "Management connection inspected", "connection.autoconnect: no"),
        s("nmcli connection modify Management connection.autoconnect yes", "autoconnect_enabled", "Connection autoconnect enabled"),
        s("systemctl enable --now NetworkManager", "network_service_enabled", "NetworkManager enabled and started"),
        s("nmcli -f GENERAL.STATE,GENERAL.CONNECTION device show ens224 && systemctl is-enabled NetworkManager", "verified", "Connection and boot service state validated", "GENERAL.STATE: 100 (connected)\nGENERAL.CONNECTION: Management\nenabled"),
    ]),
    dict(slug="firewall-network-restriction", title="Restrict Network Access", domain="Networking", technology="Firewalld", scenario="Limit SSH exposure to the internal operations subnet while leaving the public zone without SSH access.", implement="Restrict SSH to the approved source zone", steps=[
        s("firewall-cmd --get-active-zones", "zones_inspected", "Active firewall zones inspected", "public\n  interfaces: ens192\ninternal\n  interfaces: ens224"),
        s("firewall-cmd --permanent --zone=internal --add-source=10.24.0.0/16", "source_restricted", "Approved operations subnet assigned"),
        s("firewall-cmd --permanent --zone=internal --add-service=ssh", "internal_ssh_allowed", "SSH allowed in internal zone"),
        s("firewall-cmd --permanent --zone=public --remove-service=ssh", "public_ssh_removed", "SSH removed from public zone"),
        s("firewall-cmd --reload && firewall-cmd --zone=internal --list-all", "verified", "Runtime firewall restriction validated", "services: ssh\nsources: 10.24.0.0/16"),
    ]),

    # Manage users and groups (51-54)
    dict(slug="local-user-lifecycle", title="Local User Account Lifecycle", domain="Users and Groups", technology="User Accounts", scenario="Create the incoming analyst with the assigned UID and shell, adjust the comment, and retire the obsolete temporary account.", implement="Create, modify and remove local accounts", steps=[
        s("getent passwd analyst1 tempvendor", "accounts_inspected", "Relevant local accounts inspected", "tempvendor:x:1890:1890:Temporary Vendor:/home/tempvendor:/bin/bash"),
        s("useradd -u 1750 -m -s /bin/bash analyst1", "user_created", "Incoming analyst account created"),
        s("usermod -c 'Security Analyst' analyst1", "user_modified", "Analyst account attributes modified"),
        s("userdel -r tempvendor", "old_user_deleted", "Obsolete temporary account removed"),
        s("getent passwd analyst1 && ! getent passwd tempvendor", "verified", "Final local account state validated", "analyst1:x:1750:1750:Security Analyst:/home/analyst1:/bin/bash"),
    ]),
    dict(slug="password-aging", title="Passwords and Account Aging", domain="Users and Groups", technology="Account Policy", scenario="Reset the trainee credential and apply the required minimum, maximum, and warning intervals.", implement="Apply local password-aging policy", steps=[
        s("chage -l trainee", "aging_inspected", "Existing password-aging policy inspected", "Maximum number of days between password change: 99999"),
        s("passwd trainee", "password_changed", "Local password changed", "passwd: all authentication tokens updated successfully."),
        s("chage -m 1 -M 90 -W 7 trainee", "aging_policy_set", "Minimum, maximum, and warning intervals set"),
        s("chage -l trainee | grep -E 'Minimum|Maximum|warning'", "verified", "Password-aging policy validated", "Minimum number of days between password change: 1\nMaximum number of days between password change: 90\nNumber of days of warning before password expires: 7"),
    ]),
    dict(slug="local-groups-memberships", title="Local Groups and Memberships", domain="Users and Groups", technology="Group Management", scenario="Create the platform group, append the analyst without losing current memberships, remove a stale member, and retire an empty legacy group.", implement="Manage groups and supplementary membership", steps=[
        s("getent group platform oldproject", "groups_inspected", "Relevant group state inspected", "oldproject:x:3205:analyst1,former"),
        s("groupadd -g 3300 platform", "group_created", "Platform group created"),
        s("usermod -aG platform analyst1", "member_appended", "Analyst appended to platform group"),
        s("gpasswd -d former oldproject", "stale_member_removed", "Stale group membership removed"),
        s("groupdel oldproject", "old_group_deleted", "Empty legacy group deleted"),
        s("id analyst1 | grep platform && ! getent group oldproject", "verified", "Final group membership state validated", "groups=1750(analyst1),3300(platform)"),
    ]),
    dict(slug="privileged-access", title="Controlled Privileged Access", domain="Users and Groups", technology="Sudo", scenario="Grant the operations lead permission to restart only the web service through sudo, using a validated drop-in file.", implement="Configure least-privilege sudo access", steps=[
        s("sudo -l -U opslead", "current_privileges_checked", "Current delegated privileges inspected", "User opslead is not allowed to run sudo on app01."),
        s("printf '%s\\n' 'opslead ALL=(root) /usr/bin/systemctl restart httpd' > /etc/sudoers.d/opslead", "sudo_rule_created", "Command-scoped sudo rule created"),
        s("chmod 0440 /etc/sudoers.d/opslead", "sudo_rule_secured", "Sudo drop-in permissions secured"),
        s("visudo -cf /etc/sudoers.d/opslead", "verified", "Sudo policy syntax validated", "/etc/sudoers.d/opslead: parsed OK"),
    ]),

    # Manage security (55-62)
    dict(slug="firewall-service-policy", title="Firewalld Service and Rich Rules", domain="Security", technology="Firewalld", scenario="Publish the application TLS port and restrict its administrative endpoint with a persistent rich rule.", implement="Configure persistent application firewall policy", steps=[
        s("firewall-cmd --zone=public --list-all", "firewall_policy_inspected", "Current public-zone policy inspected", "services: cockpit dhcpv6-client"),
        s("firewall-cmd --permanent --zone=public --add-port=8443/tcp", "app_port_allowed", "Application TLS port allowed persistently"),
        s("firewall-cmd --permanent --zone=public --add-rich-rule='rule family=ipv4 source address=10.24.8.0/24 port port=9443 protocol=tcp accept'", "admin_rule_added", "Source-restricted administration rule added"),
        s("firewall-cmd --reload", "firewall_reloaded", "Persistent policy loaded into runtime"),
        s("firewall-cmd --zone=public --query-port=8443/tcp && firewall-cmd --zone=public --list-rich-rules", "verified", "Runtime firewall policy validated", "yes\nrule family=\"ipv4\" source address=\"10.24.8.0/24\" port port=\"9443\" protocol=\"tcp\" accept"),
    ]),
    dict(slug="default-file-permissions", title="Default File Permissions", domain="Security", technology="Permissions", scenario="Apply a restrictive default umask for operations users and create a shared directory that preserves its group on new content.", implement="Configure secure default permissions", steps=[
        s("su - opslead -c 'umask'", "current_umask_checked", "Current login umask inspected", "0022"),
        s("printf 'umask 027\\n' > /etc/profile.d/operations-umask.sh", "umask_configured", "Restrictive login umask configured"),
        s("install -d -o root -g operations -m 2770 /srv/operations", "shared_directory_secured", "Setgid shared directory created"),
        s("su - opslead -c 'umask' && stat -c '%G %a' /srv/operations", "verified", "Default and shared-directory permissions validated", "0027\noperations 2770"),
    ]),
    dict(slug="ssh-key-authentication", title="SSH Key-based Authentication", domain="Security", technology="SSH", scenario="Create a modern key pair for the administrator, install it on serverb, and prove that password authentication is unnecessary.", implement="Establish verified key-only SSH access", steps=[
        s("test -e /home/admin/.ssh/id_ed25519", "existing_key_checked", "Existing key state inspected", "test: /home/admin/.ssh/id_ed25519: no such file"),
        s("ssh-keygen -t ed25519 -N '' -f /home/admin/.ssh/id_ed25519", "keypair_created", "ED25519 key pair created", "Your public key has been saved in /home/admin/.ssh/id_ed25519.pub"),
        s("ssh-copy-id -i /home/admin/.ssh/id_ed25519.pub admin@serverb.lab", "key_installed", "Public key installed on remote account", "Number of key(s) added: 1"),
        s("ssh -o PasswordAuthentication=no admin@serverb.lab 'id -un'", "verified", "Passwordless key authentication validated", "admin"),
    ]),
    dict(slug="selinux-enforcement-modes", title="SELinux Enforcement Modes", domain="Security", technology="SELinux", scenario="Demonstrate a temporary permissive diagnostic transition, restore enforcing mode, and ensure enforcing remains configured after reboot.", implement="Manage runtime and persistent SELinux modes", steps=[
        s("getenforce", "selinux_mode_checked", "Current SELinux mode inspected", "Enforcing"),
        s("setenforce 0", "permissive_set", "Runtime mode changed to permissive"),
        s("setenforce 1", "enforcing_restored", "Runtime enforcing mode restored"),
        s("sed -i 's/^SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config", "persistent_enforcing_set", "Persistent enforcing mode configured"),
        s("getenforce && grep '^SELINUX=enforcing' /etc/selinux/config", "verified", "Runtime and persistent SELinux modes validated", "Enforcing\nSELINUX=enforcing"),
    ]),
    dict(slug="selinux-context-identification", title="SELinux File and Process Contexts", domain="Security", technology="SELinux", scenario="Identify the security contexts on the web content and running web processes, then compare the file against policy expectations.", implement="Inspect and interpret SELinux contexts", steps=[
        s("ls -Zd /srv/web /var/www/html", "file_contexts_listed", "Directory security contexts listed", "system_u:object_r:default_t:s0 /srv/web\nsystem_u:object_r:httpd_sys_content_t:s0 /var/www/html"),
        s("ps -eZ | grep httpd", "process_contexts_listed", "Web process contexts listed", "system_u:system_r:httpd_t:s0 1180 ? 00:00:01 httpd"),
        s("matchpathcon /srv/web", "expected_context_checked", "Expected policy context identified", "/srv/web system_u:object_r:httpd_sys_content_t:s0"),
        s("ls -Zd /srv/web && ps -eZ | grep -q httpd_t", "verified", "File and process context evidence validated"),
    ]),
    dict(slug="selinux-restore-contexts", title="Restore Default SELinux Contexts", domain="Security", technology="SELinux", scenario="Repair web content copied with the wrong label by restoring the policy-defined default context recursively.", implement="Restore policy-defined file contexts", steps=[
        s("ls -lZ /srv/web", "incorrect_context_found", "Incorrect file contexts identified", "unconfined_u:object_r:admin_home_t:s0 index.html"),
        s("semanage fcontext -a -t httpd_sys_content_t '/srv/web(/.*)?'", "context_policy_added", "Persistent context mapping added"),
        s("restorecon -Rv /srv/web", "contexts_restored", "Default contexts restored recursively", "Relabeled /srv/web/index.html from admin_home_t to httpd_sys_content_t"),
        s("matchpathcon -V /srv/web/index.html", "verified", "Restored context validated", "/srv/web/index.html verified."),
    ]),
    dict(slug="selinux-port-labels", title="SELinux Port Labels", domain="Security", technology="SELinux", scenario="Allow the web service domain to bind the approved nonstandard TLS port by adding a persistent SELinux port mapping.", implement="Configure the nonstandard SELinux port label", steps=[
        s("semanage port -l | grep '^http_port_t'", "http_ports_inspected", "Existing HTTP port labels inspected", "http_port_t tcp 80, 81, 443, 488, 8008, 8009, 8443"),
        s("semanage port -a -t http_port_t -p tcp 9443", "port_label_added", "Nonstandard HTTP port label added"),
        s("semanage port -l | grep '^http_port_t' | grep 9443", "verified", "SELinux port mapping validated", "http_port_t tcp 9443, 8443, 8009, 8008, 488, 443, 81, 80"),
    ]),
    dict(slug="selinux-booleans", title="Persistent SELinux Booleans", domain="Security", technology="SELinux", scenario="Permit the web service to make required outbound network connections using the narrow policy Boolean and persist the change.", implement="Enable and persist the required SELinux Boolean", steps=[
        s("getsebool httpd_can_network_connect", "boolean_inspected", "Current SELinux Boolean inspected", "httpd_can_network_connect --> off"),
        s("setsebool -P httpd_can_network_connect on", "boolean_enabled", "Required Boolean enabled persistently"),
        s("getsebool httpd_can_network_connect | grep -- '--> on'", "verified", "Persistent Boolean state validated", "httpd_can_network_connect --> on"),
    ]),
]

DOMAIN_SUMMARIES = {
    "Essential Tools": "Shell use, files, links, permissions, text processing, archives, remote access and local documentation.",
    "Software Management": "RPM/DNF and Flatpak repository and application lifecycle tasks.",
    "Shell Scripting": "Original Bash exercises for conditionals, loops, positional inputs and command output.",
    "Running Systems": "Boot, targets, recovery, processes, tuning, logs, services and secure transfer.",
    "Local Storage": "GPT partitions and the LVM physical-volume, volume-group and logical-volume lifecycle.",
    "File Systems": "Local and network file systems, autofs, online growth and permission diagnosis.",
    "System Maintenance": "Scheduling, services, boot defaults, time, software maintenance and bootloader changes.",
    "Networking": "Persistent addressing, resolution, autostart and firewalld network restrictions.",
    "Users and Groups": "Local identities, password policy, group membership and delegated privilege.",
    "Security": "Firewalld, default permissions, SSH keys and SELinux modes, labels, ports and Booleans.",
}


def validate_source() -> None:
    if len(LABS) != TOTAL:
        raise SystemExit(f"Expected {TOTAL} labs, found {len(LABS)}")
    slugs = [lab["slug"] for lab in LABS]
    if len(slugs) != len(set(slugs)):
        raise SystemExit("Duplicate practice lab slug")
    for number, lab in enumerate(LABS, 1):
        if len(lab["steps"]) < 3:
            raise SystemExit(f"Lab {number} has too few steps")
        facts = [step.fact for step in lab["steps"]]
        commands = [step.command for step in lab["steps"]]
        if facts[-1] != "verified":
            raise SystemExit(f"Lab {number} must finish with verified fact")
        if len(facts) != len(set(facts)):
            raise SystemExit(f"Lab {number} has duplicate facts")
        if len(commands) != len(set(commands)):
            raise SystemExit(f"Lab {number} has duplicate command matchers")
        if lab.get("editable") and "script_written" not in lab["editable"]["facts"]:
            raise SystemExit(f"Lab {number} editable file must set script_written")


def build_config(number: int, lab: dict) -> dict:
    steps: list[Step] = lab["steps"]
    middle_facts = [step.fact for step in steps[1:-1]]
    if lab.get("editable"):
        middle_facts = list(lab["editable"]["facts"]) + middle_facts
    labels = {step.fact: step.label for step in steps}
    if lab.get("editable"):
        labels.update({fact: "Required script content saved" for fact in lab["editable"]["facts"]})

    actions = []
    previous: list[str] = []
    for index, step in enumerate(steps):
        requires = [] if index == 0 else previous[-1:]
        if index == len(steps) - 1:
            requires = [fact for fact in middle_facts if fact != "verified"]
        actions.append({
            "pattern": shell_pattern(step.command),
            "command": step.command,
            "sets": [step.fact],
            "requires": requires,
            "output": step.output,
        })
        previous.append(step.fact)

    editable_files = []
    workflow: list[dict] = [{"command": steps[0].command}]
    if lab.get("editable"):
        editable = lab["editable"]
        editable_files.append({
            "path": editable["path"],
            "initial": "",
            "patterns": editable["patterns"],
            "sets": editable["facts"],
        })
        workflow.append({"edit": editable["path"], "content": editable["content"]})
    workflow.extend({"command": step.command} for step in steps[1:])

    inspect_facts = [steps[0].fact]
    objectives = [
        {"id": "assess", "title": "Assess the starting state", "detail": steps[0].label + ".", "points": 20, "requires": inspect_facts},
        {"id": "implement", "title": lab["implement"], "detail": "Produce the required modeled system state using supported administrative commands.", "points": 60, "requires": middle_facts},
        {"id": "validate", "title": "Validate the resulting state", "detail": steps[-1].label + ".", "points": 20, "requires": ["verified"]},
    ]
    return {
        "number": number,
        "total": TOTAL,
        "id": f"rhcsa-practice-{number:02d}-{lab['slug']}",
        "slug": lab["slug"],
        "title": lab["title"],
        "domain": lab["domain"],
        "technology": lab["technology"],
        "scenario": lab["scenario"],
        "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
        "officialObjectivesUrl": OFFICIAL_URL,
        "portrait": "../assets/pradeep-raju.jpg",
        "certificateLabTitle": f"RHCSA Practice Task {number:02d}: {lab['title']}",
        "certificateStatement": f"Demonstrating practical RHEL 10 administration skill in {lab['technology'].lower()} through an original, state-validated exercise.",
        "facts": labels,
        "actions": actions,
        "editableFiles": editable_files,
        "workflow": workflow,
        "objectives": objectives,
    }


INDEX_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="Original stateful RHEL 10 administration task for RHCSA certification practice.">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; font-src 'self'; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'">
  <title>{title} | RHCSA Certification Practice | RCW IT Training</title>
  <link rel="stylesheet" href="../practice.css">
</head>
<body>
  <noscript>This interactive practice task requires JavaScript. Enable it, then reload the page.</noscript>
  <script src="../../passport.js"></script>
  <script src="config.js"></script>
  <script src="../practice-core.js"></script>
  <script src="../practice-engine.js"></script>
</body>
</html>
"""


def guide_markdown(config: dict) -> str:
    workflow_lines = []
    for item in config["workflow"]:
        if "command" in item:
            workflow_lines.append(f"```bash\n{item['command']}\n```")
        else:
            workflow_lines.append(f"Edit `{item['edit']}` with content that satisfies the mission. One valid example is:\n\n```bash\n{item['content'].rstrip()}\n```")
    objective_rows = "\n".join(
        f"| {obj['title']} | {obj['points']} | {', '.join(config['facts'].get(f, f) for f in obj['requires'])} |"
        for obj in config["objectives"]
    )
    return f"""# {config['title']}

**RHCSA Certification Practice · Task {config['number']:02d} of {TOTAL} · {config['domain']}**

## Purpose

{config['scenario']}

This is an original RCW IT Training, RHCSA-aligned preparation exercise for RHEL 10. It is not an official exam environment, does not contain copied exam questions, and is not affiliated with or endorsed by a certification vendor. Always review the current [published EX200 objectives]({OFFICIAL_URL}) before scheduling an exam.

## Scoring

| Objective | Points | Modeled evidence |
|---|---:|---|
{objective_rows}

The score is calculated from the modeled resulting state. Completing a command line alone does not award points unless the required state is present. Total: **100 points**.

## One valid workflow

{"\n\n".join(workflow_lines)}

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
"""


def group_index() -> str:
    return """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="62 original RHEL 10 task labs organised for RHCSA certification practice.">
  <meta name="referrer" content="strict-origin-when-cross-origin">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'">
  <title>RHCSA Certification Practice | RCW IT Training</title>
  <link rel="stylesheet" href="group.css">
</head>
<body>
  <a class="skip" href="#practiceTasks">Skip to practice tasks</a>
  <header class="site-head"><a class="brand" href="../"><span>RCW</span><strong>RCW IT Training</strong></a><a class="back" href="../">All labs</a></header>
  <main>
    <section class="hero">
      <div class="hero-copy"><p class="eyebrow">RHEL 10 · Performance practice</p><h1>RHCSA Certification <span>Practice</span></h1><p>Build confidence across every published EX200 task area with 62 original, independent, state-validated challenges.</p><div class="hero-actions"><a href="#practiceTasks" class="primary">Browse all tasks</a><a href="{official}" class="secondary" target="_blank" rel="noopener noreferrer">Review official objectives</a></div></div>
      <div class="summary-card"><div><strong>62</strong><span>Independent tasks</span></div><div><strong>10</strong><span>Technology domains</span></div><div><strong>100</strong><span>Points per task</span></div><p>Original RCW IT Training practice. No copied exam questions.</p></div>
    </section>
    <section class="catalogue" id="practiceTasks"><div class="section-head"><div><p class="eyebrow">Structured task library</p><h2>Choose a technology domain</h2></div><label class="search"><span>Search</span><input id="taskSearch" type="search" placeholder="Search tasks and technologies…" autocomplete="off"></label></div><div class="domain-nav" id="domainNav" aria-label="Technology domains"></div><p class="count" id="taskCount"></p><div id="taskGroups"></div><p class="empty" id="emptyState" hidden>No practice task matches that search.</p></section>
    <section class="notice"><strong>Independent preparation resource</strong><p>These exercises are mapped to public skill areas, not to confidential or proprietary exam questions. Product names are used only to identify the technology being practised.</p></section>
  </main>
  <footer><p>© RCW IT Training · Learn. Practice. Grow.</p><a href="../disclaimer.html">Disclaimer</a><a href="../privacy.html">Privacy</a></footer>
  <script src="group-data.js"></script><script src="group.js"></script>
</body>
</html>
""".format(official=html.escape(OFFICIAL_URL, quote=True))


def generate() -> None:
    validate_source()
    OUT.mkdir(exist_ok=True)
    # Generated task directories only; preserve shared hand-authored files.
    for child in OUT.iterdir():
        if child.is_dir() and re.match(r"^\d{2}-", child.name):
            shutil.rmtree(child)

    configs = []
    for number, lab in enumerate(LABS, 1):
        config = build_config(number, lab)
        configs.append(config)
        folder = OUT / f"{number:02d}-{lab['slug']}"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "index.html").write_text(INDEX_TEMPLATE.format(title=html.escape(lab["title"])))
        config_json = json.dumps(config, indent=2, ensure_ascii=False)
        (folder / "config.js").write_text(f"window.RCW_RHCSA_PRACTICE = Object.freeze({config_json});\n")
        (folder / "LAB_GUIDE.md").write_text(guide_markdown(config))

    (OUT / "index.html").write_text(group_index())
    group_data = [{
        "number": c["number"], "id": c["id"], "slug": c["slug"], "title": c["title"],
        "domain": c["domain"], "technology": c["technology"],
        "url": f"./{c['number']:02d}-{c['slug']}/",
    } for c in configs]
    (OUT / "group-data.js").write_text("window.RCW_RHCSA_PRACTICE_TASKS = Object.freeze(" + json.dumps(group_data, indent=2, ensure_ascii=False) + ");\n")
    (OUT / "manifest.json").write_text(json.dumps({
        "title": "RHCSA Certification Practice", "total": TOTAL,
        "officialObjectivesUrl": OFFICIAL_URL, "domains": DOMAIN_SUMMARIES, "tasks": group_data,
    }, indent=2, ensure_ascii=False) + "\n")

    print(f"Generated {len(configs)} original RHCSA practice labs in {OUT}")


if __name__ == "__main__":
    generate()
