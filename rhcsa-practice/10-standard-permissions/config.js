window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 10,
  "total": 62,
  "id": "rhcsa-practice-10-standard-permissions",
  "slug": "standard-permissions",
  "title": "Standard Linux Permissions",
  "domain": "Essential Tools",
  "technology": "Permissions",
  "scenario": "Restrict a payroll export so only its owner can modify it and members of the audit group can read it.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 10: Standard Linux Permissions",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in permissions through an original, state-validated exercise.",
  "facts": {
    "permissions_inspected": "Current ownership and mode inspected",
    "group_assigned": "Audit group assigned",
    "mode_applied": "Owner and group permissions corrected",
    "verified": "Final permissions validated"
  },
  "actions": [
    {
      "pattern": "^stat\\s+\\-c\\s+'%U:%G\\s+%a\\s+%n'\\s+/srv/payroll/export\\.csv$",
      "command": "stat -c '%U:%G %a %n' /srv/payroll/export.csv",
      "sets": [
        "permissions_inspected"
      ],
      "requires": [],
      "output": "root:root 666 /srv/payroll/export.csv"
    },
    {
      "pattern": "^chgrp\\s+auditors\\s+/srv/payroll/export\\.csv$",
      "command": "chgrp auditors /srv/payroll/export.csv",
      "sets": [
        "group_assigned"
      ],
      "requires": [
        "permissions_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^chmod\\s+0640\\s+/srv/payroll/export\\.csv$",
      "command": "chmod 0640 /srv/payroll/export.csv",
      "sets": [
        "mode_applied"
      ],
      "requires": [
        "group_assigned"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^stat\\s+\\-c\\s+'%G\\s+%a'\\s+/srv/payroll/export\\.csv$",
      "command": "stat -c '%G %a' /srv/payroll/export.csv",
      "sets": [
        "verified"
      ],
      "requires": [
        "group_assigned",
        "mode_applied"
      ],
      "output": "auditors 640"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "stat -c '%U:%G %a %n' /srv/payroll/export.csv"
    },
    {
      "command": "chgrp auditors /srv/payroll/export.csv"
    },
    {
      "command": "chmod 0640 /srv/payroll/export.csv"
    },
    {
      "command": "stat -c '%G %a' /srv/payroll/export.csv"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Current ownership and mode inspected.",
      "points": 20,
      "requires": [
        "permissions_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Apply the required owner, group and mode",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "group_assigned",
        "mode_applied"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Final permissions validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
