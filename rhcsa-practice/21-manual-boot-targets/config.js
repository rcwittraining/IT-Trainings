window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 21,
  "total": 62,
  "id": "rhcsa-practice-21-manual-boot-targets",
  "slug": "manual-boot-targets",
  "title": "Manual Boot Targets",
  "domain": "Running Systems",
  "technology": "Systemd",
  "scenario": "Move an isolated host into rescue mode for maintenance, then return it to the normal multi-user target without changing the default target.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 21: Manual Boot Targets",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in systemd through an original, state-validated exercise.",
  "facts": {
    "default_target_checked": "Configured default target inspected",
    "rescue_entered": "Running host isolated into rescue target",
    "multi_user_restored": "Normal multi-user target restored",
    "verified": "Active target validated"
  },
  "actions": [
    {
      "pattern": "^systemctl\\s+get\\-default$",
      "command": "systemctl get-default",
      "sets": [
        "default_target_checked"
      ],
      "requires": [],
      "output": "multi-user.target"
    },
    {
      "pattern": "^systemctl\\s+isolate\\s+rescue\\.target$",
      "command": "systemctl isolate rescue.target",
      "sets": [
        "rescue_entered"
      ],
      "requires": [
        "default_target_checked"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^systemctl\\s+isolate\\s+multi\\-user\\.target$",
      "command": "systemctl isolate multi-user.target",
      "sets": [
        "multi_user_restored"
      ],
      "requires": [
        "rescue_entered"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^systemctl\\s+is\\-active\\s+multi\\-user\\.target$",
      "command": "systemctl is-active multi-user.target",
      "sets": [
        "verified"
      ],
      "requires": [
        "rescue_entered",
        "multi_user_restored"
      ],
      "output": "active"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "systemctl get-default"
    },
    {
      "command": "systemctl isolate rescue.target"
    },
    {
      "command": "systemctl isolate multi-user.target"
    },
    {
      "command": "systemctl is-active multi-user.target"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Configured default target inspected.",
      "points": 20,
      "requires": [
        "default_target_checked"
      ]
    },
    {
      "id": "implement",
      "title": "Switch running systemd targets manually",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "rescue_entered",
        "multi_user_restored"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Active target validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
