window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 58,
  "total": 62,
  "id": "rhcsa-practice-58-selinux-enforcement-modes",
  "slug": "selinux-enforcement-modes",
  "title": "SELinux Enforcement Modes",
  "domain": "Security",
  "technology": "SELinux",
  "scenario": "Demonstrate a temporary permissive diagnostic transition, restore enforcing mode, and ensure enforcing remains configured after reboot.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 58: SELinux Enforcement Modes",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in selinux through an original, state-validated exercise.",
  "facts": {
    "selinux_mode_checked": "Current SELinux mode inspected",
    "permissive_set": "Runtime mode changed to permissive",
    "enforcing_restored": "Runtime enforcing mode restored",
    "persistent_enforcing_set": "Persistent enforcing mode configured",
    "verified": "Runtime and persistent SELinux modes validated"
  },
  "actions": [
    {
      "pattern": "^getenforce$",
      "command": "getenforce",
      "sets": [
        "selinux_mode_checked"
      ],
      "requires": [],
      "output": "Enforcing"
    },
    {
      "pattern": "^setenforce\\s+0$",
      "command": "setenforce 0",
      "sets": [
        "permissive_set"
      ],
      "requires": [
        "selinux_mode_checked"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^setenforce\\s+1$",
      "command": "setenforce 1",
      "sets": [
        "enforcing_restored"
      ],
      "requires": [
        "permissive_set"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^sed\\s+\\-i\\s+'s/\\^SELINUX=\\.\\*/SELINUX=enforcing/'\\s+/etc/selinux/config$",
      "command": "sed -i 's/^SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config",
      "sets": [
        "persistent_enforcing_set"
      ],
      "requires": [
        "enforcing_restored"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^getenforce\\s+\\&\\&\\s+grep\\s+'\\^SELINUX=enforcing'\\s+/etc/selinux/config$",
      "command": "getenforce && grep '^SELINUX=enforcing' /etc/selinux/config",
      "sets": [
        "verified"
      ],
      "requires": [
        "permissive_set",
        "enforcing_restored",
        "persistent_enforcing_set"
      ],
      "output": "Enforcing\nSELINUX=enforcing"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "getenforce"
    },
    {
      "command": "setenforce 0"
    },
    {
      "command": "setenforce 1"
    },
    {
      "command": "sed -i 's/^SELINUX=.*/SELINUX=enforcing/' /etc/selinux/config"
    },
    {
      "command": "getenforce && grep '^SELINUX=enforcing' /etc/selinux/config"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Current SELinux mode inspected.",
      "points": 20,
      "requires": [
        "selinux_mode_checked"
      ]
    },
    {
      "id": "implement",
      "title": "Manage runtime and persistent SELinux modes",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "permissive_set",
        "enforcing_restored",
        "persistent_enforcing_set"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Runtime and persistent SELinux modes validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
