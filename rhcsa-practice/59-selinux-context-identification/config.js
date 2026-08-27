window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 59,
  "total": 62,
  "id": "rhcsa-practice-59-selinux-context-identification",
  "slug": "selinux-context-identification",
  "title": "SELinux File and Process Contexts",
  "domain": "Security",
  "technology": "SELinux",
  "scenario": "Identify the security contexts on the web content and running web processes, then compare the file against policy expectations.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 59: SELinux File and Process Contexts",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in selinux through an original, state-validated exercise.",
  "facts": {
    "file_contexts_listed": "Directory security contexts listed",
    "process_contexts_listed": "Web process contexts listed",
    "expected_context_checked": "Expected policy context identified",
    "verified": "File and process context evidence validated"
  },
  "actions": [
    {
      "pattern": "^ls\\s+\\-Zd\\s+/srv/web\\s+/var/www/html$",
      "command": "ls -Zd /srv/web /var/www/html",
      "sets": [
        "file_contexts_listed"
      ],
      "requires": [],
      "output": "system_u:object_r:default_t:s0 /srv/web\nsystem_u:object_r:httpd_sys_content_t:s0 /var/www/html"
    },
    {
      "pattern": "^ps\\s+\\-eZ\\s+\\|\\s+grep\\s+httpd$",
      "command": "ps -eZ | grep httpd",
      "sets": [
        "process_contexts_listed"
      ],
      "requires": [
        "file_contexts_listed"
      ],
      "output": "system_u:system_r:httpd_t:s0 1180 ? 00:00:01 httpd"
    },
    {
      "pattern": "^matchpathcon\\s+/srv/web$",
      "command": "matchpathcon /srv/web",
      "sets": [
        "expected_context_checked"
      ],
      "requires": [
        "process_contexts_listed"
      ],
      "output": "/srv/web system_u:object_r:httpd_sys_content_t:s0"
    },
    {
      "pattern": "^ls\\s+\\-Zd\\s+/srv/web\\s+\\&\\&\\s+ps\\s+\\-eZ\\s+\\|\\s+grep\\s+\\-q\\s+httpd_t$",
      "command": "ls -Zd /srv/web && ps -eZ | grep -q httpd_t",
      "sets": [
        "verified"
      ],
      "requires": [
        "process_contexts_listed",
        "expected_context_checked"
      ],
      "output": "Command completed successfully."
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "ls -Zd /srv/web /var/www/html"
    },
    {
      "command": "ps -eZ | grep httpd"
    },
    {
      "command": "matchpathcon /srv/web"
    },
    {
      "command": "ls -Zd /srv/web && ps -eZ | grep -q httpd_t"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Directory security contexts listed.",
      "points": 20,
      "requires": [
        "file_contexts_listed"
      ]
    },
    {
      "id": "implement",
      "title": "Inspect and interpret SELinux contexts",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "process_contexts_listed",
        "expected_context_checked"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "File and process context evidence validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
