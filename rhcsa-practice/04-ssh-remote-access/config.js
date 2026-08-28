window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 4,
  "total": 62,
  "id": "rhcsa-practice-04-ssh-remote-access",
  "slug": "ssh-remote-access",
  "title": "Secure Shell Remote Access",
  "domain": "Essential Tools",
  "technology": "Remote Administration",
  "scenario": "Connect from the administration host to serverb using the assigned key and verify the remote identity without enabling password authentication.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 04: Secure Shell Remote Access",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in remote administration through an original, state-validated exercise.",
  "facts": {
    "key_inspected": "Assigned public key fingerprint inspected",
    "remote_connected": "Remote command executed with the assigned key",
    "verified": "Remote identity validated"
  },
  "actions": [
    {
      "pattern": "^ssh\\-keygen\\s+\\-lf\\s+/home/admin/\\.ssh/id_ed25519\\.pub$",
      "command": "ssh-keygen -lf /home/admin/.ssh/id_ed25519.pub",
      "sets": [
        "key_inspected"
      ],
      "requires": [],
      "output": "256 SHA256:RCWtrainingKey admin@app01 (ED25519)"
    },
    {
      "pattern": "^ssh\\s+\\-i\\s+/home/admin/\\.ssh/id_ed25519\\s+opsadmin@serverb\\.lab\\s+'hostname'$",
      "command": "ssh -i /home/admin/.ssh/id_ed25519 opsadmin@serverb.lab 'hostname'",
      "sets": [
        "remote_connected"
      ],
      "requires": [
        "key_inspected"
      ],
      "output": "serverb.lab"
    },
    {
      "pattern": "^ssh\\s+\\-i\\s+/home/admin/\\.ssh/id_ed25519\\s+opsadmin@serverb\\.lab\\s+'id\\s+\\-u'$",
      "command": "ssh -i /home/admin/.ssh/id_ed25519 opsadmin@serverb.lab 'id -u'",
      "sets": [
        "verified"
      ],
      "requires": [
        "remote_connected"
      ],
      "output": "1701"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "ssh-keygen -lf /home/admin/.ssh/id_ed25519.pub"
    },
    {
      "command": "ssh -i /home/admin/.ssh/id_ed25519 opsadmin@serverb.lab 'hostname'"
    },
    {
      "command": "ssh -i /home/admin/.ssh/id_ed25519 opsadmin@serverb.lab 'id -u'"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Assigned public key fingerprint inspected.",
      "points": 20,
      "requires": [
        "key_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Establish key-based remote shell access",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "remote_connected"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Remote identity validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
