window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 22,
  "total": 62,
  "id": "rhcsa-practice-22-interrupt-boot-recovery",
  "slug": "interrupt-boot-recovery",
  "title": "Boot Interruption and Recovery",
  "domain": "Running Systems",
  "technology": "Boot Recovery",
  "scenario": "Use an authorised break-glass boot workflow to regain local administrative access and prepare SELinux relabelling.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 22: Boot Interruption and Recovery",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in boot recovery through an original, state-validated exercise.",
  "facts": {
    "boot_entry_inspected": "Default boot entry inspected",
    "sysroot_writable": "Installed system remounted read-write",
    "chroot_entered": "Installed system root entered",
    "root_password_reset": "Authorised root password reset",
    "relabel_requested": "SELinux relabel requested",
    "verified": "Recovery persistence marker validated"
  },
  "actions": [
    {
      "pattern": "^grubby\\s+\\-\\-info=DEFAULT$",
      "command": "grubby --info=DEFAULT",
      "sets": [
        "boot_entry_inspected"
      ],
      "requires": [],
      "output": "kernel=/boot/vmlinuz-6.12.0-55.el10.x86_64"
    },
    {
      "pattern": "^mount\\s+\\-o\\s+remount,rw\\s+/sysroot$",
      "command": "mount -o remount,rw /sysroot",
      "sets": [
        "sysroot_writable"
      ],
      "requires": [
        "boot_entry_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^chroot\\s+/sysroot$",
      "command": "chroot /sysroot",
      "sets": [
        "chroot_entered"
      ],
      "requires": [
        "sysroot_writable"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^passwd\\s+root$",
      "command": "passwd root",
      "sets": [
        "root_password_reset"
      ],
      "requires": [
        "chroot_entered"
      ],
      "output": "passwd: all authentication tokens updated successfully."
    },
    {
      "pattern": "^touch\\s+/\\.autorelabel$",
      "command": "touch /.autorelabel",
      "sets": [
        "relabel_requested"
      ],
      "requires": [
        "root_password_reset"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^test\\s+\\-e\\s+/\\.autorelabel$",
      "command": "test -e /.autorelabel",
      "sets": [
        "verified"
      ],
      "requires": [
        "sysroot_writable",
        "chroot_entered",
        "root_password_reset",
        "relabel_requested"
      ],
      "output": "Command completed successfully."
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "grubby --info=DEFAULT"
    },
    {
      "command": "mount -o remount,rw /sysroot"
    },
    {
      "command": "chroot /sysroot"
    },
    {
      "command": "passwd root"
    },
    {
      "command": "touch /.autorelabel"
    },
    {
      "command": "test -e /.autorelabel"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Default boot entry inspected.",
      "points": 20,
      "requires": [
        "boot_entry_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Complete the controlled boot-recovery workflow",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "sysroot_writable",
        "chroot_entered",
        "root_password_reset",
        "relabel_requested"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Recovery persistence marker validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
