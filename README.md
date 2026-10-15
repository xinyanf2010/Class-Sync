# ClassSync

A transparent, **student-empowered** focus and digital-responsibility platform for
K-12 classrooms — the antithesis of surveillance-first MDMs like GoGuardian.
Students keep device agency within agreed boundaries; teachers get high-level
visibility, mode-based focus controls, and assessment lock-down.

This repo is a **functional first draft**: every core mechanism works end-to-end
(join → live telemetry → teacher grid → mode/assessment controls), with UI kept
minimal on purpose.

---

## What's implemented

| Concern | Where | Notes |
| :--- | :--- | :--- |
| Shared types + socket contract | `packages/common` | Single source of truth for `Session`, `SessionMode`, `FocusEvent`, event names, thresholds. |
| Auth + RBAC | `apps/server/src/auth.ts` | JWT (12h) on REST + socket handshake; `requireRole` middleware; students can't touch teacher routes/events and vice versa. |
| Socket.io backend | `apps/server` | Express + Socket.io, in-memory store, REST + WebSocket. |
| Session state machine | `apps/server/src/session-manager.ts` | `IDLE → ACTIVE_LEARNING → QUIET_STUDY → ASSESSMENT_LOCK → ENDED`. |
| Grace window + focus scoring | `apps/server` + `apps/mobile` | 10s grace window; −10 focus/infraction; immediate breach under Assessment Lock. |
| Student app lifecycle telemetry | `apps/mobile/src/hooks/useSession.ts` | `AppState` background/foreground → telemetry, heartbeat, reconnection backoff. |
| Student transparency view | `apps/mobile/src/screens/SessionScreen.tsx` | Shows exactly what the teacher sees. |
| Teacher grid | `apps/web/src/app/live/[classId]` | Live cards, mode switcher, ping, unlock, breach alerts. |
| Load test | `scripts/simulate-students.js` | 30 virtual students churning background/foreground. |

## Layout

```
/apps
  /mobile      React Native (Expo) — student app
  /web         Next.js — teacher dashboard
  /server      Node + Express + Socket.io — backend
/packages
  /common      shared TypeScript types & socket constants
  /config      shared ESLint / Prettier config
scripts/
  simulate-students.js
```

## Running it from scratch

**Prerequisites**

- [Node.js](https://nodejs.org/) **≥ 18** (includes npm)
- For the student app on a phone: the free **Expo Go** app
  ([iOS](https://apps.apple.com/app/expo-go/id982107779) /
  [Android](https://play.google.com/store/apps/details?id=host.exp.exponent)),
  or Xcode / Android Studio if you'd rather use a simulator

**Setup**

```bash
# 1. clone the repo
git clone <repo-url>
cd CAC

# 2. install all dependencies (npm workspaces — one install covers every app)
npm install

# 3. start the backend API + WebSocket server (http://localhost:4000)
npm run dev:server
```

On first launch the server seeds demo accounts and a demo class, and writes
them to `apps/server/data/users.json`. That file is the login database — it
persists across restarts, so accounts you create survive a server reboot.
Delete the file to reset everything back to the seed data.

Leave the server running and open two more terminals:

```bash
# 4. teacher dashboard (http://localhost:3000)
npm run dev:web

# 5. student app (Expo dev server)
npm run dev:mobile
```

`dev:mobile` auto-detects your machine's LAN IP and bakes it into
`EXPO_PUBLIC_SERVER_URL`, so a phone running Expo Go can reach the backend —
`localhost` on a phone means the phone itself, not your computer. If the
auto-detection picks the wrong interface, override it:

```bash
EXPO_HOST_IP=<your ip address> npm run dev:mobile
```

Then either press `w` in the Expo terminal to run the student app in a browser,
or scan the QR code with Expo Go on a phone (see
[Connecting a physical phone](#connecting-a-physical-phone) below — the phone
needs your LAN IP instead of `localhost`).

**Environment variables (optional)**

| Variable | Where | Default | Purpose |
| :--- | :--- | :--- | :--- |
| `AUTH_SECRET` | server | built-in dev secret | JWT signing secret — set this in any real deployment |
| `NEXT_PUBLIC_SERVER_URL` | web | `http://localhost:4000` | where the dashboard finds the backend |
| `EXPO_PUBLIC_SERVER_URL` | mobile | `http://localhost:4000` | where the app finds the backend |

### Demo flow

Accounts are centralized — every user signs in with email + password, and the
server enforces roles on every REST route and socket event.

**Seeded demo accounts** (password for all: `demo1234`):

| Role | Email | Can sign in to |
| :--- | :--- | :--- |
| Teacher | `teacher@classsync.demo` | Web dashboard only |
| Student | `alice@classsync.demo` (also `bob@`, `charlie@`, `dana@`, `eli@`) | Mobile app only |

1. Open the dashboard at `http://localhost:3000` — you'll be redirected to
   `/login`. Sign in as the teacher (a student account is rejected there), then
   create a class or use the pre-seeded demo class with join code **`123456`**.
2. In the Expo app, sign in as a student, then enter the 6-digit class code to
   join. (Teacher accounts are refused by the app.) Or simulate a roomful
   instantly:
   ```bash
   npm run simulate
   ```
3. On the dashboard, flip the class between **Active Learning**, **Quiet Study**,
   and **Assessment Lock**, and ping/breach individual students.

Set `AUTH_SECRET` in the server's environment to change the JWT signing secret
(a dev default is used otherwise, with a startup warning).

### Connecting a physical phone

`localhost` won't reach your phone, so point the app at your machine's LAN IP.
The demo class is pre-enrolled with 5 students and a live session, so the
dashboard is populated immediately.

```bash
EXPO_PUBLIC_SERVER_URL=http://<your-lan-ip>:4000 npm run dev:mobile
```

- Find your LAN IP with `ipconfig getifaddr en0` (macOS) or
  `hostname -I` (Linux). It's DHCP-assigned and can change — re-check after a
  network change.
- `dev:mobile` already runs `expo start --host lan` with the startup dependency
  validation disabled (`EXPO_NO_DEPENDENCY_VALIDATION=1`) so Metro doesn't stall
  on **Starting Metro Bundler** (a known hang in hoisted npm-workspace
  monorepos when the network version check blocks). It deliberately does *not*
  use `EXPO_OFFLINE` — full offline mode stops the CLI from opening a
  development session, and Expo Go then refuses the project with a "not signed
  in" error. It also uses a local `apps/mobile/index.js` entry
  instead of Expo's hoisted `expo/AppEntry.js`, which otherwise can't resolve
  its `import App from '../../App'` under hoisting.
- Scan the QR in the terminal with **Expo Go**, or open
  `exp://<your-lan-ip>:8081` directly.
- Point the web dashboard at the same host with `NEXT_PUBLIC_SERVER_URL`.

### Screen-state telemetry (optional native build)

Everything above works in plain **Expo Go** — that's the intended
clone-and-run path. One feature needs a native build instead: telling a
**locked phone** (OFFLINE) apart from an **app switch with the screen on**
(DISTRACTED). That signal comes from a small local Expo module in
[`apps/mobile/modules/screen-state`](apps/mobile/modules/screen-state). In
Expo Go the module isn't compiled in, so it no-ops and presence falls back to
heartbeats only (a backgrounded student eventually shows OFFLINE either way).

To enable it, build a development client in the cloud — no local Xcode,
CocoaPods, or Android SDK required:

```bash
cd apps/mobile
npx eas-cli login                      # free Expo account
npm run build:dev:android              # cloud-builds an APK
npm run build:dev:ios                  # cloud-builds an iOS *simulator* build
```

Then install the build (Android: download the APK; iOS: drag the `.app` into
a Simulator) and run Metro against it:

```bash
npx expo start --dev-client --host lan
```

The iOS build profile targets the Simulator, so no Apple Developer account is
needed. (A physical iPhone would need a paid account plus a different
profile.) On iOS the lock/unlock signal additionally requires the device to
have a passcode set.11
