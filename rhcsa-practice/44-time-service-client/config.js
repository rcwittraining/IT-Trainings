window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 44,
  "total": 62,
  "id": "rhcsa-practice-44-time-service-client",
  "slug": "time-service-client",
  "title": "Time Service Client",
  "domain": "System Maintenance",
  "technology": "Time Synchronisation",
  "scenario": "Configure the host as a time-service client using the approved source and verify synchronisation health.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 44: Time Service Client",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in time synchronisation through an original, state-validated exercise.",
  "facts": {
    "time_state_inspected": "Current clock and synchronisation state inspected",
    "time_source_added": "Approved time source configured",
    "chronyd_enabled": "Time client enabled and started",
    "source_health_checked": "Time source health inspected",
    "verified": "Clock synchronisation validated"
  },
  "actions": [
    {
      "pattern": "^timedatectl\\s+status$",
      "command": "timedatectl status",
      "sets": [
        "time_state_inspected"
      ],
      "requires": [],
      "output": "System clock synchronized: no\nNTP service: inactive"
    },
    {
      "pattern": "^printf\\s+'server\\s+time\\.lab\\.example\\s+iburst\\\\n'\\s+>>\\s+/etc/chrony\\.conf$",
      "command": "printf 'server time.lab.example iburst\\n' >> /etc/chrony.conf",
      "sets": [
        "time_source_added"
      ],
      "requires": [
        "time_state_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^systemctl\\s+enable\\s+\\-\\-now\\s+chronyd$",
      "command": "systemctl enable --now chronyd",
      "sets": [
        "chronyd_enabled"
      ],
      "requires": [
        "time_source_added"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^chronyc\\s+sources\\s+\\-v$",
      "command": "chronyc sources -v",
      "sets": [
        "source_health_checked"
      ],
      "requires": [
        "chronyd_enabled"
      ],
      "output": "^* time.lab.example 2 6 377 12 +15us[+20us] +/- 3ms"
    },
    {
      "pattern": "^timedatectl\\s+show\\s+\\-p\\s+NTPSynchronized\\s+\\-\\-value$",
      "command": "timedatectl show -p NTPSynchronized --value",
      "sets": [
        "verified"
      ],
      "requires": [
        "time_source_added",
        "chronyd_enabled",
        "source_health_checked"
      ],
      "output": "yes"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "timedatectl status"
    },
    {
      "command": "printf 'server time.lab.example iburst\\n' >> /etc/chrony.conf"
    },
    {
      "command": "systemctl enable --now chronyd"
    },
    {
      "command": "chronyc sources -v"
    },
    {
      "command": "timedatectl show -p NTPSynchronized --value"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Current clock and synchronisation state inspected.",
      "points": 20,
      "requires": [
        "time_state_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Configure and validate the time client",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "time_source_added",
        "chronyd_enabled",
        "source_health_checked"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Clock synchronisation validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
