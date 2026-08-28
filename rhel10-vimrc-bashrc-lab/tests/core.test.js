"use strict";

const assert = require("node:assert/strict");
const Core = require("../lab-core.js");

const vimrc = `
" Practical defaults
set number
syntax enable
set expandtab
set tabstop = 4
set shiftwidth=4
set autoindent
`;

const bashrc = `
# .bashrc
if [ -f /etc/bashrc ]; then
  . /etc/bashrc
fi
export EDITOR=vim
export VISUAL="vim"
export HISTCONTROL=ignoreboth
export HISTSIZE='2000'
alias ll='ls -alF'
alias c="clear"
`;

assert.equal(Core.validateVimrc(vimrc).ok, true, "valid Vim configuration should pass");
assert.deepEqual(Core.validateVimrc("set number\n").missing, [
  "syntax highlighting",
  "spaces instead of tab characters",
  "tabstop=4",
  "shiftwidth=4",
  "automatic indentation"
]);

const parsed = Core.parseBashrc(bashrc);
assert.equal(parsed.env.EDITOR, "vim");
assert.equal(parsed.env.HISTSIZE, "2000");
assert.equal(parsed.aliases.ll, "ls -alF");
assert.equal(Core.validateBashrc(bashrc).ok, true, "valid Bash configuration should pass");
assert.equal(Core.validateBashrc("export EDITOR=nano\n").ok, false);

assert.equal(Core.bashSyntax(bashrc).ok, true);
assert.equal(Core.bashSyntax("alias ll='ls -alF\n").ok, false, "unclosed quote should fail");
assert.equal(Core.bashSyntax("if true; then\necho ok\n").ok, false, "unmatched if should fail");

assert.deepEqual(Core.tokenize("cp -p '~/.vimrc' ~/.vimrc.bak"), ["cp", "-p", "~/.vimrc", "~/.vimrc.bak"]);
assert.equal(Core.homePath("~/.bashrc"), "/home/student/.bashrc");
assert.equal(Core.homePath(".vimrc"), "/home/student/.vimrc");
assert.equal(Core.homePath("/etc/redhat-release"), "/etc/redhat-release");

console.log("All RHEL 10 config lab core tests passed.");
