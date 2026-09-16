/* RCW Job Matcher - offline demonstration set.
 *
 * These are NOT real vacancies. They are synthetic listings whose only job is to let a
 * visitor see the scoring, gap analysis and packet generation working with zero network
 * access (and to keep the tool testable offline). Every company name ends in "(demo)"
 * and every job carries demo:true, which the UI renders as an unmissable badge and
 * excludes from any "open application" action.
 */
(function (root, factory) {
  'use strict';
  var jobs = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = jobs;
  else { root.RCWJM = root.RCWJM || {}; root.RCWJM.sampleJobs = jobs; }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  function daysAgo(n) {
    return new Date(Date.now() - n * 86400000).toISOString();
  }

  var RAW = [
    ['Senior Linux Administrator', 'Northwind Cloud Services (demo)', 'Chennai, India', '₹22-30 LPA', 3, ['RHEL', 'Ansible', 'Bash', 'LVM', 'SELinux'],
      'Keep ~900 RHEL 8/9 hosts healthy: patching windows, kernel and firmware upgrades, systemd units, LVM and XFS growth, SELinux contexts, cron and backup hooks. You will write Ansible playbooks for anything you do twice and own the runbooks.\nRequired: 6+ years Linux administration, RHEL, shell scripting, LVM, systemd, package management, backup integration. Nice to have: Kubernetes exposure, Terraform, monitoring with Prometheus or Zabbix.'],
    ['Infrastructure Engineer (VMware + Storage)', 'Meridian Fabric Group (demo)', 'Bengaluru, India (Hybrid)', '₹26-34 LPA', 8, ['VMware vSphere', 'NetApp', 'SAN', 'Backup & DR', 'Windows Server'],
      'Own a 60-host vSphere 8 estate: ESXi and vCenter lifecycle, vMotion and DRS tuning, datastore capacity, snapshot hygiene, NetApp ONTAP aggregates and LUNs, FC zoning with the network team, Veeam backup jobs and quarterly restore tests.\nMust have: vSphere/ESXi at scale, SAN and zoning, Veeam or Commvault, Windows Server and Active Directory basics. Good to have: Ansible, PowerShell, PowerStore or PowerFlex, ZFS.'],
    ['Cloud Infrastructure Engineer (AWS/Azure)', 'Larkspur Retail Digital (demo)', 'Remote (India)', '₹32-45 LPA', 2, ['AWS EC2', 'Terraform', 'Kubernetes', 'Observability', 'Multi-cloud'],
      'Design and run landing zones across AWS and Azure: VPC/VNET, IAM and Entra role design, EKS and AKS, Terraform modules in CI, cost guardrails, DR across regions. Partner with application teams on migration waves.\nRequired: 5+ years infrastructure with AWS (EC2, VPC, IAM, EKS, S3), Terraform, Kubernetes in production, one scripting language, and a migration you personally delivered. Nice to have: Azure, Helm, Prometheus/Grafana, FinOps.'],
    ['Site Reliability Engineer, Platform', 'Halcyon Payments (demo)', 'Remote (worldwide)', '$95k-$125k', 1, ['Kubernetes', 'Observability', 'Incident response', 'CI/CD', 'Secrets & configs'],
      'Run the internal platform for 40 product teams: Kubernetes upgrades with zero downtime, Helm charts, ArgoCD pipelines, SLOs and error budgets, on-call for Sev1 with blameless postmortems, secret rotation with Vault.\nRequired: strong Kubernetes and Linux, one of Go/Python/Bash, Terraform, Prometheus stack, incident management in a 24x7 service. Bonus: CKAD/CKS, eBPF, load testing, payment or regulated environment.'],
    ['Backup & Data Protection Engineer', 'Ferrous Manufacturing IT (demo)', 'Pune, India', '₹14-19 LPA', 12, ['Backup & DR', 'VMware vSphere', 'Storage', 'Capacity & patch mgmt'],
      'Veeam on a 1.2 PB estate: job design, immutability, repository capacity, tape tier, instant VM recovery drills, restore testing every quarter, DR runbooks with the plant teams. Coordinate firmware and OS patching inside maintenance windows.\nMust have: Veeam Backup & Replication, VMware, backup architecture, restore/DR testing, RPO/RTO conversations with business owners. Nice to have: Commvault, Rubrik, NetApp SnapMirror, PowerShell.'],
    ['Endpoint Administrator (Intune / MECM)', 'Kestrel Logistics Group (demo)', 'Hyderabad, India', '₹16-22 LPA', 5, ['Microsoft Intune', 'SCCM / MECM', 'Windows Server', 'Entra ID'],
      '4,200 Windows and 400 macOS endpoints: Autopilot rollout, compliance and conditional access policies, application packaging, update rings, Defender for Endpoint onboarding, BitLocker and recovery key workflow. Drive the MECM to Intune migration wave plan.\nRequired: Intune (configuration and compliance policies, Autopilot), MECM/SCCM task sequences and software updates, Entra ID group strategy, PowerShell scripting. Nice to have: MD-102, co-management, macOS, Analyst Studio/KQL.'],
    ['Security Operations Analyst (Defender / Sentinel)', 'Ironvale Fintech Security (demo)', 'Mumbai, India', '₹18-26 LPA', 4, ['Microsoft Defender', 'Incident response', 'Hardening & compliance', 'Logging'],
      'Triage and hunt across Defender for Endpoint, Identity and Office 365; write analytics, tune alert noise, lead containment for malware and phishing campaigns, keep the runbook library honest, join the Sev1 bridge.\nRequired: 3+ years SOC or incident response, EDR investigations, KQL or SPL, MITRE ATT&CK mapping, Windows internals. Good to have: Sentinel automation, Azure Conditional Access, Python, DFIR basics.'],
    ['Network Engineer (CCNA)', 'Southbridge Trading Networks (demo)', 'Chennai, India', '₹10-14 LPA', 15, ['Cisco', 'Network fundamentals', 'Firewalls', 'Packet capture'],
      'Campus and branch: Catalyst switching, VLAN and STP design, HSRP, BGP with two carriers, ASA/Palo Alto rule changes, VPN for 30 branches, NetFlow and Wireshark for latency complaints. After-hours change windows twice a month.\nMust have: CCNA (or equivalent skill), Cisco IOS/NX-OS, firewall policy work, DNS/DHCP, tcpdump or Wireshark. Nice to have: CCNP, Meraki, Ansible for network config, Python.'],
    ['IT Support Engineer L2', 'Brightwater Schools Trust (demo)', 'Remote (India)', '₹4.5-6.5 LPA', 6, ['Windows Server', 'Microsoft 365', 'Network fundamentals', 'ITSM / ticketing'],
      'First-line escalation for 1,800 staff across 12 campuses: Windows 11 and M365, Teams and OneDrive, printing and VPN, Active Directory account and group changes, printer and switch port basics, ticket hygiene in ServiceNow.\nRequired: 2+ years support, Windows client and AD fundamentals, M365 admin centre, patient documentation. Good to have: Intune, PowerShell, CCNA-level networking, a helpdesk SLA background.'],
    ['Linux Systems Administrator (freshers welcome)', 'Quill Hosting Support (demo)', 'Remote (India)', '₹3.5-5.5 LPA', 2, ['Linux', 'Bash', 'Monitoring', 'Networking'],
      'Hosted infrastructure support for a small web host: RHEL/Ubuntu servers, nginx and Apache vhosts, DNS zone edits, cron, log triage, ticket-based escalation, weekend rotation once a month with a buddy.\nMust have: comfort on the Linux command line, bash basics, curiosity, written English for tickets. Good to have: RHCSA in progress, git, any home lab or homelab write-ups.'],
    ['DevOps Engineer', 'Tinderbox Commerce Labs (demo)', 'Bengaluru, India (Hybrid)', '₹24-36 LPA', 9, ['CI/CD', 'Kubernetes', 'Terraform', 'Ansible', 'Python'],
      'Own build-to-deploy for 25 services: GitHub Actions, ArgoCD, Terraform for AWS, container hardening, ephemeral environments per PR, cost-visible dev sandboxes, on-call for deploy failures only.\nRequired: Terraform in production, Kubernetes, CI pipeline design, Python or Go, gitflow thinking. Nice to have: AWS Lambda, Vault, Prometheus, e2e test infra, previous startup experience.'],
    ['Infrastructure Architect', 'Cobalt Health Enterprise IT (demo)', 'Chennai, India / Remote', '₹45-60 LPA', 7, ['Solution architecture', 'Multi-cloud', 'Backup & DR', 'Leadership', 'Hardening & compliance'],
      'Technical design authority for a 3,000-VM hybrid estate: HLD/LLD for compute, storage and DR; 24x7 healthcare uptime with hard RPO/RTO; cloud adoption for two migrations; vendor negotiation on storage and backup licences; mentoring four platform engineers.\nRequired: 12+ years infrastructure with at least 4 in an architecture or design-authority seat, VMware at enterprise scale, storage (NetApp or Dell), backup design, AWS or Azure landing zones, documented designs you defended in a review board. Nice to have: HL7 or healthcare familiarity, VCDX-level thinking, ITIL, FinOps.'],
    ['Cloud Migration Lead', 'Anvil Freight Systems (demo)', 'Remote (India + APAC)', '₹38-48 LPA', 11, ['Multi-cloud', 'Migration projects', 'Ansible', 'VMware vSphere', 'Leadership'],
      'Lead a 180-workload wave migration off two EOL datacentres: dependency mapping, wave planning, replatform decisions, cut-over and rollback plans, cutover rehearsals, hypercare, and a documented DR test at the end of each wave.\nMust have: delivered a lift-and-shift of 50+ workloads, VMware and Linux depth, AWS or Azure networking and IAM, migration tooling (MMS, CloudEndure, or similar), stakeholder communication up to CIO level. Bonus: Terraform, rehost-to-refactor judgement, FinOps.'],
    ['Database Administrator (MySQL / PostgreSQL)', 'Pallas Analytics Group (demo)', 'Hyderabad, India', '₹20-28 LPA', 20, ['Database admin', 'Backup & DR', 'Linux', 'Performance tuning'],
      'Own 60 MySQL and PostgreSQL instances: HA topology, query tuning, index strategy, backup and restore drills, replication lag, upgrade planning, secrets rotation, capacity forecasting.\nRequired: 5+ years DBA on MySQL or Postgres, backup/PITR, replication, slow-query analysis, Linux administration, scripted automation. Nice to have: Redis, sharding, Patroni, Percona XtraDB Cluster.'],
    ['Junior Cloud Associate (training programme)', 'Willowmere IT Academy (demo)', 'Remote (India)', '₹3-4 LPA', 3, ['Cloud Cost/FinOps', 'Linux', 'ITSM / ticketing'],
      'Structured 12-month programme supporting public-cloud hosting for SMEs: ticket triage, rightsizing reports, patch windows, monitoring setup, documentation. Training budget and mentorship included.\nLooking for: 0-2 years experience, Linux command line, one cloud certification in progress or done, willingness to learn from runbooks.'],
    ['Windows Server / Wintel Administrator', 'Hollow Brook Insurance Ops (demo)', 'Chennai, India', '₹12-18 LPA', 14, ['Windows Server', 'Active Directory', 'PKI / Certificates', 'Microsoft 365'],
      '450 Windows Server 2019/2022 hosts: patching rings, cluster and file services, AD DS and GPO ownership, DNS/DHCP, PKI certificate renewals with the app teams, IIS app pools, WSUS, DR tests twice a year.\nMust have: Windows Server administration, Active Directory and GPO, clustering, PKI basics, PowerShell. Nice to have: Azure Hybrid, Intune, SQL Server awareness, exchange or Exchange Online.'],
    ['Senior Frontend Engineer (React)', 'Cinderblock Media (demo)', 'Remote (US timezones)', '$120k-$150k', 1, [],
      'Own component architecture for a media product: React 19, TypeScript, design-system ownership, accessibility, performance budgets, SSR with Next.js.\nRequired: 6+ years React, TypeScript, testing, design systems. Must be authorised to work in the US; no sponsorship available.'],
    ['Data Scientist, NLP', 'Verdigris Research (demo)', 'Bengaluru, India', '₹30-42 LPA', 6, ['Python'],
      'Fine-tune retrieval and classification models for scientific text: PyTorch, HF transformers, evaluation harnesses, vector search, on-prem GPU cluster.\nRequired: 4+ years applied ML, PyTorch, publications or shipped models, MLOps basics.'],
    ['IT Operations Manager', 'Trellis Manufacturing Services (demo)', 'Pune, India', '₹34-44 LPA', 18, ['Leadership', 'ITSM / ticketing', 'Capacity & patch mgmt', 'Vendor mgmt'],
      'Manage the 9-person operations team across shop-floor and office infrastructure: shift roster, SLA to plant uptime, vendor and AMC negotiation, capex planning, change advisory board, audit responses, escalation ownership.\nRequired: 10+ years operations with 3+ leading a team, ITIL process maturity, vendor management, comfort with Windows/Linux/backup/storage discussions at a technical level. Nice to have: manufacturing or OT environment, PMP.'],
    ['Support Engineer (Network + Firewall, UK only)', 'Brookline Managed Networks (demo)', 'London, UK', '£38-46k', 5, ['Firewalls', 'Cisco', 'VPN'],
      'Managed-service firewall and switching support for UK SMB customers, with on-call rotation and change windows on weekday evenings. UK home office and right to work required; onsite customer visits.\nRequired: UK-based, firewall and Cisco switching support experience, driver’s licence.'],
    ['Storage Engineer (Pure + ZFS)', 'Kiln Media Archive (demo)', 'Remote (Europe)', '€55-70k', 4, ['Pure Storage', 'Filesystems', 'SAN', 'Backup & DR'],
      'Design and run a media archive on Pure FlashArray plus ZFS/TrueNAS shelves: dataset layout, snapshots and replication, quorum and pool recovery, NVMe-oF, capacity modelling for 40 PB ingest.\nRequired: production ZFS, Pure or comparable enterprise array, iSCSI/NVMe-oF, backup architecture, Linux. Bonus: object storage for media, SMB/NFS tuning.']
  ];

  return RAW.map(function (row, index) {
    return {
      id: 'demo:' + index,
      title: row[0],
      company: row[1],
      location: row[2],
      salary: row[3],
      posted: daysAgo(row[4]),
      tags: row[5],
      description: row[6],
      demo: true,
      remote: /remote/i.test(row[2]),
      url: '',
      applyUrl: '',
      source: 'demo',
      sourceLabel: 'Offline sample data',
      employmentType: /part|contract/i.test(row[6]) ? 'contract' : 'full_time',
      attribution: 'Synthetic example listing — not a real vacancy'
    };
  });
}));
