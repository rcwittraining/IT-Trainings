window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 38,
  "total": 62,
  "id": "rhcsa-practice-38-autofs-indirect-maps",
  "slug": "autofs-indirect-maps",
  "title": "Autofs Configuration",
  "domain": "File Systems",
  "technology": "Autofs",
  "scenario": "Configure an indirect automount so project exports appear beneath /projects only when accessed.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 38: Autofs Configuration",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in autofs through an original, state-validated exercise.",
  "facts": {
    "autofs_checked": "Autofs package state inspected",
    "master_map_created": "Indirect master map created",
    "indirect_map_created": "Project map created",
    "autofs_enabled": "Autofs enabled and started",
    "verified": "On-demand project mount validated"
  },
  "actions": [
    {
      "pattern": "^rpm\\s+\\-q\\s+autofs$",
      "command": "rpm -q autofs",
      "sets": [
        "autofs_checked"
      ],
      "requires": [],
      "output": "autofs-5.1.9-12.el10.x86_64"
    },
    {
      "pattern": "^printf\\s+'/projects\\s+/etc/auto\\.projects\\\\n'\\s+>\\s+/etc/auto\\.master\\.d/projects\\.autofs$",
      "command": "printf '/projects /etc/auto.projects\\n' > /etc/auto.master.d/projects.autofs",
      "sets": [
        "master_map_created"
      ],
      "requires": [
        "autofs_checked"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^printf\\s+'alpha\\s+\\-rw,sync\\s+files\\.lab\\.example:/exports/alpha\\\\n'\\s+>\\s+/etc/auto\\.projects$",
      "command": "printf 'alpha -rw,sync files.lab.example:/exports/alpha\\n' > /etc/auto.projects",
      "sets": [
        "indirect_map_created"
      ],
      "requires": [
        "master_map_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^systemctl\\s+enable\\s+\\-\\-now\\s+autofs$",
      "command": "systemctl enable --now autofs",
      "sets": [
        "autofs_enabled"
      ],
      "requires": [
        "indirect_map_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^ls\\s+/projects/alpha\\s+\\&\\&\\s+mount\\s+\\|\\s+grep\\s+'/projects/alpha'$",
      "command": "ls /projects/alpha && mount | grep '/projects/alpha'",
      "sets": [
        "verified"
      ],
      "requires": [
        "master_map_created",
        "indirect_map_created",
        "autofs_enabled"
      ],
      "output": "README.md\nfiles.lab.example:/exports/alpha on /projects/alpha type nfs4"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "rpm -q autofs"
    },
    {
      "command": "printf '/projects /etc/auto.projects\\n' > /etc/auto.master.d/projects.autofs"
    },
    {
      "command": "printf 'alpha -rw,sync files.lab.example:/exports/alpha\\n' > /etc/auto.projects"
    },
    {
      "command": "systemctl enable --now autofs"
    },
    {
      "command": "ls /projects/alpha && mount | grep '/projects/alpha'"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Autofs package state inspected.",
      "points": 20,
      "requires": [
        "autofs_checked"
      ]
    },
    {
      "id": "implement",
      "title": "Configure and activate the autofs map",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "master_map_created",
        "indirect_map_created",
        "autofs_enabled"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "On-demand project mount validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
