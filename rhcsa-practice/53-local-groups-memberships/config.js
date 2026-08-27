window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 53,
  "total": 62,
  "id": "rhcsa-practice-53-local-groups-memberships",
  "slug": "local-groups-memberships",
  "title": "Local Groups and Memberships",
  "domain": "Users and Groups",
  "technology": "Group Management",
  "scenario": "Create the platform group, append the analyst without losing current memberships, remove a stale member, and retire an empty legacy group.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 53: Local Groups and Memberships",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in group management through an original, state-validated exercise.",
  "facts": {
    "groups_inspected": "Relevant group state inspected",
    "group_created": "Platform group created",
    "member_appended": "Analyst appended to platform group",
    "stale_member_removed": "Stale group membership removed",
    "old_group_deleted": "Empty legacy group deleted",
    "verified": "Final group membership state validated"
  },
  "actions": [
    {
      "pattern": "^getent\\s+group\\s+platform\\s+oldproject$",
      "command": "getent group platform oldproject",
      "sets": [
        "groups_inspected"
      ],
      "requires": [],
      "output": "oldproject:x:3205:analyst1,former"
    },
    {
      "pattern": "^groupadd\\s+\\-g\\s+3300\\s+platform$",
      "command": "groupadd -g 3300 platform",
      "sets": [
        "group_created"
      ],
      "requires": [
        "groups_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^usermod\\s+\\-aG\\s+platform\\s+analyst1$",
      "command": "usermod -aG platform analyst1",
      "sets": [
        "member_appended"
      ],
      "requires": [
        "group_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^gpasswd\\s+\\-d\\s+former\\s+oldproject$",
      "command": "gpasswd -d former oldproject",
      "sets": [
        "stale_member_removed"
      ],
      "requires": [
        "member_appended"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^groupdel\\s+oldproject$",
      "command": "groupdel oldproject",
      "sets": [
        "old_group_deleted"
      ],
      "requires": [
        "stale_member_removed"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^id\\s+analyst1\\s+\\|\\s+grep\\s+platform\\s+\\&\\&\\s+!\\s+getent\\s+group\\s+oldproject$",
      "command": "id analyst1 | grep platform && ! getent group oldproject",
      "sets": [
        "verified"
      ],
      "requires": [
        "group_created",
        "member_appended",
        "stale_member_removed",
        "old_group_deleted"
      ],
      "output": "groups=1750(analyst1),3300(platform)"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "getent group platform oldproject"
    },
    {
      "command": "groupadd -g 3300 platform"
    },
    {
      "command": "usermod -aG platform analyst1"
    },
    {
      "command": "gpasswd -d former oldproject"
    },
    {
      "command": "groupdel oldproject"
    },
    {
      "command": "id analyst1 | grep platform && ! getent group oldproject"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Relevant group state inspected.",
      "points": 20,
      "requires": [
        "groups_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Manage groups and supplementary membership",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "group_created",
        "member_appended",
        "stale_member_removed",
        "old_group_deleted"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Final group membership state validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
