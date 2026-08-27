/* RCW IT Training — pure validation helpers for the RHEL 10 .vimrc/.bashrc lab. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.RCWConfigLabCore = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  function activeLines(content) {
    return String(content || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#") && !line.startsWith('"'));
  }

  function hasLine(lines, expression) {
    return lines.some((line) => expression.test(line));
  }

  function validateVimrc(content) {
    const lines = activeLines(content);
    const checks = [
      ["line numbers", /^set\s+(?:nu|number)$/i],
      ["syntax highlighting", /^syntax\s+(?:on|enable)$/i],
      ["spaces instead of tab characters", /^set\s+(?:et|expandtab)$/i],
      ["tabstop=4", /^set\s+(?:ts|tabstop)\s*=\s*4$/i],
      ["shiftwidth=4", /^set\s+(?:sw|shiftwidth)\s*=\s*4$/i],
      ["automatic indentation", /^set\s+(?:ai|autoindent)$/i]
    ];
    const missing = checks.filter(([, re]) => !hasLine(lines, re)).map(([label]) => label);
    return { ok: missing.length === 0, missing };
  }

  function unquote(value) {
    const text = String(value || "").trim();
    if ((text.startsWith("'") && text.endsWith("'")) || (text.startsWith('"') && text.endsWith('"'))) return text.slice(1, -1);
    return text;
  }

  function parseBashrc(content) {
    const env = {};
    const aliases = {};
    activeLines(content).forEach((line) => {
      let match = line.match(/^export\s+([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
      if (match) {
        env[match[1]] = unquote(match[2]);
        return;
      }
      match = line.match(/^alias\s+([A-Za-z_][A-Za-z0-9_-]*)\s*=\s*(.+)$/);
      if (match) aliases[match[1]] = unquote(match[2]);
    });
    return { env, aliases };
  }

  function validateBashrc(content) {
    const parsed = parseBashrc(content);
    const missing = [];
    if (parsed.env.EDITOR !== "vim") missing.push("export EDITOR=vim");
    if (parsed.env.VISUAL !== "vim") missing.push("export VISUAL=vim");
    if (parsed.env.HISTCONTROL !== "ignoreboth") missing.push("export HISTCONTROL=ignoreboth");
    if (parsed.env.HISTSIZE !== "2000") missing.push("export HISTSIZE=2000");
    if (parsed.aliases.ll !== "ls -alF") missing.push("alias ll='ls -alF'");
    if (parsed.aliases.c !== "clear") missing.push("alias c='clear'");
    return { ok: missing.length === 0, missing, env: parsed.env, aliases: parsed.aliases };
  }

  function bashSyntax(content) {
    const text = String(content || "");
    let single = false;
    let double = false;
    let escaped = false;
    for (const char of text) {
      if (escaped) { escaped = false; continue; }
      if (char === "\\" && !single) { escaped = true; continue; }
      if (char === "'" && !double) single = !single;
      else if (char === '"' && !single) double = !double;
    }
    if (single) return { ok: false, message: "unexpected EOF while looking for matching single quote" };
    if (double) return { ok: false, message: "unexpected EOF while looking for matching double quote" };
    const ifCount = (text.match(/(^|\n)\s*if\b/g) || []).length;
    const fiCount = (text.match(/(^|\n)\s*fi\b/g) || []).length;
    if (ifCount !== fiCount) return { ok: false, message: "syntax error: unmatched if/fi block" };
    return { ok: true, message: "syntax OK" };
  }

  function tokenize(command) {
    const tokens = [];
    const matcher = /"([^"]*)"|'([^']*)'|([^\s]+)/g;
    let match;
    while ((match = matcher.exec(String(command || ""))) !== null) tokens.push(match[1] ?? match[2] ?? match[3]);
    return tokens;
  }

  function homePath(value) {
    const path = String(value || "");
    if (path === "~") return "/home/student";
    if (path.startsWith("~/")) return "/home/student/" + path.slice(2);
    if (path.startsWith("/")) return path;
    return "/home/student/" + path.replace(/^\.\//, "");
  }

  return { activeLines, validateVimrc, parseBashrc, validateBashrc, bashSyntax, tokenize, homePath };
});
