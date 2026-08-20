window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 8,
  "total": 62,
  "id": "rhcsa-practice-08-file-directory-operations",
  "slug": "file-directory-operations",
  "title": "File and Directory Operations",
  "domain": "Essential Tools",
  "technology": "Files and Archives",
  "scenario": "Prepare a release workspace, preserve a configuration copy, promote the candidate artifact, and remove the obsolete staging item.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 08: File and Directory Operations",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in files and archives through an original, state-validated exercise.",
  "facts": {
    "tree_created": "Release directory tree created",
    "file_copied": "Configuration copied with metadata",
    "artifact_moved": "Candidate artifact promoted",
    "obsolete_removed": "Obsolete file removed",
    "verified": "Release tree validated"
  },
  "actions": [
    {
      "pattern": "^mkdir\\s+\\-p\\s+/srv/releases/2026\\-08/config$",
      "command": "mkdir -p /srv/releases/2026-08/config",
      "sets": [
        "tree_created"
      ],
      "requires": [],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^cp\\s+\\-a\\s+/etc/example\\.conf\\s+/srv/releases/2026\\-08/config/$",
      "command": "cp -a /etc/example.conf /srv/releases/2026-08/config/",
      "sets": [
        "file_copied"
      ],
      "requires": [
        "tree_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^mv\\s+/var/tmp/app\\.candidate\\s+/srv/releases/2026\\-08/app\\.bin$",
      "command": "mv /var/tmp/app.candidate /srv/releases/2026-08/app.bin",
      "sets": [
        "artifact_moved"
      ],
      "requires": [
        "file_copied"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^rm\\s+\\-f\\s+/srv/releases/2026\\-08/config/obsolete\\.conf$",
      "command": "rm -f /srv/releases/2026-08/config/obsolete.conf",
      "sets": [
        "obsolete_removed"
      ],
      "requires": [
        "artifact_moved"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^find\\s+/srv/releases/2026\\-08\\s+\\-maxdepth\\s+2\\s+\\-type\\s+f\\s+\\-print$",
      "command": "find /srv/releases/2026-08 -maxdepth 2 -type f -print",
      "sets": [
        "verified"
      ],
      "requires": [
        "file_copied",
        "artifact_moved",
        "obsolete_removed"
      ],
      "output": "/srv/releases/2026-08/config/example.conf\n/srv/releases/2026-08/app.bin"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "mkdir -p /srv/releases/2026-08/config"
    },
    {
      "command": "cp -a /etc/example.conf /srv/releases/2026-08/config/"
    },
    {
      "command": "mv /var/tmp/app.candidate /srv/releases/2026-08/app.bin"
    },
    {
      "command": "rm -f /srv/releases/2026-08/config/obsolete.conf"
    },
    {
      "command": "find /srv/releases/2026-08 -maxdepth 2 -type f -print"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Release directory tree created.",
      "points": 20,
      "requires": [
        "tree_created"
      ]
    },
    {
      "id": "implement",
      "title": "Build and clean the release workspace",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "file_copied",
        "artifact_moved",
        "obsolete_removed"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Release tree validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
