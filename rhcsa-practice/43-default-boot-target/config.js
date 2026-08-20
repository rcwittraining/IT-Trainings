window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 43,
  "total": 62,
  "id": "rhcsa-practice-43-default-boot-target",
  "slug": "default-boot-target",
  "title": "Default Boot Target",
  "domain": "System Maintenance",
  "technology": "Systemd",
  "scenario": "Configure the server to boot into the non-graphical multi-user target by default without disrupting the current session.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 43: Default Boot Target",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in systemd through an original, state-validated exercise.",
  "facts": {
    "default_inspected": "Existing default target inspected",
    "default_changed": "Persistent default target changed",
    "verified": "New default boot target validated"
  },
  "actions": [
    {
      "pattern": "^systemctl\\s+get\\-default$",
      "command": "systemctl get-default",
      "sets": [
        "default_inspected"
      ],
      "requires": [],
      "output": "graphical.target"
    },
    {
      "pattern": "^systemctl\\s+set\\-default\\s+multi\\-user\\.target$",
      "command": "systemctl set-default multi-user.target",
      "sets": [
        "default_changed"
      ],
      "requires": [
        "default_inspected"
      ],
      "output": "Created symlink /etc/systemd/system/default.target → /usr/lib/systemd/system/multi-user.target."
    },
    {
      "pattern": "^readlink\\s+\\-f\\s+/etc/systemd/system/default\\.target$",
      "command": "readlink -f /etc/systemd/system/default.target",
      "sets": [
        "verified"
      ],
      "requires": [
        "default_changed"
      ],
      "output": "/usr/lib/systemd/system/multi-user.target"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "systemctl get-default"
    },
    {
      "command": "systemctl set-default multi-user.target"
    },
    {
      "command": "readlink -f /etc/systemd/system/default.target"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Existing default target inspected.",
      "points": 20,
      "requires": [
        "default_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Set the persistent default systemd target",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "default_changed"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "New default boot target validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
