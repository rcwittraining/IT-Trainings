window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 18,
  "total": 62,
  "id": "rhcsa-practice-18-script-inputs",
  "slug": "script-inputs",
  "title": "Shell Script Positional Inputs",
  "domain": "Shell Scripting",
  "technology": "Bash",
  "scenario": "Create a report helper that requires a username and output path as its first two arguments, then writes identity details to that destination.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 18: Shell Script Positional Inputs",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in bash through an original, state-validated exercise.",
  "facts": {
    "input_account_checked": "Input account confirmed",
    "script_executable": "Input-processing script made executable",
    "syntax_valid": "Input-processing script syntax validated",
    "verified": "Argument-driven output validated",
    "script_written": "Required script content saved"
  },
  "actions": [
    {
      "pattern": "^getent\\s+passwd\\s+appsvc$",
      "command": "getent passwd appsvc",
      "sets": [
        "input_account_checked"
      ],
      "requires": [],
      "output": "appsvc:x:1805:1805:Application Service:/home/appsvc:/bin/bash"
    },
    {
      "pattern": "^chmod\\s+0755\\s+/usr/local/bin/user\\-report$",
      "command": "chmod 0755 /usr/local/bin/user-report",
      "sets": [
        "script_executable"
      ],
      "requires": [
        "input_account_checked"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^bash\\s+\\-n\\s+/usr/local/bin/user\\-report$",
      "command": "bash -n /usr/local/bin/user-report",
      "sets": [
        "syntax_valid"
      ],
      "requires": [
        "script_executable"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^/usr/local/bin/user\\-report\\s+appsvc\\s+/var/tmp/appsvc\\.id\\s+\\&\\&\\s+test\\s+\\-s\\s+/var/tmp/appsvc\\.id$",
      "command": "/usr/local/bin/user-report appsvc /var/tmp/appsvc.id && test -s /var/tmp/appsvc.id",
      "sets": [
        "verified"
      ],
      "requires": [
        "script_written",
        "script_executable",
        "syntax_valid"
      ],
      "output": "Command completed successfully."
    }
  ],
  "editableFiles": [
    {
      "path": "/usr/local/bin/user-report",
      "initial": "",
      "patterns": [
        "\\$1",
        "\\$2",
        "id\\s+",
        "usage|Usage",
        "-z|#"
      ],
      "sets": [
        "script_written"
      ]
    }
  ],
  "workflow": [
    {
      "command": "getent passwd appsvc"
    },
    {
      "edit": "/usr/local/bin/user-report",
      "content": "#!/bin/bash\nif [ -z \"$1\" ] || [ -z \"$2\" ]; then\n  echo \"Usage: $0 USER OUTPUT\" >&2\n  exit 2\nfi\nid \"$1\" > \"$2\"\n"
    },
    {
      "command": "chmod 0755 /usr/local/bin/user-report"
    },
    {
      "command": "bash -n /usr/local/bin/user-report"
    },
    {
      "command": "/usr/local/bin/user-report appsvc /var/tmp/appsvc.id && test -s /var/tmp/appsvc.id"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Input account confirmed.",
      "points": 20,
      "requires": [
        "input_account_checked"
      ]
    },
    {
      "id": "implement",
      "title": "Process positional script inputs",
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
      "detail": "Argument-driven output validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
