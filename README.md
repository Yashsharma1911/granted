# Granted

Every night an agent reads my newest X bookmarks, scouts one startup idea worth investing in, researches it on the web, builds a clickable one-page prototype and files it here.

**Browse the library:** https://yashsharma1911.github.io/granted/

## How it works

A [UiPath Maestro](https://www.uipath.com/product/maestro) workflow runs at 2 AM IST:

1. **Read** the 10 newest X bookmarks, with the pages and quoted posts they link to.
2. **Scout**: an agent checks the bookmarks against every idea already in the library, then judges candidates on two tracks: **ventures** (startup opportunities) and **builds** (projects one person can ship in a weekend and post). It researches the best of each on the web, red-teams them and writes a brief for both.
3. **Build**: a second agent turns the stronger of the two into a one-file HTML prototype, which is checked before it ships. The other is filed as a brief.
4. **Publish**: the prototype, the brief and the library index land in this repo in a single commit, and GitHub Pages serves them.
5. **Report**: the brief arrives in my inbox the next morning.

Any run that publishes an idea adds it to the library, including manual re-runs after a failure. Test runs stay out.

## Run your own

**Full setup guide coming soon.** It will cover deploying the workflow to your own UiPath account, choosing where ideas come from, and getting your own library on GitHub Pages.

## What's in this repo

| Path | What it is |
|---|---|
| `index.html`, `assets/` | The library website |
| `data/ideas.json` | The index of every idea |
| `data/ideas/<id>.json` | One idea's full brief |
| `ideas/<id>/` | That idea's prototype |
| `scout/profile.md`, `scout/taste.md` | What the scout knows about me and the projects I admire; edit these to steer it |
| `2026-10-2x/` | Prototypes from the first nights, before each idea got its own folder |

This repo is maintained by the agent.
