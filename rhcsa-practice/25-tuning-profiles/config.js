window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 25,
  "total": 62,
  "id": "rhcsa-practice-25-tuning-profiles",
  "slug": "tuning-profiles",
  "title": "System Tuning Profiles",
  "domain": "Running Systems",
  "technology": "Performance Tuning",
  "scenario": "Review the host recommendation and apply the approved virtual-machine tuning profile persistently.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 25: System Tuning Profiles",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in performance tuning through an original, state-validated exercise.",
  "facts": {
    "active_profile_checked": "Current tuned profile inspected",
    "recommendation_checked": "Profile recommendation inspected",
    "profile_applied": "Approved tuning profile applied",
    "verified": "Active tuning profile validated"
  },
  "actions": [
    {
      "pattern": "^tuned\\-adm\\s+active$",
      "command": "tuned-adm active",
      "sets": [
        "active_profile_checked"
      ],
      "requires": [],
      "output": "Current active profile: balanced"
    },
    {
      "pattern": "^tuned\\-adm\\s+recommend$",
      "command": "tuned-adm recommend",
      "sets": [
        "recommendation_checked"
      ],
      "requires": [
        "active_profile_checked"
      ],
      "output": "virtual-guest"
    },
    {
      "pattern": "^tuned\\-adm\\s+profile\\s+virtual\\-guest$",
      "command": "tuned-adm profile virtual-guest",
      "sets": [
        "profile_applied"
      ],
      "requires": [
        "recommendation_checked"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^tuned\\-adm\\s+verify$",
      "command": "tuned-adm verify",
      "sets": [
        "verified"
      ],
      "requires": [
        "recommendation_checked",
        "profile_applied"
      ],
      "output": "Verification succeeded, current system settings match the preset profile."
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "tuned-adm active"
    },
    {
      "command": "tuned-adm recommend"
    },
    {
      "command": "tuned-adm profile virtual-guest"
    },
    {
      "command": "tuned-adm verify"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Current tuned profile inspected.",
      "points": 20,
      "requires": [
        "active_profile_checked"
      ]
    },
    {
      "id": "implement",
      "title": "Select and verify a tuned profile",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "recommendation_checked",
        "profile_applied"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Active tuning profile validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
