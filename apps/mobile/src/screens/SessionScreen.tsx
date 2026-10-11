import { useEffect, useState } from 'react';
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Push content below the Expo Go overlay pill (which covers the top edge).
const TOP_INSET = Math.round(Dimensions.get('window').height * 0.10);
import { getSocket } from '../api/socket';
import { useSession } from '../hooks/useSession';
import type { JoinInfo } from '../types';

interface Props {
  join: JoinInfo;
  onLeave: () => void;
}

const MODE_LABELS: Record<string, string> = {
  ACTIVE_LEARNING: 'Active Learning — approved tools available',
  QUIET_STUDY: 'Quiet Study — stay in ClassSync to keep focus',
  ASSESSMENT_LOCK: 'Assessment Lock — do not leave this app',
};

const STATUS_COLORS: Record<string, string> = {
  FOCUSED: '#16a34a',
  DISTRACTED: '#d97706',
  BREACHED: '#dc2626',
  OFFLINE: '#6b7280',
};

export function SessionScreen({ join, onLeave }: Props) {
  const socket = getSocket();
  const live = useSession(
    {
      classroomId: join.classroomId,
      sessionId: join.sessionId,
      studentId: join.studentId,
      name: join.name,
    },
    socket,
  );

  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Assessment lock: full-screen overlay so the student knows to stay put.
  if (live.mode === 'ASSESSMENT_LOCK') {
    return (
      <View style={styles.lockOverlay}>
        <Text style={styles.lockTitle}>Assessment in progress</Text>
        <Text style={styles.lockBody}>
          Stay in ClassSync. Leaving this app will flag a breach to your
          teacher.
        </Text>
        {live.breached ? (
          <Text style={styles.lockBreach}>
            ⚠ Breach detected — return to ClassSync now.
          </Text>
        ) : null}
        <Text style={styles.lockTimer}>{formatElapsed(elapsed)}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>ClassSync</Text>
        <TouchableOpacity onPress={onLeave} style={styles.leaveBtn}>
          <Text style={styles.leaveText}>Leave</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.modeBanner}>
        <Text style={styles.modeText}>{MODE_LABELS[live.mode]}</Text>
      </View>

      {live.lastPingAt ? (
        <View style={styles.pingBanner}>
          <Text style={styles.pingText}>
            👋 Your teacher sent a nudge to stay focused.
          </Text>
          <TouchableOpacity onPress={live.acknowledgePing}>
            <Text style={styles.pingAck}>Got it</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {live.breached ? (
        <View style={styles.breachBanner}>
          <Text style={styles.breachText}>
            ⚠ You left during Assessment Lock. Your teacher has been notified.
          </Text>
        </View>
      ) : null}

      <View style={styles.stats}>
        <Stat label="Focus Score" value={`${live.focusScore}`} />
        <Stat label="Status" value={live.status} color={STATUS_COLORS[live.status]} />
        <Stat label="Time" value={formatElapsed(elapsed)} />
      </View>

      <View style={styles.transparency}>
        <Text style={styles.transparencyTitle}>What your teacher sees</Text>
        <Text style={styles.transparencyLine}>
          • App active status: {live.status === 'FOCUSED' ? 'Active' : 'Away'}
        </Text>
        <Text style={styles.transparencyLine}>• Focus Score: {live.focusScore}%</Text>
        <Text style={styles.transparencyLine}>
          • Test Mode: {live.mode === 'ASSESSMENT_LOCK' ? 'ON' : 'OFF'}
        </Text>
        <Text style={styles.transparencyNote}>
          ClassSync only runs during class and stops when the session ends.
        </Text>
      </View>
    </View>
  );
}

function Stat({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function formatElapsed(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16, paddingTop: 16 + TOP_INSET },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 24, fontWeight: '700' },
  leaveBtn: { padding: 8 },
  leaveText: { color: '#dc2626', fontWeight: '600' },

  modeBanner: {
    backgroundColor: '#2563eb',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
  },
  modeText: { color: '#fff', fontSize: 16, fontWeight: '600', textAlign: 'center' },

  pingBanner: {
    backgroundColor: '#fef3c7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pingText: { color: '#92400e', flex: 1 },
  pingAck: { color: '#2563eb', fontWeight: '700' },

  breachBanner: {
    backgroundColor: '#fee2e2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  breachText: { color: '#991b1b', textAlign: 'center' },

  stats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
  },
  stat: { alignItems: 'center' },
  statValue: { fontSize: 28 },
  statLabel: { color: '#666', marginTop: 4 },

  transparency: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  transparencyTitle: { fontWeight: '700', marginBottom: 8 },
  transparencyLine: { color: '#333', marginBottom: 4 },
  transparencyNote: { color: '#888', fontSize: 12, marginTop: 8 },

  lockOverlay: {
    flex: 1,
    backgroundColor: '#1e293b',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingTop: 24 + TOP_INSET,
  },
  lockTitle: { color: '#fff', fontSize: 28, fontWeight: '800', marginBottom: 16 },
  lockBody: { color: '#cbd5e1', fontSize: 16, textAlign: 'center', marginBottom: 24 },
  lockBreach: { color: '#f87171', fontSize: 16, fontWeight: '700', marginBottom: 24 },
  lockTimer: { color: '#fff', fontSize: 48, fontWeight: '300' },
});