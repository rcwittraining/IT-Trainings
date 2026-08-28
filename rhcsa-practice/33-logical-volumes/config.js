window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 33,
  "total": 62,
  "id": "rhcsa-practice-33-logical-volumes",
  "slug": "logical-volumes",
  "title": "LVM Logical Volume Lifecycle",
  "domain": "Local Storage",
  "technology": "LVM",
  "scenario": "Create the replacement application logical volume and delete the confirmed retired logical volume.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 33: LVM Logical Volume Lifecycle",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in lvm through an original, state-validated exercise.",
  "facts": {
    "lvs_inspected": "Logical volume inventory inspected",
    "lv_created": "Replacement logical volume created",
    "old_lv_removed": "Retired logical volume removed",
    "verified": "Logical volume state validated"
  },
  "actions": [
    {
      "pattern": "^lvs\\s+\\-o\\s+lv_name,vg_name,lv_size$",
      "command": "lvs -o lv_name,vg_name,lv_size",
      "sets": [
        "lvs_inspected"
      ],
      "requires": [],
      "output": "lvold vgapp 512.00m"
    },
    {
      "pattern": "^lvcreate\\s+\\-L\\s+2G\\s+\\-n\\s+lvapp\\s+vgapp$",
      "command": "lvcreate -L 2G -n lvapp vgapp",
      "sets": [
        "lv_created"
      ],
      "requires": [
        "lvs_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^lvremove\\s+\\-y\\s+/dev/vgapp/lvold$",
      "command": "lvremove -y /dev/vgapp/lvold",
      "sets": [
        "old_lv_removed"
      ],
      "requires": [
        "lv_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^lvs\\s+vgapp/lvapp\\s+\\-o\\s+lv_name,lv_size\\s+\\-\\-noheadings$",
      "command": "lvs vgapp/lvapp -o lv_name,lv_size --noheadings",
      "sets": [
        "verified"
      ],
      "requires": [
        "lv_created",
        "old_lv_removed"
      ],
      "output": "lvapp 2.00g"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "lvs -o lv_name,vg_name,lv_size"
    },
    {
      "command": "lvcreate -L 2G -n lvapp vgapp"
    },
    {
      "command": "lvremove -y /dev/vgapp/lvold"
    },
    {
      "command": "lvs vgapp/lvapp -o lv_name,lv_size --noheadings"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Logical volume inventory inspected.",
      "points": 20,
      "requires": [
        "lvs_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Create and remove logical volumes",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "lv_created",
        "old_lv_removed"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Logical volume state validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
