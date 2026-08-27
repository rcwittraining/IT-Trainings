window.RCW_RHCSA_CHALLENGE = Object.freeze({
  scenario: "network-security",
  slug: "RHCSA-Network-SELinux-Privilege",
  title: "Network, SELinux and Privilege Challenge",
  heroLine1: "Publish a service",
  heroLine2: "without weakening security.",
  summary: "Configure a persistent static network identity, expose a custom web port through firewalld, authorize it with SELinux and delegate tightly scoped administrator access.",
  scenarioLabel: "network · MAC · privilege",
  missionTitle: "Secure the application host",
  brief: "Prepare server1 for an internal web workload on TCP 8081. Keep SELinux enforcing, apply permanent policy controls and create the operator identity requested by the operations team.",
  terminalWelcome: "The ens160 connection uses automatic addressing. SELinux is enforcing and firewalld is running with no web access allowed.",
  guideIntro: "Treat network reachability, packet filtering and mandatory access control as separate layers. A service is ready only when every relevant layer is correctly configured.",
  portrait: "assets/pradeep-raju.jpg",
  certificateLabTitle: "RHEL 10 Network, SELinux and Privilege Challenge",
  certificateStatement: "Demonstrating practical skill in persistent IPv4 configuration, firewalld policy, SELinux ports, contexts and booleans, plus controlled privileged access.",
  initialDirs: ["/", "/etc", "/etc/sudoers.d", "/srv", "/var", "/var/log"],
  initialFiles: {
    "/etc/selinux/config": "SELINUX=enforcing\nSELINUXTYPE=targeted\n"
  },
  reminders: ["nmcli con mod", "hostnamectl", "firewall-cmd --permanent", "semanage port", "semanage fcontext", "restorecon", "setsebool -P", "visudo -cf"],
  objectives: [
    { id: "inspect", title: "Inspect network and MAC state", detail: "Review connection status and confirm the current SELinux mode.", points: 10 },
    { id: "network", title: "Set the persistent network identity", detail: "Configure 192.0.2.50/24, gateway 192.0.2.1, DNS 192.0.2.53 and server1.example.com.", points: 20 },
    { id: "firewall", title: "Open only the required traffic", detail: "Permanently allow the http service and TCP 8081, then reload the active policy.", points: 15 },
    { id: "selinuxPort", title: "Authorize the custom port", detail: "Keep enforcing mode and label TCP 8081 with http_port_t.", points: 15 },
    { id: "contexts", title: "Label the custom web root", detail: "Create /srv/examweb, add a persistent httpd_sys_content_t rule and apply it recursively.", points: 15 },
    { id: "boolean", title: "Apply the service boolean", detail: "Persistently enable httpd_can_network_connect.", points: 10 },
    { id: "privilege", title: "Delegate controlled access", detail: "Create ops and operator, set 90-day aging, add group membership and validate sudo policy.", points: 15 }
  ]
});
