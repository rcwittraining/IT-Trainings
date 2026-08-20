window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 55,
  "total": 62,
  "id": "rhcsa-practice-55-firewall-service-policy",
  "slug": "firewall-service-policy",
  "title": "Firewalld Service and Rich Rules",
  "domain": "Security",
  "technology": "Firewalld",
  "scenario": "Publish the application TLS port and restrict its administrative endpoint with a persistent rich rule.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 55: Firewalld Service and Rich Rules",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in firewalld through an original, state-validated exercise.",
  "facts": {
    "firewall_policy_inspected": "Current public-zone policy inspected",
    "app_port_allowed": "Application TLS port allowed persistently",
    "admin_rule_added": "Source-restricted administration rule added",
    "firewall_reloaded": "Persistent policy loaded into runtime",
    "verified": "Runtime firewall policy validated"
  },
  "actions": [
    {
      "pattern": "^firewall\\-cmd\\s+\\-\\-zone=public\\s+\\-\\-list\\-all$",
      "command": "firewall-cmd --zone=public --list-all",
      "sets": [
        "firewall_policy_inspected"
      ],
      "requires": [],
      "output": "services: cockpit dhcpv6-client"
    },
    {
      "pattern": "^firewall\\-cmd\\s+\\-\\-permanent\\s+\\-\\-zone=public\\s+\\-\\-add\\-port=8443/tcp$",
      "command": "firewall-cmd --permanent --zone=public --add-port=8443/tcp",
      "sets": [
        "app_port_allowed"
      ],
      "requires": [
        "firewall_policy_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^firewall\\-cmd\\s+\\-\\-permanent\\s+\\-\\-zone=public\\s+\\-\\-add\\-rich\\-rule='rule\\s+family=ipv4\\s+source\\s+address=10\\.24\\.8\\.0/24\\s+port\\s+port=9443\\s+protocol=tcp\\s+accept'$",
      "command": "firewall-cmd --permanent --zone=public --add-rich-rule='rule family=ipv4 source address=10.24.8.0/24 port port=9443 protocol=tcp accept'",
      "sets": [
        "admin_rule_added"
      ],
      "requires": [
        "app_port_allowed"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^firewall\\-cmd\\s+\\-\\-reload$",
      "command": "firewall-cmd --reload",
      "sets": [
        "firewall_reloaded"
      ],
      "requires": [
        "admin_rule_added"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^firewall\\-cmd\\s+\\-\\-zone=public\\s+\\-\\-query\\-port=8443/tcp\\s+\\&\\&\\s+firewall\\-cmd\\s+\\-\\-zone=public\\s+\\-\\-list\\-rich\\-rules$",
      "command": "firewall-cmd --zone=public --query-port=8443/tcp && firewall-cmd --zone=public --list-rich-rules",
      "sets": [
        "verified"
      ],
      "requires": [
        "app_port_allowed",
        "admin_rule_added",
        "firewall_reloaded"
      ],
      "output": "yes\nrule family=\"ipv4\" source address=\"10.24.8.0/24\" port port=\"9443\" protocol=\"tcp\" accept"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "firewall-cmd --zone=public --list-all"
    },
    {
      "command": "firewall-cmd --permanent --zone=public --add-port=8443/tcp"
    },
    {
      "command": "firewall-cmd --permanent --zone=public --add-rich-rule='rule family=ipv4 source address=10.24.8.0/24 port port=9443 protocol=tcp accept'"
    },
    {
      "command": "firewall-cmd --reload"
    },
    {
      "command": "firewall-cmd --zone=public --query-port=8443/tcp && firewall-cmd --zone=public --list-rich-rules"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Current public-zone policy inspected.",
      "points": 20,
      "requires": [
        "firewall_policy_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Configure persistent application firewall policy",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "app_port_allowed",
        "admin_rule_added",
        "firewall_reloaded"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Runtime firewall policy validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
