window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 62,
  "total": 62,
  "id": "rhcsa-practice-62-selinux-booleans",
  "slug": "selinux-booleans",
  "title": "Persistent SELinux Booleans",
  "domain": "Security",
  "technology": "SELinux",
  "scenario": "Permit the web service to make required outbound network connections using the narrow policy Boolean and persist the change.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 62: Persistent SELinux Booleans",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in selinux through an original, state-validated exercise.",
  "facts": {
    "boolean_inspected": "Current SELinux Boolean inspected",
    "boolean_enabled": "Required Boolean enabled persistently",
    "verified": "Persistent Boolean state validated"
  },
  "actions": [
    {
      "pattern": "^getsebool\\s+httpd_can_network_connect$",
      "command": "getsebool httpd_can_network_connect",
      "sets": [
        "boolean_inspected"
      ],
      "requires": [],
      "output": "httpd_can_network_connect --> off"
    },
    {
      "pattern": "^setsebool\\s+\\-P\\s+httpd_can_network_connect\\s+on$",
      "command": "setsebool -P httpd_can_network_connect on",
      "sets": [
        "boolean_enabled"
      ],
      "requires": [
        "boolean_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^getsebool\\s+httpd_can_network_connect\\s+\\|\\s+grep\\s+\\-\\-\\s+'\\-\\->\\s+on'$",
      "command": "getsebool httpd_can_network_connect | grep -- '--> on'",
      "sets": [
        "verified"
      ],
      "requires": [
        "boolean_enabled"
      ],
      "output": "httpd_can_network_connect --> on"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "getsebool httpd_can_network_connect"
    },
    {
      "command": "setsebool -P httpd_can_network_connect on"
    },
    {
      "command": "getsebool httpd_can_network_connect | grep -- '--> on'"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Current SELinux Boolean inspected.",
      "points": 20,
      "requires": [
        "boolean_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Enable and persist the required SELinux Boolean",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "boolean_enabled"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Persistent Boolean state validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
