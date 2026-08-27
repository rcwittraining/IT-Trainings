window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 54,
  "total": 62,
  "id": "rhcsa-practice-54-privileged-access",
  "slug": "privileged-access",
  "title": "Controlled Privileged Access",
  "domain": "Users and Groups",
  "technology": "Sudo",
  "scenario": "Grant the operations lead permission to restart only the web service through sudo, using a validated drop-in file.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 54: Controlled Privileged Access",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in sudo through an original, state-validated exercise.",
  "facts": {
    "current_privileges_checked": "Current delegated privileges inspected",
    "sudo_rule_created": "Command-scoped sudo rule created",
    "sudo_rule_secured": "Sudo drop-in permissions secured",
    "verified": "Sudo policy syntax validated"
  },
  "actions": [
    {
      "pattern": "^sudo\\s+\\-l\\s+\\-U\\s+opslead$",
      "command": "sudo -l -U opslead",
      "sets": [
        "current_privileges_checked"
      ],
      "requires": [],
      "output": "User opslead is not allowed to run sudo on app01."
    },
    {
      "pattern": "^printf\\s+'%s\\\\n'\\s+'opslead\\s+ALL=\\(root\\)\\s+/usr/bin/systemctl\\s+restart\\s+httpd'\\s+>\\s+/etc/sudoers\\.d/opslead$",
      "command": "printf '%s\\n' 'opslead ALL=(root) /usr/bin/systemctl restart httpd' > /etc/sudoers.d/opslead",
      "sets": [
        "sudo_rule_created"
      ],
      "requires": [
        "current_privileges_checked"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^chmod\\s+0440\\s+/etc/sudoers\\.d/opslead$",
      "command": "chmod 0440 /etc/sudoers.d/opslead",
      "sets": [
        "sudo_rule_secured"
      ],
      "requires": [
        "sudo_rule_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^visudo\\s+\\-cf\\s+/etc/sudoers\\.d/opslead$",
      "command": "visudo -cf /etc/sudoers.d/opslead",
      "sets": [
        "verified"
      ],
      "requires": [
        "sudo_rule_created",
        "sudo_rule_secured"
      ],
      "output": "/etc/sudoers.d/opslead: parsed OK"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "sudo -l -U opslead"
    },
    {
      "command": "printf '%s\\n' 'opslead ALL=(root) /usr/bin/systemctl restart httpd' > /etc/sudoers.d/opslead"
    },
    {
      "command": "chmod 0440 /etc/sudoers.d/opslead"
    },
    {
      "command": "visudo -cf /etc/sudoers.d/opslead"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Current delegated privileges inspected.",
      "points": 20,
      "requires": [
        "current_privileges_checked"
      ]
    },
    {
      "id": "implement",
      "title": "Configure least-privilege sudo access",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "sudo_rule_created",
        "sudo_rule_secured"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Sudo policy syntax validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
