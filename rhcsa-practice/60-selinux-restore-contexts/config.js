window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 60,
  "total": 62,
  "id": "rhcsa-practice-60-selinux-restore-contexts",
  "slug": "selinux-restore-contexts",
  "title": "Restore Default SELinux Contexts",
  "domain": "Security",
  "technology": "SELinux",
  "scenario": "Repair web content copied with the wrong label by restoring the policy-defined default context recursively.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 60: Restore Default SELinux Contexts",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in selinux through an original, state-validated exercise.",
  "facts": {
    "incorrect_context_found": "Incorrect file contexts identified",
    "context_policy_added": "Persistent context mapping added",
    "contexts_restored": "Default contexts restored recursively",
    "verified": "Restored context validated"
  },
  "actions": [
    {
      "pattern": "^ls\\s+\\-lZ\\s+/srv/web$",
      "command": "ls -lZ /srv/web",
      "sets": [
        "incorrect_context_found"
      ],
      "requires": [],
      "output": "unconfined_u:object_r:admin_home_t:s0 index.html"
    },
    {
      "pattern": "^semanage\\s+fcontext\\s+\\-a\\s+\\-t\\s+httpd_sys_content_t\\s+'/srv/web\\(/\\.\\*\\)\\?'$",
      "command": "semanage fcontext -a -t httpd_sys_content_t '/srv/web(/.*)?'",
      "sets": [
        "context_policy_added"
      ],
      "requires": [
        "incorrect_context_found"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^restorecon\\s+\\-Rv\\s+/srv/web$",
      "command": "restorecon -Rv /srv/web",
      "sets": [
        "contexts_restored"
      ],
      "requires": [
        "context_policy_added"
      ],
      "output": "Relabeled /srv/web/index.html from admin_home_t to httpd_sys_content_t"
    },
    {
      "pattern": "^matchpathcon\\s+\\-V\\s+/srv/web/index\\.html$",
      "command": "matchpathcon -V /srv/web/index.html",
      "sets": [
        "verified"
      ],
      "requires": [
        "context_policy_added",
        "contexts_restored"
      ],
      "output": "/srv/web/index.html verified."
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "ls -lZ /srv/web"
    },
    {
      "command": "semanage fcontext -a -t httpd_sys_content_t '/srv/web(/.*)?'"
    },
    {
      "command": "restorecon -Rv /srv/web"
    },
    {
      "command": "matchpathcon -V /srv/web/index.html"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Incorrect file contexts identified.",
      "points": 20,
      "requires": [
        "incorrect_context_found"
      ]
    },
    {
      "id": "implement",
      "title": "Restore policy-defined file contexts",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "context_policy_added",
        "contexts_restored"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Restored context validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
