window.RCW_RHCSA_CHALLENGE = Object.freeze({
  scenario: "user-lifecycle",
  slug: "RHCSA-User-Lifecycle-Orphaned-Home",
  title: "User Lifecycle and Orphaned Home Challenge",
  heroLine1: "Retire an account.",
  heroLine2: "Recover its working home.",
  summary: "Delete a departed user without erasing business files, create the replacement identity, redirect the preserved home and repair every orphaned ownership record.",
  scenarioLabel: "users · homes · ownership",
  missionTitle: "Transfer the legacy operations workspace",
  brief: "The legacyops account must be retired, but /home/legacyops and its contents must survive. Build opsadmin with UID 1701, assign the preserved home, repair ownership and grant the required supplementary groups.",
  terminalWelcome: "The legacyops account owns an active handover workspace. The wheel and developers groups already exist. Preserve all data while transferring responsibility.",
  guideIntro: "Separate account removal from data removal. Verify identity records, home metadata, supplementary groups and recursive ownership before declaring the handover complete.",
  portrait: "assets/pradeep-raju.jpg",
  certificateLabTitle: "RHEL 10 User Lifecycle and Orphaned Home Challenge",
  certificateStatement: "Demonstrating practical skill in account creation, safe account deletion, user attribute modification, preserved-home reassignment and recursive ownership recovery.",
  initialDirs: ["/", "/etc", "/home", "/home/legacyops", "/home/legacyops/app", "/root", "/var", "/var/log"],
  initialFiles: {
    "/home/legacyops/.bashrc": "# Legacy operations shell settings\nexport EDITOR=vi\n",
    "/home/legacyops/handover.txt": "Preserve this handover record for the replacement administrator.\n",
    "/home/legacyops/app/settings.ini": "[operations]\nenvironment=production\n"
  },
  identityInitial: {
    nextUid: 1600,
    groups: [
      { name: "root", gid: 0, members: [] },
      { name: "wheel", gid: 10, members: ["root"] },
      { name: "legacyops", gid: 1450, members: [] },
      { name: "developers", gid: 3200, members: ["legacyops"] }
    ],
    users: [
      { name: "root", uid: 0, gid: 0, primaryGroup: "root", groups: ["wheel"], home: "/root", shell: "/bin/bash" },
      { name: "legacyops", uid: 1450, gid: 1450, primaryGroup: "legacyops", groups: ["developers"], home: "/home/legacyops", shell: "/bin/bash" }
    ],
    ownership: {
      "/home/legacyops": { uid: 1450, gid: 1450 },
      "/home/legacyops/.bashrc": { uid: 1450, gid: 1450 },
      "/home/legacyops/handover.txt": { uid: 1450, gid: 1450 },
      "/home/legacyops/app": { uid: 1450, gid: 1450 },
      "/home/legacyops/app/settings.ini": { uid: 1450, gid: 1450 }
    }
  },
  identityTargets: {
    retiredUser: "legacyops",
    replacementUser: "opsadmin",
    replacementUid: 1701,
    replacementShell: "/bin/bash",
    orphanHome: "/home/legacyops",
    unwantedDefaultHome: "/home/opsadmin",
    requiredGroups: ["wheel", "developers"],
    requiredArtifacts: ["/home/legacyops/.bashrc", "/home/legacyops/handover.txt", "/home/legacyops/app", "/home/legacyops/app/settings.ini"]
  },
  reminders: ["getent passwd", "ls -ld", "userdel", "useradd -M", "usermod -d", "chown -R", "usermod -aG", "find -nouser -o -nogroup"],
  objectives: [
    { id: "inspect", title: "Inspect the source identity and home", detail: "Review legacyops and the ownership of /home/legacyops before making changes.", points: 10 },
    { id: "preserve", title: "Delete the account but preserve its data", detail: "Remove legacyops without deleting the home or any required handover artifact.", points: 15 },
    { id: "create", title: "Create the replacement user", detail: "Use useradd to create opsadmin with UID 1701 and /bin/bash without creating /home/opsadmin.", points: 15 },
    { id: "redirect", title: "Redirect the preserved home", detail: "Use usermod to assign /home/legacyops as the opsadmin home directory.", points: 15 },
    { id: "ownership", title: "Repair ownership recursively", detail: "Make opsadmin:opsadmin own the preserved home and every retained item beneath it.", points: 20 },
    { id: "modify", title: "Append required group access", detail: "Use usermod append semantics to add opsadmin to wheel and developers.", points: 15 },
    { id: "verify", title: "Verify the completed handover", detail: "Confirm the passwd record, identity and absence of orphaned home ownership.", points: 10 }
  ]
});
