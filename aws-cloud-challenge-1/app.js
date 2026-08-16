(() => {
  "use strict";

  const $ = (selector) => document.querySelector(selector);
  const screens = {
    welcome: $("#welcomeScreen"),
    lab: $("#labScreen"),
    result: $("#resultScreen")
  };

  const startForm = $("#startForm");
  const learnerNameInput = $("#learnerName");
  const nameError = $("#nameError");
  const terminalForm = $("#terminalForm");
  const commandInput = $("#commandInput");
  const terminalOutput = $("#terminalOutput");
  const terminalBody = $("#terminalBody");
  const timerElement = $("#timer");
  const scoreElement = $("#score");
  const progressText = $("#progressText");
  const progressBar = $("#progressBar");
  const certificateCanvas = $("#certificateCanvas");
  const instructorImage = $("#instructorImage");

  const taskElements = {
    evidence: $("#taskEvidence"),
    notify: $("#taskNotify"),
    detect: $("#taskDetect"),
    verify: $("#taskVerify")
  };

  const ACCOUNT_ID = "482193607715";
  const REGION = "us-east-1";
  const IAM_USER = "finance-ops";
  const SOURCE_IP = "198.51.100.84";
  const SECURITY_EMAIL = "security-team@rcwittraining.in";
  const TOPIC_ARN = `arn:aws:sns:${REGION}:${ACCOUNT_ID}:iam-security-alerts`;
  const CONFIRM_TOKEN = "LAB-CONFIRM-2026";

  const state = {
    learnerName: "",
    evidence: false,
    notify: false,
    detect: false,
    verify: false,
    topicCreated: false,
    subscriptionPending: false,
    subscriptionConfirmed: false,
    metricFilterCreated: false,
    alarmCreated: false,
    alertTriggered: false,
    emailDelivered: false,
    score: 0,
    commandHistory: [],
    historyIndex: 0,
    commandCount: 0,
    startedAt: 0,
    elapsedSeconds: 0,
    timerId: null,
    completed: false,
    certificateId: ""
  };

  function showScreen(name) {
    Object.values(screens).forEach((screen) => screen.classList.remove("is-active"));
    screens[name].classList.add("is-active");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function cleanName(value) {
    return value.replace(/\s+/g, " ").trim();
  }

  function isValidName(value) {
    return value.length >= 2 && /[\p{L}]/u.test(value) && /^[\p{L}\p{M} .'-]+$/u.test(value);
  }

  startForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = cleanName(learnerNameInput.value);
    if (!isValidName(name)) {
      learnerNameInput.setAttribute("aria-invalid", "true");
      nameError.textContent = "Enter a valid full name using letters, spaces, apostrophes, hyphens, or periods.";
      learnerNameInput.focus();
      return;
    }
    learnerNameInput.removeAttribute("aria-invalid");
    nameError.textContent = "";
    state.learnerName = name;
    beginChallenge();
  });

  learnerNameInput.addEventListener("input", () => {
    learnerNameInput.removeAttribute("aria-invalid");
    nameError.textContent = "";
  });

  function beginChallenge() {
    resetChallengeState();
    appendOutput("SEC-AWS-0816: Multiple IAM console password failures were followed by a successful sign-in from an unfamiliar source.\nScope: account 4821-9360-7715, us-east-1. Build a detection for three or more failures within five minutes and notify the security team by email.", "warning");
    showScreen("lab");
    startTimer();
    setTimeout(() => commandInput.focus(), 180);
  }

  function resetChallengeState() {
    clearInterval(state.timerId);
    state.evidence = false;
    state.notify = false;
    state.detect = false;
    state.verify = false;
    state.topicCreated = false;
    state.subscriptionPending = false;
    state.subscriptionConfirmed = false;
    state.metricFilterCreated = false;
    state.alarmCreated = false;
    state.alertTriggered = false;
    state.emailDelivered = false;
    state.score = 0;
    state.commandHistory = [];
    state.historyIndex = 0;
    state.commandCount = 0;
    state.startedAt = Date.now();
    state.elapsedSeconds = 0;
    state.completed = false;
    state.certificateId = "";
    terminalOutput.replaceChildren();
    commandInput.value = "";
    commandInput.disabled = false;
    timerElement.textContent = "00:00";
    updateProgress();
  }

  function startTimer() {
    clearInterval(state.timerId);
    state.startedAt = Date.now();
    state.timerId = window.setInterval(() => {
      state.elapsedSeconds = Math.floor((Date.now() - state.startedAt) / 1000);
      timerElement.textContent = formatDuration(state.elapsedSeconds);
    }, 250);
  }

  function formatDuration(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
    const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
    return `${minutes}:${seconds}`;
  }

  terminalForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (state.completed) return;
    const rawCommand = commandInput.value.trim();
    commandInput.value = "";
    if (!rawCommand) return;
    appendCommand(rawCommand);
    state.commandHistory.push(rawCommand);
    state.historyIndex = state.commandHistory.length;
    state.commandCount += 1;
    executeCommand(rawCommand);
    scrollTerminal();
  });

  commandInput.addEventListener("keydown", (event) => {
    if (event.key === "ArrowUp") {
      event.preventDefault();
      if (state.commandHistory.length) {
        state.historyIndex = Math.max(0, state.historyIndex - 1);
        commandInput.value = state.commandHistory[state.historyIndex] || "";
        requestAnimationFrame(() => commandInput.setSelectionRange(commandInput.value.length, commandInput.value.length));
      }
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (state.commandHistory.length) {
        state.historyIndex = Math.min(state.commandHistory.length, state.historyIndex + 1);
        commandInput.value = state.commandHistory[state.historyIndex] || "";
      }
    }
  });

  terminalBody.addEventListener("click", () => {
    if (!state.completed) commandInput.focus();
  });

  function tokenize(command) {
    const tokens = [];
    const matcher = /"([^"]*)"|'([^']*)'|([^\s]+)/g;
    let match;
    while ((match = matcher.exec(command)) !== null) tokens.push(match[1] ?? match[2] ?? match[3]);
    return tokens;
  }

  function executeCommand(rawCommand) {
    const tokens = tokenize(rawCommand);
    const command = (tokens.shift() || "").toLowerCase();
    const args = tokens;
    switch (command) {
      case "aws":
        handleAws(args, rawCommand);
        break;
      case "mailbox":
        handleMailbox(args);
        break;
      case "simulate-login-failures":
        handleSimulation(args, rawCommand);
        break;
      case "submit":
        handleSubmit(args);
        break;
      case "date":
        appendOutput("Sun Aug 16 09:27:18 IST 2026");
        break;
      case "whoami":
        appendOutput("cloudsec-analyst");
        break;
      case "pwd":
        appendOutput("/home/cloudsec");
        break;
      case "history":
        appendOutput(state.commandHistory.map((item, index) => `${String(index + 1).padStart(4, " ")}  ${item}`).join("\n"));
        break;
      case "clear":
        terminalOutput.replaceChildren();
        break;
      case "help":
        showHelp();
        break;
      case "man":
        handleMan(args[0]);
        break;
      case "echo":
        appendOutput(args.join(" "));
        break;
      case "":
        break;
      default:
        appendOutput(`bash: ${command}: command not found`, "error");
    }
  }

  function handleAws(args, rawCommand) {
    if (args.includes("--version") || args[0] === "--version") {
      appendOutput("aws-cli/2.27.41 Python/3.13.3 Linux/6.12 botocore/2.4.0");
      return;
    }
    const service = (args[0] || "").toLowerCase();
    const operation = (args[1] || "").toLowerCase();
    const query = rawCommand.toLowerCase();

    if (service === "sts" && operation === "get-caller-identity") {
      appendOutput(`{\n  "UserId": "AROARCWLAB:cloudsec-analyst",\n  "Account": "${ACCOUNT_ID}",\n  "Arn": "arn:aws:sts::${ACCOUNT_ID}:assumed-role/CloudSecurityLab/cloudsec-analyst"\n}`);
      return;
    }
    if (service === "configure" && operation === "get" && query.includes("region")) {
      appendOutput(REGION);
      return;
    }
    if (service === "cloudtrail") {
      handleCloudTrail(operation, query);
      return;
    }
    if (service === "iam") {
      handleIam(operation, query);
      return;
    }
    if (service === "sns") {
      handleSns(operation, query);
      return;
    }
    if (service === "logs") {
      handleLogs(operation, query);
      return;
    }
    if (service === "cloudwatch") {
      handleCloudWatch(operation, query);
      return;
    }
    appendOutput(`aws: error: argument service: Invalid choice '${service || "(missing)"}'. Type help for supported lab commands.`, "error");
  }

  function handleCloudTrail(operation, query) {
    if (operation === "lookup-events") {
      if (!query.includes("consolelogin")) {
        appendOutput("Tip: filter CloudTrail for EventName=ConsoleLogin to isolate console authentication activity.", "warning");
        return;
      }
      appendOutput(
        "EventTime             EventName     UserName      Result    SourceIPAddress  MFA\n" +
        "2026-08-16 03:56:12   ConsoleLogin  finance-ops   Failure   198.51.100.84    No\n" +
        "2026-08-16 03:56:49   ConsoleLogin  finance-ops   Failure   198.51.100.84    No\n" +
        "2026-08-16 03:57:31   ConsoleLogin  finance-ops   Failure   198.51.100.84    No\n" +
        "2026-08-16 03:58:06   ConsoleLogin  finance-ops   Failure   198.51.100.84    No\n" +
        "2026-08-16 03:59:18   ConsoleLogin  finance-ops   Failure   198.51.100.84    No\n" +
        "2026-08-16 04:00:03   ConsoleLogin  finance-ops   Success   198.51.100.84    No\n\n" +
        "Finding: five failed password attempts were followed by a successful non-MFA console login from the same unfamiliar address.",
        "info"
      );
      markObjective("evidence", 20, "✓ Objective 1 passed — CloudTrail identified finance-ops and the suspicious sign-in sequence. +20 points");
      return;
    }
    if (operation === "describe-trails") {
      appendOutput(`{\n  "trailList": [{\n    "Name": "management-events",\n    "S3BucketName": "rcw-lab-cloudtrail-${ACCOUNT_ID}",\n    "CloudWatchLogsLogGroupArn": "arn:aws:logs:${REGION}:${ACCOUNT_ID}:log-group:/aws/cloudtrail/management-events:*",\n    "IsMultiRegionTrail": true\n  }]\n}`);
      return;
    }
    if (operation === "get-trail-status") {
      appendOutput("{\n  \"IsLogging\": true,\n  \"LatestDeliveryTime\": \"2026-08-16T04:00:21Z\",\n  \"LatestCloudWatchLogsDeliveryTime\": \"2026-08-16T04:00:24Z\"\n}");
      return;
    }
    appendOutput(`aws cloudtrail: unsupported lab operation '${operation || "(missing)"}'`, "error");
  }

  function handleIam(operation, query) {
    if (operation === "get-user" && query.includes(IAM_USER)) {
      appendOutput(`{\n  "User": {\n    "Path": "/operations/",\n    "UserName": "${IAM_USER}",\n    "UserId": "AIDARCWFINANCEOPS",\n    "Arn": "arn:aws:iam::${ACCOUNT_ID}:user/operations/${IAM_USER}",\n    "CreateDate": "2025-11-03T09:14:00Z",\n    "PasswordLastUsed": "2026-08-16T04:00:03Z"\n  }\n}`);
      return;
    }
    if (operation === "list-users") {
      appendOutput("cloudsec-analyst\nfinance-ops\nread-only-auditor");
      return;
    }
    appendOutput(`aws iam: no matching simulated resource for '${operation}'`, "error");
  }

  function handleSns(operation, query) {
    if (operation === "create-topic") {
      if (!query.includes("iam-security-alerts")) {
        appendOutput("Create the approved topic with --name iam-security-alerts.", "warning");
        return;
      }
      state.topicCreated = true;
      appendOutput(`{\n  "TopicArn": "${TOPIC_ARN}"\n}`);
      return;
    }
    if (operation === "list-topics") {
      appendOutput(state.topicCreated ? `{\n  "Topics": [{"TopicArn": "${TOPIC_ARN}"}]\n}` : "{\n  \"Topics\": []\n}");
      return;
    }
    if (operation === "subscribe") {
      if (!state.topicCreated) {
        appendOutput("NotFound: create the iam-security-alerts topic before adding a subscription.", "error");
        return;
      }
      if (!query.includes("email") || !query.includes(SECURITY_EMAIL)) {
        appendOutput(`Use --protocol email --notification-endpoint ${SECURITY_EMAIL}.`, "warning");
        return;
      }
      state.subscriptionPending = true;
      appendOutput("{\n  \"SubscriptionArn\": \"pending confirmation\"\n}\nA confirmation message was placed in the simulated security-team mailbox. Use: mailbox security-team@rcwittraining.in", "info");
      return;
    }
    if (operation === "confirm-subscription") {
      if (!state.subscriptionPending) {
        appendOutput("No pending SNS email subscription was found.", "error");
        return;
      }
      if (!query.includes(CONFIRM_TOKEN.toLowerCase())) {
        appendOutput(`Invalid confirmation token. Inspect the simulated mailbox for the training token.`, "error");
        return;
      }
      state.subscriptionConfirmed = true;
      appendOutput(`{\n  "SubscriptionArn": "${TOPIC_ARN}:9e55b18c-rcw-lab"\n}`);
      markObjective("notify", 25, "✓ Objective 2 passed — the SNS topic and security-team email subscription are confirmed. +25 points");
      return;
    }
    if (operation === "list-subscriptions-by-topic") {
      if (!state.subscriptionPending) {
        appendOutput("{\n  \"Subscriptions\": []\n}");
      } else {
        const arn = state.subscriptionConfirmed ? `${TOPIC_ARN}:9e55b18c-rcw-lab` : "PendingConfirmation";
        appendOutput(`{\n  "Subscriptions": [{\n    "SubscriptionArn": "${arn}",\n    "Owner": "${ACCOUNT_ID}",\n    "Protocol": "email",\n    "Endpoint": "${SECURITY_EMAIL}",\n    "TopicArn": "${TOPIC_ARN}"\n  }]\n}`);
      }
      return;
    }
    if (operation === "publish") {
      if (!state.subscriptionConfirmed) {
        appendOutput("InvalidParameter: the email subscription is not confirmed.", "error");
        return;
      }
      appendOutput("{\n  \"MessageId\": \"test-7f2a-rcw-security\"\n}\nTest notification accepted. Incident completion still requires the failed-login alarm to trigger.", "info");
      return;
    }
    appendOutput(`aws sns: unsupported lab operation '${operation || "(missing)"}'`, "error");
  }

  function handleLogs(operation, query) {
    if (operation === "describe-log-groups") {
      appendOutput(`{\n  "logGroups": [{\n    "logGroupName": "/aws/cloudtrail/management-events",\n    "metricFilterCount": ${state.metricFilterCreated ? 1 : 0},\n    "storedBytes": 184320\n  }]\n}`);
      return;
    }
    if (operation === "put-metric-filter") {
      const valid = query.includes("/aws/cloudtrail/management-events") && query.includes("consolelogin") && (query.includes("failed authentication") || query.includes("errormessage")) && query.includes("failedconsolelogin");
      if (!valid) {
        appendOutput("Metric filter incomplete. Match ConsoleLogin failures in /aws/cloudtrail/management-events and publish FailedConsoleLoginCount in RCW/Security.", "warning");
        return;
      }
      state.metricFilterCreated = true;
      appendOutput("Metric filter FailedConsoleLogins created.\nPattern: { ($.eventName = \"ConsoleLogin\") && ($.errorMessage = \"Failed authentication\") }\nTransformation: RCW/Security / FailedConsoleLoginCount = 1", "success");
      maybeCompleteDetection();
      return;
    }
    if (operation === "describe-metric-filters") {
      appendOutput(state.metricFilterCreated
        ? "{\n  \"metricFilters\": [{\n    \"filterName\": \"FailedConsoleLogins\",\n    \"filterPattern\": \"{ ($.eventName = \\\"ConsoleLogin\\\") && ($.errorMessage = \\\"Failed authentication\\\") }\",\n    \"metricTransformations\": [{\"metricName\":\"FailedConsoleLoginCount\",\"metricNamespace\":\"RCW/Security\",\"metricValue\":\"1\"}]\n  }]\n}"
        : "{\n  \"metricFilters\": []\n}");
      return;
    }
    if (operation === "test-metric-filter") {
      appendOutput("{\n  \"matches\": [{\"eventNumber\":1,\"eventMessage\":\"ConsoleLogin Failed authentication\",\"extractedValues\":{}}]\n}");
      return;
    }
    appendOutput(`aws logs: unsupported lab operation '${operation || "(missing)"}'`, "error");
  }

  function handleCloudWatch(operation, query) {
    if (operation === "put-metric-alarm") {
      if (!state.topicCreated) {
        appendOutput("Configure the SNS topic before assigning an alarm action.", "error");
        return;
      }
      const valid = query.includes("multiplefailedconsolelogins") && query.includes("failedconsolelogincount") && query.includes("rcw/security") && query.includes("threshold 3") && query.includes("period 300") && query.includes("greaterthanorequaltothreshold") && query.includes("iam-security-alerts");
      if (!valid) {
        appendOutput("Alarm incomplete. Use FailedConsoleLoginCount in RCW/Security, Sum over 300 seconds, threshold 3, GreaterThanOrEqualToThreshold, and the SNS topic action.", "warning");
        return;
      }
      state.alarmCreated = true;
      appendOutput(`Alarm MultipleFailedConsoleLogins created.\nCondition: Sum >= 3 during 300 seconds\nAction: ${TOPIC_ARN}`, "success");
      maybeCompleteDetection();
      return;
    }
    if (operation === "describe-alarms") {
      if (!state.alarmCreated) {
        appendOutput("{\n  \"MetricAlarms\": []\n}");
        return;
      }
      const alarmState = state.alertTriggered ? "ALARM" : "INSUFFICIENT_DATA";
      const reason = state.alertTriggered ? "Threshold Crossed: 5 datapoints were greater than or equal to 3." : "Unchecked: waiting for failed-login metric data.";
      appendOutput(`{\n  "MetricAlarms": [{\n    "AlarmName": "MultipleFailedConsoleLogins",\n    "AlarmArn": "arn:aws:cloudwatch:${REGION}:${ACCOUNT_ID}:alarm:MultipleFailedConsoleLogins",\n    "StateValue": "${alarmState}",\n    "StateReason": "${reason}",\n    "MetricName": "FailedConsoleLoginCount",\n    "Namespace": "RCW/Security",\n    "Statistic": "Sum",\n    "Period": 300,\n    "Threshold": 3,\n    "AlarmActions": ["${TOPIC_ARN}"]\n  }]\n}`);
      return;
    }
    if (operation === "describe-alarm-history") {
      appendOutput(state.alertTriggered
        ? "2026-08-16T04:14:05Z  StateUpdate  INSUFFICIENT_DATA -> ALARM  Threshold Crossed: 5 >= 3; SNS action executed"
        : "No alarm state transition has occurred yet.");
      return;
    }
    if (operation === "set-alarm-state") {
      appendOutput("Manual alarm-state changes are disabled. Trigger the detector with simulated failed login events.", "error");
      return;
    }
    appendOutput(`aws cloudwatch: unsupported lab operation '${operation || "(missing)"}'`, "error");
  }

  function maybeCompleteDetection() {
    if (state.metricFilterCreated && state.alarmCreated) {
      markObjective("detect", 35, "✓ Objective 3 passed — the failed-login metric and three-attempt CloudWatch alarm are active. +35 points");
    }
  }

  function handleMailbox(args) {
    const address = args.join(" ").toLowerCase();
    if (!address.includes(SECURITY_EMAIL)) {
      appendOutput(`Mailbox unavailable. The approved simulated destination is ${SECURITY_EMAIL}.`, "error");
      return;
    }
    if (!state.subscriptionPending) {
      appendOutput("Inbox is empty. Subscribe this address to the SNS topic first.");
      return;
    }
    let output = `SIMULATED MAILBOX — ${SECURITY_EMAIL}\n\n[1] AWS Notification — Confirm subscription\n    Topic: ${TOPIC_ARN}\n    Confirmation token: ${CONFIRM_TOKEN}`;
    if (state.alertTriggered && state.subscriptionConfirmed) {
      output += `\n\n[2] ALARM: MultipleFailedConsoleLogins\n    Account: 4821-9360-7715\n    IAM user: ${IAM_USER}\n    Source IP: ${SOURCE_IP}\n    Failed attempts: 5 within 5 minutes\n    Alarm state: ALARM\n    Action required: disable credentials, revoke sessions, investigate the successful sign-in.`;
      state.emailDelivered = true;
    }
    appendOutput(output, state.emailDelivered ? "success" : "info");
  }

  function handleSimulation(args, rawCommand) {
    const query = rawCommand.toLowerCase();
    const countMatch = query.match(/--count\s+(\d+)/);
    const count = countMatch ? Number(countMatch[1]) : 0;
    if (!state.detect || !state.subscriptionConfirmed) {
      appendOutput("Replay blocked: complete the confirmed SNS destination, metric filter, and alarm first.", "warning");
      return;
    }
    if (!query.includes(`--user-name ${IAM_USER}`) || count < 3) {
      appendOutput(`Usage: simulate-login-failures --user-name ${IAM_USER} --count 5`, "error");
      return;
    }
    state.alertTriggered = true;
    appendOutput(`Publishing ${count} authorised ConsoleLogin failure events for ${IAM_USER}...\nFailedConsoleLoginCount Sum = ${count}\nAlarm MultipleFailedConsoleLogins: INSUFFICIENT_DATA -> ALARM\nSNS action executed: ${TOPIC_ARN}\nEmail delivery accepted for ${SECURITY_EMAIL}`, "success");
  }

  function handleSubmit(args) {
    const answer = args.join(" ").trim().toLowerCase();
    if (!answer) {
      appendOutput(`Usage: submit ${IAM_USER} ${SOURCE_IP} ${SECURITY_EMAIL}`, "error");
      return;
    }
    if (!state.evidence || !state.notify || !state.detect) {
      appendOutput("Submission held: complete the investigation, notification destination, and detector first.", "warning");
      return;
    }
    if (!state.alertTriggered) {
      appendOutput(`Trigger the approved replay first: simulate-login-failures --user-name ${IAM_USER} --count 5`, "warning");
      return;
    }
    if (!state.emailDelivered) {
      appendOutput(`Verify delivery in the simulated mailbox: mailbox ${SECURITY_EMAIL}`, "warning");
      return;
    }
    const valid = answer.includes(IAM_USER) && answer.includes(SOURCE_IP) && answer.includes(SECURITY_EMAIL);
    if (!valid) {
      appendOutput(`Finding not accepted. Include the affected IAM user, unfamiliar source IP, and security-team email destination.`, "error");
      return;
    }
    appendOutput(`Finding accepted.\nCompromised identity: ${IAM_USER}\nEvidence: five password failures followed by a successful non-MFA ConsoleLogin from ${SOURCE_IP}\nDetection: FailedConsoleLoginCount Sum >= 3 in 300 seconds\nNotification: delivered through iam-security-alerts to ${SECURITY_EMAIL}\nRecommended response: disable console access, revoke active sessions, rotate credentials, require MFA, and review subsequent CloudTrail activity.`, "success");
    markObjective("verify", 20, "✓ Objective 4 passed — the alarm triggered and the security notification was verified. +20 points");
    appendOutput("Challenge complete. Final score: 100/100", "info");
    completeChallenge();
  }

  function showHelp() {
    appendOutput(
      "AWS IAM security commands:\n" +
      "  aws sts get-caller-identity\n" +
      "  aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventName,AttributeValue=ConsoleLogin\n" +
      "  aws sns create-topic --name iam-security-alerts\n" +
      `  aws sns subscribe --topic-arn ${TOPIC_ARN} --protocol email --notification-endpoint ${SECURITY_EMAIL}\n` +
      `  mailbox ${SECURITY_EMAIL}\n` +
      `  aws sns confirm-subscription --topic-arn ${TOPIC_ARN} --token ${CONFIRM_TOKEN}\n` +
      "  aws logs put-metric-filter --log-group-name /aws/cloudtrail/management-events --filter-name FailedConsoleLogins --filter-pattern '{ ($.eventName = \"ConsoleLogin\") && ($.errorMessage = \"Failed authentication\") }' --metric-transformations metricName=FailedConsoleLoginCount,metricNamespace=RCW/Security,metricValue=1\n" +
      `  aws cloudwatch put-metric-alarm --alarm-name MultipleFailedConsoleLogins --metric-name FailedConsoleLoginCount --namespace RCW/Security --statistic Sum --period 300 --threshold 3 --comparison-operator GreaterThanOrEqualToThreshold --evaluation-periods 1 --alarm-actions ${TOPIC_ARN}\n` +
      `  simulate-login-failures --user-name ${IAM_USER} --count 5\n` +
      "  aws cloudwatch describe-alarms --alarm-names MultipleFailedConsoleLogins\n" +
      `  submit ${IAM_USER} ${SOURCE_IP} ${SECURITY_EMAIL}\n` +
      "  history | clear | help",
      "info"
    );
  }

  function handleMan(topic = "") {
    const pages = {
      cloudtrail: "CLOUDTRAIL\nRecords AWS API and console activity. ConsoleLogin events include identity, sourceIPAddress, responseElements, errorMessage, and MFA usage.",
      sns: "SNS\nAmazon Simple Notification Service topics fan out notifications to confirmed subscriptions, including email endpoints.",
      cloudwatch: "CLOUDWATCH\nMetric filters turn matching CloudWatch Logs events into metrics. Alarms evaluate metrics and invoke configured actions such as SNS topics.",
      mailbox: `MAILBOX\nOpens the browser-local training inbox for ${SECURITY_EMAIL}. No real email is sent.`,
      submit: `SUBMIT\nValidates the final finding.\nUsage: submit ${IAM_USER} ${SOURCE_IP} ${SECURITY_EMAIL}`
    };
    appendOutput(pages[topic] || (topic ? `No manual entry for ${topic}` : "What manual page do you want?"), pages[topic] ? "info" : "error");
  }

  function markObjective(key, points, message) {
    if (state[key]) return;
    state[key] = true;
    state.score += points;
    appendOutput(message, "success");
    updateProgress();
    showToast(message.replace(/^[^—]+—\s*/, "").replace(/\s*\+\d+ points$/, ""));
  }

  function appendCommand(command) {
    const line = document.createElement("div");
    line.className = "output-entry output-command";
    const user = document.createElement("span");
    user.className = "prompt-user";
    user.textContent = "cloudsec@aws-lab";
    const path = document.createElement("span");
    path.className = "prompt-path";
    path.textContent = ":~$";
    line.append(user, path, document.createTextNode(` ${command}`));
    terminalOutput.append(line);
  }

  function appendOutput(text, type = "") {
    if (text === "") return;
    const line = document.createElement("div");
    line.className = `output-entry output-text ${type}`.trim();
    line.textContent = text;
    terminalOutput.append(line);
  }

  function scrollTerminal() {
    requestAnimationFrame(() => {
      terminalBody.scrollTop = terminalBody.scrollHeight;
    });
  }

  function updateProgress() {
    const completedCount = [state.evidence, state.notify, state.detect, state.verify].filter(Boolean).length;
    scoreElement.textContent = String(state.score);
    progressText.textContent = `${completedCount} of 4 complete`;
    progressBar.style.width = `${completedCount * 25}%`;
    Object.entries(taskElements).forEach(([key, element]) => element.classList.toggle("is-complete", state[key]));
  }

  function completeChallenge() {
    if (state.completed || !state.verify) return;
    state.completed = true;
    state.score = 100;
    state.elapsedSeconds = Math.max(1, Math.floor((Date.now() - state.startedAt) / 1000));
    clearInterval(state.timerId);
    timerElement.textContent = formatDuration(state.elapsedSeconds);
    commandInput.disabled = true;
    state.certificateId = makeCertificateId(state.learnerName);
    window.setTimeout(() => {
      $("#resultName").textContent = state.learnerName;
      $("#finalTime").textContent = formatDuration(state.elapsedSeconds);
      $("#commandCount").textContent = String(state.commandCount);
      showScreen("result");
      renderCertificate();
      showToast("Perfect score — your certificate is ready.");
    }, 1000);
  }

  $("#resetButton").addEventListener("click", () => {
    resetChallengeState();
    appendOutput("Cloud security challenge reset. Begin with CloudTrail ConsoleLogin evidence.", "info");
    startTimer();
    commandInput.focus();
  });

  $("#replayButton").addEventListener("click", beginChallenge);

  $("#fullscreenButton").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        showToast("Focus mode enabled.");
      } else await document.exitFullscreen();
    } catch {
      showToast("Focus mode is not available in this browser.");
    }
  });

  function showToast(message) {
    const toast = $("#toast");
    toast.querySelector("p").textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(showToast.timeoutId);
    showToast.timeoutId = setTimeout(() => toast.classList.remove("is-visible"), 2800);
  }

  function makeCertificateId(name) {
    const now = new Date();
    const datePart = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("");
    let hash = 2166136261;
    const source = `${name}|${now.toISOString()}|${state.elapsedSeconds}|aws-iam-alert`;
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `RCW-AWS-IAM-${datePart}-${(hash >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(-7)}`;
  }

  function renderCertificate() {
    const canvas = certificateCanvas;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f4f0e6";
    ctx.fillRect(0, 0, W, H);

    // Soft paper texture.
    ctx.save();
    ctx.globalAlpha = 0.035;
    ctx.fillStyle = "#0b2b4c";
    for (let y = 0; y < H; y += 18) {
      for (let x = (y / 18) % 2 ? 9 : 0; x < W; x += 18) ctx.fillRect(x, y, 1.5, 1.5);
    }
    ctx.restore();

    // Deep-blue architectural border.
    ctx.strokeStyle = "#08233f";
    ctx.lineWidth = 22;
    ctx.strokeRect(26, 26, W - 52, H - 52);
    ctx.strokeStyle = "#ff9900";
    ctx.lineWidth = 3;
    ctx.strokeRect(48, 48, W - 96, H - 96);
    ctx.strokeStyle = "#c8a847";
    ctx.lineWidth = 2;
    ctx.strokeRect(62, 62, W - 124, H - 124);

    // Branded top band and corner geometry.
    ctx.fillStyle = "#08233f";
    ctx.fillRect(64, 64, W - 128, 130);
    ctx.fillStyle = "#ff9900";
    ctx.fillRect(64, 188, W - 128, 6);
    ctx.beginPath();
    ctx.moveTo(64, 194);
    ctx.lineTo(240, 194);
    ctx.lineTo(64, 365);
    ctx.closePath();
    ctx.fillStyle = "rgba(11,168,238,.08)";
    ctx.fill();

    // RCW terminal emblem.
    roundedRect(ctx, 98, 91, 74, 74, 16);
    ctx.fillStyle = "#ff9900";
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "800 24px ui-monospace, monospace";
    ctx.textAlign = "center";
    ctx.fillText(">_", 135, 139);

    ctx.textAlign = "left";
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 30px Arial, sans-serif";
    ctx.fillText("RCW", 195, 126);
    ctx.fillStyle = "#ffb84d";
    ctx.font = "800 13px Arial, sans-serif";
    ctx.letterSpacing = "3px";
    ctx.fillText("IT TRAINING", 196, 151);
    ctx.letterSpacing = "0px";

    ctx.textAlign = "right";
    ctx.fillStyle = "#86a7bd";
    ctx.font = "600 14px Arial, sans-serif";
    ctx.fillText("LEARN  •  PRACTICE  •  MASTER  •  ACHIEVE", W - 101, 130);
    ctx.fillStyle = "#c9e9f6";
    ctx.font = "500 12px Arial, sans-serif";
    ctx.fillText("www.rcwittraining.in", W - 101, 154);

    ctx.textAlign = "center";
    ctx.fillStyle = "#ff9900";
    ctx.font = "800 15px Arial, sans-serif";
    ctx.fillText("CERTIFICATE OF ACHIEVEMENT", W / 2, 266);
    ctx.fillStyle = "#08233f";
    setFittedFont(ctx, "AWS Cloud Challenge Champion", 1000, 61, 42, "700", "Georgia, serif");
    ctx.fillText("AWS Cloud Challenge Champion", W / 2, 336);

    ctx.fillStyle = "#6c7c86";
    ctx.font = "400 19px Georgia, serif";
    ctx.fillText("This certificate is proudly presented to", W / 2, 391);

    ctx.fillStyle = "#092b4c";
    setFittedFont(ctx, state.learnerName, 830, 57, 34, "700", "Georgia, serif");
    ctx.fillText(state.learnerName, W / 2, 468);
    const nameWidth = Math.min(830, ctx.measureText(state.learnerName).width + 90);
    const gradient = ctx.createLinearGradient(W / 2 - nameWidth / 2, 0, W / 2 + nameWidth / 2, 0);
    gradient.addColorStop(0, "rgba(11,168,238,0)");
    gradient.addColorStop(.5, "#ff9900");
    gradient.addColorStop(1, "rgba(11,168,238,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(W / 2 - nameWidth / 2, 489, nameWidth, 2);

    ctx.fillStyle = "#4f6472";
    ctx.font = "400 18px Arial, sans-serif";
    ctx.fillText("for successfully completing the RCW AWS IAM compromise alert challenge", W / 2, 543);
    ctx.fillText("by detecting repeated failed sign-ins and notifying the security team.", W / 2, 574);

    // Achievement badge.
    const badgeX = 206;
    const badgeY = 706;
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 76, 0, Math.PI * 2);
    ctx.fillStyle = "#08233f";
    ctx.fill();
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, 64, 0, Math.PI * 2);
    ctx.strokeStyle = "#c8a847";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.font = "800 34px Arial, sans-serif";
    ctx.fillText("100", badgeX, badgeY + 1);
    ctx.fillStyle = "#ffb84d";
    ctx.font = "800 12px Arial, sans-serif";
    ctx.fillText("/ 100", badgeX, badgeY + 25);
    ctx.fillStyle = "#6a7d88";
    ctx.font = "800 11px Arial, sans-serif";
    ctx.fillText("FINAL SCORE", badgeX, badgeY + 102);

    // Issue details.
    ctx.textAlign = "left";
    drawMeta(ctx, 350, 676, "ISSUED ON", formatCertificateDate(new Date()));
    drawMeta(ctx, 350, 754, "CERTIFICATE ID", state.certificateId);
    drawMeta(ctx, 660, 676, "CHALLENGE", "IAM compromise notification");
    drawMeta(ctx, 660, 754, "STATUS", "All cloud-security objectives passed");

    // Instructor portrait and signature.
    const photoX = 1140;
    const photoY = 685;
    ctx.save();
    ctx.beginPath();
    ctx.arc(photoX, photoY, 82, 0, Math.PI * 2);
    ctx.clip();
    ctx.fillStyle = "#0c2e50";
    ctx.fillRect(photoX - 84, photoY - 84, 168, 168);
    if (instructorImage.complete && instructorImage.naturalWidth) {
      drawImageCover(ctx, instructorImage, photoX - 82, photoY - 82, 164, 164, 0.5, 0.25);
    }
    ctx.restore();
    ctx.beginPath();
    ctx.arc(photoX, photoY, 86, 0, Math.PI * 2);
    ctx.strokeStyle = "#c8a847";
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(photoX, photoY, 94, 0, Math.PI * 2);
    ctx.strokeStyle = "rgba(8,35,63,.22)";
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = "center";
    ctx.fillStyle = "#092b4c";
    ctx.font = "italic 700 36px Georgia, serif";
    ctx.fillText("Pradeep Raju", photoX, 822);
    ctx.strokeStyle = "#ff9900";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(photoX - 112, 837);
    ctx.bezierCurveTo(photoX - 50, 826, photoX + 35, 849, photoX + 112, 834);
    ctx.stroke();
    ctx.fillStyle = "#6a7d88";
    ctx.font = "800 10px Arial, sans-serif";
    ctx.fillText("PRADEEP RAJU  •  RCW IT TRAINING", photoX, 861);

    // Bottom verification line.
    ctx.fillStyle = "#e3ddd0";
    ctx.fillRect(92, 895, W - 184, 1);
    ctx.textAlign = "left";
    ctx.fillStyle = "#778994";
    ctx.font = "500 10px Arial, sans-serif";
    ctx.fillText("RCW IT Training certifies the successful completion recorded above.", 98, 921);
    ctx.textAlign = "right";
    ctx.fillText("AWS Security · Cloud Challenge 01", W - 98, 921);
  }

  function roundedRect(ctx, x, y, width, height, radius) {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
  }

  function setFittedFont(ctx, text, maxWidth, startSize, minSize, weight, family) {
    let size = startSize;
    do {
      ctx.font = `${weight} ${size}px ${family}`;
      size -= 1;
    } while (ctx.measureText(text).width > maxWidth && size >= minSize);
  }

  function drawMeta(ctx, x, y, label, value) {
    ctx.fillStyle = "#81909a";
    ctx.font = "800 10px Arial, sans-serif";
    ctx.fillText(label, x, y);
    ctx.fillStyle = "#173c57";
    ctx.font = "700 15px Arial, sans-serif";
    ctx.fillText(value, x, y + 23);
  }

  function formatCertificateDate(date) {
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  }

  function drawImageCover(ctx, image, x, y, width, height, focusX = 0.5, focusY = 0.5) {
    const imageRatio = image.naturalWidth / image.naturalHeight;
    const targetRatio = width / height;
    let sourceWidth = image.naturalWidth;
    let sourceHeight = image.naturalHeight;
    let sourceX = 0;
    let sourceY = 0;

    if (imageRatio > targetRatio) {
      sourceWidth = image.naturalHeight * targetRatio;
      sourceX = (image.naturalWidth - sourceWidth) * focusX;
    } else {
      sourceHeight = image.naturalWidth / targetRatio;
      sourceY = (image.naturalHeight - sourceHeight) * focusY;
    }
    ctx.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  }

  instructorImage.addEventListener("load", () => {
    if (state.completed) renderCertificate();
  });

  $("#downloadPngButton").addEventListener("click", () => {
    if (!state.completed) return;
    renderCertificate();
    certificateCanvas.toBlob((blob) => {
      if (!blob) return;
      downloadBlob(blob, certificateFilename("png"));
      showToast("Certificate image downloaded.");
    }, "image/png");
  });

  $("#downloadPdfButton").addEventListener("click", () => {
    if (!state.completed) return;
    renderCertificate();
    certificateCanvas.toBlob(async (blob) => {
      if (!blob) {
        showToast("Could not prepare the PDF. Please try again.");
        return;
      }
      const jpegBytes = new Uint8Array(await blob.arrayBuffer());
      const pdfBytes = buildPdfFromJpeg(jpegBytes, certificateCanvas.width, certificateCanvas.height);
      downloadBlob(new Blob([pdfBytes], { type: "application/pdf" }), certificateFilename("pdf"));
      showToast("Certificate PDF downloaded.");
    }, "image/jpeg", 0.96);
  });

  function certificateFilename(extension) {
    const safeName = state.learnerName.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "learner";
    return `rcw-aws-cloud-challenge-1-${safeName}.${extension}`;
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function buildPdfFromJpeg(jpegBytes, imageWidth, imageHeight) {
    const encoder = new TextEncoder();
    const chunks = [];
    const offsets = [0];
    let length = 0;

    const push = (value) => {
      const bytes = typeof value === "string" ? encoder.encode(value) : value;
      chunks.push(bytes);
      length += bytes.length;
    };

    const addObject = (number, header, streamBytes = null) => {
      offsets[number] = length;
      push(`${number} 0 obj\n${header}`);
      if (streamBytes) {
        push("\nstream\n");
        push(streamBytes);
        push("\nendstream");
      }
      push("\nendobj\n");
    };

    push(new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0x0a, 0x25, 0xe2, 0xe3, 0xcf, 0xd3, 0x0a]));
    addObject(1, "<< /Type /Catalog /Pages 2 0 R >>");
    addObject(2, "<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    addObject(3, "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>");

    const content = encoder.encode("q\n842 0 0 595 0 0 cm\n/Im0 Do\nQ\n");
    addObject(4, `<< /Length ${content.length} >>`, content);
    addObject(5, `<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>`, jpegBytes);

    const xrefOffset = length;
    push("xref\n0 6\n");
    push("0000000000 65535 f \n");
    for (let index = 1; index <= 5; index += 1) {
      push(`${String(offsets[index]).padStart(10, "0")} 00000 n \n`);
    }
    push(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);

    const output = new Uint8Array(length);
    let position = 0;
    chunks.forEach((chunk) => {
      output.set(chunk, position);
      position += chunk.length;
    });
    return output;
  }
})();
