window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 28,
  "total": 62,
  "id": "rhcsa-practice-28-network-service-control",
  "slug": "network-service-control",
  "title": "Network Service Control",
  "domain": "Running Systems",
  "technology": "Systemd",
  "scenario": "Perform a controlled restart sequence for SSH service and confirm that the service returns to an active state.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 28: Network Service Control",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in systemd through an original, state-validated exercise.",
  "facts": {
    "service_status_checked": "Network service status inspected",
    "service_stopped": "Network service stopped",
    "service_started": "Network service started",
    "verified": "Network service state validated"
  },
  "actions": [
    {
      "pattern": "^systemctl\\s+status\\s+sshd\\s+\\-\\-no\\-pager$",
      "command": "systemctl status sshd --no-pager",
      "sets": [
        "service_status_checked"
      ],
      "requires": [],
      "output": "Active: active (running)"
    },
    {
      "pattern": "^systemctl\\s+stop\\s+sshd$",
      "command": "systemctl stop sshd",
      "sets": [
        "service_stopped"
      ],
      "requires": [
        "service_status_checked"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^systemctl\\s+start\\s+sshd$",
      "command": "systemctl start sshd",
      "sets": [
        "service_started"
      ],
      "requires": [
        "service_stopped"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^systemctl\\s+is\\-active\\s+sshd$",
      "command": "systemctl is-active sshd",
      "sets": [
        "verified"
      ],
      "requires": [
        "service_stopped",
        "service_started"
      ],
      "output": "active"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "systemctl status sshd --no-pager"
    },
    {
      "command": "systemctl stop sshd"
    },
    {
      "command": "systemctl start sshd"
    },
    {
      "command": "systemctl is-active sshd"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Network service status inspected.",
      "points": 20,
      "requires": [
        "service_status_checked"
      ]
    },
    {
      "id": "implement",
      "title": "Stop, start and validate the network service",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "service_stopped",
        "service_started"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Network service state validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
