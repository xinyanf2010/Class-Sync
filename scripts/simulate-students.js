#!/usr/bin/env node
/**
 * Load-test / demo harness for ClassSync.
 *
 * Connects N virtual students to a running server, has them join the demo
 * class, send heartbeats, and randomly background/foreground their app to
 * exercise the focus-telemetry pipeline and the teacher grid.
 *
 * Usage:
 *   node scripts/simulate-students.js
 *   COUNT=30 CLASS_CODE=123456 node scripts/simulate-students.js
 *
 * NOTE: event names are inlined as strings here because this plain-node script
 * cannot require the TypeScript source of `@classsync/common`. They must match
 * the EVENTS map in packages/common/src/constants.ts.
 */
const { io } = require('socket.io-client');

const SERVER = process.env.SERVER_URL ?? 'http://localhost:4000';
const CODE = process.env.CLASS_CODE ?? '123456';
const COUNT = Number(process.env.COUNT ?? 30);

async function joinClass(i) {
  const res = await fetch(`${SERVER}/api/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: CODE, name: `Student ${i}` }),
  });
  if (!res.ok) throw new Error(`join failed (${res.status})`);
  return res.json();
}

function simulateStudent(i) {
  return joinClass(i).then((info) => {
    const socket = io(SERVER, { transports: ['websocket'] });

    socket.on('connect', () => {
      socket.emit('client:join_session', {
        classroomId: info.classroomId,
        sessionId: info.sessionId,
        studentId: info.studentId,
        name: info.name,
        role: 'STUDENT',
      });

      // Liveness heartbeat.
      setInterval(() => {
        socket.emit('student:heartbeat', { studentId: info.studentId });
      }, 5000);

      // Randomly background and (sometimes much later) foreground the "app".
      const churn = () => {
        setTimeout(() => {
          if (!socket.connected) return;
          const { studentId, sessionId } = info;
          const ts = () => new Date().toISOString();
          socket.emit('client:state_change', {
            studentId,
            sessionId,
            event: 'APP_BACKGROUNDED',
            timestamp: ts(),
          });
          setTimeout(() => {
            socket.emit('client:state_change', {
              studentId,
              sessionId,
              event: 'APP_FOREGROUNDED',
              timestamp: ts(),
            });
            churn();
            // Long enough to cross the 30s grace window, so the demo still
            // exercises the DISTRACTED -> 'Away since' path.
          }, 20000 + Math.random() * 30000);
        }, 3000 + Math.random() * 7000);
      };
      churn();
    });
  });
}

(async () => {
  console.log(
    `Simulating ${COUNT} students against ${SERVER} (class code ${CODE})…`,
  );
  const tasks = [];
  for (let i = 1; i <= COUNT; i++) tasks.push(simulateStudent(i));
  await Promise.all(tasks);
  console.log('All students joined. Press Ctrl+C to stop.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});