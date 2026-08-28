window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 23,
  "total": 62,
  "id": "rhcsa-practice-23-process-identification-control",
  "slug": "process-identification-control",
  "title": "Process Identification and Control",
  "domain": "Running Systems",
  "technology": "Process Management",
  "scenario": "Identify the process consuming the most CPU, terminate the confirmed runaway worker gracefully, and prove it has exited.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 23: Process Identification and Control",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in process management through an original, state-validated exercise.",
  "facts": {
    "processes_ranked": "CPU-intensive processes ranked",
    "term_sent": "Graceful termination signal sent",
    "grace_period_observed": "Grace period observed",
    "verified": "Runaway process exit validated"
  },
  "actions": [
    {
      "pattern": "^ps\\s+\\-eo\\s+pid,user,pcpu,pmem,comm\\s+\\-\\-sort=\\-pcpu\\s+\\|\\s+head$",
      "command": "ps -eo pid,user,pcpu,pmem,comm --sort=-pcpu | head",
      "sets": [
        "processes_ranked"
      ],
      "requires": [],
      "output": "PID USER %CPU %MEM COMMAND\n4242 batch 98.6 4.1 report-worker"
    },
    {
      "pattern": "^kill\\s+\\-TERM\\s+4242$",
      "command": "kill -TERM 4242",
      "sets": [
        "term_sent"
      ],
      "requires": [
        "processes_ranked"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^sleep\\s+2$",
      "command": "sleep 2",
      "sets": [
        "grace_period_observed"
      ],
      "requires": [
        "term_sent"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^!\\s+ps\\s+\\-p\\s+4242$",
      "command": "! ps -p 4242",
      "sets": [
        "verified"
      ],
      "requires": [
        "term_sent",
        "grace_period_observed"
      ],
      "output": "Command completed successfully."
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "ps -eo pid,user,pcpu,pmem,comm --sort=-pcpu | head"
    },
    {
      "command": "kill -TERM 4242"
    },
    {
      "command": "sleep 2"
    },
    {
      "command": "! ps -p 4242"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "CPU-intensive processes ranked.",
      "points": 20,
      "requires": [
        "processes_ranked"
      ]
    },
    {
      "id": "implement",
      "title": "Locate and stop the runaway process",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "term_sent",
        "grace_period_observed"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Runaway process exit validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
