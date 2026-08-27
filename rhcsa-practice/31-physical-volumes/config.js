window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 31,
  "total": 62,
  "id": "rhcsa-practice-31-physical-volumes",
  "slug": "physical-volumes",
  "title": "LVM Physical Volumes",
  "domain": "Local Storage",
  "technology": "LVM",
  "scenario": "Prepare the approved partition as a new LVM physical volume and retire an unused unassigned physical volume.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 31: LVM Physical Volumes",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in lvm through an original, state-validated exercise.",
  "facts": {
    "pvs_inspected": "Physical volume inventory inspected",
    "pv_created": "New physical volume created",
    "old_pv_removed": "Unused physical volume removed",
    "verified": "Physical volume state validated"
  },
  "actions": [
    {
      "pattern": "^pvs\\s+\\-o\\s+pv_name,vg_name,pv_size$",
      "command": "pvs -o pv_name,vg_name,pv_size",
      "sets": [
        "pvs_inspected"
      ],
      "requires": [],
      "output": "/dev/vdc1  -  1.00g"
    },
    {
      "pattern": "^pvcreate\\s+/dev/vdb1$",
      "command": "pvcreate /dev/vdb1",
      "sets": [
        "pv_created"
      ],
      "requires": [
        "pvs_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^pvremove\\s+\\-y\\s+/dev/vdc1$",
      "command": "pvremove -y /dev/vdc1",
      "sets": [
        "old_pv_removed"
      ],
      "requires": [
        "pv_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^pvs\\s+\\-o\\s+pv_name,vg_name\\s+\\|\\s+grep\\s+/dev/vdb1$",
      "command": "pvs -o pv_name,vg_name | grep /dev/vdb1",
      "sets": [
        "verified"
      ],
      "requires": [
        "pv_created",
        "old_pv_removed"
      ],
      "output": "/dev/vdb1"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "pvs -o pv_name,vg_name,pv_size"
    },
    {
      "command": "pvcreate /dev/vdb1"
    },
    {
      "command": "pvremove -y /dev/vdc1"
    },
    {
      "command": "pvs -o pv_name,vg_name | grep /dev/vdb1"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Physical volume inventory inspected.",
      "points": 20,
      "requires": [
        "pvs_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Create and remove physical volumes",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "pv_created",
        "old_pv_removed"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Physical volume state validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
