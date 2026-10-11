import { useEffect, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// Push content below the Expo Go overlay pill (which covers the top edge).
const TOP_INSET = Math.round(Dimensions.get('window').height * 0.10);
import { getToken } from '../api/auth';
import { getSocket } from '../api/socket';
import { SERVER_URL } from '../config';
import type { JoinInfo } from '../types';

interface Props {
  studentName: string;
  onJoined: (info: JoinInfo) => void;
  onSignOut: () => void;
}

interface SavedClass {
  id: string;
  name: string;
  code: string;
}

export function JoinScreen({ studentName, onJoined, onSignOut }: Props) {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);
  const [savedClasses, setSavedClasses] = useState<SavedClass[]>([]);

  useEffect(() => {
    // Classes the student has joined before — persisted on the server.
    fetch(`${SERVER_URL}/api/me/classes`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then((r) => (r.ok ? r.json() : []))
      .then(setSavedClasses)
      .catch(() => {});
  }, []);

  const joinWith = async (classCode: string) => {
    if (classCode.trim().length !== 6) {
      setError('Enter the 6-digit class code from your teacher.');
      return;
    }
    setJoining(true);
    setError(null);
    try {
      const res = await fetch(`${SERVER_URL}/api/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify({ code: classCode.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? 'Could not join. Check the code and try again.');
        return;
      }
      const info: JoinInfo = await res.json();
      getSocket(); // establish the socket before handing off to the session
      onJoined(info);
    } catch {
      setError('Network error. Is the ClassSync server running?');
    } finally {
      setJoining(false);
    }
  };

  const removeClass = async (id: string) => {
    try {
      const res = await fetch(`${SERVER_URL}/api/me/classes/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setSavedClasses((prev) => prev.filter((c) => c.id !== id));
      }
    } catch {
      // ignore — the list will resync on next load
    }
  };

  return (
    <Pressable style={{ flex: 1 }} onPress={Keyboard.dismiss}>
      <View style={styles.container}>
      <Text style={styles.title}>ClassSync</Text>
      <Text style={styles.subtitle}>Hi {studentName} — join your class</Text>
      <TouchableOpacity style={styles.signOut} onPress={onSignOut}>
        <Text style={styles.signOutText}>Sign out</Text>
      </TouchableOpacity>

      {savedClasses.length > 0 ? (
        <View style={styles.savedSection}>
          <Text style={styles.savedHeading}>Your classes</Text>
          {savedClasses.map((c) => (
            <View key={c.id} style={styles.savedRow}>
              <View style={styles.savedInfo}>
                <Text style={styles.savedName}>{c.name}</Text>
                <Text style={styles.savedCode}>Code {c.code}</Text>
              </View>
              <TouchableOpacity
                style={styles.savedJoin}
                onPress={() => joinWith(c.code)}
                disabled={joining}
              >
                <Text style={styles.savedJoinText}>Join</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.savedRemove}
                onPress={() => removeClass(c.id)}
              >
                <Text style={styles.savedRemoveText}>✕</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      ) : null}

      <TextInput
        style={styles.input}
        placeholder="6-digit class code"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
        returnKeyType="join"
        onSubmitEditing={() => joinWith(code)}
        blurOnSubmit
      />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TouchableOpacity
        style={[styles.button, joining && styles.buttonDisabled]}
        onPress={() => joinWith(code)}
        disabled={joining}
      >
        <Text style={styles.buttonText}>
          {joining ? 'Joining…' : 'Join New Class'}
        </Text>
      </TouchableOpacity>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 24 + TOP_INSET,
    backgroundColor: '#fff',
  },
  title: { fontSize: 32, fontWeight: '700', textAlign: 'center' },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  savedSection: { marginBottom: 24 },
  savedHeading: {
    fontSize: 14,
    fontWeight: '700',
    color: '#666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  savedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  savedInfo: { flex: 1 },
  savedName: { fontSize: 16, fontWeight: '600' },
  savedCode: { fontSize: 12, color: '#888', marginTop: 2 },
  savedJoin: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  savedJoinText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  savedRemove: { padding: 6 },
  savedRemoveText: { color: '#dc2626', fontSize: 16, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  error: { color: '#c00', marginBottom: 12, textAlign: 'center' },
  button: {
    backgroundColor: '#2563eb',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signOut: { alignSelf: 'center', marginTop: 24, padding: 8 },
  signOutText: { color: '#dc2626', fontSize: 14, fontWeight: '600' },
});
