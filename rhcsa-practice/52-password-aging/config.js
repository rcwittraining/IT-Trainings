window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 52,
  "total": 62,
  "id": "rhcsa-practice-52-password-aging",
  "slug": "password-aging",
  "title": "Passwords and Account Aging",
  "domain": "Users and Groups",
  "technology": "Account Policy",
  "scenario": "Reset the trainee credential and apply the required minimum, maximum, and warning intervals.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 52: Passwords and Account Aging",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in account policy through an original, state-validated exercise.",
  "facts": {
    "aging_inspected": "Existing password-aging policy inspected",
    "password_changed": "Local password changed",
    "aging_policy_set": "Minimum, maximum, and warning intervals set",
    "verified": "Password-aging policy validated"
  },
  "actions": [
    {
      "pattern": "^chage\\s+\\-l\\s+trainee$",
      "command": "chage -l trainee",
      "sets": [
        "aging_inspected"
      ],
      "requires": [],
      "output": "Maximum number of days between password change: 99999"
    },
    {
      "pattern": "^passwd\\s+trainee$",
      "command": "passwd trainee",
      "sets": [
        "password_changed"
      ],
      "requires": [
        "aging_inspected"
      ],
      "output": "passwd: all authentication tokens updated successfully."
    },
    {
      "pattern": "^chage\\s+\\-m\\s+1\\s+\\-M\\s+90\\s+\\-W\\s+7\\s+trainee$",
      "command": "chage -m 1 -M 90 -W 7 trainee",
      "sets": [
        "aging_policy_set"
      ],
      "requires": [
        "password_changed"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^chage\\s+\\-l\\s+trainee\\s+\\|\\s+grep\\s+\\-E\\s+'Minimum\\|Maximum\\|warning'$",
      "command": "chage -l trainee | grep -E 'Minimum|Maximum|warning'",
      "sets": [
        "verified"
      ],
      "requires": [
        "password_changed",
        "aging_policy_set"
      ],
      "output": "Minimum number of days between password change: 1\nMaximum number of days between password change: 90\nNumber of days of warning before password expires: 7"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "chage -l trainee"
    },
    {
      "command": "passwd trainee"
    },
    {
      "command": "chage -m 1 -M 90 -W 7 trainee"
    },
    {
      "command": "chage -l trainee | grep -E 'Minimum|Maximum|warning'"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Existing password-aging policy inspected.",
      "points": 20,
      "requires": [
        "aging_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Apply local password-aging policy",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "password_changed",
        "aging_policy_set"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Password-aging policy validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
