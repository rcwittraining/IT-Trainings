window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 16,
  "total": 62,
  "id": "rhcsa-practice-16-script-conditionals",
  "slug": "script-conditionals",
  "title": "Shell Script Conditionals",
  "domain": "Shell Scripting",
  "technology": "Bash",
  "scenario": "Create a safe service-check helper that accepts a service name and returns a clear active or inactive result using a conditional.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 16: Shell Script Conditionals",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in bash through an original, state-validated exercise.",
  "facts": {
    "target_inspected": "Script target inspected",
    "script_executable": "Script made executable",
    "syntax_valid": "Script syntax validated",
    "verified": "Conditional behavior validated",
    "script_written": "Required script content saved"
  },
  "actions": [
    {
      "pattern": "^test\\s+\\-e\\s+/usr/local/bin/check\\-service$",
      "command": "test -e /usr/local/bin/check-service",
      "sets": [
        "target_inspected"
      ],
      "requires": [],
      "output": "test: /usr/local/bin/check-service: no such file"
    },
    {
      "pattern": "^chmod\\s+0755\\s+/usr/local/bin/check\\-service$",
      "command": "chmod 0755 /usr/local/bin/check-service",
      "sets": [
        "script_executable"
      ],
      "requires": [
        "target_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^bash\\s+\\-n\\s+/usr/local/bin/check\\-service$",
      "command": "bash -n /usr/local/bin/check-service",
      "sets": [
        "syntax_valid"
      ],
      "requires": [
        "script_executable"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^/usr/local/bin/check\\-service\\s+sshd$",
      "command": "/usr/local/bin/check-service sshd",
      "sets": [
        "verified"
      ],
      "requires": [
        "script_written",
        "script_executable",
        "syntax_valid"
      ],
      "output": "sshd is active"
    }
  ],
  "editableFiles": [
    {
      "path": "/usr/local/bin/check-service",
      "initial": "",
      "patterns": [
        "\\bif\\b",
        "systemctl\\s+is-active",
        "\\$1",
        "\\bthen\\b",
        "\\belse\\b",
        "\\bfi\\b"
      ],
      "sets": [
        "script_written"
      ]
    }
  ],
  "workflow": [
    {
      "command": "test -e /usr/local/bin/check-service"
    },
    {
      "edit": "/usr/local/bin/check-service",
      "content": "#!/bin/bash\nif systemctl is-active --quiet \"$1\"; then\n  echo \"$1 is active\"\nelse\n  echo \"$1 is inactive\"\nfi\n"
    },
    {
      "command": "chmod 0755 /usr/local/bin/check-service"
    },
    {
      "command": "bash -n /usr/local/bin/check-service"
    },
    {
      "command": "/usr/local/bin/check-service sshd"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Script target inspected.",
      "points": 20,
      "requires": [
        "target_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Build the conditional service-check script",
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
      "detail": "Conditional behavior validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
