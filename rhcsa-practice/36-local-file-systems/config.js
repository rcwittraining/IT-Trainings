window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 36,
  "total": 62,
  "id": "rhcsa-practice-36-local-file-systems",
  "slug": "local-file-systems",
  "title": "VFAT, ext4 and XFS File Systems",
  "domain": "File Systems",
  "technology": "Local File Systems",
  "scenario": "Prepare three training volumes with the required VFAT, ext4, and XFS formats, mount them, and verify each type.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 36: VFAT, ext4 and XFS File Systems",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in local file systems through an original, state-validated exercise.",
  "facts": {
    "devices_inspected": "Target devices inspected",
    "vfat_created": "VFAT file system created",
    "ext4_created": "ext4 file system created",
    "xfs_created": "XFS file system created",
    "filesystems_mounted": "All three file systems mounted",
    "verified": "Mounted file-system types validated"
  },
  "actions": [
    {
      "pattern": "^lsblk\\s+\\-f\\s+/dev/vdb\\s+/dev/vdc\\s+/dev/vdd$",
      "command": "lsblk -f /dev/vdb /dev/vdc /dev/vdd",
      "sets": [
        "devices_inspected"
      ],
      "requires": [],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^mkfs\\.vfat\\s+\\-n\\s+TRANSFER\\s+/dev/vdb1$",
      "command": "mkfs.vfat -n TRANSFER /dev/vdb1",
      "sets": [
        "vfat_created"
      ],
      "requires": [
        "devices_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^mkfs\\.ext4\\s+\\-L\\s+ARCHIVE\\s+/dev/vdc1$",
      "command": "mkfs.ext4 -L ARCHIVE /dev/vdc1",
      "sets": [
        "ext4_created"
      ],
      "requires": [
        "vfat_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^mkfs\\.xfs\\s+\\-L\\s+APPDATA\\s+/dev/vdd1$",
      "command": "mkfs.xfs -L APPDATA /dev/vdd1",
      "sets": [
        "xfs_created"
      ],
      "requires": [
        "ext4_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^mkdir\\s+\\-p\\s+/mnt/transfer\\s+/mnt/archive\\s+/mnt/appdata\\s+\\&\\&\\s+mount\\s+/dev/vdb1\\s+/mnt/transfer\\s+\\&\\&\\s+mount\\s+/dev/vdc1\\s+/mnt/archive\\s+\\&\\&\\s+mount\\s+/dev/vdd1\\s+/mnt/appdata$",
      "command": "mkdir -p /mnt/transfer /mnt/archive /mnt/appdata && mount /dev/vdb1 /mnt/transfer && mount /dev/vdc1 /mnt/archive && mount /dev/vdd1 /mnt/appdata",
      "sets": [
        "filesystems_mounted"
      ],
      "requires": [
        "xfs_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^findmnt\\s+\\-no\\s+FSTYPE\\s+/mnt/transfer\\s+/mnt/archive\\s+/mnt/appdata$",
      "command": "findmnt -no FSTYPE /mnt/transfer /mnt/archive /mnt/appdata",
      "sets": [
        "verified"
      ],
      "requires": [
        "vfat_created",
        "ext4_created",
        "xfs_created",
        "filesystems_mounted"
      ],
      "output": "vfat\next4\nxfs"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "lsblk -f /dev/vdb /dev/vdc /dev/vdd"
    },
    {
      "command": "mkfs.vfat -n TRANSFER /dev/vdb1"
    },
    {
      "command": "mkfs.ext4 -L ARCHIVE /dev/vdc1"
    },
    {
      "command": "mkfs.xfs -L APPDATA /dev/vdd1"
    },
    {
      "command": "mkdir -p /mnt/transfer /mnt/archive /mnt/appdata && mount /dev/vdb1 /mnt/transfer && mount /dev/vdc1 /mnt/archive && mount /dev/vdd1 /mnt/appdata"
    },
    {
      "command": "findmnt -no FSTYPE /mnt/transfer /mnt/archive /mnt/appdata"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Target devices inspected.",
      "points": 20,
      "requires": [
        "devices_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Create and mount three local file-system types",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "vfat_created",
        "ext4_created",
        "xfs_created",
        "filesystems_mounted"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Mounted file-system types validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
