window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 50,
  "total": 62,
  "id": "rhcsa-practice-50-firewall-network-restriction",
  "slug": "firewall-network-restriction",
  "title": "Restrict Network Access",
  "domain": "Networking",
  "technology": "Firewalld",
  "scenario": "Limit SSH exposure to the internal operations subnet while leaving the public zone without SSH access.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 50: Restrict Network Access",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in firewalld through an original, state-validated exercise.",
  "facts": {
    "zones_inspected": "Active firewall zones inspected",
    "source_restricted": "Approved operations subnet assigned",
    "internal_ssh_allowed": "SSH allowed in internal zone",
    "public_ssh_removed": "SSH removed from public zone",
    "verified": "Runtime firewall restriction validated"
  },
  "actions": [
    {
      "pattern": "^firewall\\-cmd\\s+\\-\\-get\\-active\\-zones$",
      "command": "firewall-cmd --get-active-zones",
      "sets": [
        "zones_inspected"
      ],
      "requires": [],
      "output": "public\n  interfaces: ens192\ninternal\n  interfaces: ens224"
    },
    {
      "pattern": "^firewall\\-cmd\\s+\\-\\-permanent\\s+\\-\\-zone=internal\\s+\\-\\-add\\-source=10\\.24\\.0\\.0/16$",
      "command": "firewall-cmd --permanent --zone=internal --add-source=10.24.0.0/16",
      "sets": [
        "source_restricted"
      ],
      "requires": [
        "zones_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^firewall\\-cmd\\s+\\-\\-permanent\\s+\\-\\-zone=internal\\s+\\-\\-add\\-service=ssh$",
      "command": "firewall-cmd --permanent --zone=internal --add-service=ssh",
      "sets": [
        "internal_ssh_allowed"
      ],
      "requires": [
        "source_restricted"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^firewall\\-cmd\\s+\\-\\-permanent\\s+\\-\\-zone=public\\s+\\-\\-remove\\-service=ssh$",
      "command": "firewall-cmd --permanent --zone=public --remove-service=ssh",
      "sets": [
        "public_ssh_removed"
      ],
      "requires": [
        "internal_ssh_allowed"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^firewall\\-cmd\\s+\\-\\-reload\\s+\\&\\&\\s+firewall\\-cmd\\s+\\-\\-zone=internal\\s+\\-\\-list\\-all$",
      "command": "firewall-cmd --reload && firewall-cmd --zone=internal --list-all",
      "sets": [
        "verified"
      ],
      "requires": [
        "source_restricted",
        "internal_ssh_allowed",
        "public_ssh_removed"
      ],
      "output": "services: ssh\nsources: 10.24.0.0/16"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "firewall-cmd --get-active-zones"
    },
    {
      "command": "firewall-cmd --permanent --zone=internal --add-source=10.24.0.0/16"
    },
    {
      "command": "firewall-cmd --permanent --zone=internal --add-service=ssh"
    },
    {
      "command": "firewall-cmd --permanent --zone=public --remove-service=ssh"
    },
    {
      "command": "firewall-cmd --reload && firewall-cmd --zone=internal --list-all"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Active firewall zones inspected.",
      "points": 20,
      "requires": [
        "zones_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Restrict SSH to the approved source zone",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "source_restricted",
        "internal_ssh_allowed",
        "public_ssh_removed"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Runtime firewall restriction validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
