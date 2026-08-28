window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 5,
  "total": 62,
  "id": "rhcsa-practice-05-multi-user-login-switch",
  "slug": "multi-user-login-switch",
  "title": "Multi-user Login and Identity Switching",
  "domain": "Essential Tools",
  "technology": "Identity Operations",
  "scenario": "Review active sessions, switch into the application service account with its login environment, and confirm the resulting identity.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 05: Multi-user Login and Identity Switching",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in identity operations through an original, state-validated exercise.",
  "facts": {
    "sessions_inspected": "Active user sessions inspected",
    "login_shell_switched": "Login environment switched to appsvc",
    "service_identity_checked": "Service identity and groups inspected",
    "verified": "Effective user validated"
  },
  "actions": [
    {
      "pattern": "^who$",
      "command": "who",
      "sets": [
        "sessions_inspected"
      ],
      "requires": [],
      "output": "admin    pts/0  2026-08-21 09:14 (10.24.8.21)"
    },
    {
      "pattern": "^su\\s+\\-\\s+appsvc$",
      "command": "su - appsvc",
      "sets": [
        "login_shell_switched"
      ],
      "requires": [
        "sessions_inspected"
      ],
      "output": "Last login: Fri Aug 21 09:06:11 IST 2026"
    },
    {
      "pattern": "^id$",
      "command": "id",
      "sets": [
        "service_identity_checked"
      ],
      "requires": [
        "login_shell_switched"
      ],
      "output": "uid=1805(appsvc) gid=1805(appsvc) groups=1805(appsvc),3001(appteam)"
    },
    {
      "pattern": "^whoami$",
      "command": "whoami",
      "sets": [
        "verified"
      ],
      "requires": [
        "login_shell_switched",
        "service_identity_checked"
      ],
      "output": "appsvc"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "who"
    },
    {
      "command": "su - appsvc"
    },
    {
      "command": "id"
    },
    {
      "command": "whoami"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Active user sessions inspected.",
      "points": 20,
      "requires": [
        "sessions_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Switch safely to the service identity",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "login_shell_switched",
        "service_identity_checked"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Effective user validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
