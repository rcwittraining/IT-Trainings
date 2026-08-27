window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 24,
  "total": 62,
  "id": "rhcsa-practice-24-process-scheduling",
  "slug": "process-scheduling",
  "title": "Process Scheduling Adjustment",
  "domain": "Running Systems",
  "technology": "Process Management",
  "scenario": "Lower the CPU scheduling priority of a noncritical report renderer while leaving the process running.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 24: Process Scheduling Adjustment",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in process management through an original, state-validated exercise.",
  "facts": {
    "priority_inspected": "Current scheduling values inspected",
    "priority_adjusted": "Nice value adjusted",
    "verified": "Adjusted scheduling state validated"
  },
  "actions": [
    {
      "pattern": "^ps\\s+\\-o\\s+pid,ni,pri,comm\\s+\\-p\\s+4310$",
      "command": "ps -o pid,ni,pri,comm -p 4310",
      "sets": [
        "priority_inspected"
      ],
      "requires": [],
      "output": "PID  NI PRI COMMAND\n4310  0  19 report-render"
    },
    {
      "pattern": "^renice\\s+\\-n\\s+10\\s+\\-p\\s+4310$",
      "command": "renice -n 10 -p 4310",
      "sets": [
        "priority_adjusted"
      ],
      "requires": [
        "priority_inspected"
      ],
      "output": "4310 (process ID) old priority 0, new priority 10"
    },
    {
      "pattern": "^ps\\s+\\-o\\s+pid,ni,pri,comm\\s+\\-\\-no\\-headers\\s+\\-p\\s+4310$",
      "command": "ps -o pid,ni,pri,comm --no-headers -p 4310",
      "sets": [
        "verified"
      ],
      "requires": [
        "priority_adjusted"
      ],
      "output": "4310 10   9 report-render"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "ps -o pid,ni,pri,comm -p 4310"
    },
    {
      "command": "renice -n 10 -p 4310"
    },
    {
      "command": "ps -o pid,ni,pri,comm --no-headers -p 4310"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Current scheduling values inspected.",
      "points": 20,
      "requires": [
        "priority_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Adjust the running process priority",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "priority_adjusted"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Adjusted scheduling state validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
