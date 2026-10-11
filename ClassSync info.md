# CLAUDE.md - Development Guide for ClassSync

## Project Overview
**ClassSync** (or *FocusBridge*) is a modern, collaborative focus and digital responsibility platform built specifically for K-12 classrooms. Unlike traditional, authoritative device-management systems (e.g., GoGuardian, Securly, Lightspeed) that rely on covert surveillance, total site blocks, and heavy-handed filtering, **ClassSync** operates on a **transparent, student-empowered model**.

It enables schools to embrace mobile devices as educational tools rather than banning them outright. Students retain device agency within agreed-upon boundaries, while teachers gain high-level visibility, mode-based focus controls, and assessment lock-down capabilities.

---

## Differentiators: ClassSync vs. Legacy School MDMs (GoGuardian, etc.)

| Feature / Dimension | Legacy Systems (GoGuardian, Securly, etc.) | ClassSync (Our App) |
| :--- | :--- | :--- |
| **Philosophy & Culture** | Surveillance, distrust, covert tracking, restrictive bans. | Transparency, digital responsibility, student agency, trust-building. |
| **Privacy & Visibility** | Permanent, hidden background daemon; logs all web activity 24/7. | **Session-Based & Opt-In:** Active ONLY during explicit class session windows. |
| **Student Experience** | Black-box blocking screens ("Site Blocked by Admin"); zero feedback. | **Live Focus Dashboard:** Students see their own focus score, active mode, and allowable apps. |
| **Control Mechanism** | Strict URL blacklists/whitelists enforced at OS/DNS level. | **Intentional Focus Modes:** Soft nudges, gamified focus metrics, and voluntary self-regulation before hard lock. |
| **BYOD / Mobile Support** | Primary focus on school-owned Chromebooks/Laptops; mobile apps are cumbersome or invasive MDM profiles. | **Native Mobile-First Design:** Lightweight iOS/Android app designed for personal smartphones without needing invasive MDM device takeover. |
| **Test Mode Security** | Kiosk-mode overrides that require deep device enrolled management. | **Assessment Isolation Mode:** Lightweight, event-driven app lock with instant telemetry alerts on backgrounding/app-switching. |

---

## Technical Architecture & Tech Stack

### Recommended Stack
- **Mobile Frontend (Student App):** React Native (Expo) or Flutter for cross-platform iOS & Android support.
- **Web Dashboard (Teacher App):** React.js / Next.js with Tailwind CSS for clean, high-density grid layouts.
- **Backend Service:** Node.js (TypeScript) with Express or NestJS.
- **Real-Time Communication:** WebSockets (`socket.io`) or Firebase Realtime Database / Firestore listeners.
- **Database:** PostgreSQL (for relational data: users, classes, sessions) + Redis (for real-time session state & active presence).
- **Authentication:** JWT + Role-Based Access Control (RBAC) supporting `STUDENT`, `TEACHER`, `PARENT`, and `ADMIN`.

### System Architecture Diagram Logic
```
  [ Student Mobile App ]  <--->  [ WebSocket Gateway / Server ]  <--->  [ Teacher Web Dashboard ]
           |                                  |                                   |
    (App State,                     (Session Orchestration,             (Live Grid Monitoring,
   Backgrounding,                    Focus Telemetry, Mode              Focus Mode Toggles,
  Assessment Events)                     State Store)                   Assessment Trigger)
```

---

## Key Modules & Core Implementation Details

### Module 1: Session State Machine & Real-Time Sync Engine
Every class period operates as a discrete **Session**. Sessions transition through states:
`IDLE` -> `ACTIVE_LEARNING` -> `QUIET_STUDY` -> `ASSESSMENT_LOCK` -> `ENDED`.

#### State Definitions
1. **`ACTIVE_LEARNING` (Open/Permissive):**
   - Students can use approved tools (calculators, dictionary, research sites, classroom tools).
   - Phone screen is monitored via periodic heartbeats and active-app status.
2. **`QUIET_STUDY` (Nudge Mode):**
   - If student leaves ClassSync, a gentle local notification fires: *"ClassSync is paused. Return to stay focused!"*
   - Focus Score degrades over time spent outside the app.
3. **`ASSESSMENT_LOCK` (Strict Mode):**
   - Hard lock state. If the student switches apps or minimizes ClassSync, an immediate violation alert (`EVENT_ASSESSMENT_BREACH`) is broadcast to the teacher's dashboard.

### Module 2: Student Focus Telemetry & Active-Window Detection
Since ClassSync avoids invasive MDM root permissions, it uses native mobile lifecycle hooks to track focus integrity:

#### Implementation Logic (React Native / Native Bridge Example)
- Listen to `AppState` transitions (`active` -> `background` -> `inactive`).
- When `AppState` moves to `background` during an active class session:
  1. Record timestamp `t_exit`.
  2. Emit WebSocket message: `socket.emit('student_status_change', { studentId, status: 'BACKGROUNDED', exitTime: t_exit })`.
  3. Start a local grace timer (e.g., 10 seconds).
  4. If user returns within grace window, issue a "Focus Re-established" event.
  5. If user remains backgrounded after grace window:
     - Deduct points from current Session Focus Score.
     - Update Teacher Dashboard card status to `YELLOW` (Distracted) or `RED` (Breached).

### Module 3: Teacher Dashboard & Student Card Grid
The teacher view must handle high-concurrency real-time updates without re-rendering the entire grid.

#### UI Specs
- Grid view displaying student cards with status indicators:
  - **Green Badge:** Focused / In ClassSync or allowed app.
  - **Yellow Badge:** App backgrounded for > 10s (Soft warning).
  - **Red / Flash Badge:** Assessment Breach / Out of sync during Test Mode.
- Quick action controls:
  - `Toggle Mode`: Shift entire class between *Active Learning*, *Quiet Study*, and *Assessment Lock*.
  - `Ping Student`: Send a gentle, direct focus nudge to a specific student's screen.
  - `Unlock Student`: Override an assessment breach flag.

### Module 4: Student Agency & Transparency View
To uphold the non-authoritative philosophy:
- Students can see **exactly what data is transmitted** (e.g., "Teacher sees: App Active status, Focus Score: 94%, Test Mode: ON").
- **No Background Surveillance Outside Class:** Once session status = `ENDED`, all event listeners and WebSocket sockets terminate immediately.
- **Focus Streaks & Gamification:** Students earn daily/weekly focus points for remaining in-bounds during class, promoting healthy digital habits.

---

## Step-by-Step Development Instructions

### Phase 1: Environment Setup & Project Structure
1. Monorepo setup using Turborepo or NPM Workspaces:
   ```
   /apps
     /mobile      # React Native Expo (Student app)
     /web         # Next.js / Tailwind (Teacher dashboard)
   /packages
     /common      # Shared TypeScript types, schemas, constants
     /config      # Eslint, Prettier, Tailwind configurations
   ```
2. Define common types in `/packages/common/src/types.ts`:
   - `User`, `Classroom`, `Session`, `SessionMode`, `FocusEvent`, `TelemetryPayload`.

### Phase 2: Database Schema & Authentication
1. Setup PostgreSQL with Prisma or Drizzle ORM.
2. Tables required:
   - `users` (id, email, role, name)
   - `classrooms` (id, code, teacher_id, name)
   - `enrollments` (id, classroom_id, student_id)
   - `sessions` (id, classroom_id, mode, started_at, ended_at)
   - `focus_logs` (id, session_id, student_id, event_type, duration_seconds)
3. Implement JWT-based authentication with role claim validation middleware.

### Phase 3: Real-Time WebSocket Engine
1. Setup Socket.io on Express backend.
2. Implement room scoping: `socket.join(`room:classroom:${classId}`)`.
3. Handle key events:
   - `client:join_session`
   - `client:state_change` (Student app state change)
   - `teacher:set_mode` (Teacher changing session mode)
   - `teacher:ping_student` (Nudge action)
   - `server:broadcast_grid_state` (Periodic or delta state updates to teacher grid)

### Phase 4: Mobile App (Student) Core Logic
1. Build authentication flow & class join code interface.
2. Construct Active Session Screen:
   - Display current mode banner (e.g., "Active Learning Mode - Free Access").
   - Display live timer and personal Focus Score.
   - Implement `AppState` listener hook:
     ```typescript
     useEffect(() => {
       const subscription = AppState.addEventListener('change', nextAppState => {
         if (nextAppState === 'background') {
           sendTelemetryEvent('APP_BACKGROUNDED');
         } else if (nextAppState === 'active') {
           sendTelemetryEvent('APP_FOREGROUNDED');
         }
       });
       return () => subscription.remove();
     }, [sessionId]);
     ```
3. Implement Assessment Lock UI: Full-screen overlay when teacher activates `ASSESSMENT_LOCK` mode with immediate exit-detection telemetry.

### Phase 5: Web Dashboard (Teacher) UI & Real-Time Sync
1. Class Management page: Create class, generate 6-digit student join code.
2. Live Session Dashboard:
   - Real-time grid showing cards for each enrolled student.
   - Header toolbar with Mode Switcher (`Active Learning`, `Quiet Study`, `Assessment Lock`).
   - Sound / visual notification triggers when a student triggers an assessment breach during test mode.
3. Post-Class Summary Analytics:
   - Class-wide focus index graph.
   - List of total focus nudges sent vs. self-corrected returns.

---

## Guidelines for Code Quality & Performance

1. **Low-Latency Telemetry:** Keep WebSocket payloads lightweight. Send delta updates (`{ studentId: "123", status: "BG" }`) rather than full state snapshots.
2. **Graceful Reconnection:** Mobile network drops happen frequently in school buildings. Implement exponential backoff reconnection logic in Socket.io client.
3. **Battery & CPU Efficiency:** Avoid heavy background polling loops on mobile devices. Rely on event-based hooks (`AppState`, `NetInfo`).
4. **Privacy First:** Ensure no personal device files, search history, or outside-app data are scraped or transmitted. Audit all telemetry data structures to verify student privacy compliance (FERPA/COPPA compliance considerations).

---

## Verification & Testing Strategy

- **Simulated Multi-Client Test:** Create a script (`scripts/simulate-students.js`) that connects 30 virtual WebSocket clients simulating student app-switching and telemetry payloads to benchmark dashboard performance.
- **Assessment Lock Edge Cases:** Test app behavior on mobile when receiving incoming calls, notifications, or low-battery popups to distinguish between deliberate app switching and system overlays.