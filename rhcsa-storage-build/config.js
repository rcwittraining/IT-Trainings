window.RCW_RHCSA_CHALLENGE = Object.freeze({
  scenario: "storage",
  slug: "RHCSA-Persistent-Storage-Build",
  title: "Persistent Storage Build Challenge",
  heroLine1: "Build storage that",
  heroLine2: "survives a reboot.",
  summary: "Provision an unused disk from its GPT label through LVM, XFS, UUID-based mounting and persistent swap. The evaluator checks the final modeled system state after every action.",
  scenarioLabel: "Storage lifecycle · persistence",
  missionTitle: "Provision the data disk",
  brief: "A new 12 GiB disk, /dev/sdc, has been attached to server1. Build an 8 GiB LVM partition, provide /reports and add swap without changing the operating-system disk.",
  terminalWelcome: "The operating system is on /dev/sda. The unused practice disk is /dev/sdc.",
  guideIntro: "Inspect first, then configure each storage layer. Re-run verification commands whenever you need to confirm the modeled state.",
  portrait: "assets/pradeep-raju.jpg",
  certificateLabTitle: "RHEL 10 Persistent Storage Build Challenge",
  certificateStatement: "Demonstrating practical skill in GPT partitioning, LVM provisioning, XFS creation, UUID-based persistent mounting and persistent swap activation.",
  initialDirs: ["/", "/etc", "/var", "/var/log", "/boot"],
  initialFiles: {
    "/etc/fstab": "# /etc/fstab\nUUID=ROOT-RHEL10  /      xfs   defaults  0 0\nUUID=BOOT-RHEL10  /boot  xfs   defaults  0 0\n"
  },
  reminders: ["lsblk -f", "parted", "pvcreate / vgcreate / lvcreate", "mkfs.xfs", "vi /etc/fstab", "mount -a", "swapon -a"],
  objectives: [
    { id: "inventory", title: "Inventory block storage", detail: "Inspect devices and filesystem signatures before making changes.", points: 10 },
    { id: "partition", title: "Create the GPT partition", detail: "Give /dev/sdc a GPT label and create an 8 GiB /dev/sdc1 partition.", points: 15 },
    { id: "lvm", title: "Build the LVM foundation", detail: "Initialize /dev/sdc1 and create the volume group vg_exam.", points: 20 },
    { id: "filesystem", title: "Create the reports filesystem", detail: "Create a 4 GiB logical volume named lv_reports and format it as XFS.", points: 20 },
    { id: "mount", title: "Persist /reports by UUID", detail: "Create /reports, add UUID=RCW-REPORTS to /etc/fstab and successfully apply it.", points: 20 },
    { id: "swap", title: "Add persistent swap", detail: "Create 1 GiB lv_swap, initialize it, persist it in fstab and activate it.", points: 15 }
  ]
});
