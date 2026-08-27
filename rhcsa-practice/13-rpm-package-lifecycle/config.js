window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 13,
  "total": 62,
  "id": "rhcsa-practice-13-rpm-package-lifecycle",
  "slug": "rpm-package-lifecycle",
  "title": "RPM Package Lifecycle",
  "domain": "Software Management",
  "technology": "RPM and DNF",
  "scenario": "Install the approved terminal multiplexer and remove an obsolete clear-text client from the managed host.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 13: RPM Package Lifecycle",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in rpm and dnf through an original, state-validated exercise.",
  "facts": {
    "packages_inspected": "Current package state inspected",
    "package_installed": "Approved package installed",
    "package_removed": "Obsolete package removed",
    "verified": "Final RPM package state validated"
  },
  "actions": [
    {
      "pattern": "^rpm\\s+\\-q\\s+tmux\\s+telnet$",
      "command": "rpm -q tmux telnet",
      "sets": [
        "packages_inspected"
      ],
      "requires": [],
      "output": "package tmux is not installed\ntelnet-0.17-95.el10.x86_64"
    },
    {
      "pattern": "^dnf\\s+install\\s+\\-y\\s+tmux$",
      "command": "dnf install -y tmux",
      "sets": [
        "package_installed"
      ],
      "requires": [
        "packages_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^dnf\\s+remove\\s+\\-y\\s+telnet$",
      "command": "dnf remove -y telnet",
      "sets": [
        "package_removed"
      ],
      "requires": [
        "package_installed"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^rpm\\s+\\-q\\s+tmux\\s+\\&\\&\\s+!\\s+rpm\\s+\\-q\\s+telnet$",
      "command": "rpm -q tmux && ! rpm -q telnet",
      "sets": [
        "verified"
      ],
      "requires": [
        "package_installed",
        "package_removed"
      ],
      "output": "tmux-3.4-7.el10.x86_64\npackage telnet is not installed"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "rpm -q tmux telnet"
    },
    {
      "command": "dnf install -y tmux"
    },
    {
      "command": "dnf remove -y telnet"
    },
    {
      "command": "rpm -q tmux && ! rpm -q telnet"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Current package state inspected.",
      "points": 20,
      "requires": [
        "packages_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Install and remove RPM packages",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "package_installed",
        "package_removed"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Final RPM package state validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
