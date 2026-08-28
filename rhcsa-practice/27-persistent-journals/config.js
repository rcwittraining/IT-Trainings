window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 27,
  "total": 62,
  "id": "rhcsa-practice-27-persistent-journals",
  "slug": "persistent-journals",
  "title": "Persistent System Journals",
  "domain": "Running Systems",
  "technology": "Logging",
  "scenario": "Convert a volatile journal configuration into persistent storage and flush the current runtime journal safely.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 27: Persistent System Journals",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in logging through an original, state-validated exercise.",
  "facts": {
    "journal_storage_checked": "Persistent journal directory state inspected",
    "journal_directory_created": "Persistent journal directory created",
    "journal_permissions_set": "Journal directory ownership and mode set",
    "journal_flushed": "Journal service restarted and runtime data flushed",
    "verified": "Persistent journal storage validated"
  },
  "actions": [
    {
      "pattern": "^test\\s+\\-d\\s+/var/log/journal$",
      "command": "test -d /var/log/journal",
      "sets": [
        "journal_storage_checked"
      ],
      "requires": [],
      "output": "test: /var/log/journal: no such file or directory"
    },
    {
      "pattern": "^mkdir\\s+\\-p\\s+/var/log/journal$",
      "command": "mkdir -p /var/log/journal",
      "sets": [
        "journal_directory_created"
      ],
      "requires": [
        "journal_storage_checked"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^chown\\s+root:systemd\\-journal\\s+/var/log/journal\\s+\\&\\&\\s+chmod\\s+2755\\s+/var/log/journal$",
      "command": "chown root:systemd-journal /var/log/journal && chmod 2755 /var/log/journal",
      "sets": [
        "journal_permissions_set"
      ],
      "requires": [
        "journal_directory_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^systemctl\\s+restart\\s+systemd\\-journald\\s+\\&\\&\\s+journalctl\\s+\\-\\-flush$",
      "command": "systemctl restart systemd-journald && journalctl --flush",
      "sets": [
        "journal_flushed"
      ],
      "requires": [
        "journal_permissions_set"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^test\\s+\\-d\\s+/var/log/journal\\s+\\&\\&\\s+journalctl\\s+\\-\\-disk\\-usage$",
      "command": "test -d /var/log/journal && journalctl --disk-usage",
      "sets": [
        "verified"
      ],
      "requires": [
        "journal_directory_created",
        "journal_permissions_set",
        "journal_flushed"
      ],
      "output": "Archived and active journals take up 16.0M in the file system."
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "test -d /var/log/journal"
    },
    {
      "command": "mkdir -p /var/log/journal"
    },
    {
      "command": "chown root:systemd-journal /var/log/journal && chmod 2755 /var/log/journal"
    },
    {
      "command": "systemctl restart systemd-journald && journalctl --flush"
    },
    {
      "command": "test -d /var/log/journal && journalctl --disk-usage"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Persistent journal directory state inspected.",
      "points": 20,
      "requires": [
        "journal_storage_checked"
      ]
    },
    {
      "id": "implement",
      "title": "Enable persistent journal storage",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "journal_directory_created",
        "journal_permissions_set",
        "journal_flushed"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Persistent journal storage validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
