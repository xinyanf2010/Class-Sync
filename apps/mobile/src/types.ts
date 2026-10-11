/** Payload the JoinScreen receives from POST /api/join and passes downstream. */
export interface JoinInfo {
  classroomId: string;
  sessionId: string;
  studentId: string;
  name: string;
}