window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 17,
  "total": 62,
  "id": "rhcsa-practice-17-script-loops",
  "slug": "script-loops",
  "title": "Shell Script Loops",
  "domain": "Shell Scripting",
  "technology": "Bash",
  "scenario": "Create a script that loops over three service log directories and produces one compressed archive for each directory.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 17: Shell Script Loops",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in bash through an original, state-validated exercise.",
  "facts": {
    "sources_inspected": "Loop input directories inspected",
    "script_executable": "Loop script made executable",
    "syntax_valid": "Loop script syntax validated",
    "verified": "Loop output validated",
    "script_written": "Required script content saved"
  },
  "actions": [
    {
      "pattern": "^ls\\s+\\-d\\s+/var/log/api\\s+/var/log/billing\\s+/var/log/worker$",
      "command": "ls -d /var/log/api /var/log/billing /var/log/worker",
      "sets": [
        "sources_inspected"
      ],
      "requires": [],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^chmod\\s+0755\\s+/usr/local/bin/archive\\-service\\-logs$",
      "command": "chmod 0755 /usr/local/bin/archive-service-logs",
      "sets": [
        "script_executable"
      ],
      "requires": [
        "sources_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^bash\\s+\\-n\\s+/usr/local/bin/archive\\-service\\-logs$",
      "command": "bash -n /usr/local/bin/archive-service-logs",
      "sets": [
        "syntax_valid"
      ],
      "requires": [
        "script_executable"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^/usr/local/bin/archive\\-service\\-logs\\s+\\&\\&\\s+ls\\s+/backup/api\\.tgz\\s+/backup/billing\\.tgz\\s+/backup/worker\\.tgz$",
      "command": "/usr/local/bin/archive-service-logs && ls /backup/api.tgz /backup/billing.tgz /backup/worker.tgz",
      "sets": [
        "verified"
      ],
      "requires": [
        "script_written",
        "script_executable",
        "syntax_valid"
      ],
      "output": "/backup/api.tgz\n/backup/billing.tgz\n/backup/worker.tgz"
    }
  ],
  "editableFiles": [
    {
      "path": "/usr/local/bin/archive-service-logs",
      "initial": "",
      "patterns": [
        "\\bfor\\b",
        "\\bin\\b",
        "\\bdo\\b",
        "\\bdone\\b",
        "tar\\s+-czf"
      ],
      "sets": [
        "script_written"
      ]
    }
  ],
  "workflow": [
    {
      "command": "ls -d /var/log/api /var/log/billing /var/log/worker"
    },
    {
      "edit": "/usr/local/bin/archive-service-logs",
      "content": "#!/bin/bash\nfor service in api billing worker; do\n  tar -czf \"/backup/${service}.tgz\" \"/var/log/${service}\"\ndone\n"
    },
    {
      "command": "chmod 0755 /usr/local/bin/archive-service-logs"
    },
    {
      "command": "bash -n /usr/local/bin/archive-service-logs"
    },
    {
      "command": "/usr/local/bin/archive-service-logs && ls /backup/api.tgz /backup/billing.tgz /backup/worker.tgz"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Loop input directories inspected.",
      "points": 20,
      "requires": [
        "sources_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Build the looping archive script",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "script_written",
        "script_executable",
        "syntax_valid"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Loop output validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
