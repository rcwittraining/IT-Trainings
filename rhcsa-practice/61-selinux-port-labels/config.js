window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 61,
  "total": 62,
  "id": "rhcsa-practice-61-selinux-port-labels",
  "slug": "selinux-port-labels",
  "title": "SELinux Port Labels",
  "domain": "Security",
  "technology": "SELinux",
  "scenario": "Allow the web service domain to bind the approved nonstandard TLS port by adding a persistent SELinux port mapping.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 61: SELinux Port Labels",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in selinux through an original, state-validated exercise.",
  "facts": {
    "http_ports_inspected": "Existing HTTP port labels inspected",
    "port_label_added": "Nonstandard HTTP port label added",
    "verified": "SELinux port mapping validated"
  },
  "actions": [
    {
      "pattern": "^semanage\\s+port\\s+\\-l\\s+\\|\\s+grep\\s+'\\^http_port_t'$",
      "command": "semanage port -l | grep '^http_port_t'",
      "sets": [
        "http_ports_inspected"
      ],
      "requires": [],
      "output": "http_port_t tcp 80, 81, 443, 488, 8008, 8009, 8443"
    },
    {
      "pattern": "^semanage\\s+port\\s+\\-a\\s+\\-t\\s+http_port_t\\s+\\-p\\s+tcp\\s+9443$",
      "command": "semanage port -a -t http_port_t -p tcp 9443",
      "sets": [
        "port_label_added"
      ],
      "requires": [
        "http_ports_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^semanage\\s+port\\s+\\-l\\s+\\|\\s+grep\\s+'\\^http_port_t'\\s+\\|\\s+grep\\s+9443$",
      "command": "semanage port -l | grep '^http_port_t' | grep 9443",
      "sets": [
        "verified"
      ],
      "requires": [
        "port_label_added"
      ],
      "output": "http_port_t tcp 9443, 8443, 8009, 8008, 488, 443, 81, 80"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "semanage port -l | grep '^http_port_t'"
    },
    {
      "command": "semanage port -a -t http_port_t -p tcp 9443"
    },
    {
      "command": "semanage port -l | grep '^http_port_t' | grep 9443"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Existing HTTP port labels inspected.",
      "points": 20,
      "requires": [
        "http_ports_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Configure the nonstandard SELinux port label",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "port_label_added"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "SELinux port mapping validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
