window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 1,
  "total": 62,
  "id": "rhcsa-practice-01-shell-command-syntax",
  "slug": "shell-command-syntax",
  "title": "Shell Command Syntax",
  "domain": "Essential Tools",
  "technology": "Shell Fundamentals",
  "scenario": "An operations handover requires a quick, auditable confirmation that you are on the correct host, using the intended identity, and can inspect the staging directory with valid shell syntax.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 01: Shell Command Syntax",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in shell fundamentals through an original, state-validated exercise.",
  "facts": {
    "cwd_checked": "Current working directory inspected",
    "identity_checked": "Effective identity inspected",
    "directory_listed": "Staging directory listed with valid syntax",
    "verified": "Shell task validated"
  },
  "actions": [
    {
      "pattern": "^pwd$",
      "command": "pwd",
      "sets": [
        "cwd_checked"
      ],
      "requires": [],
      "output": "/root"
    },
    {
      "pattern": "^id$",
      "command": "id",
      "sets": [
        "identity_checked"
      ],
      "requires": [
        "cwd_checked"
      ],
      "output": "uid=0(root) gid=0(root) groups=0(root)"
    },
    {
      "pattern": "^ls\\s+\\-la\\s+/var/tmp$",
      "command": "ls -la /var/tmp",
      "sets": [
        "directory_listed"
      ],
      "requires": [
        "identity_checked"
      ],
      "output": "total 8\ndrwxrwxrwt.  5 root root 4096 Aug 21 09:00 ."
    },
    {
      "pattern": "^test\\s+\\-d\\s+/var/tmp\\s+\\&\\&\\s+echo\\s+SHELL_READY$",
      "command": "test -d /var/tmp && echo SHELL_READY",
      "sets": [
        "verified"
      ],
      "requires": [
        "identity_checked",
        "directory_listed"
      ],
      "output": "SHELL_READY"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "pwd"
    },
    {
      "command": "id"
    },
    {
      "command": "ls -la /var/tmp"
    },
    {
      "command": "test -d /var/tmp && echo SHELL_READY"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Current working directory inspected.",
      "points": 20,
      "requires": [
        "cwd_checked"
      ]
    },
    {
      "id": "implement",
      "title": "Confirm the shell working context",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "identity_checked",
        "directory_listed"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Shell task validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
