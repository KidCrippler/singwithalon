# CLAUDE.md

This repository contains **two independent projects** that both serve Alon Cohen's
sing-along business but share no code, dependencies, or deployment. Treat them
separately — a change in one never affects the other.

| Directory   | What it is                          | Read its own guide            |
|-------------|-------------------------------------|-------------------------------|
| `react-app/`| Public marketing website (Hebrew/RTL)| `react-app/CLAUDE.md`         |
| `platform/` | Real-time multi-tenant sing-along app| `platform/CLAUDE.md`          |

**Before working on anything, open the relevant subdirectory's `CLAUDE.md`** — it
has that project's tech stack, commands, conventions, and gotchas.

> Note: the root `package.json` `npm run dev` script starts **platform only**.
> Each project also has its own `package.json` and is run from inside its own directory.
