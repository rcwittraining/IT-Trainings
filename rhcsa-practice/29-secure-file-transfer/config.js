window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 29,
  "total": 62,
  "id": "rhcsa-practice-29-secure-file-transfer",
  "slug": "secure-file-transfer",
  "title": "Secure File Transfer",
  "domain": "Running Systems",
  "technology": "Remote Administration",
  "scenario": "Transfer the signed configuration bundle to serverb over SSH and verify integrity at the destination.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 29: Secure File Transfer",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in remote administration through an original, state-validated exercise.",
  "facts": {
    "source_hash_recorded": "Source checksum recorded",
    "artifact_transferred": "Artifact transferred securely with metadata",
    "verified": "Destination checksum validated"
  },
  "actions": [
    {
      "pattern": "^sha256sum\\s+/var/tmp/app\\-config\\.tgz$",
      "command": "sha256sum /var/tmp/app-config.tgz",
      "sets": [
        "source_hash_recorded"
      ],
      "requires": [],
      "output": "a91d54f2c80c15e6a272...  /var/tmp/app-config.tgz"
    },
    {
      "pattern": "^scp\\s+\\-p\\s+/var/tmp/app\\-config\\.tgz\\s+opsadmin@serverb\\.lab:/srv/incoming/$",
      "command": "scp -p /var/tmp/app-config.tgz opsadmin@serverb.lab:/srv/incoming/",
      "sets": [
        "artifact_transferred"
      ],
      "requires": [
        "source_hash_recorded"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^ssh\\s+opsadmin@serverb\\.lab\\s+'sha256sum\\s+/srv/incoming/app\\-config\\.tgz'$",
      "command": "ssh opsadmin@serverb.lab 'sha256sum /srv/incoming/app-config.tgz'",
      "sets": [
        "verified"
      ],
      "requires": [
        "artifact_transferred"
      ],
      "output": "a91d54f2c80c15e6a272...  /srv/incoming/app-config.tgz"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "sha256sum /var/tmp/app-config.tgz"
    },
    {
      "command": "scp -p /var/tmp/app-config.tgz opsadmin@serverb.lab:/srv/incoming/"
    },
    {
      "command": "ssh opsadmin@serverb.lab 'sha256sum /srv/incoming/app-config.tgz'"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Source checksum recorded.",
      "points": 20,
      "requires": [
        "source_hash_recorded"
      ]
    },
    {
      "id": "implement",
      "title": "Transfer and verify the protected artifact",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "artifact_transferred"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Destination checksum validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
