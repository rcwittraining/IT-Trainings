window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 12,
  "total": 62,
  "id": "rhcsa-practice-12-rpm-repositories",
  "slug": "rpm-repositories",
  "title": "RPM Repository Configuration",
  "domain": "Software Management",
  "technology": "RPM and DNF",
  "scenario": "Add the approved internal tools repository, enable it, refresh metadata, and confirm that DNF can see it.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 12: RPM Repository Configuration",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in rpm and dnf through an original, state-validated exercise.",
  "facts": {
    "repos_inspected": "Existing RPM repositories inspected",
    "repo_added": "Internal repository definition added",
    "repo_enabled": "Internal repository enabled",
    "metadata_refreshed": "Repository metadata refreshed",
    "verified": "Enabled repository validated"
  },
  "actions": [
    {
      "pattern": "^dnf\\s+repolist$",
      "command": "dnf repolist",
      "sets": [
        "repos_inspected"
      ],
      "requires": [],
      "output": "rhel-10-baseos\nrhel-10-appstream"
    },
    {
      "pattern": "^dnf\\s+config\\-manager\\s+\\-\\-add\\-repo\\s+https://repo\\.lab\\.example/rhel10/tools\\.repo$",
      "command": "dnf config-manager --add-repo https://repo.lab.example/rhel10/tools.repo",
      "sets": [
        "repo_added"
      ],
      "requires": [
        "repos_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^dnf\\s+config\\-manager\\s+\\-\\-set\\-enabled\\s+training\\-tools$",
      "command": "dnf config-manager --set-enabled training-tools",
      "sets": [
        "repo_enabled"
      ],
      "requires": [
        "repo_added"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^dnf\\s+makecache$",
      "command": "dnf makecache",
      "sets": [
        "metadata_refreshed"
      ],
      "requires": [
        "repo_enabled"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^dnf\\s+repolist\\s+\\-\\-enabled\\s+\\|\\s+grep\\s+training\\-tools$",
      "command": "dnf repolist --enabled | grep training-tools",
      "sets": [
        "verified"
      ],
      "requires": [
        "repo_added",
        "repo_enabled",
        "metadata_refreshed"
      ],
      "output": "training-tools  RCW Training Tools"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "dnf repolist"
    },
    {
      "command": "dnf config-manager --add-repo https://repo.lab.example/rhel10/tools.repo"
    },
    {
      "command": "dnf config-manager --set-enabled training-tools"
    },
    {
      "command": "dnf makecache"
    },
    {
      "command": "dnf repolist --enabled | grep training-tools"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Existing RPM repositories inspected.",
      "points": 20,
      "requires": [
        "repos_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Configure the approved RPM repository",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "repo_added",
        "repo_enabled",
        "metadata_refreshed"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Enabled repository validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
