window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 34,
  "total": 62,
  "id": "rhcsa-practice-34-persistent-mount-identifiers",
  "slug": "persistent-mount-identifiers",
  "title": "Persistent Mounts by UUID or Label",
  "domain": "Local Storage",
  "technology": "Persistent Mounts",
  "scenario": "Configure the existing XFS data volume to mount at boot using its UUID rather than a device name.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 34: Persistent Mounts by UUID or Label",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in persistent mounts through an original, state-validated exercise.",
  "facts": {
    "uuid_discovered": "File-system UUID discovered",
    "mountpoint_created": "Persistent mount point created",
    "fstab_updated": "UUID-based boot mount recorded",
    "fstab_tested": "Persistent mounts tested without reboot",
    "verified": "Mounted file system validated"
  },
  "actions": [
    {
      "pattern": "^blkid\\s+/dev/vgapp/lvdata$",
      "command": "blkid /dev/vgapp/lvdata",
      "sets": [
        "uuid_discovered"
      ],
      "requires": [],
      "output": "/dev/mapper/vgapp-lvdata: UUID=7b5d-rcw-2026 TYPE=xfs"
    },
    {
      "pattern": "^mkdir\\s+\\-p\\s+/data$",
      "command": "mkdir -p /data",
      "sets": [
        "mountpoint_created"
      ],
      "requires": [
        "uuid_discovered"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^printf\\s+'UUID=7b5d\\-rcw\\-2026\\s+/data\\s+xfs\\s+defaults\\s+0\\s+0\\\\n'\\s+>>\\s+/etc/fstab$",
      "command": "printf 'UUID=7b5d-rcw-2026 /data xfs defaults 0 0\\n' >> /etc/fstab",
      "sets": [
        "fstab_updated"
      ],
      "requires": [
        "mountpoint_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^mount\\s+\\-a$",
      "command": "mount -a",
      "sets": [
        "fstab_tested"
      ],
      "requires": [
        "fstab_updated"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^findmnt\\s+\\-no\\s+SOURCE,FSTYPE,TARGET\\s+/data$",
      "command": "findmnt -no SOURCE,FSTYPE,TARGET /data",
      "sets": [
        "verified"
      ],
      "requires": [
        "mountpoint_created",
        "fstab_updated",
        "fstab_tested"
      ],
      "output": "/dev/mapper/vgapp-lvdata xfs /data"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "blkid /dev/vgapp/lvdata"
    },
    {
      "command": "mkdir -p /data"
    },
    {
      "command": "printf 'UUID=7b5d-rcw-2026 /data xfs defaults 0 0\\n' >> /etc/fstab"
    },
    {
      "command": "mount -a"
    },
    {
      "command": "findmnt -no SOURCE,FSTYPE,TARGET /data"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "File-system UUID discovered.",
      "points": 20,
      "requires": [
        "uuid_discovered"
      ]
    },
    {
      "id": "implement",
      "title": "Create a persistent identifier-based mount",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "mountpoint_created",
        "fstab_updated",
        "fstab_tested"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Mounted file system validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
