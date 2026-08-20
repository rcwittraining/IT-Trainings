window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 47,
  "total": 62,
  "id": "rhcsa-practice-47-ipv4-ipv6-addressing",
  "slug": "ipv4-ipv6-addressing",
  "title": "IPv4 and IPv6 Addressing",
  "domain": "Networking",
  "technology": "NetworkManager",
  "scenario": "Configure the operations connection with the assigned static IPv4 and IPv6 addresses, gateways, and automatic activation.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 47: IPv4 and IPv6 Addressing",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in networkmanager through an original, state-validated exercise.",
  "facts": {
    "interfaces_inspected": "Network devices inspected",
    "ipv4_configured": "Static IPv4 configuration applied",
    "ipv6_configured": "Static IPv6 configuration applied",
    "connection_activated": "Connection set to autostart and activated",
    "verified": "Persistent dual-stack configuration validated"
  },
  "actions": [
    {
      "pattern": "^nmcli\\s+device\\s+status$",
      "command": "nmcli device status",
      "sets": [
        "interfaces_inspected"
      ],
      "requires": [],
      "output": "DEVICE TYPE STATE CONNECTION\nens192 ethernet connected Operations"
    },
    {
      "pattern": "^nmcli\\s+connection\\s+modify\\s+Operations\\s+ipv4\\.method\\s+manual\\s+ipv4\\.addresses\\s+10\\.24\\.8\\.40/24\\s+ipv4\\.gateway\\s+10\\.24\\.8\\.1$",
      "command": "nmcli connection modify Operations ipv4.method manual ipv4.addresses 10.24.8.40/24 ipv4.gateway 10.24.8.1",
      "sets": [
        "ipv4_configured"
      ],
      "requires": [
        "interfaces_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^nmcli\\s+connection\\s+modify\\s+Operations\\s+ipv6\\.method\\s+manual\\s+ipv6\\.addresses\\s+2001:db8:24:8::40/64\\s+ipv6\\.gateway\\s+2001:db8:24:8::1$",
      "command": "nmcli connection modify Operations ipv6.method manual ipv6.addresses 2001:db8:24:8::40/64 ipv6.gateway 2001:db8:24:8::1",
      "sets": [
        "ipv6_configured"
      ],
      "requires": [
        "ipv4_configured"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^nmcli\\s+connection\\s+modify\\s+Operations\\s+connection\\.autoconnect\\s+yes\\s+\\&\\&\\s+nmcli\\s+connection\\s+up\\s+Operations$",
      "command": "nmcli connection modify Operations connection.autoconnect yes && nmcli connection up Operations",
      "sets": [
        "connection_activated"
      ],
      "requires": [
        "ipv6_configured"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^nmcli\\s+\\-f\\s+ipv4\\.addresses,ipv6\\.addresses,connection\\.autoconnect\\s+connection\\s+show\\s+Operations$",
      "command": "nmcli -f ipv4.addresses,ipv6.addresses,connection.autoconnect connection show Operations",
      "sets": [
        "verified"
      ],
      "requires": [
        "ipv4_configured",
        "ipv6_configured",
        "connection_activated"
      ],
      "output": "ipv4.addresses: 10.24.8.40/24\nipv6.addresses: 2001:db8:24:8::40/64\nconnection.autoconnect: yes"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "nmcli device status"
    },
    {
      "command": "nmcli connection modify Operations ipv4.method manual ipv4.addresses 10.24.8.40/24 ipv4.gateway 10.24.8.1"
    },
    {
      "command": "nmcli connection modify Operations ipv6.method manual ipv6.addresses 2001:db8:24:8::40/64 ipv6.gateway 2001:db8:24:8::1"
    },
    {
      "command": "nmcli connection modify Operations connection.autoconnect yes && nmcli connection up Operations"
    },
    {
      "command": "nmcli -f ipv4.addresses,ipv6.addresses,connection.autoconnect connection show Operations"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Network devices inspected.",
      "points": 20,
      "requires": [
        "interfaces_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Configure persistent dual-stack addressing",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "ipv4_configured",
        "ipv6_configured",
        "connection_activated"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Persistent dual-stack configuration validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
