window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 57,
  "total": 62,
  "id": "rhcsa-practice-57-ssh-key-authentication",
  "slug": "ssh-key-authentication",
  "title": "SSH Key-based Authentication",
  "domain": "Security",
  "technology": "SSH",
  "scenario": "Create a modern key pair for the administrator, install it on serverb, and prove that password authentication is unnecessary.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 57: SSH Key-based Authentication",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in ssh through an original, state-validated exercise.",
  "facts": {
    "existing_key_checked": "Existing key state inspected",
    "keypair_created": "ED25519 key pair created",
    "key_installed": "Public key installed on remote account",
    "verified": "Passwordless key authentication validated"
  },
  "actions": [
    {
      "pattern": "^test\\s+\\-e\\s+/home/admin/\\.ssh/id_ed25519$",
      "command": "test -e /home/admin/.ssh/id_ed25519",
      "sets": [
        "existing_key_checked"
      ],
      "requires": [],
      "output": "test: /home/admin/.ssh/id_ed25519: no such file"
    },
    {
      "pattern": "^ssh\\-keygen\\s+\\-t\\s+ed25519\\s+\\-N\\s+''\\s+\\-f\\s+/home/admin/\\.ssh/id_ed25519$",
      "command": "ssh-keygen -t ed25519 -N '' -f /home/admin/.ssh/id_ed25519",
      "sets": [
        "keypair_created"
      ],
      "requires": [
        "existing_key_checked"
      ],
      "output": "Your public key has been saved in /home/admin/.ssh/id_ed25519.pub"
    },
    {
      "pattern": "^ssh\\-copy\\-id\\s+\\-i\\s+/home/admin/\\.ssh/id_ed25519\\.pub\\s+admin@serverb\\.lab$",
      "command": "ssh-copy-id -i /home/admin/.ssh/id_ed25519.pub admin@serverb.lab",
      "sets": [
        "key_installed"
      ],
      "requires": [
        "keypair_created"
      ],
      "output": "Number of key(s) added: 1"
    },
    {
      "pattern": "^ssh\\s+\\-o\\s+PasswordAuthentication=no\\s+admin@serverb\\.lab\\s+'id\\s+\\-un'$",
      "command": "ssh -o PasswordAuthentication=no admin@serverb.lab 'id -un'",
      "sets": [
        "verified"
      ],
      "requires": [
        "keypair_created",
        "key_installed"
      ],
      "output": "admin"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "test -e /home/admin/.ssh/id_ed25519"
    },
    {
      "command": "ssh-keygen -t ed25519 -N '' -f /home/admin/.ssh/id_ed25519"
    },
    {
      "command": "ssh-copy-id -i /home/admin/.ssh/id_ed25519.pub admin@serverb.lab"
    },
    {
      "command": "ssh -o PasswordAuthentication=no admin@serverb.lab 'id -un'"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Existing key state inspected.",
      "points": 20,
      "requires": [
        "existing_key_checked"
      ]
    },
    {
      "id": "implement",
      "title": "Establish verified key-only SSH access",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "keypair_created",
        "key_installed"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Passwordless key authentication validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
