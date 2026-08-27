window.RCW_RHCSA_CHALLENGE = Object.freeze({
  scenario: "system",
  slug: "RHCSA-Boot-Timers-Recovery",
  title: "Boot, Timers and Recovery Challenge",
  heroLine1: "Control boot, time",
  heroLine2: "and scheduled work.",
  summary: "Repair a server baseline with a persistent boot target, synchronized time, durable journals, a native systemd timer and a regenerated bootloader configuration.",
  scenarioLabel: "systemd · journals · boot",
  missionTitle: "Harden system operations",
  brief: "server1 was cloned with workstation defaults and incomplete operations controls. Convert it to a durable server baseline without relying on a reboot to hide mistakes.",
  terminalWelcome: "The host currently starts graphical.target. Chrony, persistent journals and the report timer require configuration.",
  guideIntro: "Inspect the current boot state first. Configuration-file objectives are awarded only after the related service or generator action applies that content.",
  portrait: "assets/pradeep-raju.jpg",
  certificateLabTitle: "RHEL 10 Boot, Timers and Recovery Challenge",
  certificateStatement: "Demonstrating practical skill in systemd target selection, time synchronization, persistent journal storage, timer units and bootloader configuration generation.",
  initialDirs: ["/", "/etc", "/etc/default", "/etc/systemd", "/etc/systemd/system", "/var", "/var/log", "/usr/local/sbin", "/boot", "/boot/grub2"],
  initialFiles: {
    "/etc/chrony.conf": "# RHEL 10 time client configuration\ndriftfile /var/lib/chrony/drift\nmakestep 1.0 3\nrtcsync\n",
    "/etc/default/grub": "GRUB_TIMEOUT=1\nGRUB_DISTRIBUTOR=\"$(sed 's, release .*$,,g' /etc/system-release)\"\nGRUB_DEFAULT=saved\nGRUB_DISABLE_SUBMENU=true\nGRUB_TERMINAL_OUTPUT=console\nGRUB_CMDLINE_LINUX=\"rhgb quiet\"\n",
    "/usr/local/sbin/rhcsa-report": "#!/bin/bash\ndate >> /var/log/rhcsa-report.log\n"
  },
  reminders: ["systemctl get-default", "systemctl isolate", "journalctl -b -p err", "vi /etc/chrony.conf", "systemctl daemon-reload", "systemctl list-timers", "grub2-mkconfig"],
  objectives: [
    { id: "inspect", title: "Exercise the rescue target", detail: "Inspect boot state, enter rescue.target and return the current session to multi-user.target.", points: 10 },
    { id: "target", title: "Persist the server target", detail: "Configure multi-user.target as the default boot target.", points: 15 },
    { id: "time", title: "Synchronize system time", detail: "Use time.example.net with iburst, enable and restart chronyd, then verify its source.", points: 20 },
    { id: "journal", title: "Make journals persistent", detail: "Create /var/log/journal, restart journald and inspect journal disk usage.", points: 15 },
    { id: "timer", title: "Deploy a native timer", detail: "Create a oneshot rhcsa-report service and a persistent daily timer, reload and enable it.", points: 25 },
    { id: "grub", title: "Apply the bootloader setting", detail: "Set GRUB_TIMEOUT=5 and regenerate /boot/grub2/grub.cfg.", points: 15 }
  ]
});
