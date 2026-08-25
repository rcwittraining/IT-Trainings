#!/usr/bin/env python3
# RCW-NixPerm v1.0.0 — Linux File & Folder Permission Manager
# Windows portable GUI (Tkinter) that SSHes to a Linux server, audits
# file/folder permissions, exports to Excel, and applies chown, chgrp,
# chmod, special bits (setuid/setgid/sticky) and POSIX ACLs.
import tkinter as tk
from tkinter import ttk, scrolledtext, filedialog, messagebox
import paramiko
import os, sys, datetime, re, stat, threading, json, csv

try:
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
    XLSX_OK = True
except Exception:
    XLSX_OK = False

APP_NAME = "RCW-NixPerm"
APP_VER = "1.0.0"
APP_TAG = "Linux File & Folder Permission Manager"

# ---------------------------------------------------------------------------
# SSH connection helper
# ---------------------------------------------------------------------------
class SSHClient:
    def __init__(self):
        self.client = None
        self.ip = None

    def connect(self, host, port, user, auth, secret, timeout=15):
        self.client = paramiko.SSHClient()
        self.client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        if auth == "key":
            pkey = None
            for key_cls in (paramiko.Ed25519Key, paramiko.RSAKey,
                            paramiko.ECDSAKey, paramiko.DSSKey):
                try:
                    pkey = key_cls.from_private_key_file(secret)
                    break
                except Exception:
                    continue
            if pkey is None:
                raise ValueError("Could not load private key file.")
            self.client.connect(hostname=host, port=port, username=user,
                                pkey=pkey, timeout=timeout, look_for_keys=False,
                                allow_agent=False)
        else:
            self.client.connect(hostname=host, port=port, username=user,
                                password=secret, timeout=timeout,
                                look_for_keys=False, allow_agent=False)
        self.ip = self.client.get_transport().getpeername()[0]
        return True

    def cmd(self, command, sudo_pw=None, timeout=120):
        if not self.client:
            return ("", "not connected", -1)
        try:
            if sudo_pw:
                full = 'sudo -S -p "" %s' % command
                stdin, stdout, stderr = self.client.exec_command(full, timeout=timeout)
                try:
                    stdin.write(sudo_pw + "\n")
                    stdin.flush()
                except Exception:
                    pass
            else:
                stdin, stdout, stderr = self.client.exec_command(command, timeout=timeout)
            out = stdout.read().decode("utf-8", "replace")
            err = stderr.read().decode("utf-8", "replace")
            try:
                code = stdout.channel.recv_exit_status()
            except Exception:
                code = 0
            return (out, err, code)
        except Exception as e:
            return ("", str(e), -1)

    def close(self):
        try:
            self.client.close()
        except Exception:
            pass


# ---------------------------------------------------------------------------
# Permission helpers
# ---------------------------------------------------------------------------
def parse_long_ls(line):
    """Parse one line of 'ls -la' output into a dict."""
    parts = line.split(None, 8)
    if len(parts) < 9:
        return None
    perms = parts[0]
    if len(perms) < 10 or perms[0] not in "dlbcps-":
        return None
    try:
        links = int(parts[1])
    except ValueError:
        links = 0
    owner = parts[2]
    group = parts[3]
    size = parts[4]
    date_str = " ".join(parts[5:8])
    name = parts[8]
    # handle symlink target
    target = ""
    if " -> " in name:
        name, target = name.split(" -> ", 1)
    ftype = {"d": "dir", "l": "link", "-": "file", "b": "block",
             "c": "char", "p": "pipe", "s": "socket"}.get(perms[0], "other")
    return {
        "perms": perms,
        "type": ftype,
        "links": links,
        "owner": owner,
        "group": group,
        "size": size,
        "date": date_str,
        "name": name,
        "target": target,
        "special": _special_flags(perms),
        "octal": _perms_to_octal(perms),
    }


def _special_flags(perms):
    """Return a string like 'sgid+sticky' from permission string."""
    flags = []
    if len(perms) >= 10:
        if perms[3] in ("s", "S"):
            flags.append("setuid")
        if perms[6] in ("s", "S"):
            flags.append("setgid")
        if perms[9] in ("t", "T"):
            flags.append("sticky")
    return "+".join(flags) if flags else ""


def _perms_to_octal(perms):
    """Convert rwxrwxrwx string to octal (e.g. 0755)."""
    if len(perms) < 10:
        return ""
    triplets = [perms[1:4], perms[4:7], perms[7:10]]
    digits = []
    for t in triplets:
        v = 0
        if t[0] in ("r",):
            v += 4
        if t[1] in ("w",):
            v += 2
        if t[2] in ("x", "s", "t"):
            v += 1
        digits.append(str(v))
    # special bits
    special = 0
    if perms[3] in ("s", "S"):
        special += 4
    if perms[6] in ("s", "S"):
        special += 2
    if perms[9] in ("t", "T"):
        special += 1
    return "%d%s%s%s" % (special, digits[0], digits[1], digits[2])


# ---------------------------------------------------------------------------
# Excel export
# ---------------------------------------------------------------------------
def export_excel(rows, meta, path):
    """
    rows: list of dicts with keys:
      path, name, type, perms, octal, owner, group, size, special, acl
    meta: dict with host, date, user, etc.
    """
    wb = Workbook()
    ws = wb.active
    ws.title = "Permission Audit"

    # Header style
    hdr_font = Font(bold=True, color="FFFFFF", size=11)
    hdr_fill = PatternFill(start_color="101C30", end_color="101C30", fill_type="solid")
    warn_fill = PatternFill(start_color="FFF3CD", end_color="FFF3CD", fill_type="solid")
    err_fill = PatternFill(start_color="F8D7DA", end_color="F8D7DA", fill_type="solid")
    thin = Side(style="thin", color="D0D0D0")
    border = Border(top=thin, bottom=thin, left=thin, right=thin)

    # Title block
    ws.merge_cells("A1:J1")
    c = ws["A1"]
    c.value = "%s v%s — Permission Audit Report" % (APP_NAME, APP_VER)
    c.font = Font(bold=True, size=14, color="101C30")

    ws["A2"] = "Host:";  ws["B2"] = meta.get("host", "")
    ws["A3"] = "IP:";    ws["B3"] = meta.get("ip", "")
    ws["A4"] = "Path:";  ws["B4"] = meta.get("path", "")
    ws["A5"] = "Date:";  ws["B5"] = meta.get("date", "")
    ws["A6"] = "Items:"; ws["B6"] = len(rows)
    for r in range(2, 7):
        ws.cell(row=r, column=1).font = Font(bold=True)

    # Column headers
    headers = ["Path", "Name", "Type", "Permissions", "Octal",
               "Owner", "Group", "Size", "Special Bits", "ACL"]
    hr = 8
    for ci, h in enumerate(headers, 1):
        cell = ws.cell(row=hr, column=ci, value=h)
        cell.font = hdr_font
        cell.fill = hdr_fill
        cell.alignment = Alignment(horizontal="center")
        cell.border = border

    # Data rows
    for ri, row in enumerate(rows, hr + 1):
        vals = [
            row.get("path", ""),
            row.get("name", ""),
            row.get("type", ""),
            row.get("perms", ""),
            row.get("octal", ""),
            row.get("owner", ""),
            row.get("group", ""),
            row.get("size", ""),
            row.get("special", ""),
            row.get("acl", ""),
        ]
        for ci, v in enumerate(vals, 1):
            cell = ws.cell(row=ri, column=ci, value=str(v))
            cell.border = border
            # highlight world-writable
            if ci == 4 and v and "w" in v[7:10]:
                cell.fill = err_fill
            # highlight special bits
            if ci == 9 and v:
                cell.fill = warn_fill

    # Column widths
    widths = [50, 30, 8, 14, 8, 16, 16, 12, 20, 40]
    for ci, w in enumerate(widths, 1):
        ws.column_dimensions[ws.cell(row=1, column=ci).column_letter].width = w

    # Summary sheet
    ws2 = wb.create_sheet("Summary")
    ws2["A1"] = "Permission Summary"
    ws2["A1"].font = Font(bold=True, size=14)
    ws2["A3"] = "Total items"
    ws2["B3"] = len(rows)
    dirs = [r for r in rows if r.get("type") == "dir"]
    files = [r for r in rows if r.get("type") == "file"]
    links = [r for r in rows if r.get("type") == "link"]
    ws2["A4"] = "Directories"; ws2["B4"] = len(dirs)
    ws2["A5"] = "Files";       ws2["B5"] = len(files)
    ws2["A6"] = "Symlinks";    ws2["B6"] = len(links)
    ws2["A8"] = "World-writable files"
    ws2["B8"] = sum(1 for r in rows if r.get("type") == "file" and
                    len(r.get("perms", "")) >= 10 and r["perms"][8] == "w")
    ws2["A9"] = "World-writable dirs (no sticky)"
    ws2["B9"] = sum(1 for r in rows if r.get("type") == "dir" and
                    len(r.get("perms", "")) >= 10 and r["perms"][8] == "w" and
                    r["perms"][9] not in ("t", "T"))
    ws2["A10"] = "SUID files"
    ws2["B10"] = sum(1 for r in rows if r.get("type") == "file" and
                     len(r.get("perms", "")) >= 10 and r["perms"][3] in ("s", "S"))
    ws2["A11"] = "SGID files/dirs"
    ws2["B11"] = sum(1 for r in rows if
                     len(r.get("perms", "")) >= 10 and r["perms"][6] in ("s", "S"))
    for r in range(3, 12):
        ws2.cell(row=r, column=1).font = Font(bold=True)
    ws2.column_dimensions["A"].width = 35
    ws2.column_dimensions["B"].width = 15

    wb.save(path)


# ---------------------------------------------------------------------------
# Main application
# ---------------------------------------------------------------------------
class App(tk.Tk):
    def __init__(self):
        super().__init__()
        self.title("%s v%s — %s" % (APP_NAME, APP_VER, APP_TAG))
        self.geometry("1180x750")
        try:
            self.iconbitmap(os.path.join(os.path.dirname(os.path.abspath(__file__)), "rcw.ico"))
        except Exception:
            pass
        self.ssh = None
        self.sudo_pw = ""
        self.audit_rows = []
        self.current_path = ""
        self.build_ui()

    def build_ui(self):
        pad = {"padx": 6, "pady": 3}

        # --- SSH connection frame ---
        conn = ttk.LabelFrame(self, text="Target Linux Server (SSH)")
        conn.pack(fill="x", **pad)

        ttk.Label(conn, text="Host:").grid(row=0, column=0, sticky="e")
        self.e_host = ttk.Entry(conn, width=22); self.e_host.grid(row=0, column=1, **pad)
        self.e_host.insert(0, "192.168.1.10")
        ttk.Label(conn, text="Port:").grid(row=0, column=2, sticky="e")
        self.e_port = ttk.Entry(conn, width=6); self.e_port.grid(row=0, column=3, **pad)
        self.e_port.insert(0, "22")
        ttk.Label(conn, text="User:").grid(row=0, column=4, sticky="e")
        self.e_user = ttk.Entry(conn, width=16); self.e_user.grid(row=0, column=5, **pad)
        self.e_user.insert(0, "root")
        ttk.Label(conn, text="Auth:").grid(row=0, column=6, sticky="e")
        self.auth_var = tk.StringVar(value="password")
        ttk.Radiobutton(conn, text="Password", variable=self.auth_var,
                        value="password").grid(row=0, column=7)
        ttk.Radiobutton(conn, text="Key", variable=self.auth_var,
                        value="key").grid(row=0, column=8)

        ttk.Label(conn, text="Secret:").grid(row=1, column=0, sticky="e")
        self.e_secret = ttk.Entry(conn, width=36, show="*"); self.e_secret.grid(row=1, column=1, columnspan=4, **pad)
        ttk.Button(conn, text="Browse...", command=self._browse_key).grid(row=1, column=5, **pad)
        ttk.Label(conn, text="Sudo pw:").grid(row=1, column=6, sticky="e")
        self.e_sudo = ttk.Entry(conn, width=22, show="*"); self.e_sudo.grid(row=1, column=7, columnspan=2, **pad)

        bf = ttk.Frame(conn)
        bf.grid(row=2, column=0, columnspan=9, pady=4)
        self.btn_connect = ttk.Button(bf, text="Connect", command=self._connect)
        self.btn_connect.pack(side="left", padx=4)
        self.btn_disconnect = ttk.Button(bf, text="Disconnect", command=self._disconnect, state="disabled")
        self.btn_disconnect.pack(side="left", padx=4)
        self.lbl_status = ttk.Label(bf, text="Not connected", foreground="gray")
        self.lbl_status.pack(side="left", padx=12)

        # --- Path / audit frame ---
        path_frame = ttk.LabelFrame(self, text="Permission Audit")
        path_frame.pack(fill="x", **pad)

        ttk.Label(path_frame, text="Path:").grid(row=0, column=0, sticky="e")
        self.e_path = ttk.Entry(path_frame, width=50); self.e_path.grid(row=0, column=1, **pad)
        self.e_path.insert(0, "/etc")
        self.chk_recursive = tk.BooleanVar(value=False)
        ttk.Checkbutton(path_frame, text="Recursive", variable=self.chk_recursive).grid(row=0, column=2, **pad)
        self.chk_acl = tk.BooleanVar(value=False)
        ttk.Checkbutton(path_frame, text="Include ACL (getfacl)", variable=self.chk_acl).grid(row=0, column=3, **pad)
        self.btn_audit = ttk.Button(path_frame, text="Audit Permissions", command=self._audit, state="disabled")
        self.btn_audit.grid(row=0, column=4, **pad)
        self.btn_export = ttk.Button(path_frame, text="Export Excel (.xlsx)", command=self._export, state="disabled")
        self.btn_export.grid(row=0, column=5, **pad)
        self.lbl_count = ttk.Label(path_frame, text="")
        self.lbl_count.grid(row=0, column=6, **pad)

        # --- Permission treeview ---
        tree_frame = ttk.Frame(self)
        tree_frame.pack(fill="both", expand=True, **pad)

        cols = ("path", "name", "type", "perms", "octal", "owner", "group", "size", "special")
        self.tree = ttk.Treeview(tree_frame, columns=cols, show="headings", height=14)
        widths = {"path": 250, "name": 180, "type": 50, "perms": 95, "octal": 55,
                  "owner": 100, "group": 100, "size": 80, "special": 120}
        for c in cols:
            self.tree.heading(c, text=c.capitalize())
            self.tree.column(c, width=widths.get(c, 100), minwidth=40)

        sb_y = ttk.Scrollbar(tree_frame, orient="vertical", command=self.tree.yview)
        sb_x = ttk.Scrollbar(tree_frame, orient="horizontal", command=self.tree.xview)
        self.tree.configure(yscrollcommand=sb_y.set, xscrollcommand=sb_x.set)
        self.tree.grid(row=0, column=0, sticky="nsew")
        sb_y.grid(row=0, column=1, sticky="ns")
        sb_x.grid(row=1, column=0, sticky="ew")
        tree_frame.rowconfigure(0, weight=1)
        tree_frame.columnconfigure(0, weight=1)

        # --- Modify permissions frame ---
        mod = ttk.LabelFrame(self, text="Modify Permissions (selected item or type path)")
        mod.pack(fill="x", **pad)

        # Row 1: chown, chgrp
        ttk.Label(mod, text="chown (owner):").grid(row=0, column=0, sticky="e")
        self.e_chown = ttk.Entry(mod, width=18); self.e_chown.grid(row=0, column=1, **pad)
        ttk.Label(mod, text="chgrp (group):").grid(row=0, column=2, sticky="e")
        self.e_chgrp = ttk.Entry(mod, width=18); self.e_chgrp.grid(row=0, column=3, **pad)

        # Row 2: chmod
        ttk.Label(mod, text="chmod:").grid(row=1, column=0, sticky="e")
        self.e_chmod = ttk.Entry(mod, width=18); self.e_chmod.grid(row=1, column=1, **pad)
        self.e_chmod.insert(0, "e.g. 0755 or u+rwx")
        self.e_chmod.bind("<FocusIn>", lambda e: self._clear_if_hint(self.e_chmod, "e.g. 0755 or u+rwx"))

        # Special bits quick buttons
        sf = ttk.Frame(mod)
        sf.grid(row=1, column=2, columnspan=4, sticky="w")
        for label, val in [("u+s (SUID)", "u+s"), ("u-s", "u-s"),
                           ("g+s (SGID)", "g+s"), ("g-s", "g-s"),
                           ("o+t (Sticky)", "o+t"), ("o-t", "o-t")]:
            ttk.Button(sf, text=label, width=12,
                       command=lambda v=val: self._insert_special(v)).pack(side="left", padx=2)

        # Row 3: ACL
        ttk.Label(mod, text="ACL:").grid(row=2, column=0, sticky="e")
        self.e_acl = ttk.Entry(mod, width=50); self.e_acl.grid(row=2, column=1, columnspan=4, **pad)
        self.e_acl.insert(0, "e.g. u:john:rwx  or  g:devs:rx  or  m::rx")
        self.e_acl.bind("<FocusIn>", lambda e: self._clear_if_hint(self.e_acl, "e.g. u:john:rwx  or  g:devs:rx  or  m::rx"))

        # Row 4: options and apply
        self.chk_mod_recursive = tk.BooleanVar(value=False)
        ttk.Checkbutton(mod, text="Apply recursive", variable=self.chk_mod_recursive).grid(row=3, column=0, columnspan=2, sticky="w", **pad)
        self.chk_dryrun = tk.BooleanVar(value=True)
        ttk.Checkbutton(mod, text="Dry-run (preview only)", variable=self.chk_dryrun).grid(row=3, column=2, columnspan=2, sticky="w", **pad)

        bf2 = ttk.Frame(mod)
        bf2.grid(row=3, column=4, columnspan=2, sticky="e", **pad)
        self.btn_apply = ttk.Button(bf2, text="Apply Changes", command=self._apply, state="disabled")
        self.btn_apply.pack(side="left", padx=4)
        self.btn_refresh = ttk.Button(bf2, text="Refresh Audit", command=self._audit, state="disabled")
        self.btn_refresh.pack(side="left", padx=4)

        # --- Log ---
        self.log = scrolledtext.ScrolledText(self, height=8, font=("Consolas", 9))
        self.log.pack(fill="x", **pad)
        self._log("%s v%s ready. Connect to a Linux server to begin.\n" % (APP_NAME, APP_VER))
        if not XLSX_OK:
            self._log("WARNING: openpyxl not available — Excel export disabled.\n")

    # --- helpers ---
    def _log(self, msg):
        self.log.insert("end", msg)
        self.log.see("end")

    def _clear_if_hint(self, entry, hint):
        if entry.get() == hint:
            entry.delete(0, "end")

    def _insert_special(self, val):
        cur = self.e_chmod.get()
        if cur in ("", "e.g. 0755 or u+rwx"):
            self.e_chmod.delete(0, "end")
            self.e_chmod.insert(0, val)
        else:
            self.e_chmod.insert("end", "," + val)

    def _browse_key(self):
        p = filedialog.askopenfilename(
            title="Select private key file",
            filetypes=[("Key files", "*.pem *.ppk *.key *.rsa *.ed25519"), ("All", "*.*")])
        if p:
            self.e_secret.delete(0, "end")
            self.e_secret.insert(0, p)

    def _bg(self, fn):
        threading.Thread(target=fn, daemon=True).start()

    def _sel_path(self):
        """Return selected tree item path or the audit path."""
        sel = self.tree.selection()
        if sel:
            vals = self.tree.item(sel[0], "values")
            if vals:
                full = vals[0]
                name = vals[1]
                return full + "/" + name if not full.endswith(name) else full
        return self.current_path

    # --- SSH connect / disconnect ---
    def _connect(self):
        self.lbl_status.config(text="Connecting...", foreground="orange")
        self.btn_connect.config(state="disabled")
        self._bg(self._do_connect)

    def _do_connect(self):
        try:
            s = SSHClient()
            s.connect(self.e_host.get(), int(self.e_port.get() or 22),
                      self.e_user.get(), self.auth_var.get(), self.e_secret.get())
            self.ssh = s
            self.sudo_pw = self.e_sudo.get() or None
            # test
            out, err, code = s.cmd("uname -a", self.sudo_pw)
            self.after(0, lambda: self._connected(out.strip()))
        except Exception as e:
            self.after(0, lambda: self._connect_fail(str(e)))

    def _connected(self, uname):
        self.lbl_status.config(text="Connected: %s" % self.e_host.get(), foreground="green")
        self.btn_connect.config(state="disabled")
        self.btn_disconnect.config(state="normal")
        self.btn_audit.config(state="normal")
        self.btn_apply.config(state="normal")
        self._log("Connected. %s\n" % uname)

    def _connect_fail(self, err):
        self.lbl_status.config(text="Connection failed", foreground="red")
        self.btn_connect.config(state="normal")
        self._log("ERROR: %s\n" % err)
        messagebox.showerror("Connection failed", err)

    def _disconnect(self):
        if self.ssh:
            self.ssh.close()
            self.ssh = None
        self.lbl_status.config(text="Not connected", foreground="gray")
        self.btn_connect.config(state="normal")
        self.btn_disconnect.config(state="disabled")
        self.btn_audit.config(state="disabled")
        self.btn_export.config(state="disabled")
        self.btn_apply.config(state="disabled")
        self.btn_refresh.config(state="disabled")
        for item in self.tree.get_children():
            self.tree.delete(item)
        self.audit_rows = []
        self._log("Disconnected.\n")

    # --- Audit ---
    def _audit(self):
        if not self.ssh:
            messagebox.showwarning("Not connected", "Connect to a server first.")
            return
        self.btn_audit.config(state="disabled")
        self.btn_export.config(state="disabled")
        self._log("Auditing %s %s...\n" % (
            self.e_path.get(),
            "(recursive)" if self.chk_recursive.get() else "(single dir)"))
        self._bg(self._do_audit)

    def _do_audit(self):
        path = self.e_path.get().strip()
        recursive = self.chk_recursive.get()
        include_acl = self.chk_acl.get()
        sudo = self.sudo_pw

        # Build the listing command
        if recursive:
            cmd = 'find %s -maxdepth 10 -exec ls -ld {} + 2>/dev/null' % _shq(path)
        else:
            cmd = 'ls -la %s 2>/dev/null' % _shq(path)

        out, err, code = self.ssh.cmd(cmd, sudo, timeout=180)
        if not out.strip():
            self.after(0, lambda: self._log("WARNING: no output. Check path and permissions.\n"))

        # Parse output
        rows = []
        for line in out.splitlines():
            parsed = parse_long_ls(line)
            if parsed is None:
                continue
            # Build full path
            if recursive:
                full = line.split(None, 8)[-1] if len(line.split(None, 8)) >= 9 else parsed["name"]
                parent = os.path.dirname(full) if "/" in full else path
            else:
                parent = path.rstrip("/")
                full = parent + "/" + parsed["name"]
            parsed["path"] = parent
            parsed["full"] = full

            # ACL if requested
            parsed["acl"] = ""
            if include_acl:
                acl_out, _, _ = self.ssh.cmd("getfacl -p %s 2>/dev/null" % _shq(full), sudo, timeout=10)
                if acl_out:
                    acl_lines = []
                    for al in acl_out.splitlines():
                        al = al.strip()
                        if al and not al.startswith("#"):
                            acl_lines.append(al)
                    parsed["acl"] = "; ".join(acl_lines)
            rows.append(parsed)

        self.audit_rows = rows
        self.current_path = path
        self.after(0, lambda: self._fill_tree(rows))

    def _fill_tree(self, rows):
        for item in self.tree.get_children():
            self.tree.delete(item)
        for r in rows:
            self.tree.insert("", "end", values=(
                r["path"], r["name"], r["type"], r["perms"], r["octal"],
                r["owner"], r["group"], r["size"], r["special"]
            ))
        self.lbl_count.config(text="%d items" % len(rows))
        self.btn_audit.config(state="normal")
        self.btn_refresh.config(state="normal")
        self.btn_export.config(state="normal")
        self._log("Audit complete: %d items found.\n" % len(rows))

    # --- Export ---
    def _export(self):
        if not self.audit_rows:
            messagebox.showwarning("Nothing to export", "Run an audit first.")
            return
        if not XLSX_OK:
            messagebox.showerror("Missing dependency", "openpyxl is not installed.")
            return
        host = self.e_host.get().replace(".", "_")
        default = "RCW-NixPerm-%s-%s.xlsx" % (host, datetime.datetime.now().strftime("%Y%m%d-%H%M"))
        path = filedialog.asksaveasfilename(
            title="Save permission audit",
            defaultextension=".xlsx",
            initialfile=default,
            filetypes=[("Excel Workbook", "*.xlsx"), ("CSV", "*.csv"), ("All", "*.*")])
        if not path:
            return
        try:
            if path.lower().endswith(".csv"):
                self._export_csv(path)
            else:
                meta = {
                    "host": self.e_host.get(),
                    "ip": self.ssh.ip if self.ssh else "",
                    "path": self.current_path,
                    "date": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                }
                export_excel(self.audit_rows, meta, path)
            self._log("Exported: %s\n" % path)
            messagebox.showinfo("Exported", "Saved to:\n%s" % path)
            try:
                os.startfile(path)
            except Exception:
                pass
        except Exception as e:
            messagebox.showerror("Export failed", str(e))
            self._log("EXPORT ERROR: %s\n" % e)

    def _export_csv(self, path):
        with open(path, "w", newline="", encoding="utf-8") as f:
            w = csv.DictWriter(f, fieldnames=[
                "path", "name", "type", "perms", "octal",
                "owner", "group", "size", "special", "acl"])
            w.writeheader()
            for r in self.audit_rows:
                w.writerow({k: r.get(k, "") for k in w.fieldnames})

    # --- Apply permission changes ---
    def _apply(self):
        if not self.ssh:
            messagebox.showwarning("Not connected", "Connect to a server first.")
            return
        target = self._sel_path()
        chown = self.e_chown.get().strip()
        chgrp = self.e_chgrp.get().strip()
        chmod = self.e_chmod.get().strip()
        acl = self.e_acl.get().strip()
        recursive = self.chk_mod_recursive.get()
        dryrun = self.chk_dryrun.get()

        if not any([chown, chgrp, chmod, acl]) or chmod in ("e.g. 0755 or u+rwx",):
            messagebox.showinfo("Nothing to do", "Enter at least one change (chown, chgrp, chmod or ACL).")
            return

        # Build commands
        commands = []
        rflag = "-R " if recursive else ""

        if chown:
            commands.append("chown %s%s %s" % (rflag, _shq(chown), _shq(target)))
        if chgrp:
            commands.append("chgrp %s%s %s" % (rflag, _shq(chgrp), _shq(target)))
        if chmod and chmod not in ("e.g. 0755 or u+rwx",):
            # Handle multiple comma-separated chmod operations
            for part in chmod.split(","):
                part = part.strip()
                if not part:
                    continue
                # If it looks numeric (e.g., 0755, 755, 4755)
                if re.match(r"^[0-7]{3,4}$", part):
                    commands.append("chmod %s%s %s" % (rflag, part, _shq(target)))
                else:
                    commands.append("chmod %s%s %s" % (rflag, part, _shq(target)))
        if acl:
            # Parse ACL entry or entries
            for entry in acl.split(","):
                entry = entry.strip()
                if not entry or entry.startswith("e.g."):
                    continue
                commands.append("setfacl -m %s %s%s" % (_shq(entry), "-R " if recursive else "", _shq(target)))

        if not commands:
            return

        preview = "\n".join("  $ " + c for c in commands)
        if dryrun:
            self._log("DRY-RUN — commands that would execute on %s:\n%s\n" % (target, preview))
            self._log("Uncheck 'Dry-run' to execute for real.\n")
            messagebox.showinfo("Dry-run Preview",
                                "Commands that would run:\n\n%s\n\nUncheck 'Dry-run' and click Apply to execute." % preview)
            return

        # Confirm
        if not messagebox.askyesno("Confirm Permission Change",
                                   "Execute these commands on the server?\n\n%s\n\nTarget: %s%s" % (
                                       preview, target, " (recursive)" if recursive else "")):
            return

        self.btn_apply.config(state="disabled")
        self._log("Applying changes to %s...\n" % target)
        self._bg(lambda: self._do_apply(commands, target))

    def _do_apply(self, commands, target):
        results = []
        for cmd in commands:
            out, err, code = self.ssh.cmd(cmd, self.sudo_pw, timeout=60)
            status = "OK" if code == 0 else "FAIL(%d)" % code
            results.append((cmd, status, out.strip(), err.strip()))
            self.after(0, lambda c=cmd, s=status: self._log("  [%s] %s\n" % (s, c)))
        self.after(0, lambda: self._apply_done(results, target))

    def _apply_done(self, results, target):
        self.btn_apply.config(state="normal")
        ok = sum(1 for _, s, _, _ in results if s == "OK")
        fail = sum(1 for _, s, _, _ in results if s != "OK")
        self._log("Done: %d OK, %d failed on %s.\n" % (ok, fail, target))
        if fail:
            for cmd, status, out, err in results:
                if status != "OK" and err:
                    self._log("  ERROR (%s): %s\n" % (cmd, err))
        # Auto-refresh audit
        self._log("Auto-refreshing audit...\n")
        self._bg(self._do_audit)


def _shq(s):
    """Shell-quote a string."""
    return "'" + s.replace("'", "'\\''") + "'"


if __name__ == "__main__":
    App().mainloop()
