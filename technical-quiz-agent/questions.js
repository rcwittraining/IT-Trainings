(function (root, factory) {
  "use strict";
  var data = factory();
  if (typeof module === "object" && module.exports) module.exports = data;
  else root.RCWQuizData = data;
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // Question format: [difficulty 1-3, prompt, four choices, correct choice index].
  var topics = {
    linux: {
      label: "Linux",
      aliases: ["linux", "rhel", "red hat", "ubuntu", "debian", "centos", "shell", "bash", "unix", "rhcs"],
      questions: [
        [1,"Which command prints the current working directory?",["pwd","whoami","whereis","ls"],0],
        [1,"Which option makes ls include hidden files?",["-h","-a","-r","-s"],1],
        [1,"Which command displays filesystem free space in human-readable units?",["du -sh","df -h","free -m","lsblk -f"],1],
        [1,"Which command changes a file's owner?",["chmod","chown","chgrp","usermod"],1],
        [1,"Which command is normally used to restart a systemd service?",["service reload-all","systemctl restart","init restart","daemonctl run"],1],
        [1,"Which file commonly defines filesystems mounted at boot?",["/etc/hosts","/etc/passwd","/etc/fstab","/etc/profile"],2],
        [1,"Which command displays IP addresses on modern Linux systems?",["ip addr","route print","net view","hostip"],0],
        [2,"What permissions does chmod 640 assign?",["Owner rw, group r, others none","Owner rwx, group r, others none","Owner r, group rw, others none","Owner rw, group rw, others none"],0],
        [2,"Which command shows logs for the sshd systemd unit?",["dmesg sshd","journalctl -u sshd","cat /var/log/sshd","systemctl logs sshd"],1],
        [2,"Which command finds files named config.yaml below the current directory?",["grep -r config.yaml .","locate -p config.yaml","find . -name config.yaml -type f","ls -R config.yaml"],2],
        [2,"Which command lists listening TCP and UDP sockets with process details?",["ss -tulpn","ip -s link","ps -net","route -n"],0],
        [2,"What does the sticky bit on a shared directory such as /tmp help prevent?",["Reading directory names","Users deleting files owned by other users","The directory being mounted","Root changing permissions"],1],
        [2,"What does an inode primarily store?",["A filename only","File metadata and block references","A user's password","A network route"],1],
        [2,"Which command reports the total size of a directory?",["df -Th directory","du -sh directory","stat -f directory","ls -S directory"],1],
        [2,"What signal does kill send by default?",["SIGKILL","SIGSTOP","SIGTERM","SIGHUP"],2],
        [3,"A logical volume was extended. What is usually required next to use the new space?",["Reboot the host","Grow the filesystem","Recreate the volume group","Change the mount owner"],1],
        [3,"Load average remains high but CPU usage is low. What is a likely cause?",["Tasks waiting on I/O","An empty page cache","Too few user accounts","A disabled firewall"],0],
        [3,"Which command displays the current SELinux mode?",["sestatusctl","getenforce","selinux -m","lscontext"],1],
        [3,"Why can a deleted log file still consume disk space?",["Its inode is immutable","A running process still has it open","The filesystem always keeps two copies","The file remains in DNS cache"],1],
        [3,"Which sequence safely gives a process a chance to exit before forcing termination?",["SIGKILL then SIGTERM","SIGSTOP then SIGHUP","SIGTERM then SIGKILL if needed","SIGHUP then SIGSTOP"],2]
      ]
    },

    windows: {
      label: "Windows & Identity",
      aliases: ["windows", "active directory", "ad ds", "microsoft", "powershell", "server 202", "domain controller", "group policy", "entra"],
      questions: [
        [1,"Which Windows service provides centralized domain authentication?",["DHCP Server","Active Directory Domain Services","Print Spooler","Task Scheduler"],1],
        [1,"Which console is commonly used to inspect Windows system and application logs?",["Event Viewer","Disk Cleanup","Registry Editor","Resource Monitor"],0],
        [1,"Which command displays detailed Windows IP configuration?",["netstat -r","ipconfig /all","route show","Get-DnsName"],1],
        [1,"What is the default port for Remote Desktop Protocol?",["22","80","443","3389"],3],
        [1,"Which PowerShell cmdlet lists services?",["Find-Service","Show-Daemon","Get-Service","List-Service"],2],
        [1,"What is Group Policy primarily used for?",["Compressing files","Centrally configuring users and computers","Replacing DNS","Creating database indexes"],1],
        [1,"Which Windows feature encrypts an entire drive?",["BitLocker","Defender Firewall","Storage Sense","Remote Assistance"],0],
        [2,"Why is DNS critical to an Active Directory domain?",["It stores user passwords","Clients use it to locate domain services","It assigns NTFS permissions","It creates backups"],1],
        [2,"Which command immediately refreshes Group Policy?",["gpupdate /force","policyctl sync","gpedit /reload","net policy refresh"],0],
        [2,"Which PowerShell cmdlet tests whether a remote TCP port is reachable?",["Test-NetConnection","Get-NetAdapter","Resolve-Path","Measure-Command"],0],
        [2,"What does NTFS permission inheritance do?",["Copies DNS records","Passes parent permissions to child objects","Encrypts child folders","Blocks domain administrators"],1],
        [2,"What is a domain controller?",["A host that provides directory and authentication services","A router for internet traffic","A storage-only appliance","A desktop update utility"],0],
        [2,"Which authentication protocol is normally preferred in a modern Windows domain?",["FTP","Kerberos","SNMP","Telnet"],1],
        [2,"Which tool schedules a program to run at a specific time or event?",["Task Scheduler","Device Manager","Disk Management","Performance Monitor"],0],
        [2,"Which PowerShell cmdlet lists running processes?",["Get-Job","Get-Process","Show-Task","Read-Process"],1],
        [3,"Which FSMO role is especially important for time synchronization and urgent password-change handling?",["Schema Master","Domain Naming Master","PDC Emulator","Infrastructure Master"],2],
        [3,"A user receives effective Deny and Allow NTFS permissions for the same action. Which normally wins?",["Allow","Deny","The newest entry","The inherited entry"],1],
        [3,"What is the main purpose of a Windows failover cluster?",["Centralize browser bookmarks","Maintain service availability across nodes","Replace user authentication","Convert NTFS to FAT"],1],
        [3,"Why use Safe Mode during troubleshooting?",["It loads a minimal driver and service set","It permanently disables security","It increases CPU speed","It joins a new domain"],0],
        [3,"A workstation can reach an IP address but not a hostname. What should be checked first?",["Display resolution","DNS configuration","NTFS compression","Printer queue"],1]
      ]
    },

    networking: {
      label: "Networking",
      aliases: ["network", "networking", "ccna", "cisco", "routing", "switching", "dns", "dhcp", "tcp", "ip address", "firewall", "vpn"],
      questions: [
        [1,"Which service translates hostnames into IP addresses?",["DHCP","DNS","NTP","SNMP"],1],
        [1,"Which service automatically assigns IP configuration to clients?",["DNS","SSH","DHCP","SMTP"],2],
        [1,"Which is a private IPv4 address?",["8.8.8.8","10.25.4.9","172.40.1.2","203.0.113.5"],1],
        [1,"What is the default TCP port for HTTPS?",["22","53","80","443"],3],
        [1,"What is the default TCP port for SSH?",["21","22","25","110"],1],
        [1,"Which protocol is used by ping?",["ICMP","ARP","SMTP","BGP"],0],
        [1,"What is the purpose of a default gateway?",["Resolve local usernames","Forward traffic to other networks","Encrypt every packet","Allocate MAC addresses"],1],
        [2,"How many usable host addresses are normally available in an IPv4 /24 subnet?",["128","254","256","510"],1],
        [2,"What does ARP resolve on a local IPv4 network?",["Hostname to IP address","IP address to MAC address","Port to process","URL to certificate"],1],
        [2,"Which TCP flags form the three-way handshake?",["SYN, SYN-ACK, ACK","ACK, FIN, RST","PSH, ACK, FIN","SYN, RST, FIN"],0],
        [2,"What is the main purpose of a VLAN?",["Increase disk capacity","Create logical Layer 2 segmentation","Replace IP addressing","Encrypt application data"],1],
        [2,"What does source NAT commonly do for outbound client traffic?",["Changes private source addresses to a public address","Changes DNS names to MAC addresses","Adds a VLAN tag","Creates a TLS certificate"],0],
        [2,"How does traceroute identify intermediate hops?",["By varying IP TTL values","By reading DNS zone files","By changing Ethernet speed","By scanning file permissions"],0],
        [2,"What distinguishes UDP from TCP?",["UDP requires a handshake","UDP is connectionless","UDP guarantees delivery","UDP always uses encryption"],1],
        [2,"What is a load balancer's primary role?",["Distribute traffic across service instances","Assign user passwords","Store operating-system files","Replace all routers"],0],
        [3,"How many usable host addresses are normally in an IPv4 /26 subnet?",["30","62","64","126"],1],
        [3,"What problem does Spanning Tree Protocol help prevent?",["Layer 2 switching loops","Expired TLS certificates","Duplicate usernames","Database deadlocks"],0],
        [3,"What happens when a packet exceeds the path MTU and cannot be fragmented?",["It may be dropped and require path-MTU handling","It becomes a DNS query","It automatically changes to ARP","It always bypasses the router"],0],
        [3,"What does a DNS record's TTL control?",["Encryption strength","How long resolvers may cache it","The number of IP addresses in a subnet","TCP retransmission count"],1],
        [3,"Which routing protocol exchanges routes between autonomous systems on the internet?",["OSPF","STP","BGP","ARP"],2]
      ]
    },

    cloud: {
      label: "Cloud",
      aliases: ["cloud", "aws", "azure", "gcp", "google cloud", "iaas", "paas", "saas", "serverless", "cloud architect"],
      questions: [
        [1,"Which cloud model provides virtual machines, networks and storage as building blocks?",["SaaS","IaaS","DNS","CI"],1],
        [1,"What does cloud elasticity mean?",["Resources can expand or contract with demand","All resources are free","Data never leaves one server","Passwords never expire"],0],
        [1,"Which storage type is commonly used for scalable files such as images and backups?",["Object storage","CPU cache","Swap memory","Firmware"],0],
        [1,"What is an availability zone?",["An isolated location within a cloud region","A user permission","A billing tag","A database row"],0],
        [1,"What is a key benefit of auto scaling?",["It adjusts capacity to demand","It removes the need for monitoring","It guarantees bug-free code","It disables network controls"],0],
        [1,"What does least privilege mean for cloud access?",["Give every administrator full control","Grant only permissions required for the task","Use one shared account","Disable audit logs"],1],
        [1,"What is serverless computing?",["Running code without managing the underlying servers directly","Computing with no physical infrastructure anywhere","A network with no DNS","A database with no storage"],0],
        [2,"In the shared-responsibility model, what does the customer normally remain responsible for?",["The provider's building security","The provider's physical disks","Their identities, data and configurations","The provider's power supply"],2],
        [2,"What does RPO describe?",["Acceptable data-loss window","Maximum CPU utilization","Required password length","Network packet size"],0],
        [2,"What does RTO describe?",["Target time to restore service","Data encryption algorithm","Monthly cloud cost","Number of user roles"],0],
        [2,"Why deploy instances across multiple availability zones?",["Improve resilience to a location failure","Avoid all software updates","Remove the need for backups","Use the same IP everywhere"],0],
        [2,"What is the best use of an instance role or managed identity?",["Provide temporary service credentials without embedding secrets","Share an administrator password","Disable authorization","Store application logs"],0],
        [2,"Why encrypt cloud data at rest?",["Protect stored data if underlying media or snapshots are exposed","Increase CPU clock speed","Replace identity controls","Prevent every application error"],0],
        [2,"What should a load-balancer health check determine?",["Whether an instance can serve requests","Whether a user accepted cookies","Whether a disk label is attractive","Whether source code has comments"],0],
        [2,"Why apply consistent resource tags?",["Support ownership, automation and cost reporting","Encrypt network traffic","Increase disk IOPS","Replace backups"],0],
        [3,"What is immutable infrastructure?",["Replacing deployed instances with new versions instead of modifying them in place","Preventing all users from reading logs","Never changing application code","Using only one server forever"],0],
        [3,"Which design best limits the impact of a compromised web server?",["Give it full administrator access","Place it in a segmented tier with narrowly scoped permissions","Store credentials in its source code","Disable logging"],1],
        [3,"When is multi-region deployment most justified?",["When business continuity requires surviving a regional outage","For every temporary test script","To avoid defining an RPO","When no data exists"],0],
        [3,"What is a cost-anomaly alert designed to detect?",["Unexpected spending changes","Expired user sessions only","Low screen brightness","A missing DNS suffix"],0],
        [3,"Why test restoration of managed-database backups?",["A successful backup job does not prove recoverability","Testing always reduces retention","Backups automatically test applications","It removes the need for replication"],0]
      ]
    },

    security: {
      label: "Cybersecurity",
      aliases: ["security", "cyber", "cybersecurity", "soc", "iam", "siem", "incident response", "ethical hacking", "penetration", "infosec", "zero trust"],
      questions: [
        [1,"What does multi-factor authentication require?",["Two passwords of the same type","Evidence from more than one authentication factor","A longer username","A public IP address"],1],
        [1,"What is phishing?",["A deceptive attempt to steal information or trigger unsafe action","A disk-repair method","A routing protocol","A database backup"],0],
        [1,"What is the principle of least privilege?",["Grant only the access needed","Make everyone an administrator","Share one account","Disable access reviews"],0],
        [1,"Why install security patches promptly?",["To address known vulnerabilities","To increase monitor size","To create user accounts","To replace backups"],0],
        [1,"What does encryption provide that hashing normally does not?",["Reversible protection using a key","A fixed one-way digest only","Automatic user authorization","Network routing"],0],
        [1,"What is the primary purpose of a firewall?",["Control network traffic using rules","Recover deleted files","Compile source code","Allocate disk blocks"],0],
        [1,"What is a vulnerability?",["A weakness that could be exploited","A confirmed backup","A user training record","A network cable type"],0],
        [2,"What is a SIEM used for?",["Centralizing and analyzing security events","Formatting disks","Assigning IP addresses","Editing application code"],0],
        [2,"What is EDR designed to monitor?",["Endpoint activity and threats","Database normalization","Cloud billing only","Printer toner"],0],
        [2,"Which control best reduces password-hash cracking risk?",["Unique salts and a strong password-hashing function","Storing passwords in plain text","Using the username as a password","Disabling login logs"],0],
        [2,"What does network segmentation help achieve?",["Limit lateral movement and isolate systems","Make all ports public","Remove authentication","Replace patching"],0],
        [2,"Which practice helps defend SQL queries from injection?",["Parameterized queries","String concatenation with raw input","Disabling database logs","Using shorter table names"],0],
        [2,"Which practice helps prevent reflected XSS?",["Context-aware output encoding","Making every user an administrator","Disabling TLS","Storing input in DNS"],0],
        [2,"What is the first objective of incident containment?",["Limit further damage while preserving response options","Delete every log","Immediately rebuild without evidence","Announce a root cause before investigation"],0],
        [2,"What does zero trust emphasize?",["Explicit verification and minimal access","Automatic trust for internal networks","One permanent shared credential","No monitoring"],0],
        [3,"Why preserve chain of custody during an investigation?",["Document evidence handling and integrity","Increase network bandwidth","Reset all passwords automatically","Create DNS records"],0],
        [3,"What is the value of an immutable offline backup against ransomware?",["It is harder for the attacker to alter or encrypt","It eliminates every vulnerability","It replaces incident response","It makes MFA unnecessary"],0],
        [3,"What does CVSS communicate?",["A standardized vulnerability-severity score","A password hash","A network route","A backup retention period"],0],
        [3,"After isolating a compromised host, what should guide eradication and recovery?",["Validated scope, root cause and a controlled recovery plan","Guesswork and immediate log deletion","Turning off all monitoring","Reusing exposed credentials"],0],
        [3,"Why perform regular restore exercises?",["Verify backups and recovery procedures actually work","Reduce encryption strength","Avoid defining recovery objectives","Disable audit requirements"],0]
      ]
    },

    devops: {
      label: "DevOps & Containers",
      aliases: ["devops", "docker", "container", "kubernetes", "k8s", "ci/cd", "cicd", "jenkins", "terraform", "ansible", "gitops", "sre"],
      questions: [
        [1,"What is version control used for?",["Tracking and collaborating on code changes","Assigning IP addresses","Replacing unit tests","Encrypting disks"],0],
        [1,"What does continuous integration normally do?",["Frequently build and test merged changes","Manually deploy once a year","Disable source history","Replace monitoring"],0],
        [1,"What is a container image?",["A packaged, read-only application template","A running physical server","A DNS record","A user password"],0],
        [1,"What does a Dockerfile describe?",["Steps to build a container image","A database relationship","A network route","A help-desk ticket"],0],
        [1,"What is the main purpose of an artifact repository?",["Store versioned build outputs","Assign VLANs","Manage user keyboards","Replace source control"],0],
        [1,"What is a rollback?",["Returning to a previously known-good release","Deleting all version history","Disabling backups","Adding more user privileges"],0],
        [1,"What does infrastructure as code manage?",["Infrastructure definitions through versioned configuration","Only application screenshots","Manual phone approvals","Physical cable labels only"],0],
        [2,"How does a container differ from a traditional virtual machine?",["It typically shares the host kernel","It always includes a separate physical CPU","It cannot run applications","It has no filesystem"],0],
        [2,"What is a Kubernetes Pod?",["The smallest deployable unit containing one or more containers","A physical router","A source-code branch","A database index"],0],
        [2,"What does a Kubernetes Deployment manage?",["Desired state and rollout of replicated Pods","User email accounts","DNS registration only","Physical server warranties"],0],
        [2,"What is a readiness probe used for?",["Determine whether a workload should receive traffic","Restart a failed operating system automatically","Encrypt a container image","Create a Git branch"],0],
        [2,"What is a liveness probe used for?",["Detect when a workload needs restarting","Choose a database primary key","Assign a VLAN","Measure cloud cost"],0],
        [2,"What property makes an automation task idempotent?",["Repeated runs converge on the same intended state","It runs only once","It requires a GUI","It deletes all previous state"],0],
        [2,"What is a blue-green deployment?",["Switching traffic between two complete environments","Deploying only at night","Mixing development and production data","Using two passwords"],0],
        [2,"What is a canary release?",["Sending a small portion of traffic to a new version first","Releasing without tests","Disabling monitoring during deployment","Updating every user simultaneously"],0],
        [3,"Why should secrets not be embedded in a container image?",["Image layers and registries can expose them","It prevents the image from starting at all","Secrets increase CPU speed","Images cannot contain text"],0],
        [3,"What three telemetry types commonly form observability?",["Logs, metrics and traces","Users, groups and roles","Rows, columns and indexes","CPU, keyboard and display"],0],
        [3,"What is the safest response to a failed production deployment?",["Use a tested rollback or roll-forward plan and verify service health","Delete monitoring data","Continue regardless of errors","Change multiple unrelated systems"],0],
        [3,"Why pin dependency or image versions in production?",["Improve repeatability and control upgrades","Guarantee zero vulnerabilities forever","Remove the need for testing","Make logs unnecessary"],0],
        [3,"What does GitOps use as the desired-state source of truth?",["A version-controlled repository","A developer's memory","A temporary chat message","A local untracked file"],0]
      ]
    },

    databases: {
      label: "Databases",
      aliases: ["database", "databases", "sql", "mysql", "postgres", "oracle", "db2", "nosql", "dba", "mongodb"],
      questions: [
        [1,"Which SQL statement retrieves rows from a table?",["SELECT","UPDATE","DROP","GRANT"],0],
        [1,"What is a primary key?",["A column or set that uniquely identifies each row","A database password","A backup file","A network port"],0],
        [1,"What does a foreign key represent?",["A relationship to a key in another table","An encrypted password","A temporary log","A query timeout"],0],
        [1,"What does an SQL WHERE clause do?",["Filters rows","Creates a database","Sorts columns alphabetically by definition","Starts a backup"],0],
        [1,"What does ORDER BY control?",["Result sorting","User authentication","Table encryption","Transaction rollback"],0],
        [1,"What does COUNT(*) return?",["The number of rows","The longest text value","The database size in bytes","The newest transaction"],0],
        [1,"What is a database backup intended to support?",["Recovery from data loss or corruption","Faster keyboard input","Network address assignment","Source compilation"],0],
        [2,"What is the main trade-off of adding an index?",["Faster reads can require extra storage and write work","All queries become slower","Backups become impossible","Transactions lose consistency"],0],
        [2,"Which ACID property means a transaction happens completely or not at all?",["Atomicity","Consistency","Isolation","Durability"],0],
        [2,"What does an INNER JOIN return?",["Rows with matching join values in both inputs","Every row from both inputs regardless of match","Only duplicate table names","Database permissions"],0],
        [2,"Why normalize relational data?",["Reduce unnecessary duplication and update anomalies","Remove all relationships","Store every value in one column","Disable constraints"],0],
        [2,"What is a read replica commonly used for?",["Offloading read workloads","Accepting every write as the only primary","Replacing backups","Managing user passwords"],0],
        [2,"What is a database deadlock?",["Transactions wait on one another's locked resources","A table has no primary key","A backup finishes early","A query returns zero rows"],0],
        [2,"Why use connection pooling?",["Reuse database connections and reduce setup overhead","Store backup copies","Encrypt table names","Replace indexes"],0],
        [2,"What does GROUP BY enable?",["Aggregation by shared values","User-role assignment","Disk formatting","Transaction rollback"],0],
        [3,"How does HAVING differ from WHERE in an aggregate query?",["HAVING filters groups after aggregation","HAVING creates indexes","WHERE can only filter columns named WHERE","There is no difference"],0],
        [3,"Why inspect a query execution plan?",["Understand access methods and performance cost","Recover a forgotten password","Create a network route","Change backup retention"],0],
        [3,"What should an application do after detecting a deadlock victim error?",["Retry the transaction safely with appropriate limits","Delete the database","Disable all locking","Ignore every error"],0],
        [3,"What does a UNIQUE constraint enforce?",["No duplicate value combination in the constrained columns","Every row is encrypted","All queries use an index","The table has only one column"],0],
        [3,"Which backup strategy captures changes since the most recent backup of any type?",["Incremental backup","Full backup","Schema-only export","Read replica"],0]
      ]
    },

    virtualization: {
      label: "Virtualization",
      aliases: ["virtualization", "vmware", "hyper-v", "hyperv", "virtual machine", "vm", "hypervisor", "esxi", "vcenter", "proxmox"],
      questions: [
        [1,"What is a hypervisor?",["Software that creates and runs virtual machines","A database query","A network cable","A backup schedule"],0],
        [1,"Where does a Type 1 hypervisor run?",["Directly on host hardware","Inside a web browser only","Only inside a database","On a network switch"],0],
        [1,"What is a virtual machine template?",["A reusable base for creating VMs","A live network packet","A user password","A physical rack diagram"],0],
        [1,"What is a virtual switch used for?",["Connect virtual network interfaces","Encrypt virtual disks","Schedule backups","Allocate database rows"],0],
        [1,"What does live migration do?",["Moves a running VM between hosts with minimal interruption","Converts a VM to a user account","Deletes a snapshot","Changes a DNS zone"],0],
        [1,"What is thin-provisioned virtual storage?",["Capacity allocated as data is written","A disk with no filesystem","Storage that cannot grow","A read-only tape"],0],
        [1,"Why install guest integration tools?",["Improve drivers, coordination and manageability","Replace the guest operating system","Disable time synchronization","Remove virtual networking"],0],
        [2,"Why is a VM snapshot not a complete backup strategy?",["It often depends on the same platform and storage","It always creates an offline copy","It cannot preserve memory","It is stored only on paper"],0],
        [2,"What is vCPU overcommit?",["Assigning more virtual CPUs than physical cores","Giving every VM a dedicated physical server","Disabling CPU scheduling","Encrypting CPU instructions"],0],
        [2,"What is memory ballooning?",["A technique to reclaim guest memory under host pressure","Permanent guest-memory encryption","Adding physical DIMMs automatically","A database cache setting"],0],
        [2,"What does virtualization high availability normally do after host failure?",["Restart affected VMs on surviving hosts","Recover every unsaved memory page","Replace application backups","Disable monitoring"],0],
        [2,"Why use VM anti-affinity rules?",["Keep redundant workloads on separate hosts","Force every VM onto one host","Disable live migration","Remove network segmentation"],0],
        [2,"What does a resource pool control?",["Relative compute resource allocation","DNS-zone transfers","User password length","Backup-file compression only"],0],
        [2,"What can sustained datastore latency cause?",["Slow VM I/O and application response","More physical CPU cores","Faster DNS resolution","Automatic patching"],0],
        [2,"Why maintain consistent VLAN configuration across migration hosts?",["Preserve VM network connectivity after migration","Increase virtual disk size","Replace access control","Change the guest hostname"],0],
        [3,"What is a NUMA-aware placement concern?",["Keeping CPU and memory access local where possible","Choosing a DNS suffix","Formatting every disk as FAT","Using only one user account"],0],
        [3,"What is PCI passthrough?",["Directly assigning a physical device to a VM","Copying files over HTTP","Sharing one virtual disk with all users","Creating a VM snapshot"],0],
        [3,"What risk does a long snapshot chain introduce?",["Performance, capacity and consolidation complexity","Guaranteed data independence","Automatic offsite protection","Faster guest boot in every case"],0],
        [3,"What is nested virtualization?",["Running a hypervisor inside a virtual machine","Placing a VM in two folders","Using two virtual disks","Backing up a host twice"],0],
        [3,"Before planned host maintenance, what is the safest first action?",["Migrate or shut down workloads according to the maintenance plan","Power off shared storage immediately","Delete all VM logs","Disable cluster health checks"],0]
      ]
    },

    storage: {
      label: "Storage & Backup",
      aliases: ["storage", "backup", "backups", "san", "nas", "raid", "veeam", "iscsi", "nfs", "smb", "disaster recovery", "dr"],
      questions: [
        [1,"What does NAS primarily provide?",["File-level storage over a network","CPU virtualization","User authentication only","Source-code compilation"],0],
        [1,"What does SAN primarily provide to hosts?",["Block-level storage over a network","Email filtering","Web-page caching","DNS records"],0],
        [1,"What does RAID 1 use?",["Mirroring","Single parity only","No redundancy","Object replication over HTTP"],0],
        [1,"How many disk failures can RAID 6 normally tolerate?",["None","One","Two","Any number"],2],
        [1,"Which protocol commonly provides Linux/Unix network file shares?",["NFS","SMTP","BGP","RDP"],0],
        [1,"Which protocol commonly provides Windows-compatible network file shares?",["SMB","ICMP","NTP","SSH"],0],
        [1,"What does IOPS measure?",["Input/output operations per second","Internet routes per switch","Encrypted users per site","Images per source file"],0],
        [2,"What is the minimum number of disks normally required for RAID 5?",["Two","Three","Four","Five"],1],
        [2,"What does RAID 10 combine?",["Mirroring and striping","Two independent parity sets only","Tape and object storage","Compression and encryption"],0],
        [2,"What is a hot spare?",["An idle disk available for automatic rebuild","A faster CPU core","An offsite backup user","A read-only snapshot"],0],
        [2,"What does storage latency measure?",["Time to complete an I/O operation","Total usable capacity","Number of users","Backup retention days"],0],
        [2,"What does throughput measure?",["Amount of data transferred over time","The number of drive bays only","Password strength","Snapshot age"],0],
        [2,"What is deduplication?",["Eliminating duplicate data blocks or objects","Making two full copies of every file","Encrypting filenames","Deleting all old backups"],0],
        [2,"What does the 3-2-1 backup guideline recommend?",["Three copies, two media types, one offsite","Three passwords, two admins, one server","Three disks in every RAID","Three daily full backups only"],0],
        [2,"What is a storage snapshot?",["A point-in-time representation of data","A guaranteed offsite backup","A network firewall rule","A physical inventory label"],0],
        [3,"Why use an immutable backup copy?",["Prevent alteration or deletion during its retention period","Make restoration unnecessary","Replace access controls","Increase source disk speed"],0],
        [3,"What is a filesystem scrub designed to do?",["Detect and sometimes repair integrity problems","Create user accounts","Assign IP addresses","Compile drivers"],0],
        [3,"Why can thin provisioning create operational risk?",["Allocated logical capacity can exceed available physical capacity","It prevents snapshots","It requires one disk per user","It disables monitoring"],0],
        [3,"What should determine backup retention and frequency?",["Business recovery and compliance requirements","The color of the storage chassis","Only the number of administrators","A random default"],0],
        [3,"Why test recovery at application level instead of checking only restored files?",["Usable recovery requires application consistency and function","Files never contain data","Applications do not use storage","It eliminates RPO and RTO"],0]
      ]
    },

    programming: {
      label: "Programming & Web",
      aliases: ["programming", "developer", "development", "coding", "javascript", "python", "java", "c#", "c++", "web", "api", "html", "css", "software engineer"],
      questions: [
        [1,"What is a variable used for?",["Storing a value that code can reference","Assigning an IP route","Formatting a disk","Creating a backup schedule"],0],
        [1,"What is a function?",["A reusable block of behavior","A network cable","A database backup file","A user permission"],0],
        [1,"What does a conditional statement do?",["Chooses behavior based on a condition","Always repeats forever","Encrypts source code","Creates a VLAN"],0],
        [1,"What is a loop used for?",["Repeating an operation","Defining a DNS server","Storing one fixed password","Replacing tests"],0],
        [1,"What data format uses objects with key-value pairs and arrays and is common in APIs?",["JSON","PNG","MP3","PDF"],0],
        [1,"Which HTTP method normally retrieves a resource without changing it?",["GET","POST","DELETE","PATCH"],0],
        [1,"What does HTTP status 404 mean?",["Resource not found","Successful request","Server error","Authentication succeeded"],0],
        [2,"What is an API?",["An interface that allows software components to communicate","A disk partition","A physical firewall","A source-code font"],0],
        [2,"What is a unit test?",["A focused test of a small unit of behavior","A full data-center outage exercise","A user password policy","A network speed test only"],0],
        [2,"Why validate untrusted input?",["Reject malformed or unsafe data before use","Increase CPU clock speed","Replace authorization","Avoid writing tests"],0],
        [2,"What is exception handling used for?",["Managing error conditions in a controlled way","Assigning IP addresses","Encrypting every variable","Deleting logs"],0],
        [2,"What does a Git commit represent?",["A recorded set of repository changes","A running server process","A DNS lookup","A database lock"],0],
        [2,"Why create a source-control branch?",["Develop changes in an isolated line of work","Permanently delete history","Replace code review","Publish passwords"],0],
        [2,"What is a merge conflict?",["Competing changes that cannot be combined automatically","A failed DNS query","A full disk","A successful deployment"],0],
        [2,"What is code review intended to improve?",["Correctness, maintainability and shared understanding","Screen brightness","Network cabling","Backup compression only"],0],
        [3,"What does O(n) time mean?",["Work grows roughly in proportion to input size","Work is always zero","Work doubles every millisecond","The algorithm cannot finish"],0],
        [3,"Why keep configuration such as service endpoints outside source code?",["Allow safe environment-specific configuration","Make code impossible to test","Disable version control","Avoid all validation"],0],
        [3,"What is the safest way to build an HTML view from untrusted text?",["Use safe text insertion or context-aware encoding","Concatenate it directly into markup","Disable browser security","Store it in a URL fragment first"],0],
        [3,"What does semantic version 2.4.1 normally represent?",["Major 2, minor 4, patch 1","Year 2, month 4, day 1","Two servers, four users, one database","Build time only"],0],
        [3,"Why should automated tests be deterministic?",["The same conditions should produce the same outcome","They should fail randomly","They should depend on one developer's machine","They should skip assertions"],0]
      ]
    },

    support: {
      label: "IT Support",
      aliases: ["it support", "help desk", "helpdesk", "desktop support", "technical support", "troubleshooting", "service desk", "itil", "operations", "sysadmin", "administrator"],
      questions: [
        [1,"What should a technician establish first when receiving an incident?",["The symptoms, scope and impact","A final root cause without investigation","A replacement budget","A new user password"],0],
        [1,"Why reproduce a problem when safe to do so?",["Confirm symptoms and gather evidence","Make the impact larger","Avoid documenting it","Delete useful logs"],0],
        [1,"What should determine incident priority?",["Impact and urgency","Ticket age only","The user's job title only","A random number"],0],
        [1,"What is an SLA?",["An agreed service target","A disk format","A network protocol","A programming language"],0],
        [1,"Why document troubleshooting steps?",["Create a clear record and prevent repeated work","Hide the investigation","Replace user communication","Avoid escalation"],0],
        [1,"What is a workaround?",["A temporary way to restore or continue service","A proven permanent root-cause fix","A backup encryption key","A network address"],0],
        [1,"When should a ticket be escalated?",["When scope, risk, authority or expertise requires it","Only after deleting logs","Whenever the user asks a question","Never"],0],
        [2,"Why change one relevant variable at a time during diagnosis?",["Preserve cause-and-effect evidence","Make recovery slower","Avoid recording results","Guarantee every change succeeds"],0],
        [2,"A hostname fails but its IP address works. What is the likely area to investigate?",["Name resolution","Display settings","Disk encryption","Printer hardware"],0],
        [2,"Why collect logs before restarting a failing service?",["A restart may remove useful transient evidence","Logs always prevent restarts","The service cannot write logs","It increases network speed"],0],
        [2,"What should a change record include?",["Purpose, risk, validation and rollback plan","Only the implementer's name","A shared password","No timing information"],0],
        [2,"Why confirm user authorization before remote access?",["Protect privacy and establish consent","Improve disk performance","Change DNS automatically","Avoid creating a ticket"],0],
        [2,"What is the value of a knowledge base?",["Reusable, reviewed solutions and guidance","Replacing every specialist","Storing shared passwords","Avoiding all updates"],0],
        [2,"What is root-cause analysis intended to identify?",["The underlying reason an issue occurred","Only who reported the issue","The newest software version","A temporary workaround only"],0],
        [2,"Why verify service after applying a fix?",["Confirm restoration and detect side effects","Remove the need for notes","Reset incident priority","Disable monitoring"],0],
        [3,"A fix restores service but the issue repeatedly returns. What is the next best action?",["Open or continue problem investigation for the underlying cause","Close all related records permanently","Stop monitoring the service","Repeat unrecorded changes"],0],
        [3,"Why define monitoring thresholds from normal baselines?",["Reduce noise and detect meaningful deviation","Guarantee no false positives","Replace capacity planning","Avoid documenting alerts"],0],
        [3,"During a major incident, what should stakeholder updates contain?",["Known impact, actions, risks and next update time","Unverified blame","Private credentials","Only technical abbreviations"],0],
        [3,"What is the safest response when a requested fix exceeds your authority?",["Preserve evidence and escalate through the approved path","Proceed secretly","Use a shared administrator account","Delete the ticket"],0],
        [3,"After resolving a high-impact incident, what activity supports continual improvement?",["A blameless review with tracked actions","Deleting the incident timeline","Disabling alerts","Avoiding root-cause discussion"],0]
      ]
    }
  };

  return { topics: topics };
});
