window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 41,
  "total": 62,
  "id": "rhcsa-practice-41-task-scheduling",
  "slug": "task-scheduling",
  "title": "At, Cron and Systemd Timer Scheduling",
  "domain": "System Maintenance",
  "technology": "Task Scheduling",
  "scenario": "Schedule one maintenance command once, one recurring report through cron, and enable the supplied systemd cleanup timer.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 41: At, Cron and Systemd Timer Scheduling",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in task scheduling through an original, state-validated exercise.",
  "facts": {
    "at_queue_inspected": "One-time task queue inspected",
    "at_job_created": "One-time key rotation scheduled",
    "cron_job_created": "Recurring cron report scheduled",
    "timer_enabled": "Systemd cleanup timer enabled",
    "verified": "All scheduling mechanisms validated"
  },
  "actions": [
    {
      "pattern": "^atq$",
      "command": "atq",
      "sets": [
        "at_queue_inspected"
      ],
      "requires": [],
      "output": "3 Fri Aug 21 23:00:00 2026 a root"
    },
    {
      "pattern": "^echo\\s+'/usr/local/sbin/rotate\\-key'\\s+\\|\\s+at\\s+23:30$",
      "command": "echo '/usr/local/sbin/rotate-key' | at 23:30",
      "sets": [
        "at_job_created"
      ],
      "requires": [
        "at_queue_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^\\(crontab\\s+\\-l\\s+2>/dev/null;\\s+echo\\s+'15\\s+2\\s+\\*\\s+\\*\\s+\\*\\s+/usr/local/sbin/daily\\-report'\\)\\s+\\|\\s+crontab\\s+\\-$",
      "command": "(crontab -l 2>/dev/null; echo '15 2 * * * /usr/local/sbin/daily-report') | crontab -",
      "sets": [
        "cron_job_created"
      ],
      "requires": [
        "at_job_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^systemctl\\s+enable\\s+\\-\\-now\\s+cache\\-clean\\.timer$",
      "command": "systemctl enable --now cache-clean.timer",
      "sets": [
        "timer_enabled"
      ],
      "requires": [
        "cron_job_created"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^atq\\s+\\&\\&\\s+crontab\\s+\\-l\\s+\\&\\&\\s+systemctl\\s+list\\-timers\\s+cache\\-clean\\.timer$",
      "command": "atq && crontab -l && systemctl list-timers cache-clean.timer",
      "sets": [
        "verified"
      ],
      "requires": [
        "at_job_created",
        "cron_job_created",
        "timer_enabled"
      ],
      "output": "Command completed successfully."
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "atq"
    },
    {
      "command": "echo '/usr/local/sbin/rotate-key' | at 23:30"
    },
    {
      "command": "(crontab -l 2>/dev/null; echo '15 2 * * * /usr/local/sbin/daily-report') | crontab -"
    },
    {
      "command": "systemctl enable --now cache-clean.timer"
    },
    {
      "command": "atq && crontab -l && systemctl list-timers cache-clean.timer"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "One-time task queue inspected.",
      "points": 20,
      "requires": [
        "at_queue_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Configure all three scheduling mechanisms",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "at_job_created",
        "cron_job_created",
        "timer_enabled"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "All scheduling mechanisms validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
