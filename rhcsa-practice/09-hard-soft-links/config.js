window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 9,
  "total": 62,
  "id": "rhcsa-practice-09-hard-soft-links",
  "slug": "hard-soft-links",
  "title": "Hard and Symbolic Links",
  "domain": "Essential Tools",
  "technology": "Files and Archives",
  "scenario": "Provide a same-filesystem recovery name for a policy file and a stable symbolic path for the current application release.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 09: Hard and Symbolic Links",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in files and archives through an original, state-validated exercise.",
  "facts": {
    "inode_inspected": "Source inode inspected",
    "hard_link_created": "Hard recovery link created",
    "soft_link_created": "Stable symbolic release link created",
    "verified": "Both link types validated"
  },
  "actions": [
    {
      "pattern": "^stat\\s+\\-c\\s+'%i\\s+%n'\\s+/srv/policy/current\\.conf$",
      "command": "stat -c '%i %n' /srv/policy/current.conf",
      "sets": [
        "inode_inspected"
      ],
      "requires": [],
      "output": "524881 /srv/policy/current.conf"
    },
    {
      "pattern": "^ln\\s+/srv/policy/current\\.conf\\s+/srv/policy/current\\.conf\\.recovery$",
      "command": "ln /srv/policy/current.conf /srv/policy/current.conf.recovery",
      "sets": [
        "hard_link_created"
      ],
      "requires": [
        "inode_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^ln\\s+\\-s\\s+/srv/releases/app\\-4\\.2\\s+/opt/app\\-current$",
      "command": "ln -s /srv/releases/app-4.2 /opt/app-current",
      "sets": [
        "soft_link_created"
      ],
      "requires": [
        "hard_link_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^test\\s+/srv/policy/current\\.conf\\s+\\-ef\\s+/srv/policy/current\\.conf\\.recovery\\s+\\&\\&\\s+test\\s+\\-L\\s+/opt/app\\-current$",
      "command": "test /srv/policy/current.conf -ef /srv/policy/current.conf.recovery && test -L /opt/app-current",
      "sets": [
        "verified"
      ],
      "requires": [
        "hard_link_created",
        "soft_link_created"
      ],
      "output": "Command completed successfully."
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "stat -c '%i %n' /srv/policy/current.conf"
    },
    {
      "command": "ln /srv/policy/current.conf /srv/policy/current.conf.recovery"
    },
    {
      "command": "ln -s /srv/releases/app-4.2 /opt/app-current"
    },
    {
      "command": "test /srv/policy/current.conf -ef /srv/policy/current.conf.recovery && test -L /opt/app-current"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Source inode inspected.",
      "points": 20,
      "requires": [
        "inode_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Create hard and symbolic links",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "hard_link_created",
        "soft_link_created"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Both link types validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
