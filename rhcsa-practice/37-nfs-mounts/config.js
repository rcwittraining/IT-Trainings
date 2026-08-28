window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 37,
  "total": 62,
  "id": "rhcsa-practice-37-nfs-mounts",
  "slug": "nfs-mounts",
  "title": "NFS Network File Systems",
  "domain": "File Systems",
  "technology": "NFS",
  "scenario": "Mount the approved engineering export now and configure the same NFS mount to return after reboot.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 37: NFS Network File Systems",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in nfs through an original, state-validated exercise.",
  "facts": {
    "exports_inspected": "Available NFS exports inspected",
    "nfs_mountpoint_created": "NFS mount point created",
    "nfs_fstab_added": "Persistent NFS mount recorded",
    "nfs_mounted": "NFS export mounted",
    "verified": "NFS mount validated"
  },
  "actions": [
    {
      "pattern": "^showmount\\s+\\-e\\s+files\\.lab\\.example$",
      "command": "showmount -e files.lab.example",
      "sets": [
        "exports_inspected"
      ],
      "requires": [],
      "output": "/exports/engineering 10.24.0.0/16"
    },
    {
      "pattern": "^mkdir\\s+\\-p\\s+/engineering$",
      "command": "mkdir -p /engineering",
      "sets": [
        "nfs_mountpoint_created"
      ],
      "requires": [
        "exports_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^printf\\s+'files\\.lab\\.example:/exports/engineering\\s+/engineering\\s+nfs4\\s+defaults,_netdev\\s+0\\s+0\\\\n'\\s+>>\\s+/etc/fstab$",
      "command": "printf 'files.lab.example:/exports/engineering /engineering nfs4 defaults,_netdev 0 0\\n' >> /etc/fstab",
      "sets": [
        "nfs_fstab_added"
      ],
      "requires": [
        "nfs_mountpoint_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^mount\\s+/engineering$",
      "command": "mount /engineering",
      "sets": [
        "nfs_mounted"
      ],
      "requires": [
        "nfs_fstab_added"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^findmnt\\s+\\-no\\s+SOURCE,FSTYPE\\s+/engineering$",
      "command": "findmnt -no SOURCE,FSTYPE /engineering",
      "sets": [
        "verified"
      ],
      "requires": [
        "nfs_mountpoint_created",
        "nfs_fstab_added",
        "nfs_mounted"
      ],
      "output": "files.lab.example:/exports/engineering nfs4"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "showmount -e files.lab.example"
    },
    {
      "command": "mkdir -p /engineering"
    },
    {
      "command": "printf 'files.lab.example:/exports/engineering /engineering nfs4 defaults,_netdev 0 0\\n' >> /etc/fstab"
    },
    {
      "command": "mount /engineering"
    },
    {
      "command": "findmnt -no SOURCE,FSTYPE /engineering"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Available NFS exports inspected.",
      "points": 20,
      "requires": [
        "exports_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Create an active and persistent NFS mount",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "nfs_mountpoint_created",
        "nfs_fstab_added",
        "nfs_mounted"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "NFS mount validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
