window.RCW_RHCSA_PRACTICE = Object.freeze({
  "number": 15,
  "total": 62,
  "id": "rhcsa-practice-15-flatpak-app-lifecycle",
  "slug": "flatpak-app-lifecycle",
  "title": "Flatpak Application Lifecycle",
  "domain": "Software Management",
  "technology": "Flatpak",
  "scenario": "Deploy the approved diagram application from the training remote and remove its retired predecessor.",
  "officialAlignment": "Original practice mapped to a published EX200/RHEL 10 skill area.",
  "officialObjectivesUrl": "https://www.redhat.com/en/services/training/ex200-red-hat-certified-system-administrator-rhcsa-exam",
  "portrait": "../assets/pradeep-raju.jpg",
  "certificateLabTitle": "RHCSA Practice Task 15: Flatpak Application Lifecycle",
  "certificateStatement": "Demonstrating practical RHEL 10 administration skill in flatpak through an original, state-validated exercise.",
  "facts": {
    "apps_inspected": "Installed Flatpak applications inspected",
    "app_installed": "Approved Flatpak application installed",
    "app_removed": "Retired Flatpak application removed",
    "verified": "Final Flatpak application state validated"
  },
  "actions": [
    {
      "pattern": "^flatpak\\s+list\\s+\\-\\-app$",
      "command": "flatpak list --app",
      "sets": [
        "apps_inspected"
      ],
      "requires": [],
      "output": "Old Diagram Tool\torg.example.OldDiagram"
    },
    {
      "pattern": "^flatpak\\s+install\\s+\\-y\\s+training\\s+org\\.example\\.Diagram$",
      "command": "flatpak install -y training org.example.Diagram",
      "sets": [
        "app_installed"
      ],
      "requires": [
        "apps_inspected"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^flatpak\\s+uninstall\\s+\\-y\\s+org\\.example\\.OldDiagram$",
      "command": "flatpak uninstall -y org.example.OldDiagram",
      "sets": [
        "app_removed"
      ],
      "requires": [
        "app_installed"
      ],
      "output": "Command completed successfully."
    },
    {
      "pattern": "^flatpak\\s+info\\s+org\\.example\\.Diagram$",
      "command": "flatpak info org.example.Diagram",
      "sets": [
        "verified"
      ],
      "requires": [
        "app_installed",
        "app_removed"
      ],
      "output": "ID: org.example.Diagram\nOrigin: training\nInstallation: system"
    }
  ],
  "editableFiles": [],
  "workflow": [
    {
      "command": "flatpak list --app"
    },
    {
      "command": "flatpak install -y training org.example.Diagram"
    },
    {
      "command": "flatpak uninstall -y org.example.OldDiagram"
    },
    {
      "command": "flatpak info org.example.Diagram"
    }
  ],
  "objectives": [
    {
      "id": "assess",
      "title": "Assess the starting state",
      "detail": "Installed Flatpak applications inspected.",
      "points": 20,
      "requires": [
        "apps_inspected"
      ]
    },
    {
      "id": "implement",
      "title": "Install and remove Flatpak applications",
      "detail": "Produce the required modeled system state using supported administrative commands.",
      "points": 60,
      "requires": [
        "app_installed",
        "app_removed"
      ]
    },
    {
      "id": "validate",
      "title": "Validate the resulting state",
      "detail": "Final Flatpak application state validated.",
      "points": 20,
      "requires": [
        "verified"
      ]
    }
  ]
});
