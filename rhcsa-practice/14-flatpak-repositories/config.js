window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 14,
  "total": 62,
  "id": "rhcsa-practice-14-flatpak-repositories",
  "slug": "flatpak-repositories",
  "title": "Flatpak Repository Configuration",
  "domain": "Software Management",
  "technology": "Flatpak",
  "scenario": "Register the approved desktop application source without duplicating an existing remote, then verify its name and URL.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 14: Flatpak Repository Configuration",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in flatpak through an original, state-validated exercise.",
  "facts": {
    "remotes_inspected": "Existing Flatpak remotes inspected",
    "remote_added": "Training Flatpak remote added idempotently",
    "remote_enabled": "Training remote enabled",
    "verified": "Flatpak remote validated"
  },
  "actions": [
    {
      "pattern": "^flatpak\\s+remotes$",
      "command": "flatpak remotes",
      "sets": [
        "remotes_inspected"
      ],
      "requires": [],
      "output": "Name    Options\nflathub system"
    },
    {
      "pattern": "^flatpak\\s+remote\\-add\\s+\\-\\-if\\-not\\-exists\\s+training\\s+https://flatpak\\.lab\\.example/training\\.flatpakrepo$",
      "command": "flatpak remote-add --if-not-exists training https://flatpak.lab.example/training.flatpakrepo",
      "sets": [
        "remote_added"
      ],
      "requires": [
        "remotes_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^flatpak\\s+remote\\-modify\\s+\\-\\-enable\\s+training$",
      "command": "flatpak remote-modify --enable training",
      "sets": [
        "remote_enabled"
      ],
      "requires": [
        "remote_added"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^flatpak\\s+remotes\\s+\\-\\-columns=name,url\\s+\\|\\s+grep\\s+'\\^training'$",
      "command": "flatpak remotes --columns=name,url | grep '^training'",
      "sets": [
        "verified"
      ],
      "requires": [
        "remote_added",
        "remote_enabled"
      ],
      "output": "training\thttps://flatpak.lab.example/repo/"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "flatpak remotes"
    },
    {
      "command": "flatpak remote-add --if-not-exists training https://flatpak.lab.example/training.flatpakrepo"
    },
    {
      "command": "flatpak remote-modify --enable training"
    },
    {
      "command": "flatpak remotes --columns=name,url | grep '^training'"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Existing Flatpak remotes inspected.",
      "points": 20,
      "requires": [
        "remotes_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Configure the approved Flatpak remote",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "remote_added",
        "remote_enabled"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Flatpak remote validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
