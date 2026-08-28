window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 26,
  "total": 62,
  "id": "rhcsa-practice-26-logs-journals-analysis",
  "slug": "logs-journals-analysis",
  "title": "System Logs and Journal Analysis",
  "domain": "Running Systems",
  "technology": "Logging",
  "scenario": "Correlate boot errors with payment-service events from the incident window and verify journal integrity.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 26: System Logs and Journal Analysis",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in logging through an original, state-validated exercise.",
  "facts": {
    "boot_errors_reviewed": "Current-boot errors reviewed",
    "service_window_reviewed": "Service incident window reviewed",
    "verified": "Journal integrity validated"
  },
  "actions": [
    {
      "pattern": "^journalctl\\s+\\-b\\s+\\-p\\s+err$",
      "command": "journalctl -b -p err",
      "sets": [
        "boot_errors_reviewed"
      ],
      "requires": [],
      "output": "Aug 21 09:42:11 app01 payments[882]: upstream timeout"
    },
    {
      "pattern": "^journalctl\\s+\\-u\\s+payments\\.service\\s+\\-\\-since\\s+'2026\\-08\\-21\\s+09:40'\\s+\\-\\-until\\s+'2026\\-08\\-21\\s+09:50'$",
      "command": "journalctl -u payments.service --since '2026-08-21 09:40' --until '2026-08-21 09:50'",
      "sets": [
        "service_window_reviewed"
      ],
      "requires": [
        "boot_errors_reviewed"
      ],
      "output": "Aug 21 09:42:11 app01 payments[882]: upstream timeout after 30s"
    },
    {
      "pattern": "^journalctl\\s+\\-\\-verify$",
      "command": "journalctl --verify",
      "sets": [
        "verified"
      ],
      "requires": [
        "service_window_reviewed"
      ],
      "output": "PASS: /var/log/journal/rcw/system.journal"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "journalctl -b -p err"
    },
    {
      "command": "journalctl -u payments.service --since '2026-08-21 09:40' --until '2026-08-21 09:50'"
    },
    {
      "command": "journalctl --verify"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Current-boot errors reviewed.",
      "points": 20,
      "requires": [
        "boot_errors_reviewed"
      ]
    },
    {
      "id": "implement",
      "title": "Locate and interpret incident journal records",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "service_window_reviewed"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Journal integrity validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
