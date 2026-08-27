window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 42,
  "total": 62,
  "id": "rhcsa-practice-42-service-enable-boot",
  "slug": "service-enable-boot",
  "title": "Service Startup and Boot Enablement",
  "domain": "System Maintenance",
  "technology": "Systemd",
  "scenario": "Start the application API immediately and ensure it starts automatically on future boots.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 42: Service Startup and Boot Enablement",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in systemd through an original, state-validated exercise.",
  "facts": {
    "service_inspected": "Current service state inspected",
    "service_enabled_started": "Service enabled and started",
    "verified": "Boot and runtime service state validated"
  },
  "actions": [
    {
      "pattern": "^systemctl\\s+status\\s+app\\-api\\.service\\s+\\-\\-no\\-pager$",
      "command": "systemctl status app-api.service --no-pager",
      "sets": [
        "service_inspected"
      ],
      "requires": [],
      "output": "Loaded: loaded; disabled\nActive: inactive (dead)"
    },
    {
      "pattern": "^systemctl\\s+enable\\s+\\-\\-now\\s+app\\-api\\.service$",
      "command": "systemctl enable --now app-api.service",
      "sets": [
        "service_enabled_started"
      ],
      "requires": [
        "service_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^systemctl\\s+is\\-enabled\\s+app\\-api\\.service\\s+\\&\\&\\s+systemctl\\s+is\\-active\\s+app\\-api\\.service$",
      "command": "systemctl is-enabled app-api.service && systemctl is-active app-api.service",
      "sets": [
        "verified"
      ],
      "requires": [
        "service_enabled_started"
      ],
      "output": "enabled\nactive"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "systemctl status app-api.service --no-pager"
    },
    {
      "command": "systemctl enable --now app-api.service"
    },
    {
      "command": "systemctl is-enabled app-api.service && systemctl is-active app-api.service"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Current service state inspected.",
      "points": 20,
      "requires": [
        "service_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Start and enable the managed service",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "service_enabled_started"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Boot and runtime service state validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
