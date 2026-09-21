---
description: Learn Docker Compose hands-on: read a compose file, build, start a two-service stack detached, inspect it and tear it down — with the mistakes that trip up beginners.
---

# Why this lab exists

Most people meet Docker through a single `docker run` command. The moment an application needs two containers — a web server and a database, say — the command lines get long, the port mappings get forgotten, and nobody remembers which flags were used last time. Docker Compose fixes that by putting the whole stack in one declarative file, `docker-compose.yml`, and giving you four verbs to manage it: `build`, `up`, `ps`/`logs`, and `down`.

In this lab you work on a host called `docker-host-01` as the user `dev`. The application lives in `/app` and already has a compose file. Your job is to read it, build it, run it in the background, and shut it down cleanly. Those four steps are exactly what you would do on a real development box on day one of a new project.

# Reading the compose file before you run anything

Get into the habit of running `cat /app/docker-compose.yml` *before* you start a stack. Two things in this file matter:

- **`services:`** — every top-level key underneath is one container. Here there are two: `web` (built from the `nginx` image) and `db` (built from the `mysql` image).
- **`ports:`** — `80:80` means *host port 80 → container port 80*. The left-hand number is the one your browser will use. If port 80 is already taken on the host, `up` will fail with `address already in use`, so check with `ss -ltnp | grep :80` if you are ever unsure.

Notice that `db` has no `ports:` entry. That is intentional and good practice: the database only needs to be reachable by `web` over the private network Compose creates, not from the outside world.

> Compose creates a network per project named `<folder>_default`. Services reach each other by service name — `web` can talk to the database as `db:3306` — with no IP addresses involved.

# The four commands, and what each one really does

1. **`docker compose build`** — builds any service that has a `build:` section and pulls images for services that only have `image:`. In this file both services use published images, so the command finishes quickly, but you should still run it: it validates the YAML and confirms the images are available *before* you try to start anything.
2. **`docker compose up -d`** — creates the network, creates the containers and starts them. The `-d` (detached) flag returns your terminal immediately. Without `-d` Compose streams every container's logs to your screen and stops the stack when you press Ctrl+C — fine for debugging, wrong for anything you want to keep running.
3. **`docker compose ps`** and **`docker compose logs web`** — the two commands you use most after `up`. `ps` shows state and port mappings; `logs` shows stdout/stderr from a service. Add `-f` to follow.
4. **`docker compose down`** — stops and removes the containers *and* the network. It does **not** remove named volumes, so database data survives a `down` unless you add `-v`.

# Mistakes I see in every beginner batch

- **Running the commands from the wrong directory.** Compose looks for `docker-compose.yml` (or `compose.yaml`) in the current directory. If you are in `/home/dev` instead of `/app`, you get `no configuration file provided: not found`. Either `cd /app` first or pass `-f /app/docker-compose.yml`.
- **Typing `docker-compose` with a hyphen.** That is the old Python v1 tool, removed in 2023. Modern Docker ships Compose v2 as a plugin: `docker compose` with a space.
- **Forgetting `-d`, then closing the terminal.** The stack dies with the shell. If you did this, just run `up -d` again — Compose is idempotent and will only recreate what changed.
- **Using `docker rm` on compose-managed containers.** It works, but Compose then loses track of them. Always use `down` (or `stop`/`rm` through Compose) so the project state stays consistent.
- **Expecting MySQL to come up without a root password.** The official image refuses to start unless `MYSQL_ROOT_PASSWORD` (or one of its alternatives) is set. In this simulated lab the container starts either way; on a real host you would add an `environment:` block to the `db` service.

# How the lab scores you

The terminal below checks each objective as you type. Reading the file, building, starting detached and tearing down are worth 25 points each. You can retype a command if you make a mistake — only correct commands count. When you finish, download the scorecard; the lab does not store anything on a server, so keep the file if you want it.

# Where to go next

Once this feels easy, try the **Docker Networking** and **Docker Volumes** labs on this site — they cover the two things this compose file deliberately leaves out: how `web` actually reaches `db`, and how to stop losing your database every time you run `down -v`.
