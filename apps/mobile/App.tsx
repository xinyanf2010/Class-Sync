import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { signOut } from './src/api/auth';
import { disconnectSocket } from './src/api/socket';
import { JoinScreen } from './src/screens/JoinScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SessionScreen } from './src/screens/SessionScreen';
import type { JoinInfo } from './src/types';

export default function App() {
  const [studentName, setStudentName] = useState<string | null>(null);
  const [join, setJoin] = useState<JoinInfo | null>(null);

  if (!studentName) {
    return (
      <>
        <StatusBar style="auto" />
        <LoginScreen onLoggedIn={setStudentName} />
      </>
    );
  }

  if (!join) {
    return (
      <>
        <StatusBar style="auto" />
        <JoinScreen
          studentName={studentName}
          onJoined={setJoin}
          onSignOut={() => {
            disconnectSocket();
            signOut();
            setStudentName(null);
          }}
        />
      </>
    );
  }

  return (
    <>
      <StatusBar style="light" />
      <SessionScreen
        join={join}
        onLeave={() => {
          disconnectSocket();
          setJoin(null);
        }}
      />
    </>
  );
}
