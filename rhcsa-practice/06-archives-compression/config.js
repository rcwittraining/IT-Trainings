window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 6,
  "total": 62,
  "id": "rhcsa-practice-06-archives-compression",
  "slug": "archives-compression",
  "title": "Archive and Compression Operations",
  "domain": "Essential Tools",
  "technology": "Files and Archives",
  "scenario": "Package application configuration with gzip, inspect a bzip2 reference archive, and restore it into an isolated validation directory.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 06: Archive and Compression Operations",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in files and archives through an original, state-validated exercise.",
  "facts": {
    "source_sized": "Archive source size inspected",
    "gzip_archive_created": "gzip-compressed archive created",
    "bzip_archive_inspected": "bzip2 archive contents inspected",
    "archive_restored": "bzip2 archive restored in isolation",
    "verified": "Created archive validated"
  },
  "actions": [
    {
      "pattern": "^du\\s+\\-sh\\s+/srv/app$",
      "command": "du -sh /srv/app",
      "sets": [
        "source_sized"
      ],
      "requires": [],
      "output": "38M\t/srv/app"
    },
    {
      "pattern": "^tar\\s+\\-czf\\s+/backup/app\\-etc\\.tar\\.gz\\s+\\-C\\s+/srv/app\\s+etc$",
      "command": "tar -czf /backup/app-etc.tar.gz -C /srv/app etc",
      "sets": [
        "gzip_archive_created"
      ],
      "requires": [
        "source_sized"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^tar\\s+\\-tjf\\s+/backup/reference\\.tar\\.bz2$",
      "command": "tar -tjf /backup/reference.tar.bz2",
      "sets": [
        "bzip_archive_inspected"
      ],
      "requires": [
        "gzip_archive_created"
      ],
      "output": "reference/\nreference/manifest.txt"
    },
    {
      "pattern": "^mkdir\\s+\\-p\\s+/restore/reference\\s+\\&\\&\\s+tar\\s+\\-xjf\\s+/backup/reference\\.tar\\.bz2\\s+\\-C\\s+/restore/reference$",
      "command": "mkdir -p /restore/reference && tar -xjf /backup/reference.tar.bz2 -C /restore/reference",
      "sets": [
        "archive_restored"
      ],
      "requires": [
        "bzip_archive_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^tar\\s+\\-tzf\\s+/backup/app\\-etc\\.tar\\.gz\\s+\\|\\s+grep\\s+\\-q\\s+'\\^etc/'$",
      "command": "tar -tzf /backup/app-etc.tar.gz | grep -q '^etc/'",
      "sets": [
        "verified"
      ],
      "requires": [
        "gzip_archive_created",
        "bzip_archive_inspected",
        "archive_restored"
      ],
      "output": "Command completed successfully."
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "du -sh /srv/app"
    },
    {
      "command": "tar -czf /backup/app-etc.tar.gz -C /srv/app etc"
    },
    {
      "command": "tar -tjf /backup/reference.tar.bz2"
    },
    {
      "command": "mkdir -p /restore/reference && tar -xjf /backup/reference.tar.bz2 -C /restore/reference"
    },
    {
      "command": "tar -tzf /backup/app-etc.tar.gz | grep -q '^etc/'"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Archive source size inspected.",
      "points": 20,
      "requires": [
        "source_sized"
      ]
    },
    {
      "id": "implement",
      "title": "Create, inspect and restore compressed archives",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "gzip_archive_created",
        "bzip_archive_inspected",
        "archive_restored"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Created archive validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
