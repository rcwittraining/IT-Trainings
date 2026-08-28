window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 2,
  "total": 62,
  "id": "rhcsa-practice-02-io-redirection-pipelines",
  "slug": "io-redirection-pipelines",
  "title": "I/O Redirection and Pipelines",
  "domain": "Essential Tools",
  "technology": "Shell Fundamentals",
  "scenario": "Build a compact health report while keeping standard output and errors in separate evidence files for the night operations team.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 02: I/O Redirection and Pipelines",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in shell fundamentals through an original, state-validated exercise.",
  "facts": {
    "report_created": "Report created with output redirection",
    "errors_appended": "Journal errors appended without overwriting",
    "pipeline_used": "Pipeline processed report output",
    "stderr_redirected": "Standard error redirected separately",
    "verified": "Redirection result validated"
  },
  "actions": [
    {
      "pattern": "^printf\\s+'node=app01\\\\n'\\s+>\\s+/var/tmp/health\\.report$",
      "command": "printf 'node=app01\\n' > /var/tmp/health.report",
      "sets": [
        "report_created"
      ],
      "requires": [],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^journalctl\\s+\\-p\\s+err\\s+\\-b\\s+>>\\s+/var/tmp/health\\.report$",
      "command": "journalctl -p err -b >> /var/tmp/health.report",
      "sets": [
        "errors_appended"
      ],
      "requires": [
        "report_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^grep\\s+\\-E\\s+'node\\|error'\\s+/var/tmp/health\\.report\\s+\\|\\s+wc\\s+\\-l$",
      "command": "grep -E 'node|error' /var/tmp/health.report | wc -l",
      "sets": [
        "pipeline_used"
      ],
      "requires": [
        "errors_appended"
      ],
      "output": "7"
    },
    {
      "pattern": "^grep\\s+token\\s+/root/private\\s+2>\\s+/var/tmp/health\\.errors$",
      "command": "grep token /root/private 2> /var/tmp/health.errors",
      "sets": [
        "stderr_redirected"
      ],
      "requires": [
        "pipeline_used"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^test\\s+\\-s\\s+/var/tmp/health\\.report\\s+\\&\\&\\s+test\\s+\\-e\\s+/var/tmp/health\\.errors$",
      "command": "test -s /var/tmp/health.report && test -e /var/tmp/health.errors",
      "sets": [
        "verified"
      ],
      "requires": [
        "errors_appended",
        "pipeline_used",
        "stderr_redirected"
      ],
      "output": "Command completed successfully."
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "printf 'node=app01\\n' > /var/tmp/health.report"
    },
    {
      "command": "journalctl -p err -b >> /var/tmp/health.report"
    },
    {
      "command": "grep -E 'node|error' /var/tmp/health.report | wc -l"
    },
    {
      "command": "grep token /root/private 2> /var/tmp/health.errors"
    },
    {
      "command": "test -s /var/tmp/health.report && test -e /var/tmp/health.errors"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Report created with output redirection.",
      "points": 20,
      "requires": [
        "report_created"
      ]
    },
    {
      "id": "implement",
      "title": "Build the redirected operations report",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "errors_appended",
        "pipeline_used",
        "stderr_redirected"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Redirection result validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
