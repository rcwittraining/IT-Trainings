"use strict";

const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { JSDOM } = require("jsdom");
const { createCanvas } = require("@napi-rs/canvas");

const ROOT = path.resolve(__dirname, "..");
const SCENARIOS = {
  "rhcsa-storage-build": [
    "lsblk -f",
    "parted -s /dev/sdc mklabel gpt",
    "parted -s /dev/sdc mkpart primary 1MiB 8193MiB",
    "pvcreate /dev/sdc1",
    "vgcreate vg_exam /dev/sdc1",
    "lvcreate -n lv_reports -L 4G vg_exam",
    "mkfs.xfs /dev/vg_exam/lv_reports",
    "mkdir -p /reports"
  ],
  "rhcsa-system-operations": [
    "systemctl get-default",
    "journalctl -b -p err",
    "systemctl isolate rescue.target",
    "systemctl isolate multi-user.target",
    "systemctl set-default multi-user.target"
  ],
  "rhcsa-network-selinux": [
    "nmcli device status",
    "getenforce",
    "nmcli con mod ens160 ipv4.method manual",
    "nmcli con mod ens160 ipv4.addresses 192.0.2.50/24",
    "nmcli con mod ens160 ipv4.gateway 192.0.2.1",
    "nmcli con mod ens160 ipv4.dns 192.0.2.53",
    "nmcli con up ens160",
    "hostnamectl set-hostname server1.example.com"
  ]
};

function makeDom(slug) {
  const html = fs.readFileSync(path.join(ROOT, slug, "index.html"), "utf8");
  const dom = new JSDOM(html, { runScripts: "outside-only", url: `https://www.rcwittraining.in/${slug}/`, pretendToBeVisual: true });
  const { window } = dom;
  const nativeCanvases = new WeakMap();
  function nativeCanvas(element) {
    if (!nativeCanvases.has(element)) nativeCanvases.set(element, createCanvas(element.width || 300, element.height || 150));
    return nativeCanvases.get(element);
  }
  window.HTMLCanvasElement.prototype.getContext = function getContext(type) { return nativeCanvas(this).getContext(type); };
  window.HTMLCanvasElement.prototype.toDataURL = function toDataURL(type, quality) { return nativeCanvas(this).toDataURL(type, quality); };
  window.scrollTo = () => {};
  window.alert = (message) => { throw new Error(`Unexpected alert: ${message}`); };
  window.confirm = () => true;
  window.Image = class TestImage { set src(_) { setTimeout(() => this.onerror && this.onerror(new Error("portrait fallback")), 0); } };
  if (!window.HTMLDialogElement.prototype.showModal) window.HTMLDialogElement.prototype.showModal = function showModal() { this.setAttribute("open", ""); };
  if (!window.HTMLDialogElement.prototype.close) window.HTMLDialogElement.prototype.close = function close() { this.removeAttribute("open"); };
  let lastBlob = null;
  window.URL.createObjectURL = (blob) => { lastBlob = blob; return "blob:test-certificate"; };
  window.URL.revokeObjectURL = () => {};
  window.HTMLAnchorElement.prototype.click = function click() { this.dataset.clicked = "true"; };
  window.RCWPassport = { record: (entry) => { window.__passportEntry = entry; } };
  window.__RCW_ENABLE_TEST__ = true;
  window.eval(fs.readFileSync(path.join(ROOT, slug, "config.js"), "utf8"));
  window.eval(fs.readFileSync(path.join(ROOT, "rhcsa-challenge-engine.js"), "utf8"));
  return { dom, window, getLastBlob: () => lastBlob };
}

function start(window) {
  window.document.querySelector("#learnerName").value = "RCW Test Learner";
  window.document.querySelector("#startLab").click();
  assert(window.document.querySelector("#lab").classList.contains("active"), "lab should start");
}

function execute(window, commands) {
  commands.forEach((command) => window.__RCW_RHCSA_TEST__.run(command));
}

async function storageTest() {
  const env = makeDom("rhcsa-storage-build"), { window } = env;
  start(window);
  execute(window, SCENARIOS["rhcsa-storage-build"]);
  const base = window.__RCW_RHCSA_TEST__.getState().files["/etc/fstab"];
  window.__RCW_RHCSA_TEST__.setFile("/etc/fstab", `${base}UUID=RCW-REPORTS  /reports  xfs  defaults  0 0\n`);
  execute(window, ["mount -a", "lvcreate -n lv_swap -L 1G vg_exam", "mkswap /dev/vg_exam/lv_swap"]);
  window.__RCW_RHCSA_TEST__.setFile("/etc/fstab", `${window.__RCW_RHCSA_TEST__.getState().files["/etc/fstab"]}/dev/vg_exam/lv_swap  swap  swap  defaults  0 0\n`);
  execute(window, ["swapon -a"]);
  await verifyCompletion(env, 6);
  env.dom.window.close();
}

async function systemTest() {
  const env = makeDom("rhcsa-system-operations"), { window } = env;
  start(window);
  execute(window, SCENARIOS["rhcsa-system-operations"]);
  window.__RCW_RHCSA_TEST__.setFile("/etc/chrony.conf", `${window.__RCW_RHCSA_TEST__.getState().files["/etc/chrony.conf"]}server time.example.net iburst\n`);
  execute(window, ["systemctl enable --now chronyd", "systemctl restart chronyd", "chronyc sources", "mkdir -p /var/log/journal", "systemctl restart systemd-journald", "journalctl --disk-usage"]);
  window.__RCW_RHCSA_TEST__.setFile("/etc/systemd/system/rhcsa-report.service", "[Unit]\nDescription=Write report\n\n[Service]\nType=oneshot\nExecStart=/usr/local/sbin/rhcsa-report\n");
  window.__RCW_RHCSA_TEST__.setFile("/etc/systemd/system/rhcsa-report.timer", "[Unit]\nDescription=Daily report\n\n[Timer]\nOnCalendar=daily\nPersistent=true\nUnit=rhcsa-report.service\n\n[Install]\nWantedBy=timers.target\n");
  execute(window, ["systemctl daemon-reload", "systemctl enable --now rhcsa-report.timer"]);
  window.__RCW_RHCSA_TEST__.setFile("/etc/default/grub", window.__RCW_RHCSA_TEST__.getState().files["/etc/default/grub"].replace("GRUB_TIMEOUT=1", "GRUB_TIMEOUT=5"));
  execute(window, ["grub2-mkconfig -o /boot/grub2/grub.cfg"]);
  await verifyCompletion(env, 6);
  env.dom.window.close();
}

async function networkTest() {
  const env = makeDom("rhcsa-network-selinux"), { window } = env;
  start(window);
  execute(window, SCENARIOS["rhcsa-network-selinux"]);
  execute(window, [
    "firewall-cmd --permanent --add-service=http",
    "firewall-cmd --permanent --add-port=8081/tcp",
    "firewall-cmd --reload",
    "setenforce 1",
    "semanage port -a -t http_port_t -p tcp 8081"
  ]);
  const secureScore = window.__RCW_RHCSA_TEST__.getScore();
  execute(window, ["setenforce 0"]);
  assert(window.__RCW_RHCSA_TEST__.getScore() < secureScore, "breaking current state should revoke objective points");
  execute(window, [
    "setenforce 1",
    "mkdir -p /srv/examweb",
    "semanage fcontext -a -t httpd_sys_content_t '/srv/examweb(/.*)?'",
    "restorecon -Rv /srv/examweb",
    "setsebool -P httpd_can_network_connect on",
    "groupadd ops",
    "useradd operator",
    "usermod -aG ops operator",
    "chage -M 90 operator"
  ]);
  window.__RCW_RHCSA_TEST__.setFile("/etc/sudoers.d/operator", "operator ALL=(ALL) ALL\n");
  execute(window, ["visudo -cf /etc/sudoers.d/operator"]);
  await verifyCompletion(env, 7);
  env.dom.window.close();
}

async function verifyCompletion(env, objectiveCount) {
  const { window } = env;
  await new Promise((resolve) => setTimeout(resolve, 700));
  assert.strictEqual(window.__RCW_RHCSA_TEST__.getScore(), 100, "final score should be 100");
  assert(window.document.querySelector("#result").classList.contains("active"), "result screen should be visible");
  assert.strictEqual(window.document.querySelectorAll(".task.done").length, objectiveCount, "every objective should be complete");
  assert.strictEqual(window.document.querySelector("#resultLearner").textContent, "RCW Test Learner");
  assert.strictEqual(window.document.querySelector("#resultTitle").textContent, "Linux Challenge Champion");
  assert.strictEqual(window.__passportEntry.score, 100, "passport should receive final score");
  assert(window.document.querySelector("#certificateCanvas").toDataURL("image/jpeg").startsWith("data:image/jpeg"), "certificate should render to JPEG");
  window.document.querySelector("#downloadCertificate").click();
  await new Promise((resolve) => setTimeout(resolve, 100));
  const blob = env.getLastBlob();
  assert(blob && blob.type === "application/pdf" && blob.size > 1000, "certificate download should create a PDF blob");
}

async function editorTest() {
  const env = makeDom("rhcsa-system-operations"), { window } = env;
  start(window);
  window.__RCW_RHCSA_TEST__.run("vi /etc/chrony.conf");
  const editor = window.document.querySelector("#editor"), text = window.document.querySelector("#editorText");
  assert.strictEqual(editor.hidden, false, "vi should open the stateful editor");
  window.document.querySelector('[data-editor="insert"]').click();
  assert.strictEqual(text.readOnly, false, "insert mode should make text editable");
  text.value += "server time.example.net iburst\n";
  window.document.querySelector('[data-editor="savequit"]').click();
  assert.strictEqual(editor.hidden, true, "save and quit should close editor");
  assert(window.__RCW_RHCSA_TEST__.getState().files["/etc/chrony.conf"].includes("time.example.net"));
  env.dom.window.close();
}

(async () => {
  await storageTest();
  await systemTest();
  await networkTest();
  await editorTest();
  console.log("RHCSA challenge state-flow, editor, score, passport and PDF tests passed.");
})().catch((error) => { console.error(error); process.exitCode = 1; });
