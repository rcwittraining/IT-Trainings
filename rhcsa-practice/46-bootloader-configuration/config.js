window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 46,
  "total": 62,
  "id": "rhcsa-practice-46-bootloader-configuration",
  "slug": "bootloader-configuration",
  "title": "Bootloader Configuration",
  "domain": "System Maintenance",
  "technology": "Bootloader",
  "scenario": "Add persistent auditing to every installed kernel command line and confirm the setting across boot entries.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 46: Bootloader Configuration",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in bootloader through an original, state-validated exercise.",
  "facts": {
    "default_kernel_checked": "Default kernel identified",
    "kernel_args_updated": "Auditing argument added to all kernels",
    "verified": "Bootloader arguments validated"
  },
  "actions": [
    {
      "pattern": "^grubby\\s+\\-\\-default\\-kernel$",
      "command": "grubby --default-kernel",
      "sets": [
        "default_kernel_checked"
      ],
      "requires": [],
      "output": "/boot/vmlinuz-6.12.0-55.el10.x86_64"
    },
    {
      "pattern": "^grubby\\s+\\-\\-update\\-kernel=ALL\\s+\\-\\-args='audit=1'$",
      "command": "grubby --update-kernel=ALL --args='audit=1'",
      "sets": [
        "kernel_args_updated"
      ],
      "requires": [
        "default_kernel_checked"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^grubby\\s+\\-\\-info=ALL\\s+\\|\\s+grep\\s+\\-E\\s+'\\^args=\\.\\*audit=1'$",
      "command": "grubby --info=ALL | grep -E '^args=.*audit=1'",
      "sets": [
        "verified"
      ],
      "requires": [
        "kernel_args_updated"
      ],
      "output": "args=\"ro crashkernel=auto audit=1\""
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "grubby --default-kernel"
    },
    {
      "command": "grubby --update-kernel=ALL --args='audit=1'"
    },
    {
      "command": "grubby --info=ALL | grep -E '^args=.*audit=1'"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Default kernel identified.",
      "points": 20,
      "requires": [
        "default_kernel_checked"
      ]
    },
    {
      "id": "implement",
      "title": "Modify persistent bootloader kernel arguments",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "kernel_args_updated"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Bootloader arguments validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
