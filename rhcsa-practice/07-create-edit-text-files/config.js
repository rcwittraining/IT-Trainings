window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 7,
  "total": 62,
  "id": "rhcsa-practice-07-create-edit-text-files",
  "slug": "create-edit-text-files",
  "title": "Create and Edit Text Files",
  "domain": "Essential Tools",
  "technology": "Text Processing",
  "scenario": "Replace an outdated login banner, correct its environment label, and prove that the exact approved line is present.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 07: Create and Edit Text Files",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in text processing through an original, state-validated exercise.",
  "facts": {
    "banner_inspected": "Existing banner inspected",
    "banner_created": "Banner file created with approved text",
    "banner_edited": "Environment label edited in place",
    "verified": "Final banner text validated"
  },
  "actions": [
    {
      "pattern": "^sed\\s+\\-n\\s+'1,20p'\\s+/etc/motd$",
      "command": "sed -n '1,20p' /etc/motd",
      "sets": [
        "banner_inspected"
      ],
      "requires": [],
      "output": "Legacy development access"
    },
    {
      "pattern": "^printf\\s+'Authorized\\s+development\\s+access\\s+only\\\\n'\\s+>\\s+/etc/motd$",
      "command": "printf 'Authorized development access only\\n' > /etc/motd",
      "sets": [
        "banner_created"
      ],
      "requires": [
        "banner_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^sed\\s+\\-i\\s+'s/development/production/'\\s+/etc/motd$",
      "command": "sed -i 's/development/production/' /etc/motd",
      "sets": [
        "banner_edited"
      ],
      "requires": [
        "banner_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^grep\\s+\\-Fx\\s+'Authorized\\s+production\\s+access\\s+only'\\s+/etc/motd$",
      "command": "grep -Fx 'Authorized production access only' /etc/motd",
      "sets": [
        "verified"
      ],
      "requires": [
        "banner_created",
        "banner_edited"
      ],
      "output": "Authorized production access only"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "sed -n '1,20p' /etc/motd"
    },
    {
      "command": "printf 'Authorized development access only\\n' > /etc/motd"
    },
    {
      "command": "sed -i 's/development/production/' /etc/motd"
    },
    {
      "command": "grep -Fx 'Authorized production access only' /etc/motd"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Existing banner inspected.",
      "points": 20,
      "requires": [
        "banner_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Create and revise the approved banner",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "banner_created",
        "banner_edited"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Final banner text validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
