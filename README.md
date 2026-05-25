# Cookie Bridge — Cookie Clicker API Mod

A full REST API bridge for Cookie Clicker v2.053 (Steam/Electron).  
Exposes complete game state and all actions over HTTP on `localhost:8000`.

## What it does

- **52+ REST endpoints** — read state, buy buildings/upgrades, cast spells, manage garden, stock market, dragon auras, wrinklers, seasons, prestige/legacy
- **Live View** — floating in-game overlay with real-time stats, minigame cards, buff alerts
- **Evolution Charts** (`/charts`) — historical CpS, bank, buildings, upgrades, prestige, legacy across all rebirths
- **Auto-save DB** — full game snapshot every 5 min to `%USERPROFILE%\CookieBridge\saves.ndjson` (includes Export Save string for restore)
- **Docs** (`/docs`) — interactive API reference with all routes, parameters, and examples

## Install

> Requires Windows. Run as **Administrator**.

```powershell
# 1. Clone
git clone https://github.com/ToDyNh0/cookie-clicker-API-mod.git
cd cookie-clicker-API-mod

# 2. Install (replaces start.js + installs mod)
.\install.ps1
```

Then start Cookie Clicker and open **http://localhost:8000/docs**

## Uninstall

```powershell
.\uninstall.ps1
```

Restores the original `start.js` and removes the mod folder.

## Structure

```
start.js          ← patched Cookie Clicker server (replaces resources/app/start.js)
mod_api/
  main.js         ← in-game mod (reads Game.* and pushes state to the server)
  info.txt        ← mod metadata
install.ps1       ← copies files to the correct Steam paths
uninstall.ps1     ← restores originals
```

## Key endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Status / health check |
| GET | `/docs` | Full interactive API reference |
| GET | `/state` | Complete game state snapshot |
| GET | `/stats` | All stats with `Game.*` source annotations |
| GET | `/charts` | Evolution charts UI |
| POST | `/action/enqueue` | Queue any game action |
| POST | `/action/buy/build/{name}/{qty}` | Buy buildings |
| POST | `/action/buy/upgrade/{name}` | Buy upgrade |
| GET | `/db/history` | Historical save data (timeseries) |
| POST | `/db/save/now` | Trigger immediate DB snapshot |

## DB saves location

```
%USERPROFILE%\CookieBridge\saves.ndjson
```

Each line is a JSON snapshot: stats + full base64 save string (identical to in-game Export Save).  
Cap: 200 MB with 80% rotation.

## Requirements

- Cookie Clicker v2.053 (Steam)
- Windows (PowerShell install script)
- No extra dependencies — uses Node.js bundled with Electron
