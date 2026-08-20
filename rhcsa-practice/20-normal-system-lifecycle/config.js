window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 20,
  "total": 62,
  "id": "rhcsa-practice-20-normal-system-lifecycle",
  "slug": "normal-system-lifecycle",
  "title": "Normal Boot, Reboot and Shutdown",
  "domain": "Running Systems",
  "technology": "System Lifecycle",
  "scenario": "Demonstrate controlled reboot scheduling, cancellation, and normal shutdown handling on the isolated maintenance node.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 20: Normal Boot, Reboot and Shutdown",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in system lifecycle through an original, state-validated exercise.",
  "facts": {
    "jobs_inspected": "Pending system jobs inspected",
    "reboot_scheduled": "Normal reboot scheduled with notice",
    "reboot_cancelled": "Scheduled reboot safely cancelled",
    "shutdown_requested": "Normal system shutdown requested",
    "verified": "Lifecycle request state validated"
  },
  "actions": [
    {
      "pattern": "^systemctl\\s+list\\-jobs$",
      "command": "systemctl list-jobs",
      "sets": [
        "jobs_inspected"
      ],
      "requires": [],
      "output": "No jobs running."
    },
    {
      "pattern": "^shutdown\\s+\\-r\\s+\\+5\\s+'RCW\\s+maintenance\\s+validation'$",
      "command": "shutdown -r +5 'RCW maintenance validation'",
      "sets": [
        "reboot_scheduled"
      ],
      "requires": [
        "jobs_inspected"
      ],
      "output": "Reboot scheduled for Fri 2026-08-21 10:30:00 IST"
    },
    {
      "pattern": "^shutdown\\s+\\-c$",
      "command": "shutdown -c",
      "sets": [
        "reboot_cancelled"
      ],
      "requires": [
        "reboot_scheduled"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^systemctl\\s+poweroff$",
      "command": "systemctl poweroff",
      "sets": [
        "shutdown_requested"
      ],
      "requires": [
        "reboot_cancelled"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^systemctl\\s+list\\-jobs\\s+\\-\\-no\\-pager$",
      "command": "systemctl list-jobs --no-pager",
      "sets": [
        "verified"
      ],
      "requires": [
        "reboot_scheduled",
        "reboot_cancelled",
        "shutdown_requested"
      ],
      "output": "shutdown.target start waiting"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "systemctl list-jobs"
    },
    {
      "command": "shutdown -r +5 'RCW maintenance validation'"
    },
    {
      "command": "shutdown -c"
    },
    {
      "command": "systemctl poweroff"
    },
    {
      "command": "systemctl list-jobs --no-pager"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Pending system jobs inspected.",
      "points": 20,
      "requires": [
        "jobs_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Use supported system lifecycle operations",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "reboot_scheduled",
        "reboot_cancelled",
        "shutdown_requested"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Lifecycle request state validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
