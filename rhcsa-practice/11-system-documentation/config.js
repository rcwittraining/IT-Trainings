window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 11,
  "total": 62,
  "id": "rhcsa-practice-11-system-documentation",
  "slug": "system-documentation",
  "title": "System Documentation Research",
  "domain": "Essential Tools",
  "technology": "Documentation",
  "scenario": "Use installed documentation to identify the configuration file format and packaged examples for the system logging service.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 11: System Documentation Research",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in documentation through an original, state-validated exercise.",
  "facts": {
    "keyword_search_done": "Manual keyword search completed",
    "manual_opened": "Correct manual section consulted",
    "info_opened": "Info documentation consulted",
    "package_docs_listed": "Package documentation located",
    "verified": "Local documentation path validated"
  },
  "actions": [
    {
      "pattern": "^man\\s+\\-k\\s+systemd\\s+journal$",
      "command": "man -k systemd journal",
      "sets": [
        "keyword_search_done"
      ],
      "requires": [],
      "output": "journald.conf (5) - Journal service configuration files"
    },
    {
      "pattern": "^man\\s+5\\s+journald\\.conf$",
      "command": "man 5 journald.conf",
      "sets": [
        "manual_opened"
      ],
      "requires": [
        "keyword_search_done"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^info\\s+coreutils\\s+'File\\s+permissions'$",
      "command": "info coreutils 'File permissions'",
      "sets": [
        "info_opened"
      ],
      "requires": [
        "manual_opened"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^rpm\\s+\\-qd\\s+systemd\\s+\\|\\s+grep\\s+journald$",
      "command": "rpm -qd systemd | grep journald",
      "sets": [
        "package_docs_listed"
      ],
      "requires": [
        "info_opened"
      ],
      "output": "/usr/share/man/man5/journald.conf.5.gz"
    },
    {
      "pattern": "^test\\s+\\-r\\s+/usr/share/man/man5/journald\\.conf\\.5\\.gz$",
      "command": "test -r /usr/share/man/man5/journald.conf.5.gz",
      "sets": [
        "verified"
      ],
      "requires": [
        "manual_opened",
        "info_opened",
        "package_docs_listed"
      ],
      "output": "Command completed successfully."
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "man -k systemd journal"
    },
    {
      "command": "man 5 journald.conf"
    },
    {
      "command": "info coreutils 'File permissions'"
    },
    {
      "command": "rpm -qd systemd | grep journald"
    },
    {
      "command": "test -r /usr/share/man/man5/journald.conf.5.gz"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Manual keyword search completed.",
      "points": 20,
      "requires": [
        "keyword_search_done"
      ]
    },
    {
      "id": "implement",
      "title": "Locate authoritative local documentation",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "manual_opened",
        "info_opened",
        "package_docs_listed"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Local documentation path validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
