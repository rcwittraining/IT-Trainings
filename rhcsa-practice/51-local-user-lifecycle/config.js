window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 51,
  "total": 62,
  "id": "rhcsa-practice-51-local-user-lifecycle",
  "slug": "local-user-lifecycle",
  "title": "Local User Account Lifecycle",
  "domain": "Users and Groups",
  "technology": "User Accounts",
  "scenario": "Create the incoming analyst with the assigned UID and shell, adjust the comment, and retire the obsolete temporary account.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 51: Local User Account Lifecycle",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in user accounts through an original, state-validated exercise.",
  "facts": {
    "accounts_inspected": "Relevant local accounts inspected",
    "user_created": "Incoming analyst account created",
    "user_modified": "Analyst account attributes modified",
    "old_user_deleted": "Obsolete temporary account removed",
    "verified": "Final local account state validated"
  },
  "actions": [
    {
      "pattern": "^getent\\s+passwd\\s+analyst1\\s+tempvendor$",
      "command": "getent passwd analyst1 tempvendor",
      "sets": [
        "accounts_inspected"
      ],
      "requires": [],
      "output": "tempvendor:x:1890:1890:Temporary Vendor:/home/tempvendor:/bin/bash"
    },
    {
      "pattern": "^useradd\\s+\\-u\\s+1750\\s+\\-m\\s+\\-s\\s+/bin/bash\\s+analyst1$",
      "command": "useradd -u 1750 -m -s /bin/bash analyst1",
      "sets": [
        "user_created"
      ],
      "requires": [
        "accounts_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^usermod\\s+\\-c\\s+'Security\\s+Analyst'\\s+analyst1$",
      "command": "usermod -c 'Security Analyst' analyst1",
      "sets": [
        "user_modified"
      ],
      "requires": [
        "user_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^userdel\\s+\\-r\\s+tempvendor$",
      "command": "userdel -r tempvendor",
      "sets": [
        "old_user_deleted"
      ],
      "requires": [
        "user_modified"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^getent\\s+passwd\\s+analyst1\\s+\\&\\&\\s+!\\s+getent\\s+passwd\\s+tempvendor$",
      "command": "getent passwd analyst1 && ! getent passwd tempvendor",
      "sets": [
        "verified"
      ],
      "requires": [
        "user_created",
        "user_modified",
        "old_user_deleted"
      ],
      "output": "analyst1:x:1750:1750:Security Analyst:/home/analyst1:/bin/bash"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "getent passwd analyst1 tempvendor"
    },
    {
      "command": "useradd -u 1750 -m -s /bin/bash analyst1"
    },
    {
      "command": "usermod -c 'Security Analyst' analyst1"
    },
    {
      "command": "userdel -r tempvendor"
    },
    {
      "command": "getent passwd analyst1 && ! getent passwd tempvendor"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Relevant local accounts inspected.",
      "points": 20,
      "requires": [
        "accounts_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Create, modify and remove local accounts",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "user_created",
        "user_modified",
        "old_user_deleted"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Final local account state validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
