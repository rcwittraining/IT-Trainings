window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 45,
  "total": 62,
  "id": "rhcsa-practice-45-software-install-update-sources",
  "slug": "software-install-update-sources",
  "title": "Software Installation and Updates",
  "domain": "System Maintenance",
  "technology": "RPM and DNF",
  "scenario": "Install one approved local RPM, update managed packages from configured remote sources, and review the resulting transaction.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 45: Software Installation and Updates",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in rpm and dnf through an original, state-validated exercise.",
  "facts": {
    "sources_inspected": "Enabled software sources inspected",
    "local_rpm_installed": "Approved local RPM installed",
    "packages_updated": "Installed packages updated from repositories",
    "verified": "Latest software transaction validated"
  },
  "actions": [
    {
      "pattern": "^dnf\\s+repolist\\s+\\-\\-enabled$",
      "command": "dnf repolist --enabled",
      "sets": [
        "sources_inspected"
      ],
      "requires": [],
      "output": "rhel-10-baseos\nrhel-10-appstream\ntraining-tools"
    },
    {
      "pattern": "^dnf\\s+install\\s+\\-y\\s+/var/tmp/rcw\\-agent\\-2\\.1\\-1\\.el10\\.x86_64\\.rpm$",
      "command": "dnf install -y /var/tmp/rcw-agent-2.1-1.el10.x86_64.rpm",
      "sets": [
        "local_rpm_installed"
      ],
      "requires": [
        "sources_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^dnf\\s+update\\s+\\-y$",
      "command": "dnf update -y",
      "sets": [
        "packages_updated"
      ],
      "requires": [
        "local_rpm_installed"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^dnf\\s+history\\s+info\\s+last$",
      "command": "dnf history info last",
      "sets": [
        "verified"
      ],
      "requires": [
        "local_rpm_installed",
        "packages_updated"
      ],
      "output": "Command Line : dnf update -y\nReturn-Code  : Success"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "dnf repolist --enabled"
    },
    {
      "command": "dnf install -y /var/tmp/rcw-agent-2.1-1.el10.x86_64.rpm"
    },
    {
      "command": "dnf update -y"
    },
    {
      "command": "dnf history info last"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Enabled software sources inspected.",
      "points": 20,
      "requires": [
        "sources_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Install and update from approved sources",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "local_rpm_installed",
        "packages_updated"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Latest software transaction validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
