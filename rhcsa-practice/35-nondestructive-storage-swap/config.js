window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 35,
  "total": 62,
  "id": "rhcsa-practice-35-nondestructive-storage-swap",
  "slug": "nondestructive-storage-swap",
  "title": "Non-destructive Storage and Swap",
  "domain": "Local Storage",
  "technology": "LVM and Swap",
  "scenario": "Add a 1 GiB swap logical volume to the running system without disturbing existing data and make it persistent.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 35: Non-destructive Storage and Swap",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in lvm and swap through an original, state-validated exercise.",
  "facts": {
    "free_space_checked": "Volume-group free space inspected",
    "swap_lv_created": "Swap logical volume created",
    "swap_formatted": "Logical volume formatted as swap",
    "swap_activated": "New swap activated online",
    "swap_persisted": "Swap activation made persistent",
    "verified": "Active swap validated"
  },
  "actions": [
    {
      "pattern": "^vgs\\s+vgsystem\\s+\\-o\\s+vg_name,vg_free$",
      "command": "vgs vgsystem -o vg_name,vg_free",
      "sets": [
        "free_space_checked"
      ],
      "requires": [],
      "output": "vgsystem 4.00g"
    },
    {
      "pattern": "^lvcreate\\s+\\-L\\s+1G\\s+\\-n\\s+lvswap\\s+vgsystem$",
      "command": "lvcreate -L 1G -n lvswap vgsystem",
      "sets": [
        "swap_lv_created"
      ],
      "requires": [
        "free_space_checked"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^mkswap\\s+/dev/vgsystem/lvswap$",
      "command": "mkswap /dev/vgsystem/lvswap",
      "sets": [
        "swap_formatted"
      ],
      "requires": [
        "swap_lv_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^swapon\\s+/dev/vgsystem/lvswap$",
      "command": "swapon /dev/vgsystem/lvswap",
      "sets": [
        "swap_activated"
      ],
      "requires": [
        "swap_formatted"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^printf\\s+'/dev/vgsystem/lvswap\\s+none\\s+swap\\s+defaults\\s+0\\s+0\\\\n'\\s+>>\\s+/etc/fstab$",
      "command": "printf '/dev/vgsystem/lvswap none swap defaults 0 0\\n' >> /etc/fstab",
      "sets": [
        "swap_persisted"
      ],
      "requires": [
        "swap_activated"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^swapon\\s+\\-\\-show\\s+\\|\\s+grep\\s+lvswap$",
      "command": "swapon --show | grep lvswap",
      "sets": [
        "verified"
      ],
      "requires": [
        "swap_lv_created",
        "swap_formatted",
        "swap_activated",
        "swap_persisted"
      ],
      "output": "/dev/dm-3 partition 1024M 0B -2"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "vgs vgsystem -o vg_name,vg_free"
    },
    {
      "command": "lvcreate -L 1G -n lvswap vgsystem"
    },
    {
      "command": "mkswap /dev/vgsystem/lvswap"
    },
    {
      "command": "swapon /dev/vgsystem/lvswap"
    },
    {
      "command": "printf '/dev/vgsystem/lvswap none swap defaults 0 0\\n' >> /etc/fstab"
    },
    {
      "command": "swapon --show | grep lvswap"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Volume-group free space inspected.",
      "points": 20,
      "requires": [
        "free_space_checked"
      ]
    },
    {
      "id": "implement",
      "title": "Add persistent swap non-destructively",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "swap_lv_created",
        "swap_formatted",
        "swap_activated",
        "swap_persisted"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Active swap validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
