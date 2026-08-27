window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 19,
  "total": 62,
  "id": "rhcsa-practice-19-script-command-output",
  "slug": "script-command-output",
  "title": "Command Output in Shell Scripts",
  "domain": "Shell Scripting",
  "technology": "Bash",
  "scenario": "Create a snapshot helper that captures the current host, timestamp, and uptime using command substitution in a structured report.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 19: Command Output in Shell Scripts",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in bash through an original, state-validated exercise.",
  "facts": {
    "host_checked": "Source command output inspected",
    "script_executable": "Snapshot script made executable",
    "syntax_valid": "Snapshot script syntax validated",
    "verified": "Captured command output validated",
    "script_written": "Required script content saved"
  },
  "actions": [
    {
      "pattern": "^hostname\\s+\\-f$",
      "command": "hostname -f",
      "sets": [
        "host_checked"
      ],
      "requires": [],
      "output": "app01.lab.example"
    },
    {
      "pattern": "^chmod\\s+0755\\s+/usr/local/bin/host\\-snapshot$",
      "command": "chmod 0755 /usr/local/bin/host-snapshot",
      "sets": [
        "script_executable"
      ],
      "requires": [
        "host_checked"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^bash\\s+\\-n\\s+/usr/local/bin/host\\-snapshot$",
      "command": "bash -n /usr/local/bin/host-snapshot",
      "sets": [
        "syntax_valid"
      ],
      "requires": [
        "script_executable"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^/usr/local/bin/host\\-snapshot\\s+\\&\\&\\s+grep\\s+\\-E\\s+'\\^\\(host\\|time\\|uptime\\)='\\s+/var/tmp/host\\.snapshot$",
      "command": "/usr/local/bin/host-snapshot && grep -E '^(host|time|uptime)=' /var/tmp/host.snapshot",
      "sets": [
        "verified"
      ],
      "requires": [
        "script_written",
        "script_executable",
        "syntax_valid"
      ],
      "output": "host=app01.lab.example\ntime=2026-08-21T10:15:00+05:30\nuptime=up 3 days, 4 hours"
    }
  ],
  "editableFiles": [
    {
      "path": "/usr/local/bin/host-snapshot",
      "initial": "",
      "patterns": [
        "\\$\\(hostname",
        "\\$\\(date",
        "\\$\\(uptime",
        ">"
      ],
      "sets": [
        "script_written"
      ]
    }
  ],
  "workflow": [
    {
      "command": "hostname -f"
    },
    {
      "edit": "/usr/local/bin/host-snapshot",
      "content": "#!/bin/bash\noutput=/var/tmp/host.snapshot\nprintf 'host=%s\\ntime=%s\\nuptime=%s\\n' \"$(hostname -f)\" \"$(date -Is)\" \"$(uptime -p)\" > \"$output\"\n"
    },
    {
      "command": "chmod 0755 /usr/local/bin/host-snapshot"
    },
    {
      "command": "bash -n /usr/local/bin/host-snapshot"
    },
    {
      "command": "/usr/local/bin/host-snapshot && grep -E '^(host|time|uptime)=' /var/tmp/host.snapshot"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Source command output inspected.",
      "points": 20,
      "requires": [
        "host_checked"
      ]
    },
    {
      "id": "implement",
      "title": "Process command output inside a script",
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
      "detail": "Captured command output validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
