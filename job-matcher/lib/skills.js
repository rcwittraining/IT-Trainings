/* RCW Job Matcher - skill / role taxonomy and detection.
 *
 * The taxonomy is deliberately domain-shaped (enterprise infrastructure, cloud,
 * platform, endpoint and ops) because that is the audience of this site. Every entry
 * carries: aliases (what a human actually types), weight (how much it should move a
 * match score), and optionally `lab` (a path on this site so the "close this gap"
 * link is a real click, not a promise).
 *
 * Browser: window.RCWJM.skills   Node (tests): module.exports
 */
(function (root, factory) {
  'use strict';
  if (typeof module === 'object' && module && module.exports) {
    module.exports = factory();
  } else {
    root.RCWJM = root.RCWJM || {};
    root.RCWJM.skills = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  // [canonical name, category, weight, aliases..., {lab}]
  // weight 3 = differentiator, 2 = core, 1 = supporting.
  var RAW = [
    ['Linux', 'OS', 3, ['linux', 'gnu/linux', 'unix'], { lab: 'rhel10-terminal/' }],
    ['RHEL', 'OS', 3, ['rhel', 'red hat enterprise linux', 'redhat', 'red hat linux', 'rhel 8', 'rhel 9', 'rhel 10'], { lab: 'rhcsa-practice/' }],
    ['CentOS', 'OS', 1, ['centos', 'centos stream']],
    ['Rocky Linux', 'OS', 2, ['rocky linux', 'rockylinux', 'rocky']],
    ['AlmaLinux', 'OS', 1, ['almalinux', 'alma linux']],
    ['Ubuntu', 'OS', 2, ['ubuntu', 'ubuntu server', 'ubuntu 22.04', 'ubuntu 24.04']],
    ['Debian', 'OS', 1, ['debian']],
    ['SUSE', 'OS', 1, ['suse', 'sles', 'opensuse']],
    ['Windows Server', 'OS', 3, ['windows server', 'windows server 2016', 'windows server 2019', 'windows server 2022', 'wintel']],
    ['systemd', 'Linux', 2, ['systemd', 'systemctl', 'journald', 'journalctl'], { lab: 'systemd-services/' }],
    ['SELinux', 'Linux', 3, ['selinux', 'apparmor'], { lab: 'selinux-contexts/' }],
    ['LVM', 'Linux', 2, ['lvm', 'logical volume', 'pvcreate', 'lvextend', 'volume group'], { lab: 'rhcsa-storage-build/' }],
    ['Storage Spaces', 'Storage', 1, ['storage spaces', 'storagespaces']],
    ['Filesystems', 'Linux', 2, ['xfs', 'ext4', 'btrfs', 'zfs', 'filesystem', 'lvm-thin', 'thin pool'], { lab: 'mount-filesystems/' }],
    ['Shell scripting', 'Scripting', 3, ['bash', 'shell scripting', 'shell script', 'sh scripting', 'zsh', 'ksh'], { lab: 'bash-scripting/' }],
    ['PowerShell', 'Scripting', 3, ['powershell', 'pwsh']],
    ['Python', 'Scripting', 3, ['python', 'python3', 'py'], { lab: 'python-datastructures/' }],
    ['Ansible', 'Automation', 3, ['ansible', 'ansible tower', 'awx', 'ansible playbook', 'ansible automation platform'], { lab: 'ansible-playbook/' }],
    ['Terraform', 'Automation', 3, ['terraform', 'opentofu', 'hcl', 'terraform module'], { lab: 'terraform-basics/' }],
    ['Puppet', 'Automation', 2, ['puppet']],
    ['Chef', 'Automation', 1, ['chef infra', 'chef client', 'chef cookbooks']],
    ['Git', 'DevOps', 2, ['git', 'github', 'gitlab', 'bitbucket', 'version control'], { lab: 'git-rebase/' }],
    ['CI/CD', 'DevOps', 3, ['ci/cd', 'ci-cd', 'continuous integration', 'continuous delivery', 'jenkins', 'github actions', 'gitlab ci', 'azure devops', 'teamcity']],
    ['GitOps', 'DevOps', 2, ['gitops', 'argocd', 'flux cd']],
    ['Docker', 'Containers', 3, ['docker', 'docker-compose', 'podman', 'containerd', 'oci image'], { lab: 'docker-beginners/' }],
    ['Kubernetes', 'Containers', 3, ['kubernetes', 'k8s', 'kubectl', 'eks', 'aks', 'gke', 'openshift', 'ocp', 'helm', 'kustomize'], { lab: 'kubectl-pods/' }],
    ['Helm', 'Containers', 2, ['helm', 'helm chart'], { lab: 'helm-basics/' }],
    ['Container networking', 'Networking', 1, ['cilium', 'calico', 'flannel', 'ingress controller', 'istio']],
    ['Observability', 'Monitoring', 3, ['prometheus', 'grafana', 'alertmanager', 'loki', 'datadog', 'new relic', 'dynatrace', 'observability', 'thanos'], { lab: 'production-outage-game/' }],
    ['Logging', 'Monitoring', 2, ['elk', 'logstash', 'kibana', 'splunk', 'graylog', 'fluentd', 'centralized logging'], { lab: 'journalctl-logs/' }],
    ['Monitoring', 'Monitoring', 3, ['nagios', 'zabbix', 'pnp4nagios', 'solarwinds', 'checkmk', 'icinga', 'monitoring', 'sensu', 'op5'], { lab: 'log-analysis/' }],
    ['Backup & DR', 'Backup', 3, ['veeam', 'commvault', 'netbackup', 'nbu', 'rubrik', 'cohesity', 'datap domain', 'avamar', 'granular recovery', 'backup and recovery', 'disaster recovery', 'business continuity', 'rpo', 'rto', 'immutable backup', 'replication'], { lab: 'veeam-jobs-restore-troubleshooting.html' }],
    ['NetApp', 'Storage', 2, ['netapp', 'ontap', 'aff', 'fas ', 'snapmirror', 'snapvault'], { lab: 'truenas-zfs-storage-architecture.html' }],
    ['Dell Storage', 'Storage', 2, ['dell emc', 'powerstore', 'unity xt', 'xtremio', 'powermax', 'powerflex', 'vnx', 'isilon', 'poweredge', 'idrac', 'perc'], { lab: 'dell-poweredge-idrac-perc-troubleshooting.html' }],
    ['Pure Storage', 'Storage', 2, ['pure storage', 'flasharray', 'flasharray//']],
    ['Hitachi/IBM Storage', 'Storage', 1, ['hitachi vsp', 'ibm flashsystem', 'ibm storwize', 'hds']],
    ['SAN', 'Storage', 2, ['san', 'fibre channel', 'fc-zoning', 'zoning', 'lun masking', 'zoning', 'emc switch', 'brocade', 'mibre', 'multipath', 'mpath', 'nvme-ofo', 'nvmeof'], { lab: 'san-multipath-latency-troubleshooting.html' }],
    ['NAS', 'Storage', 1, ['nas', 'nfs', 'smb', 'cifs', 'samba', 'iscsi', 'truenas', 'windows file server', 'dfs', 'dfs namespace', 'dfs replication'], { lab: 'nfs-smb-mount-troubleshooting.html' }],
    ['VMware vSphere', 'Virtualization', 3, ['vmware', 'vsphere', 'esxi', 'vcenter', 'vcenter server', 'vmotion', 'drs', 'ha cluster', 'vm tools', 'vmware tools', 'vcsa', 'datastore', 'vmfs', 'vsan', 'vSAN'], { lab: 'vmware-esxi-psod-troubleshooting.html' }],
    ['VMware SRM/ARIA', 'Virtualization', 2, ['site recovery manager', 'srm', 'aria automation', 'vrealize', 'vra', 'vrops', 'aria operations', 'nsx']],
    ['Horizon / VDI', 'Virtualization', 3, ['horizon view', 'vmware horizon', 'citrix', 'xenapp', 'xen desktop', 'virtual apps and desktops', 'vdi', 'pvs', 'machine creation services', 'profile manager', 'uniforme']],
    ['Hyper-V', 'Virtualization', 2, ['hyper-v', 'hyperv', 'scvmm', 'virtual machine manager', 'vmm']],
    ['Proxmox', 'Virtualization', 1, ['proxmox', 'pve', 'kvm', 'qemu', 'libvirt', 'virtualbox', 'virtualbox']],
    ['AWS EC2', 'Cloud', 3, ['aws ec2', 'ec2', 'autoscaling', 'launch template', 'ami', 'ebs', 'instance profile'], { lab: 'aws-ec2-cli/' }],
    ['AWS S3', 'Cloud', 2, ['s3', 's3 bucket', 'lifecycle policy', 'glacier', 'cloudfront'], { lab: 'aws-s3-cli/' }],
    ['AWS Networking', 'Cloud', 2, ['vpc', 'subnet', 'route table', 'security group', 'network acl', 'transit gateway', 'direct connect', 'route 53', 'aws route53'], { lab: 'aws-vpc-cli/' }],
    ['AWS IAM', 'Cloud', 2, ['aws iam', 'iam role', 'iam policy', 'sts', 'organizations', 'aws sso', 'permission set'], { lab: 'aws-iam-cli/' }],
    ['AWS Compute/Serverless', 'Cloud', 2, ['aws lambda', 'lambda', 'fargate', 'aws batch', 'app runner', 'aws elastic beanstalk'], { lab: 'aws-lambda-cli/' }],
    ['AWS Infra as Code', 'Cloud', 2, ['cloudformation', 'aws cdk', 'aws cli', 'aws ssm', 'systems manager'], { lab: 'aws-cloudformation/' }],
    ['AWS Databases', 'Cloud', 1, ['rds', 'aurora', 'dynamodb', 'elasticache', 'aws database'], { lab: 'aws-rds-cli/' }],
    ['Azure VM/Networking', 'Cloud', 3, ['azure vm', 'azure vnet', 'network security group', 'nsg', 'load balancer azure', 'azure networking', 'availability set', 'availability zone', 'vm scale set', 'vmss'], { lab: 'azure-vm/' }],
    ['Azure Storage', 'Cloud', 2, ['azure storage', 'azure blob', 'azure files', 'azure netapp files', 'azure disk', 'storage account'], { lab: 'azure-storage/' }],
    ['Entra ID', 'Identity', 3, ['entra id', 'azure ad', 'azure active directory', 'conditional access', 'pim', 'privileged identity management', 'identity protection', 'tenant'], { lab: 'azure-entra/' }],
    ['Microsoft Intune', 'Endpoint', 3, ['intune', 'microsoft endpoint manager', 'autopilot', 'endpoint analytics', 'configuration profile', 'compliance policy', 'app protection policy', 'macos management'], { lab: 'intune-autopilot-lab/' }],
    ['SCCM / MECM', 'Endpoint', 3, ['sccm', 'mectm', 'configmgr', 'configuration manager', 'software update point', 'task sequence', 'mdt', 'windows as a service', 'patching']],
    ['Microsoft Defender', 'Security', 3, ['defender for endpoint', 'defender for identity', 'defender for office 365', 'microsoft defender', 'microsoft sentinel', 'sentinel', 'kql', 'advanced hunting', 'incident queue'], { lab: 'microsoft-defender-labs/' }],
    ['GCP Compute', 'Cloud', 2, ['gcp', 'google cloud', 'compute engine', 'gke', 'cloud run', 'mig', 'instance group'], { lab: 'gcp-compute/' }],
    ['GCP IAM/Storage', 'Cloud', 2, ['cloud iam', 'service account gcp', 'cloud storage', 'bigquery', 'cloud sql', 'vpc gcp', 'cloud dns'], { lab: 'gcp-storage/' }],
    ['Multi-cloud', 'Cloud', 2, ['multi-cloud', 'hybrid cloud', 'cloud migration', 'aws to azure', 'cross cloud', 'landing zone', 'cloud adoption framework']],
    ['Cloud Cost/FinOps', 'Cloud', 1, ['finops', 'cost optimization', 'reserved instance', 'savings plan', 'rightsizing']],
    ['Active Directory', 'Identity', 3, ['active directory', 'ad ds', 'domain controller', 'gpo', 'group policy', 'ou structure', 'adrep', 'forest', 'tree', 'domain functional level', 'krbtgt', 'kerberos', 'ntlm', 'ad replication', 'sysvol', 'dfs-r']],
    ['ADFS / Federation', 'Identity', 2, ['adfs', 'active directory federation services', 'saml', 'oidc', 'openid connect', 'oauth', 'single sign-on', 'sso', 'ldap', 'scim']],
    ['PKI / Certificates', 'Security', 2, ['pki', 'certificate authority', 'adcs', 'ndes', 'certificate template', 'tls', 'ssl certificate', 'openssl', 'lets encrypt', 'mutual tls']],
    ['Password & access policy', 'Security', 1, ['fine-grained password policy', 'password policy', 'laps', 'local admin password solution', 'jit', 'least privilege', 'zero trust', 'zero-trust', 'privileged access']],
    ['Network fundamentals', 'Networking', 2, ['tcp/ip', 'dns', 'dhcp', 'vlan', 'subnetting', 'osi model', 'routing', 'switching', 'arp', 'nat', 'port forwarding', 'mtu'], { lab: 'subnetting-drill/' }],
    ['Cisco', 'Networking', 3, ['cisco', 'ios xe', 'nx-os', 'catalyst', 'meraki', 'asa firewall', 'anyconnect', 'ise', 'trustsec', 'spanning tree', 'stp', 'hsrp', 'vrrp', 'port-channel', 'lacp'], { lab: 'networking-challenge/' }],
    ['BGP/OSPF', 'Networking', 2, ['bgp', 'ospf', 'eigrp', 'static routing', 'route redistribution', 'bfd']],
    ['Firewalls', 'Security', 3, ['palo alto', 'fortinet', 'fortigate', 'checkpoint', 'juniper srx', 'pfSense', 'iptables', 'firewalld', 'nftables', 'ufw', 'windows firewall', 'waf', 'netscaler', 'citrix adc', 'load balancer', 'f5 big-ip', 'haproxy', 'nginx'], { lab: 'iptables-basics/' }],
    ['Packet capture', 'Networking', 2, ['wireshark', 'tcpdump', 'network analyzer', 'packet capture', 'pcap', 'traceroute', 'sflow', 'netflow'], { lab: 'network-troubleshooting/' }],
    ['VPN', 'Networking', 2, ['vpn', 'site-to-site', 'ipsec', 'wireguard', 'openvpn', 'global protect', 'always on vpn']],
    ['Email & collaboration', 'Collaboration', 2, ['exchange server', 'exchange online', 'microsoft 365', 'office 365', 'o365', 'teams', 'sharepoint', 'onedrive', 'smtp', 'exchange online protection', 'spf', 'dmarc', 'dkim']],
    ['Database admin', 'Data', 2, ['sql server', 'mssql', 'azure sql', 'postgresql', 'postgres', 'mysql', 'mariadb', 'oracle db', 'oracle database', 'dbcc', 'backup and restore database', 'query tuning'], { lab: 'mysql-basics/' }],
    ['Redis & messaging', 'Data', 1, ['redis', 'kafka', 'rabbitmq', 'activemq', 'sqs', 'event hub', 'pub/sub', 'queue'], { lab: 'redis-basics/' }],
    ['Web servers', 'Infrastructure', 1, ['iis', 'apache', 'nginx', 'tomcat', 'weblogic', 'jboss', 'wildfly', 'url rewrite', 'app pool']],
    ['Load & app delivery', 'Infrastructure', 2, ['application delivery', 'load balancing', 'ssl offload', 'sticky session', 'health probe', 'reverse proxy']],
    ['ITSM / ticketing', 'Process', 2, ['servicenow', 'itsm', 'jira service management', 'bmc remedy', 'remedyforce', 'freshservice', 'zendesk', 'incident management', 'change management', 'problem management', 'itil', 'ticket queue', 'request fulfilment']],
    ['Runbooks & SOPs', 'Process', 2, ['runbook', 'run books', 'standard operating procedure', 'sop documents', 'knowledge base articles', 'kb articles', 'shift handover', 'operational documentation']],
    ['Capacity & patch mgmt', 'Process', 2, ['capacity planning', 'patch management', 'patching cycle', 'maintenance window', 'change advisory board', 'cab', 'firmware upgrade', 'lifecycle management'], { lab: 'intune-windows-autopatch-hotpatch.html' }],
    ['Incident response', 'Security', 3, ['incident response', 'ir process', 'root cause analysis', 'rca', 'postmortem', 'post-incident review', 'siem', 'soar', 'malware containment', 'ransomware', 'threat hunting', 'mitre att&ck', 'phishing triage', 'edr'], { lab: 'incident-response-freshers/' }],
    ['Hardening & compliance', 'Security', 3, ['cis benchmark', 'hardening', 'security baseline', 'stp', 'audit', 'iso 27001', 'soc 2', 'pci-dss', 'gdpr', 'sox', 'nerc cip', 'risk assessment', 'vulnerability management', 'qualys', 'nessus', 'tenable', 'patch compliance'], { lab: 'password-policy/' }],
    ['On-call & SLA', 'Process', 2, ['on-call', 'oncall', '24x7', '24*7', 'shift rotation', 'sla', 'slas', 'severity 1', 'sev1', 'war room', 'escalation matrix', 'p1 incident']],
    ['Migration projects', 'Projects', 3, ['migration', 'datacenter migration', 'lift and shift', 'os upgrade', 'ad upgrade', 'exchange migration', 'file server migration', 'rationalization', 'modernization', 'end of life', 'eol', 'cut-over', 'cutover plan', 'wave planning']],
    ['Project & vendor mgmt', 'Projects', 2, ['vendor management', 'stakeholder management', 'project planning', 'rfp', 'proof of concept', 'budget planning', 'capex', 'licence reconciliation', 'annual maintenance contract', 'amc', 'itam', 'statement of work']],
    ['Leadership', 'Leadership', 3, ['team lead', 'team of', 'led a team', 'managed a team', 'people management', 'mentoring', 'mentor', 'coaching', 'performance review', 'pre-sales', 'scope of work', 'sow', 'shift lead', 'technical owner', 'buddy', 'onboarded new engineers']],
    ['Solution architecture', 'Leadership', 3, ['solution architect', 'solution architecture', 'infrastructure architect', 'cloud architect', 'technical architect', 'design authority', 'reference architecture', 'platform architecture', 'architecture review board', 'hld', 'lld', 'high level design', 'low level design', 'design document', 'technical design authority', 'capacity model', 'ha design', 'resiliency design']],
    ['Virtual desktops (DaaS)', 'Virtualization', 2, ['azure virtual desktop', 'avd', 'windows 365', 'cloud pc', 'bsv', 'fslogix', 'profilecontainer']],
    ['AI / ML ops', 'Emerging', 1, ['bedrock', 'sagemaker', 'azure openai', 'openai', 'langchain', 'rag', 'vector database', 'copilot studio', 'ai agents', 'ml ops']],
    ['Scripted testing', 'DevOps', 1, ['pytest', 'mocha', 'selenium', 'test automation', 'unit testing', 'testdriven', 'tdd', 'ansible-lint', 'molecule']],
    ['Secrets & configs', 'Security', 2, ['vault', 'hashicorp vault', 'aws secrets manager', 'key vault', 'azure key vault', 'sops', 'sealed secrets', 'config management']],
    ['High performance computing', 'Infrastructure', 1, ['gpu', 'vgpu', 'nvidia vgpu', 'cuda', 'rdma', 'roce', 'infiniband', 'mpi', 'slurm']],
    ['Remote access & zero trust', 'Security', 2, ['zta', 'global protect', 'palo globalprotect', 'anyconnect', 'netscaler gateway', 'reach vdi', 'citrix gateway', 'universal workspace', 'vpn alternative', 'device posture', 'never trust always verify']],
    ['Asset & licence mgmt', 'Process', 1, ['asset management', 'software licence', 'licence management', 'sam', 'cmdb', 'discovery and mapping']],
    ['Enterprise Storage', 'Storage', 3, ['storage administration', 'storage arrays', 'block storage', 'object storage', 'file storage', 'storage tiering', 'storage capacity planning', 'qos', 'storage performance']],
    ['Swap & memory', 'Linux', 1, ['swap', 'swap space', 'memory tuning', 'oom', 'out of memory', 'zram', 'hugepages', 'transparent hugepages']],
    ['SSH & remote access', 'Security', 2, ['ssh', 'sshd', 'ssh keys', 'authorized_keys', 'sftp', 'scp', 'rsync', 'passwordless ssh', 'port knocking']],
    ['Task scheduling', 'Linux', 1, ['cron', 'crontab', 'anacron', 'systemd timer', 'at job', 'scheduler']],
    ['Performance tuning', 'Linux', 3, ['performance tuning', 'performance analysis', 'performance optimisation', 'performance optimization', 'latency', 'throughput', 'load average', 'perf', 'sar', 'vmstat', 'iostat', 'slab top', 'pidstat']]
  ];

  var CERTS = [
    ['RHCSA', 'Red Hat', ['rhcsa', 'red hat certified system administrator', 'ex200']],
    ['RHCE', 'Red Hat', ['rhce', 'red hat certified engineer', 'ex294']],
    ['RHCA', 'Red Hat', ['rhca', 'red hat certified architect']],
    ['CompTIA Linux+', 'Vendor-neutral', ['linux+', 'comptia linux']],
    ['LPIC', 'Vendor-neutral', ['lpic-1', 'lpic-2', 'lpic-3', 'lpi level']],
    ['LFCS / LFCE', 'Linux Foundation', ['lfcs', 'lfce']],
    ['CKA', 'CNCF', ['cka', 'certified kubernetes administrator']],
    ['CKAD', 'CNCF', ['ckad']],
    ['CKS', 'CNCF', ['cks', 'kubernetes security']],
    ['HashiCorp Terraform Associate', 'HashiCorp', ['terraform associate', 'hcpa terraform', 'pct']],
    ['AWS SAA', 'AWS', ['aws certified solutions architect', 'saa-c03', 'saa', 'associate solutions']],
    ['AWS Professional', 'AWS', ['aws certified solutions architect professional', 'sap-c02', 'devops engineer professional', 'devops-c02']],
    ['AWS SysOps', 'AWS', ['sysops administrator', 'soa-c02']],
    ['Azure AZ-900', 'Microsoft', ['az-900', 'azure fundamentals']],
    ['Azure AZ-104', 'Microsoft', ['az-104', 'azure administrator']],
    ['Azure AZ-305', 'Microsoft', ['az-305', 'azure solutions architect']],
    ['Azure AZ-500', 'Microsoft', ['az-500', 'azure security engineer']],
    ['MD-102', 'Microsoft', ['md-102', 'endpoint administrator', 'intune certification']],
    ['SC-200', 'Microsoft', ['sc-200', 'security operations analyst']],
    ['SC-300', 'Microsoft', ['sc-300', 'identity and access administrator']],
    ['AI-102', 'Microsoft', ['ai-102']],
    ['DP-300', 'Microsoft', ['dp-300', 'azure database administrator']],
    ['GCP Associate', 'Google Cloud', ['associate cloud engineer', 'gcp-ace', 'professional cloud architect', 'professional cloud engineer', 'professional database engineer']],
    ['VMware VCP', 'VMware', ['vcp', 'vcp-dcv', 'vcap', 'vcdx', 'vmware certified professional']],
    ['Citrix CCA-V', 'Citrix', ['cca-v', 'ccns', 'citrix certified']],
    ['Cisco CCNA', 'Cisco', ['ccna', '200-301', 'ccnp', 'ccie', 'jncia']],
    ['Security+ / SSCP', 'Vendor-neutral', ['security+', 'comptia security', 'sscp', 'ceh', 'cissp', 'gaspo']],
    ['ITIL', 'Process', ['itil', 'itil 4', 'itil v3', 'itil foundation']],
    ['PMP / PRINCE2', 'Management', ['pmp', 'prince2', 'agile certified', 'smc']]
  ];

  // Job-title families: used to decide whether a posting is even in the user's lane,
  // and to convert a title into a seniority level.
  var ROLE_FAMILIES = [
    { id: 'sysadmin', label: 'Linux / System Administrator', level: 2, patterns: ['linux administrator', 'system administrator', 'systems administrator', 'unix administrator', 'linux admin', 'system admin', 'server administrator', 'wintel administrator', 'windows administrator', 'rhel administrator'] },
    { id: 'infraops', label: 'Infrastructure Engineer', level: 3, patterns: ['infrastructure engineer', 'infrastructure specialist', 'platform engineer', 'environment engineer', 'compute engineer', 'enterprise engineer', 'it infrastructure', 'technical analyst', 'operations engineer', 'production support engineer'] },
    { id: 'sre', label: 'SRE / Reliability', level: 4, patterns: ['site reliability', 'sre', 'reliability engineer', 'stability engineer', 'observability engineer'] },
    { id: 'devops', label: 'DevOps / Automation', level: 3, patterns: ['devops', 'sre/devops', 'platform engineer', 'cloud devops', 'automation engineer', 'configuration engineer', 'build engineer', 'release engineer', 'deployment engineer'] },
    { id: 'cloud', label: 'Cloud Engineer', level: 3, patterns: ['cloud engineer', 'cloud administrator', 'cloud operations', 'aws engineer', 'azure engineer', 'gcp engineer', 'cloud migration engineer', 'cloud infrastructure engineer'] },
    { id: 'virtualization', label: 'Virtualization / VDI', level: 3, patterns: ['virtualization engineer', 'vmware engineer', 'vmware administrator', 'esxi', 'vcenter administrator', 'virtualization administrator', 'vdi engineer', 'citrix engineer', 'horizon engineer', 'hyper-v administrator'] },
    { id: 'storage', label: 'Storage Engineer', level: 3, patterns: ['storage engineer', 'storage administrator', 'storage specialist', 'nas administrator', 'san administrator', 'backup engineer', 'backup administrator', 'data protection engineer', 'vmware & storage'] },
    { id: 'network', label: 'Network Engineer', level: 3, patterns: ['network engineer', 'network administrator', 'network operations', 'noc engineer', 'lan wan engineer', 'wireless engineer', 'network security engineer'] },
    { id: 'endpoint', label: 'Endpoint / Intune Admin', level: 2, patterns: ['endpoint administrator', 'intune administrator', 'sccm administrator', 'desktop support engineer', 'modern workplace', 'mdm administrator', 'autopilot'] },
    { id: 'secops', label: 'Security / SecOps', level: 3, patterns: ['security engineer', 'security analyst', 'soc analyst', 'information security', 'incident responder', 'vulnerability management', 'identity and access', 'iam engineer', 'defender administrator'] },
    { id: 'support', label: 'IT Support / L1-L3', level: 1, patterns: ['it support', 'service desk', 'helpdesk', 'help desk', 'technical support engineer', 'l1 support', 'l2 support', 'l3 support', 'desktop engineer', 'field support', 'end user computing'] },
    { id: 'lead', label: 'Team Lead / Module Lead', level: 4, patterns: ['team lead', 'module lead', 'technical lead', 'lead engineer', 'principal engineer', 'senior staff', 'supervisor', 'shift lead', 'operations lead'] },
    { id: 'architect', label: 'Architect / Design Authority', level: 5, patterns: ['architect', 'design authority', 'technical consultant', 'solution consultant', 'advisory engineer', 'technical specialist', 'cloud advisor', 'technical owner'] },
    { id: 'manager', label: 'IT Manager / Head', level: 5, patterns: ['it manager', 'infrastructure manager', 'operations manager', 'technology manager', 'it operations lead', 'head of it', 'it service delivery manager', 'delivery manager'] },
    { id: 'dba', label: 'Database Engineer', level: 3, patterns: ['database administrator', 'dba', 'sql server administrator', 'mysql administrator', 'postgres administrator', 'database engineer'] },
    { id: 'trainer', label: 'Trainer / Content / EdTech', level: 3, patterns: ['trainer', 'instructor', 'faculty', 'content developer', 'curriculum', 'course author', 'technical writer', 'instructional designer', 'edtech', 'lab engineer', 'developer advocate', 'community manager'] }
  ];

  // A posting that wants this much more seniority than the profile has is a poor use
  // of an application, so the score is trimmed instead of pretending it is a fit.
  var LEVEL_LABELS = { 1: 'entry / support', 2: 'administrator', 3: 'engineer', 4: 'lead / senior engineer', 5: 'architect / manager', 6: 'principal / head' };

  var LOCATION_GROUPS = {
    'India': ['india', 'bengaluru', 'bangalore', 'chennai', 'hyderabad', 'pune', 'mumbai', 'gurgram', 'gurugram', 'gurgaon', 'noida', 'new delhi', 'delhi', 'kolkata', 'ahmedabad', 'kochi', 'trivandrum', 'thiruvananthapuram', 'mysuru', 'mysore', 'coimbatore', 'vadodara', 'jaipur', 'remote india', 'india remote', 'telecom india'],
    'Remote (worldwide)': ['worldwide', 'remote', 'anywhere', 'eMEA', 'any location', 'home based', 'work from home', 'global remote'],
    'Europe': ['germany', 'france', 'netherlands', 'poland', 'portugal', 'spain', 'ireland', 'romania', 'czech', 'uk', 'united kingdom', 'london', 'europe', 'emea'],
    'Middle East': ['dubai', 'uae', 'saudi', 'qatar', 'bahrain', 'kuwait', 'oman', 'middle east'],
    'US/Canada': ['united states', 'usa', 'canada', 'toronto', 'vancouver', 'new york', 'austin', 'remote us', 'north america'],
    'APAC': ['singapore', 'australia', 'sydney', 'melbourne', 'japan', 'tokyo', 'malaysia', 'kuala lumpur', 'new zealand', 'apac', 'asean']
  };

  var SKILLS = RAW.map(function (row, index) {
    var name = row[0], category = row[1], weight = row[2];
    // A RAW row is [name, category, weight, aliasesArray, optionsObject]. Both the alias
    // list and the options object have to be pulled out by inspection: an array is
    // typeof "object" too, so a naive type filter silently swallows the aliases.
    var aliases = [];
    var extra = {};
    for (var cell = 3; cell < row.length; cell += 1) {
      var value = row[cell];
      if (Array.isArray(value)) aliases = aliases.concat(value);
      else if (value && typeof value === 'object') extra = value;
      else if (typeof value === 'string') aliases.push(value);
    }
    var list = aliases.length ? aliases : [name];
    if (list.map(function (a) { return a.toLowerCase(); }).indexOf(name.toLowerCase()) === -1) list = [name].concat(list);
    return {
      id: 'sk' + index,
      name: name,
      category: category,
      weight: weight,
      aliases: dedupe(list.map(function (a) { return a.trim(); }).filter(Boolean)),
      lab: extra.lab || ''
    };
  });

  var BY_NAME = Object.create(null);
  SKILLS.forEach(function (skill) { BY_NAME[skill.name.toLowerCase()] = skill; });

  function dedupe(list) {
    var seen = Object.create(null), out = [];
    list.forEach(function (item) {
      var key = String(item).toLowerCase();
      if (!seen[key]) { seen[key] = 1; out.push(item); }
    });
    return out;
  }

  var escapeRegExp = function (value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  };

  function boundary(alias) {
    // Leading edge only needs a boundary when the alias starts with a word character;
    // trailing edge must not eat a following dot in "aws." style sentences.
    var body = escapeRegExp(alias).replace(/\s+/g, '[- /]+');
    var lead = /^[\w+#.]/.test(alias) ? '(?<![a-z0-9+#./-])' : '';
    var tail = /[\w+#.]$/.test(alias) ? '(?![a-z0-9+#/-])' : '';
    return new RegExp(lead + body + tail, 'i');
  }

  var COMPILED = SKILLS.map(function (skill) {
    return { skill: skill, regexes: skill.aliases.map(function (alias) { return { alias: alias, re: boundary(alias) }; }) };
  });

  function findIn(text) {
    var hits = Object.create(null);
    var lower = String(text || '').toLowerCase();
    if (!lower.trim()) return hits;
    COMPILED.forEach(function (entry) {
      var found = [];
      entry.regexes.forEach(function (item) {
        if (item.re.test(lower)) found.push(item.alias);
      });
      if (found.length) hits[entry.skill.name] = found;
    });
    return hits;
  }

  function countOccurrences(text, alias) {
    var re = new RegExp(boundary(alias).source, 'gi');
    return (String(text || '').match(re) || []).length;
  }

  /**
   * Extract skill mentions from a blob of text.
   * Returns { skills: [{name, category, weight, mentions, aliases, evidence, lab}], byName }
   */
  function extract(text) {
    var source = String(text || '');
    var byName = Object.create(null);
    var list = [];
    SKILLS.forEach(function (skill) {
      var mentions = 0, usedAliases = [];
      skill.aliases.forEach(function (alias) {
        var n = countOccurrences(source, alias);
        if (n > 0) { mentions += n; usedAliases.push(alias); }
      });
      if (!mentions) return;
      var evidence = [];
      var sentences = source.replace(/\r/g, '').split(/\n+/);
      for (var i = 0; i < sentences.length && evidence.length < 3; i += 1) {
        var line = sentences[i].trim();
        if (line.length > 20 && skill.aliases.some(function (a) { return boundary(a).test(line); })) evidence.push(line.slice(0, 220));
      }
      var entry = {
        name: skill.name,
        category: skill.category,
        weight: skill.weight,
        mentions: Math.min(mentions, 40),
        aliases: usedAliases.slice(0, 6),
        evidence: evidence,
        lab: skill.lab
      };
      byName[skill.name] = entry;
      list.push(entry);
    });
    list.sort(function (a, b) { return (b.weight * Math.min(b.mentions, 8)) - (a.weight * Math.min(a.mentions, 8)); });
    return { skills: list, byName: byName };
  }

  function lookup(name) {
    if (!name) return null;
    var key = String(name).toLowerCase().trim();
    if (BY_NAME[key]) return BY_NAME[key];
    var found = null;
    SKILLS.forEach(function (skill) {
      if (found) return;
      if (skill.aliases.some(function (a) { return a.toLowerCase() === key; })) found = skill;
    });
    return found;
  }

  /** Resolve free-text skill words typed by a user into canonical names. */
  function resolveList(input) {
    var words = String(input || '').split(/[,;\n]|\s{2,}/).map(function (w) { return w.trim(); }).filter(Boolean);
    var resolved = [], unknown = [];
    words.forEach(function (word) {
      var skill = lookup(word);
      if (skill) { if (resolved.indexOf(skill.name) === -1) resolved.push(skill.name); return; }
      var loose = SKILLS.filter(function (candidate) {
        var lower = word.toLowerCase();
        return candidate.name.toLowerCase().indexOf(lower) !== -1 || lower.length > 3 &&
          candidate.aliases.some(function (alias) { return alias.toLowerCase().indexOf(lower) !== -1; });
      }).map(function (candidate) { return candidate.name; });
      loose.slice(0, 3).forEach(function (name) { if (resolved.indexOf(name) === -1) resolved.push(name); });
      if (!loose.length && unknown.indexOf(word) === -1) unknown.push(word);
    });
    return { known: resolved, unknown: unknown };
  }

  function categories() {
    var out = [];
    SKILLS.forEach(function (skill) { if (out.indexOf(skill.category) === -1) out.push(skill.category); });
    return out.sort();
  }

  function classifyTitle(title) {
    var lower = ' ' + String(title || '').toLowerCase() + ' ';
    var matched = [];
    ROLE_FAMILIES.forEach(function (family) {
      var hit = family.patterns.some(function (pattern) { return lower.indexOf(pattern) !== -1; });
      if (hit) matched.push({ id: family.id, label: family.label, level: family.level });
    });
    var level = 3;
    if (matched.length) level = Math.max.apply(null, matched.map(function (m) { return m.level; }));
    if (/\b(senior|staff|principal|lead|expert)\b/.test(lower)) level += 1;
    if (/\b(junior|jr|associate|intern|graduate|trainee|fresher|entry level|l1)\b/.test(lower)) level -= 1;
    if (/\b(head|director|manager|architect|lead)\b/.test(lower)) level = Math.max(level, 5);
    return { families: matched, level: Math.max(1, Math.min(6, level)), label: matched.length ? matched[0].label : 'unclassified' };
  }

  function certHits(text) {
    var lower = String(text || '').toLowerCase();
    var out = [];
    CERTS.forEach(function (row) {
      var name = row[0], provider = row[1], aliases = row[2];
      if (aliases.some(function (alias) { return lower.indexOf(alias) !== -1; })) out.push({ name: name, provider: provider });
    });
    return out;
  }

  function locationRegions(location) {
    var lower = ' ' + String(location || '').toLowerCase() + ' ';
    var out = [];
    Object.keys(LOCATION_GROUPS).forEach(function (region) {
      var hit = LOCATION_GROUPS[region].some(function (word) { return lower.indexOf(word) !== -1; });
      if (hit) out.push(region);
    });
    if (/remote|anywhere|any location|home based|work from home|wfh/.test(lower) && out.indexOf('Remote (worldwide)') === -1) out.push('Remote (worldwide)');
    return out;
  }

  return {
    SKILLS: SKILLS,
    CERTS: CERTS,
    ROLE_FAMILIES: ROLE_FAMILIES,
    LEVEL_LABELS: LEVEL_LABELS,
    LOCATION_GROUPS: LOCATION_GROUPS,
    categories: categories,
    certHits: certHits,
    classifyTitle: classifyTitle,
    countOccurrences: countOccurrences,
    extract: extract,
    findIn: findIn,
    locationRegions: locationRegions,
    lookup: lookup,
    resolveList: resolveList
  };
}));
