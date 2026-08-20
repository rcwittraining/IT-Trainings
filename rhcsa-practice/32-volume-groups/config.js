window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 32,
  "total": 62,
  "id": "rhcsa-practice-32-volume-groups",
  "slug": "volume-groups",
  "title": "LVM Volume Groups",
  "domain": "Local Storage",
  "technology": "LVM",
  "scenario": "Create the application volume group from the first approved PV, then add the second PV to expand its capacity.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 32: LVM Volume Groups",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in lvm through an original, state-validated exercise.",
  "facts": {
    "available_pvs_checked": "Available physical volumes inspected",
    "vg_created": "Application volume group created",
    "vg_extended": "Second physical volume assigned to the group",
    "verified": "Volume group membership validated"
  },
  "actions": [
    {
      "pattern": "^pvs$",
      "command": "pvs",
      "sets": [
        "available_pvs_checked"
      ],
      "requires": [],
      "output": "/dev/vdb1\n/dev/vdc1"
    },
    {
      "pattern": "^vgcreate\\s+vgapp\\s+/dev/vdb1$",
      "command": "vgcreate vgapp /dev/vdb1",
      "sets": [
        "vg_created"
      ],
      "requires": [
        "available_pvs_checked"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^vgextend\\s+vgapp\\s+/dev/vdc1$",
      "command": "vgextend vgapp /dev/vdc1",
      "sets": [
        "vg_extended"
      ],
      "requires": [
        "vg_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^vgs\\s+vgapp\\s+\\-o\\s+vg_name,pv_count,vg_size$",
      "command": "vgs vgapp -o vg_name,pv_count,vg_size",
      "sets": [
        "verified"
      ],
      "requires": [
        "vg_created",
        "vg_extended"
      ],
      "output": "VG #PV VSize\nvgapp 2 3.99g"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "pvs"
    },
    {
      "command": "vgcreate vgapp /dev/vdb1"
    },
    {
      "command": "vgextend vgapp /dev/vdc1"
    },
    {
      "command": "vgs vgapp -o vg_name,pv_count,vg_size"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Available physical volumes inspected.",
      "points": 20,
      "requires": [
        "available_pvs_checked"
      ]
    },
    {
      "id": "implement",
      "title": "Create and extend the volume group",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "vg_created",
        "vg_extended"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Volume group membership validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
