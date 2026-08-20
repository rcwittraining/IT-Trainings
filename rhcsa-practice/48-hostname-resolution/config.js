window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 48,
  "total": 62,
  "id": "rhcsa-practice-48-hostname-resolution",
  "slug": "hostname-resolution",
  "title": "Hostname and Name Resolution",
  "domain": "Networking",
  "technology": "DNS and Hostnames",
  "scenario": "Assign the approved fully qualified hostname, provide an emergency local mapping, configure DNS, and verify resolution order.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 48: Hostname and Name Resolution",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in dns and hostnames through an original, state-validated exercise.",
  "facts": {
    "hostname_inspected": "Current hostname inspected",
    "hostname_set": "Approved static hostname configured",
    "hosts_mapping_added": "Emergency local mapping added",
    "dns_configured": "Approved DNS servers configured",
    "verified": "Hostname resolution validated"
  },
  "actions": [
    {
      "pattern": "^hostnamectl\\s+status$",
      "command": "hostnamectl status",
      "sets": [
        "hostname_inspected"
      ],
      "requires": [],
      "output": "Static hostname: localhost.localdomain"
    },
    {
      "pattern": "^hostnamectl\\s+set\\-hostname\\s+app01\\.lab\\.example$",
      "command": "hostnamectl set-hostname app01.lab.example",
      "sets": [
        "hostname_set"
      ],
      "requires": [
        "hostname_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^printf\\s+'10\\.24\\.8\\.21\\s+repo\\.lab\\.example\\s+repo\\\\n'\\s+>>\\s+/etc/hosts$",
      "command": "printf '10.24.8.21 repo.lab.example repo\\n' >> /etc/hosts",
      "sets": [
        "hosts_mapping_added"
      ],
      "requires": [
        "hostname_set"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^nmcli\\s+connection\\s+modify\\s+Operations\\s+ipv4\\.dns\\s+'10\\.24\\.8\\.10\\s+10\\.24\\.8\\.11'\\s+\\&\\&\\s+nmcli\\s+connection\\s+up\\s+Operations$",
      "command": "nmcli connection modify Operations ipv4.dns '10.24.8.10 10.24.8.11' && nmcli connection up Operations",
      "sets": [
        "dns_configured"
      ],
      "requires": [
        "hosts_mapping_added"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^getent\\s+hosts\\s+repo\\.lab\\.example$",
      "command": "getent hosts repo.lab.example",
      "sets": [
        "verified"
      ],
      "requires": [
        "hostname_set",
        "hosts_mapping_added",
        "dns_configured"
      ],
      "output": "10.24.8.21 repo.lab.example repo"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "hostnamectl status"
    },
    {
      "command": "hostnamectl set-hostname app01.lab.example"
    },
    {
      "command": "printf '10.24.8.21 repo.lab.example repo\\n' >> /etc/hosts"
    },
    {
      "command": "nmcli connection modify Operations ipv4.dns '10.24.8.10 10.24.8.11' && nmcli connection up Operations"
    },
    {
      "command": "getent hosts repo.lab.example"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Current hostname inspected.",
      "points": 20,
      "requires": [
        "hostname_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Configure hostname and resolution sources",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "hostname_set",
        "hosts_mapping_added",
        "dns_configured"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Hostname resolution validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
