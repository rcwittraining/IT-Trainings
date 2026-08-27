window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 3,
  "total": 62,
  "id": "rhcsa-practice-03-grep-regular-expressions",
  "slug": "grep-regular-expressions",
  "title": "Grep and Regular Expressions",
  "domain": "Essential Tools",
  "technology": "Text Processing",
  "scenario": "An order service log mixes routine probes with dated warnings and errors. Extract only actionable, correctly formatted events for review.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 03: Grep and Regular Expressions",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in text processing through an original, state-validated exercise.",
  "facts": {
    "pattern_tested": "Extended regular expression tested",
    "noise_removed": "Routine events excluded into a report",
    "verified": "Filtered report validated"
  },
  "actions": [
    {
      "pattern": "^grep\\s+\\-En\\s+'\\^\\(ERROR\\|WARN\\)\\[\\[:space:\\]\\]\\+\\[0\\-9\\]\\{4\\}\\-\\[0\\-9\\]\\{2\\}\\-\\[0\\-9\\]\\{2\\}'\\s+/var/log/orders\\.log$",
      "command": "grep -En '^(ERROR|WARN)[[:space:]]+[0-9]{4}-[0-9]{2}-[0-9]{2}' /var/log/orders.log",
      "sets": [
        "pattern_tested"
      ],
      "requires": [],
      "output": "18:ERROR 2026-08-21 payment timeout\n31:WARN 2026-08-21 queue depth high"
    },
    {
      "pattern": "^grep\\s+\\-Ev\\s+'healthcheck\\|127\\\\\\.0\\\\\\.0\\\\\\.1'\\s+/var/log/orders\\.log\\s+>\\s+/var/tmp/orders\\-actionable\\.log$",
      "command": "grep -Ev 'healthcheck|127\\.0\\.0\\.1' /var/log/orders.log > /var/tmp/orders-actionable.log",
      "sets": [
        "noise_removed"
      ],
      "requires": [
        "pattern_tested"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^grep\\s+\\-Eq\\s+'\\^\\(ERROR\\|WARN\\)'\\s+/var/tmp/orders\\-actionable\\.log$",
      "command": "grep -Eq '^(ERROR|WARN)' /var/tmp/orders-actionable.log",
      "sets": [
        "verified"
      ],
      "requires": [
        "noise_removed"
      ],
      "output": "Command completed successfully."
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "grep -En '^(ERROR|WARN)[[:space:]]+[0-9]{4}-[0-9]{2}-[0-9]{2}' /var/log/orders.log"
    },
    {
      "command": "grep -Ev 'healthcheck|127\\.0\\.0\\.1' /var/log/orders.log > /var/tmp/orders-actionable.log"
    },
    {
      "command": "grep -Eq '^(ERROR|WARN)' /var/tmp/orders-actionable.log"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Extended regular expression tested.",
      "points": 20,
      "requires": [
        "pattern_tested"
      ]
    },
    {
      "id": "implement",
      "title": "Filter actionable events with regular expressions",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "noise_removed"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Filtered report validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
