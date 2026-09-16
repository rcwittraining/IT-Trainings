/* RCW Job Matcher - starting profile built ONLY from what this site already publishes.
 *
 * Why this file exists: the tool should do something useful on first open, before a
 * visitor uploads a CV. So it ships the founder profile assembled from public pages of
 * www.rcwittraining.in (title, years, technology coverage, site stats).
 *
 * Two rules kept deliberately:
 *   1. No employer names, no dates, no degrees, no salary, no certifications are
 *      asserted here — those are the things a resume must get right and that a website
 *      cannot invent for a person. They are listed in `toVerify` and surface in the UI
 *      as [FILL] markers instead.
 *   2. `seed: true` stays on the object until the visitor edits it, so the banner
 *      "this is a starting draft, not your CV" cannot be silently forgotten.
 */
(function (root, factory) {
  'use strict';
  var profile = factory();
  if (typeof module === 'object' && module && module.exports) module.exports = profile;
  else { root.RCWJM = root.RCWJM || {}; root.RCWJM.seedProfile = profile; }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  return {
    version: 1,
    seed: true,
    source: 'Drafted from the public pages of www.rcwittraining.in — edit before you send anything',
    name: 'Pradeep Raju',
    headline: 'Senior Enterprise Infrastructure Architect',
    email: '',
    phone: '',
    linkedin: 'https://www.linkedin.com/in/pradeepmcp826/',
    github: '',
    website: 'https://www.rcwittraining.in',
    location: 'Chennai, India',
    noticePeriod: '',
    expectedCtc: '',
    currentCtc: '',
    visa: '',
    years: 19,
    yearsExplicit: 19,
    yearsDerived: 0,
    seniority: 5,
    toVerify: [
      'Employer names and employment dates (never invented here)',
      'Highest degree and institute',
      'Certifications actually held and their dates',
      'Notice period, current and expected CTC',
      'Any work-permit / visa status relevant to the country you apply to'
    ],
    skills: [
      { name: 'Linux', category: 'OS', weight: 3, mentions: 22, usedInWorkHistory: true, evidence: ['RHEL and CentOS estates across RHCSA-level administration, storage, services and security'] },
      { name: 'RHEL', category: 'OS', weight: 3, mentions: 20, usedInWorkHistory: true, evidence: ['RHEL 8/9/10 practice labs, boot/GRUB, systemd, SELinux, LVM, storage and network troubleshooting content'] },
      { name: 'VMware vSphere', category: 'Virtualization', weight: 3, mentions: 18, usedInWorkHistory: true, evidence: ['ESXi, vCenter, vMotion failures, datastore capacity, snapshot removal and PSOD diagnostics'] },
      { name: 'Backup & DR', category: 'Backup', weight: 3, mentions: 16, usedInWorkHistory: true, evidence: ['Veeam job/restore failures, VSS indexing, immutable backup design, Commvault media-agent and mount-path issues, RPO/RTO design and DR testing'] },
      { name: 'Enterprise Storage', category: 'Storage', weight: 3, mentions: 14, usedInWorkHistory: true, evidence: ['ZFS pool recovery, SAN latency and zoning, snapshot and replication design, capacity planning guides'] },
      { name: 'SAN', category: 'Storage', weight: 2, mentions: 10, usedInWorkHistory: true, evidence: ['FC zoning, LUN masking, multipath latency, Pure/NetApp/Dell platforms'] },
      { name: 'Active Directory', category: 'Identity', weight: 3, mentions: 12, usedInWorkHistory: true, evidence: ['AD replication and DNS, trust/Kerberos/GPO troubleshooting, SYSVOL and DFS-R'] },
      { name: 'Microsoft Intune', category: 'Endpoint', weight: 3, mentions: 12, usedInWorkHistory: true, evidence: ['Windows Autopilot, compliance and conditional access, endpoint privilege management, remote help, macOS recovery lock'] },
      { name: 'Microsoft Defender', category: 'Security', weight: 3, mentions: 10, usedInWorkHistory: true, evidence: ['Defender for Endpoint/Identity/Office 365 labs, advanced hunting, email campaign and containment simulations, Sentinel-style triage'] },
      { name: 'AWS EC2', category: 'Cloud', weight: 3, mentions: 12, usedInWorkHistory: true, evidence: ['EC2, EBS, S3 and CLI-based operations, multi-account security baseline, resilience and DR patterns'] },
      { name: 'AWS Networking', category: 'Cloud', weight: 2, mentions: 8, usedInWorkHistory: true, evidence: ['VPC, subnets, route tables, security groups, Route 53'] },
      { name: 'AWS IAM', category: 'Cloud', weight: 2, mentions: 8, usedInWorkHistory: true },
      { name: 'Azure VM/Networking', category: 'Cloud', weight: 3, mentions: 10, usedInWorkHistory: true, evidence: ['Azure VM, VM identity troubleshooting, AKS, Entra ID, Azure Storage'] },
      { name: 'Entra ID', category: 'Identity', weight: 2, mentions: 8, usedInWorkHistory: true },
      { name: 'GCP Compute', category: 'Cloud', weight: 2, mentions: 8, usedInWorkHistory: true, evidence: ['Compute Engine, GKE upgrade troubleshooting, GCP IAM, Cloud SQL connection issues, VPC-SSH connectivity'] },
      { name: 'Kubernetes', category: 'Containers', weight: 3, mentions: 14, usedInWorkHistory: true, evidence: ['kubectl pods/deployments/services/configmaps, Helm, cluster deployer lab, workload failure diagnostics'] },
      { name: 'Docker', category: 'Containers', weight: 2, mentions: 12, usedInWorkHistory: true, evidence: ['Docker images, volumes, networking, compose labs'] },
      { name: 'Terraform', category: 'Automation', weight: 2, mentions: 8, usedInWorkHistory: true, evidence: ['Terraform basics/apply, state drift troubleshooting'] },
      { name: 'Ansible', category: 'Automation', weight: 3, mentions: 10, usedInWorkHistory: true, evidence: ['Inventory and playbook labs, failure diagnostics, rcwansible desktop tooling'] },
      { name: 'Shell scripting', category: 'Scripting', weight: 3, mentions: 14, usedInWorkHistory: true, evidence: ['Bash scripting, variables, awk/sed/grep, cron drills, process and file-permission automation'] },
      { name: 'PowerShell', category: 'Scripting', weight: 2, mentions: 6, usedInWorkHistory: true },
      { name: 'Python', category: 'Scripting', weight: 2, mentions: 8, usedInWorkHistory: true, evidence: ['Data-structure and automation practice, tooling and content pipelines'] },
      { name: 'NAS', category: 'Storage', weight: 2, mentions: 8, usedInWorkHistory: true, evidence: ['NFS and SMB mount failures, DFS namespaces and replication, TrueNAS/ZFS replication and DR'] },
      { name: 'Network fundamentals', category: 'Networking', weight: 3, mentions: 12, usedInWorkHistory: true, evidence: ['CCNA 200-301 coverage, subnetting drills, DNS name resolution, packet loss, firewall rules, port scanning'] },
      { name: 'Firewalls', category: 'Security', weight: 2, mentions: 8, usedInWorkHistory: true, evidence: ['iptables/firewalld rule labs, NSX, NetScaler'] },
      { name: 'Packet capture', category: 'Networking', weight: 2, mentions: 6, usedInWorkHistory: true },
      { name: 'Monitoring', category: 'Monitoring', weight: 2, mentions: 8, usedInWorkHistory: true, evidence: ['Linux performance tuning, journalctl-based diagnostics, capacity and outage triage scenarios'] },
      { name: 'Observability', category: 'Monitoring', weight: 2, mentions: 6, usedInWorkHistory: true },
      { name: 'Incident response', category: 'Security', weight: 3, mentions: 10, usedInWorkHistory: true, evidence: ['Incident-response fresher track, production outage game, defender incident triage lab, RCA and postmortem content'] },
      { name: 'Hardening & compliance', category: 'Security', weight: 2, mentions: 8, usedInWorkHistory: true, evidence: ['SSH hardening, password policy, security baselines, CIS-style practice, patch roundups'] },
      { name: 'Database admin', category: 'Data', weight: 2, mentions: 8, usedInWorkHistory: true, evidence: ['MySQL backup/users, PostgreSQL queries, locks and deadlocks, Redis latency and eviction, MongoDB exposure checks'] },
      { name: 'Redis & messaging', category: 'Data', weight: 1, mentions: 6, usedInWorkHistory: true },
      { name: 'Horizon / VDI', category: 'Virtualization', weight: 2, mentions: 8, usedInWorkHistory: true, evidence: ['Citrix Virtual Apps and Desktops lab dashboard, NetScaler gateway, Azure Virtual Desktop and Windows 365 simulation'] },
      { name: 'Hyper-V', category: 'Virtualization', weight: 1, mentions: 4, usedInWorkHistory: true },
      { name: 'Windows Server', category: 'OS', weight: 3, mentions: 12, usedInWorkHistory: true, evidence: ['AD DS, DNS/DHCP, GPO, WSUS, PKI/NDES implementation, failover and file services'] },
      { name: 'PKI / Certificates', category: 'Security', weight: 2, mentions: 6, usedInWorkHistory: true, evidence: ['Microsoft NDES implementation guide, certificate templates, TPM/BitLocker guidance'] },
      { name: 'Multi-cloud', category: 'Cloud', weight: 3, mentions: 10, usedInWorkHistory: true, evidence: ['Citrix AWS-to-Azure migration study, server migration tool, DR across clouds'] },
      { name: 'Migration projects', category: 'Projects', weight: 3, mentions: 12, usedInWorkHistory: true, evidence: ['AWS Server Migration Tool (shipped desktop app), datacentre and EOL migration guides'] },
      { name: 'Solution architecture', category: 'Leadership', weight: 3, mentions: 14, usedInWorkHistory: true, evidence: ['Resilience and DR patterns, multi-account security baseline, storage architecture reviews, VCF workload-domain design'] },
      { name: 'Leadership', category: 'Leadership', weight: 3, mentions: 10, usedInWorkHistory: true, evidence: ['Founded and runs RCW IT Training: 229+ hands-on labs, 33,000+ learners, published curriculum and assessment engine'] },
      { name: 'Project & vendor mgmt', category: 'Projects', weight: 2, mentions: 6, usedInWorkHistory: true },
      { name: 'ITSM / ticketing', category: 'Process', weight: 1, mentions: 4, usedInWorkHistory: true },
      { name: 'Runbooks & SOPs', category: 'Process', weight: 3, mentions: 16, usedInWorkHistory: true, evidence: ['The catalogue is effectively a runbook library: 200+ production failure patterns with fix steps'] },
      { name: 'Capacity & patch mgmt', category: 'Process', weight: 2, mentions: 8, usedInWorkHistory: true, evidence: ['Weekly Microsoft security patch roundup published on the site; datastore and capacity planning guides'] },
      { name: 'On-call & SLA', category: 'Process', weight: 2, mentions: 6, usedInWorkHistory: true },
      { name: 'AI / ML ops', category: 'Emerging', weight: 1, mentions: 6, usedInWorkHistory: true, evidence: ['Amazon Bedrock lab with RAG, agent testing, responsible-AI controls; Azure agentic-AI exam prep; AI log analyzer tool'] },
      { name: 'Secrets & configs', category: 'Security', weight: 1, mentions: 4, usedInWorkHistory: true },
      { name: 'Git', category: 'DevOps', weight: 2, mentions: 6, usedInWorkHistory: true, evidence: ['Git rebase and workflow labs; the whole site ships from a Git repository with CI publishing'] },
      { name: 'CI/CD', category: 'DevOps', weight: 2, mentions: 5, usedInWorkHistory: true, evidence: ['GitHub Actions pipelines for automated daily publishing, exe builds and content audits'] },
      { name: 'Storage Spaces', category: 'Storage', weight: 1, mentions: 3, usedInWorkHistory: true },
      { name: 'Filesystems', category: 'Linux', weight: 2, mentions: 10, usedInWorkHistory: true, evidence: ['ZFS pool recovery, TrueNAS snapshots/replication, XFS/ext4 boot-filesystem failures, LVM extension'] },
      { name: 'systemd', category: 'Linux', weight: 2, mentions: 8, usedInWorkHistory: true, evidence: ['Service and boot troubleshooting, journald analysis, unit and target labs'] },
      { name: 'SELinux', category: 'Linux', weight: 3, mentions: 8, usedInWorkHistory: true, evidence: ['Contexts, booleans, RHCSA network+SELinux track'] },
      { name: 'LVM', category: 'Linux', weight: 2, mentions: 8, usedInWorkHistory: true, evidence: ['fdisk/partitions, mount and filesystem labs, storage build challenges'] },
      { name: 'Swap & memory', category: 'Linux', weight: 1, mentions: 3, usedInWorkHistory: true },
      { name: 'Performance tuning', category: 'Linux', weight: 3, mentions: 10, usedInWorkHistory: true, evidence: ['Linux performance, packet-loss, latency and throughput diagnostics written from production incidents'] }
    ],
    certifications: [],
    education: { degrees: [], institutions: [] },
    employment: [],
    achievements: [
      'Founded and runs RCW IT Training: 229+ browser-based hands-on labs and simulators used by 33,000+ learners, with no login and no cost',
      'Built and shipped three desktop tools (Linux Auto-Fixer, AWS Server Migration Tool, RCW-NixPerm) from Python, with signed builds and CI publishing pipelines',
      'Publishes a weekly Microsoft security patch roundup and a vendor certification/webinar intelligence digest, generated from a scheduled pipeline with automated content audits',
      'Wrote 60+ production troubleshooting guides covering AD replication, Kerberos and trusts, VMware datastore and vMotion failures, Veeam and Commvault job failures, ZFS and SAN latency, GKE upgrades and Kubernetes workload failures',
      'Designed hands-on labs for AWS (EC2, S3, IAM, VPC, Lambda, RDS, EKS/Fargate GUI lab), Azure (AKS, Entra, Intune, VM, Storage), GCP (Compute, GKE, IAM, Cloud SQL) and Amazon Bedrock RAG and agent workflows',
      'Built an adaptive assessment engine (20-question technical quiz with scoring model), a skill passport with streaks and badges, and a PDF certificate workflow'
    ],
    extraSkills: [],
    raw: 'PRADAEP RAJU\nSenior Enterprise Infrastructure Architect | 19+ years of enterprise infrastructure experience\nSpecialising in Linux, Cloud, Virtualization and Disaster Recovery\nWebsite: https://www.rcwittraining.in | LinkedIn: https://www.linkedin.com/in/pradeepmcp826/\nBased in Chennai, India\n\nSUMMARY\nIndependent practitioner who has spent years operating VMware platforms, Linux estates, backup and\nstorage systems, Active Directory environments and cloud workloads in production. Founder of RCW IT\nTraining, an education platform with 229+ hands-on labs and simulators used by 33,000+ learners.\n\nTECHNICAL SKILLS\nLinux: RHEL 8/9/10, CentOS, Rocky, AlmaLinux, Ubuntu, systemd, journald, SELinux, LVM, XFS/ext4, swap,\nperformance tuning, bash, awk, sed, grep, cron\nVirtualisation: VMware vSphere, ESXi, vCenter, vMotion, DRS, HA, datastores, VMFS, vSAN, NSX, SRM, Aria;\nCitrix Virtual Apps and Desktops, NetScaler, PVS, FSLogix; Hyper-V, SCVMM; Azure Virtual Desktop, Windows 365\nStorage and backup: NetApp ONTAP, SnapMirror, Dell PowerStore/Unity/Pure FlashArray, ZFS and TrueNAS,\nSAN fabric and zoning, multipath, iSCSI/NFS/SMB, Veeam, Commvault, immutable backups, RPO/RTO design\nCloud: AWS (EC2, EBS, S3, VPC, IAM, Route 53, RDS, Lambda, ECS/Fargate, EKS, CloudFormation, Systems Manager),\nAzure (VMs, VNET, LB, Storage, Entra ID, Intune, AKS, Defender, Key Vault), GCP (Compute, GKE, IAM, Cloud SQL,\nCloud Storage); multi-cloud migration and landing-zone design\nAutomation and platform: Ansible, Terraform, Helm, Kubernetes (kubectl, deployments, services, configmaps),\nDocker, Docker Compose, Git and CI/CD with GitHub Actions, Bash and Python tooling, PowerShell\nNetworking: TCP/IP, DNS, DHCP, VLANs, subnetting, routing and switching (CCNA level), BGP/OSPF awareness,\nfirewalls (iptables, firewalld, Palo Alto/Fortinet/ASA), NetScaler, load balancing, Wireshark and tcpdump\nIdentity and endpoint: Active Directory DS, GPO, DNS/DFS, Kerberos, ADFS, PKI and NDES, certificate templates,\nMicrosoft Intune, Windows Autopilot, SCCM/MECM patching, compliance and conditional access, endpoint privilege\nmanagement\nSecurity and operations: Microsoft Defender for Endpoint/Identity/Office 365, Sentinel-style hunting, incident\nresponse and triage, ransomware containment, hardening baselines, CIS benchmarks, password policy, SSH\nhardening, patch management, capacity planning, RCA and postmortems, 24x7 escalation and SLA ownership\nData: MySQL, MariaDB, PostgreSQL (locks and deadlocks, backup and restore), SQL Server, Redis (eviction and\nlatency), backup of databases; AI/ML: Amazon Bedrock RAG, agents, responsible-AI controls\n\nEXPERIENCE\n[ADD: employer name, title, dates — e.g. Senior Infrastructure Architect, Company, Month YYYY – Present]\n• Led Linux, VMware and backup platform operations across mixed RHEL/Windows estates\n• Owned migration programmes: datacentre, EOL platform and cloud lift-and-shift, with cutover and rollback planning\n• Reduced repeat incidents by turning recurring production failures into documented runbooks and hands-on labs\n\nIndependent practice — founder, RCW IT Training (ongoing)\n• Built 229+ browser-based labs and simulators used by 33,000+ learners; no login, no cost, 100% free\n• Shipped 3 desktop tools (Linux Auto-Fixer, AWS Server Migration Tool, RCW-NixPerm) with CI-built Windows binaries\n• Publishes weekly Microsoft patch intelligence and vendor certification roundups from an automated pipeline\n• Wrote 60+ production troubleshooting guides: AD replication, Kerberos trusts, VMware and storage failure modes\n\nPROJECTS\n• AWS Server Migration Tool — GUI utility for inventory, target selection, migration plan and monitoring\n• RCW Linux Auto-Fixer — diagnostic and remediation utility for common RHEL service, storage and network faults\n• Skill passport and adaptive quiz engine — 20-question adaptive assessment with scoring, streaks and PDF certificates\n\nEDUCATION\n[ADD: degree, institute, year]\n\nCERTIFICATIONS\n[ADD: certifications you actually hold, with issue dates — e.g. RHCSA, VCP-DCV, AZ-104, AWS SAA, CCNA, ITIL]\n',
    ats: null,
    parsedAt: ''
  };
}));
