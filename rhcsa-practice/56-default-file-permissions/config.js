window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 56,
  "total": 62,
  "id": "rhcsa-practice-56-default-file-permissions",
  "slug": "default-file-permissions",
  "title": "Default File Permissions",
  "domain": "Security",
  "technology": "Permissions",
  "scenario": "Apply a restrictive default umask for operations users and create a shared directory that preserves its group on new content.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 56: Default File Permissions",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in permissions through an original, state-validated exercise.",
  "facts": {
    "current_umask_checked": "Current login umask inspected",
    "umask_configured": "Restrictive login umask configured",
    "shared_directory_secured": "Setgid shared directory created",
    "verified": "Default and shared-directory permissions validated"
  },
  "actions": [
    {
      "pattern": "^su\\s+\\-\\s+opslead\\s+\\-c\\s+'umask'$",
      "command": "su - opslead -c 'umask'",
      "sets": [
        "current_umask_checked"
      ],
      "requires": [],
      "output": "0022"
    },
    {
      "pattern": "^printf\\s+'umask\\s+027\\\\n'\\s+>\\s+/etc/profile\\.d/operations\\-umask\\.sh$",
      "command": "printf 'umask 027\\n' > /etc/profile.d/operations-umask.sh",
      "sets": [
        "umask_configured"
      ],
      "requires": [
        "current_umask_checked"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^install\\s+\\-d\\s+\\-o\\s+root\\s+\\-g\\s+operations\\s+\\-m\\s+2770\\s+/srv/operations$",
      "command": "install -d -o root -g operations -m 2770 /srv/operations",
      "sets": [
        "shared_directory_secured"
      ],
      "requires": [
        "umask_configured"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^su\\s+\\-\\s+opslead\\s+\\-c\\s+'umask'\\s+\\&\\&\\s+stat\\s+\\-c\\s+'%G\\s+%a'\\s+/srv/operations$",
      "command": "su - opslead -c 'umask' && stat -c '%G %a' /srv/operations",
      "sets": [
        "verified"
      ],
      "requires": [
        "umask_configured",
        "shared_directory_secured"
      ],
      "output": "0027\noperations 2770"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "su - opslead -c 'umask'"
    },
    {
      "command": "printf 'umask 027\\n' > /etc/profile.d/operations-umask.sh"
    },
    {
      "command": "install -d -o root -g operations -m 2770 /srv/operations"
    },
    {
      "command": "su - opslead -c 'umask' && stat -c '%G %a' /srv/operations"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Current login umask inspected.",
      "points": 20,
      "requires": [
        "current_umask_checked"
      ]
    },
    {
      "id": "implement",
      "title": "Configure secure default permissions",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "umask_configured",
        "shared_directory_secured"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Default and shared-directory permissions validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
