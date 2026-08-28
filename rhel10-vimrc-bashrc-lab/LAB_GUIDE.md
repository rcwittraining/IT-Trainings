# RHEL 10 `.vimrc` and `.bashrc` Configuration Lab

- **Publisher:** RCW IT Training
- **Level:** Beginner to intermediate Linux administration
- **Estimated time:** 25 minutes
- **Maximum score:** 100 points
- **Environment:** Safe, browser-based RHEL 10 simulation

## Purpose

This lab teaches how per-user Vim and Bash configuration works on RHEL 10. It checks the resulting simulated files and shell state—not only the commands entered.

By the end of the exercise, the learner will be able to:

- inspect hidden user configuration files;
- create recoverable backups before editing;
- configure practical Vim defaults;
- configure Bash variables, history behavior, and aliases;
- reload `.bashrc` into the current shell;
- verify environment values and aliases;
- run a Bash syntax check; and
- review file changes with a unified diff.

## Scoring

| Objective | Points |
|---|---:|
| Inspect `.vimrc` and `.bashrc` | 10 |
| Back up both original files | 15 |
| Configure `.vimrc` | 25 |
| Configure `.bashrc` | 25 |
| Reload and verify the Bash environment | 15 |
| Syntax-check and review both files | 10 |
| **Total** | **100** |

## Vim controls in the browser lab

The embedded editor models the essential Vim workflow:

- `i` — enter Insert mode;
- `a` — append after the cursor and enter Insert mode;
- `o` — open a new line and enter Insert mode;
- `Esc` — return to Normal mode;
- `:` — open Vim's command line;
- `:w` — write changes;
- `:wq` — write and quit;
- `:q!` — quit and discard unsaved changes.

Touch-friendly buttons below the editor provide the same core actions.

## Exercise

### 1. Inspect the current files — 10 points

```bash
cat ~/.vimrc
cat ~/.bashrc
```

Notice that `.bashrc` sources the system-wide `/etc/bashrc`. User-specific settings should be added without removing the existing block.

### 2. Back up the originals — 15 points

Create both backups **before editing**:

```bash
cp -p ~/.vimrc ~/.vimrc.bak
cp -p ~/.bashrc ~/.bashrc.bak
ls -la
```

The `-p` option represents preserving file metadata in a real shell. The lab verifies that both `.bak` files contain the original content.

### 3. Configure `.vimrc` — 25 points

```bash
vim ~/.vimrc
```

Keep the existing content and add:

```vim
" Practical Vim defaults
set number
syntax on
set expandtab
set tabstop=4
set shiftwidth=4
set autoindent
```

What these settings do:

- `number` shows line numbers;
- `syntax on` enables syntax highlighting;
- `expandtab` inserts spaces when Tab is pressed;
- `tabstop=4` displays a tab as four columns;
- `shiftwidth=4` uses four columns for indentation operations; and
- `autoindent` carries indentation to a new line.

Save with `Esc`, then `:wq`.

### 4. Configure `.bashrc` — 25 points

```bash
vim ~/.bashrc
```

Keep the original system-definition block and append:

```bash
# RCW user preferences
export EDITOR=vim
export VISUAL=vim
export HISTCONTROL=ignoreboth
export HISTSIZE=2000
alias ll='ls -alF'
alias c='clear'
```

- `EDITOR` and `VISUAL` tell command-line tools which editor to launch.
- `HISTCONTROL=ignoreboth` combines `ignorespace` and `ignoredups` behavior.
- `HISTSIZE=2000` retains more commands in the current shell history.
- `ll` provides a detailed directory listing.
- `c` provides a short command for clearing the terminal.

Save with `Esc`, then `:wq`.

### 5. Reload and verify — 15 points

Editing `.bashrc` does not retroactively change the current shell. Reload it:

```bash
source ~/.bashrc
```

Verify the active settings:

```bash
echo $EDITOR
echo $HISTSIZE
type ll
```

Optional checks:

```bash
echo $HISTCONTROL
alias ll
ll
```

Expected key results:

- `EDITOR` is `vim`;
- `HISTSIZE` is `2000`; and
- `ll` is reported as an alias for `ls -alF`.

### 6. Validate and review — 10 points

Run Bash's no-execute syntax check:

```bash
bash -n ~/.bashrc
```

The lab prints an explicit success message because a real `bash -n` command is silent on success.

Review both files against their backups:

```bash
diff -u ~/.vimrc.bak ~/.vimrc
diff -u ~/.bashrc.bak ~/.bashrc
```

Lines beginning with `-` are from the backup. Lines beginning with `+` are from the configured file.

## Completion and certificate

Completing all six objectives produces a final score of **100/100**. The learner can then open an RCW IT Training certificate for **Linux Challenge Champion**, signed by **Pradeep Raju**, and download it as a PDF.

## Recovery

Use the reset button in the lab header to restore the original dotfiles and clear the current attempt. In a real environment, recovery from the backups would use commands such as:

```bash
cp -p ~/.vimrc.bak ~/.vimrc
cp -p ~/.bashrc.bak ~/.bashrc
```

## Notes

This is an educational simulation. It does not execute commands on the learner's device or connect to an external system. It intentionally supports a focused command set for the objectives above.
