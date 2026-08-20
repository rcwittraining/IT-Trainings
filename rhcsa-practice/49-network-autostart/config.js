window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 49,
  "total": 62,
  "id": "rhcsa-practice-49-network-autostart",
  "slug": "network-autostart",
  "title": "Network Service Autostart",
  "domain": "Networking",
  "technology": "NetworkManager",
  "scenario": "Ensure the management connection and NetworkManager service recover automatically after boot.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 49: Network Service Autostart",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in networkmanager through an original, state-validated exercise.",
  "facts": {
    "connection_inspected": "Management connection inspected",
    "autoconnect_enabled": "Connection autoconnect enabled",
    "network_service_enabled": "NetworkManager enabled and started",
    "verified": "Connection and boot service state validated"
  },
  "actions": [
    {
      "pattern": "^nmcli\\s+connection\\s+show\\s+Management$",
      "command": "nmcli connection show Management",
      "sets": [
        "connection_inspected"
      ],
      "requires": [],
      "output": "connection.autoconnect: no"
    },
    {
      "pattern": "^nmcli\\s+connection\\s+modify\\s+Management\\s+connection\\.autoconnect\\s+yes$",
      "command": "nmcli connection modify Management connection.autoconnect yes",
      "sets": [
        "autoconnect_enabled"
      ],
      "requires": [
        "connection_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^systemctl\\s+enable\\s+\\-\\-now\\s+NetworkManager$",
      "command": "systemctl enable --now NetworkManager",
      "sets": [
        "network_service_enabled"
      ],
      "requires": [
        "autoconnect_enabled"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^nmcli\\s+\\-f\\s+GENERAL\\.STATE,GENERAL\\.CONNECTION\\s+device\\s+show\\s+ens224\\s+\\&\\&\\s+systemctl\\s+is\\-enabled\\s+NetworkManager$",
      "command": "nmcli -f GENERAL.STATE,GENERAL.CONNECTION device show ens224 && systemctl is-enabled NetworkManager",
      "sets": [
        "verified"
      ],
      "requires": [
        "autoconnect_enabled",
        "network_service_enabled"
      ],
      "output": "GENERAL.STATE: 100 (connected)\nGENERAL.CONNECTION: Management\nenabled"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "nmcli connection show Management"
    },
    {
      "command": "nmcli connection modify Management connection.autoconnect yes"
    },
    {
      "command": "systemctl enable --now NetworkManager"
    },
    {
      "command": "nmcli -f GENERAL.STATE,GENERAL.CONNECTION device show ens224 && systemctl is-enabled NetworkManager"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Management connection inspected.",
      "points": 20,
      "requires": [
        "connection_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Enable persistent network startup",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "autoconnect_enabled",
        "network_service_enabled"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Connection and boot service state validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
