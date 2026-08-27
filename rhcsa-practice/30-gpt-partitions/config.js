window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 30,
  "total": 62,
  "id": "rhcsa-practice-30-gpt-partitions",
  "slug": "gpt-partitions",
  "title": "GPT Partition Management",
  "domain": "Local Storage",
  "technology": "Partitions",
  "scenario": "Initialise the empty data disk with GPT and create a correctly aligned 2 GiB partition for application data.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 30: GPT Partition Management",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in partitions through an original, state-validated exercise.",
  "facts": {
    "disk_inspected": "Target disk inspected",
    "gpt_created": "GPT disk label created",
    "partition_created": "Aligned data partition created",
    "partition_table_reloaded": "Kernel partition table refreshed",
    "verified": "GPT partition layout validated"
  },
  "actions": [
    {
      "pattern": "^lsblk\\s+\\-f\\s+/dev/vdb$",
      "command": "lsblk -f /dev/vdb",
      "sets": [
        "disk_inspected"
      ],
      "requires": [],
      "output": "NAME FSTYPE SIZE MOUNTPOINTS\nvdb         10G"
    },
    {
      "pattern": "^parted\\s+/dev/vdb\\s+\\-\\-script\\s+mklabel\\s+gpt$",
      "command": "parted /dev/vdb --script mklabel gpt",
      "sets": [
        "gpt_created"
      ],
      "requires": [
        "disk_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^parted\\s+/dev/vdb\\s+\\-\\-script\\s+mkpart\\s+primary\\s+1MiB\\s+2049MiB$",
      "command": "parted /dev/vdb --script mkpart primary 1MiB 2049MiB",
      "sets": [
        "partition_created"
      ],
      "requires": [
        "gpt_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^partprobe\\s+/dev/vdb$",
      "command": "partprobe /dev/vdb",
      "sets": [
        "partition_table_reloaded"
      ],
      "requires": [
        "partition_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^lsblk\\s+\\-o\\s+NAME,SIZE,TYPE\\s+/dev/vdb$",
      "command": "lsblk -o NAME,SIZE,TYPE /dev/vdb",
      "sets": [
        "verified"
      ],
      "requires": [
        "gpt_created",
        "partition_created",
        "partition_table_reloaded"
      ],
      "output": "vdb 10G disk\n└─vdb1 2G part"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "lsblk -f /dev/vdb"
    },
    {
      "command": "parted /dev/vdb --script mklabel gpt"
    },
    {
      "command": "parted /dev/vdb --script mkpart primary 1MiB 2049MiB"
    },
    {
      "command": "partprobe /dev/vdb"
    },
    {
      "command": "lsblk -o NAME,SIZE,TYPE /dev/vdb"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Target disk inspected.",
      "points": 20,
      "requires": [
        "disk_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Create the GPT partition layout",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "gpt_created",
        "partition_created",
        "partition_table_reloaded"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "GPT partition layout validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
