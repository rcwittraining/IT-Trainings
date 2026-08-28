window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 39,
  "total": 62,
  "id": "rhcsa-practice-39-extend-logical-volume",
  "slug": "extend-logical-volume",
  "title": "Extend an Existing Logical Volume",
  "domain": "File Systems",
  "technology": "LVM and File Systems",
  "scenario": "Increase the nearly full XFS application volume by 2 GiB and grow its file system online in one controlled operation.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 39: Extend an Existing Logical Volume",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in lvm and file systems through an original, state-validated exercise.",
  "facts": {
    "capacity_inspected": "Logical volume and file-system capacity inspected",
    "lv_and_fs_extended": "Logical volume and file system extended online",
    "verified": "Extended capacity validated"
  },
  "actions": [
    {
      "pattern": "^lvs\\s+/dev/vgapp/lvdata\\s+\\-o\\s+lv_size\\s+\\&\\&\\s+df\\s+\\-hT\\s+/data$",
      "command": "lvs /dev/vgapp/lvdata -o lv_size && df -hT /data",
      "sets": [
        "capacity_inspected"
      ],
      "requires": [],
      "output": "LSize 4.00g\n/dev/mapper/vgapp-lvdata xfs 4.0G 3.6G 410M 90% /data"
    },
    {
      "pattern": "^lvextend\\s+\\-r\\s+\\-L\\s+\\+2G\\s+/dev/vgapp/lvdata$",
      "command": "lvextend -r -L +2G /dev/vgapp/lvdata",
      "sets": [
        "lv_and_fs_extended"
      ],
      "requires": [
        "capacity_inspected"
      ],
      "output": "Size of logical volume vgapp/lvdata changed from 4.00 GiB to 6.00 GiB."
    },
    {
      "pattern": "^lvs\\s+/dev/vgapp/lvdata\\s+\\-o\\s+lv_size\\s+\\-\\-noheadings\\s+\\&\\&\\s+df\\s+\\-hT\\s+/data$",
      "command": "lvs /dev/vgapp/lvdata -o lv_size --noheadings && df -hT /data",
      "sets": [
        "verified"
      ],
      "requires": [
        "lv_and_fs_extended"
      ],
      "output": "6.00g\n/dev/mapper/vgapp-lvdata xfs 6.0G 3.6G 2.4G 60% /data"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "lvs /dev/vgapp/lvdata -o lv_size && df -hT /data"
    },
    {
      "command": "lvextend -r -L +2G /dev/vgapp/lvdata"
    },
    {
      "command": "lvs /dev/vgapp/lvdata -o lv_size --noheadings && df -hT /data"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Logical volume and file-system capacity inspected.",
      "points": 20,
      "requires": [
        "capacity_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Extend the LV and its file system",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "lv_and_fs_extended"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Extended capacity validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
