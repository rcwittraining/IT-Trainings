window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 40,
  "total": 62,
  "id": "rhcsa-practice-40-permission-troubleshooting",
  "slug": "permission-troubleshooting",
  "title": "File Permission Troubleshooting",
  "domain": "File Systems",
  "technology": "Permissions",
  "scenario": "The application service cannot read its configuration. Trace every path component, correct ownership and mode, and test access as the service identity.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 40: File Permission Troubleshooting",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in permissions through an original, state-validated exercise.",
  "facts": {
    "path_permissions_traced": "Every path component inspected",
    "acl_inspected": "File ACL and effective permissions inspected",
    "ownership_repaired": "Configuration ownership repaired recursively",
    "modes_repaired": "Directory and file modes repaired",
    "verified": "Service-account access validated"
  },
  "actions": [
    {
      "pattern": "^namei\\s+\\-l\\s+/srv/app/config/settings\\.ini$",
      "command": "namei -l /srv/app/config/settings.ini",
      "sets": [
        "path_permissions_traced"
      ],
      "requires": [],
      "output": "f: /srv/app/config/settings.ini\ndrwxr-xr-x root root /\ndrwxr-xr-x root root srv\ndrwx------ root root app"
    },
    {
      "pattern": "^getfacl\\s+/srv/app/config/settings\\.ini$",
      "command": "getfacl /srv/app/config/settings.ini",
      "sets": [
        "acl_inspected"
      ],
      "requires": [
        "path_permissions_traced"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^chown\\s+\\-R\\s+appsvc:appteam\\s+/srv/app/config$",
      "command": "chown -R appsvc:appteam /srv/app/config",
      "sets": [
        "ownership_repaired"
      ],
      "requires": [
        "acl_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^chmod\\s+0750\\s+/srv/app\\s+/srv/app/config\\s+\\&\\&\\s+chmod\\s+0640\\s+/srv/app/config/settings\\.ini$",
      "command": "chmod 0750 /srv/app /srv/app/config && chmod 0640 /srv/app/config/settings.ini",
      "sets": [
        "modes_repaired"
      ],
      "requires": [
        "ownership_repaired"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^su\\s+\\-s\\s+/bin/bash\\s+appsvc\\s+\\-c\\s+'test\\s+\\-r\\s+/srv/app/config/settings\\.ini'$",
      "command": "su -s /bin/bash appsvc -c 'test -r /srv/app/config/settings.ini'",
      "sets": [
        "verified"
      ],
      "requires": [
        "acl_inspected",
        "ownership_repaired",
        "modes_repaired"
      ],
      "output": "Command completed successfully."
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "namei -l /srv/app/config/settings.ini"
    },
    {
      "command": "getfacl /srv/app/config/settings.ini"
    },
    {
      "command": "chown -R appsvc:appteam /srv/app/config"
    },
    {
      "command": "chmod 0750 /srv/app /srv/app/config && chmod 0640 /srv/app/config/settings.ini"
    },
    {
      "command": "su -s /bin/bash appsvc -c 'test -r /srv/app/config/settings.ini'"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Every path component inspected.",
      "points": 20,
      "requires": [
        "path_permissions_traced"
      ]
    },
    {
      "id": "implement",
      "title": "Diagnose and repair the access path",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "acl_inspected",
        "ownership_repaired",
        "modes_repaired"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Service-account access validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
