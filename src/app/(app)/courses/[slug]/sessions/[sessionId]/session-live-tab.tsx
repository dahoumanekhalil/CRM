import { hasPermission } from "@/lib/permissions";
import { auth } from "@/auth";
import { LiveSessionPanel } from "@/components/livekit/live-session-panel";
import { ParticipantList } from "@/components/livekit/participant-list";
import { PollHistory } from "@/components/livekit/poll-history";
import { QAHistory } from "@/components/livekit/qa-history";
import {
  SessionAnalyticsOverview,
  CourseRollupCard,
} from "@/components/livekit/session-analytics";
import { StudentLiveView } from "@/components/livekit/student-live-view";
import { format } from "date-fns";
import {
  getLiveSession,
  getAllLiveSessions,
  createLiveSession,
  goLive,
  endLiveSession,
  cancelLiveSession,
  reRunLiveSession,
  admitWaitingParticipant,
  rejectWaitingParticipant,
  muteParticipantTrack,
  kickParticipant,
  muteAllParticipants,
  toggleRoomLock,
  grantSpeakingPermission,
  revokeSpeakingPermission,
  startRecording,
  stopRecording,
  getRecordingUrl,
  sendChatMessage,
  getChatHistory,
  saveWhiteboardSnapshot,
  getSessionParticipants,
  createPoll,
  submitPollVote,
  closePoll,
  getSessionPolls,
  askQuestion,
  upvoteQuestion,
  updateQuestionStatus,
  getSessionQuestions,
  getSessionAnalytics,
  getCourseSessionsRollup,
  createBreakoutRooms,
  saveBreakoutAssignments,
  closeBreakoutRooms,
  getBreakoutToken,
  joinAsEnrolledStudent,
} from "./live-session-actions";

export async function SessionLiveTab({
  sessionId,
  courseSlug,
  sessionStartDate,
}: {
  sessionId: string;
  courseSlug: string;
  sessionStartDate: Date;
}) {
  const session = await auth();
  const canHost = hasPermission(session?.user?.role, "live.host");
  const canView = hasPermission(session?.user?.role, "live.view");

  if (!canView) {
    return (
      <p className="text-sm text-muted-foreground">
        You don&apos;t have permission to view live session information.
      </p>
    );
  }

  const liveSession = await getLiveSession(sessionId);

  // Fetch participants, polls, Q&A, analytics, rollup, and session history in parallel.
  const [participantsResult, pollsResult, questionsResult, analyticsResult, rollupResult, allSessions] =
    await Promise.all([
      canHost && liveSession ? getSessionParticipants(liveSession.id) : null,
      canHost && liveSession ? getSessionPolls(liveSession.id) : null,
      canHost && liveSession ? getSessionQuestions(liveSession.id) : null,
      canHost && liveSession ? getSessionAnalytics(liveSession.id) : null,
      canHost ? getCourseSessionsRollup(courseSlug) : null,
      canHost ? getAllLiveSessions(sessionId) : Promise.resolve([]),
    ]);

  return (
    <div className="space-y-4">
      {canHost ? (
        <LiveSessionPanel
          initialLiveSession={liveSession}
          courseSessionId={sessionId}
          courseSlug={courseSlug}
          createAction={createLiveSession}
          goLiveAction={goLive}
          endAction={endLiveSession}
          cancelAction={cancelLiveSession}
          admitAction={admitWaitingParticipant}
          rejectAction={rejectWaitingParticipant}
          moderationActions={{
            muteTrack: muteParticipantTrack,
            kick: kickParticipant,
            grantSpeaking: grantSpeakingPermission,
            revokeSpeaking: revokeSpeakingPermission,
            muteAll: muteAllParticipants,
            toggleLock: toggleRoomLock,
          }}
          startRecordingAction={startRecording}
          stopRecordingAction={stopRecording}
          getRecordingUrlAction={getRecordingUrl}
          sendMessageAction={sendChatMessage}
          getChatHistoryAction={getChatHistory}
          saveWhiteboardSnapshotAction={saveWhiteboardSnapshot}
          createPollAction={createPoll}
          submitVoteAction={submitPollVote}
          closePollAction={closePoll}
          askQuestionAction={askQuestion}
          upvoteQuestionAction={upvoteQuestion}
          updateQuestionStatusAction={updateQuestionStatus}
          createBreakoutRoomsAction={createBreakoutRooms}
          saveBreakoutAssignmentsAction={saveBreakoutAssignments}
          closeBreakoutRoomsAction={closeBreakoutRooms}
          getBreakoutTokenAction={getBreakoutToken}
          reRunAction={reRunLiveSession}
        />
      ) : null}

      {/* Session analytics overview — host only, shown when session has ended */}
      {canHost && liveSession && liveSession.endedAt && analyticsResult?.ok && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Session Analytics</h3>
          <SessionAnalyticsOverview analytics={analyticsResult.data} />
        </div>
      )}

      {/* Participant list — host only, shown whenever a live session exists */}
      {canHost && liveSession && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Participants</h3>
            {participantsResult?.ok && (
              <span className="text-xs text-muted-foreground">
                {participantsResult.data.length}{" "}
                {participantsResult.data.length === 1 ? "person" : "people"}
              </span>
            )}
          </div>
          {participantsResult?.ok ? (
            <ParticipantList
              participants={participantsResult.data}
              sessionDurationSeconds={
                analyticsResult?.ok
                  ? analyticsResult.data.sessionDurationSeconds
                  : null
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              {participantsResult?.error ?? "No participant data available."}
            </p>
          )}
        </div>
      )}

      {/* Poll history — host only */}
      {canHost && liveSession && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Polls</h3>
            {pollsResult?.ok && pollsResult.data.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {pollsResult.data.length} {pollsResult.data.length === 1 ? "poll" : "polls"}
              </span>
            )}
          </div>
          {pollsResult?.ok ? (
            <PollHistory polls={pollsResult.data} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {pollsResult?.error ?? "No poll data available."}
            </p>
          )}
        </div>
      )}

      {/* Q&A history — host only */}
      {canHost && liveSession && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">Q&amp;A</h3>
            {questionsResult?.ok && questionsResult.data.length > 0 && (
              <span className="text-xs text-muted-foreground">
                {questionsResult.data.length}{" "}
                {questionsResult.data.length === 1 ? "question" : "questions"}
              </span>
            )}
          </div>
          {questionsResult?.ok ? (
            <QAHistory questions={questionsResult.data} />
          ) : (
            <p className="text-sm text-muted-foreground">
              {questionsResult?.error ?? "No Q&A data available."}
            </p>
          )}
        </div>
      )}

      {/* Course-level rollup — host only */}
      {canHost && rollupResult?.ok && rollupResult.data.sessionsWithLive > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Course Overview</h3>
          <CourseRollupCard rollup={rollupResult.data} />
        </div>
      )}

      {/* 23.1–23.3 — Student-facing live session view */}
      {!canHost && (
        <StudentLiveView
          liveSession={liveSession}
          sessionStartDate={sessionStartDate}
          joinAction={joinAsEnrolledStudent}
          getRecordingUrlAction={getRecordingUrl}
          sendMessageAction={sendChatMessage}
          getChatHistoryAction={getChatHistory}
          askQuestionAction={askQuestion}
          upvoteQuestionAction={upvoteQuestion}
          submitVoteAction={submitPollVote}
        />
      )}

      {/* 32.1 — Session history timeline: shown when there are multiple live sessions */}
      {canHost && allSessions.length > 1 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-foreground">Session History</h3>
          <div className="divide-y divide-border overflow-hidden rounded-lg border">
            {allSessions.map((s, i) => {
              const isCurrentSession = s.id === liveSession?.id;
              const durationSec =
                s.startedAt && s.endedAt
                  ? Math.round((s.endedAt.getTime() - s.startedAt.getTime()) / 1000)
                  : null;
              const statusColors: Record<string, string> = {
                SCHEDULED: "bg-muted text-muted-foreground",
                WAITING: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
                LIVE: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                ENDED: "bg-muted text-muted-foreground",
                RECORDING_PROCESSING: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                COMPLETED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                CANCELLED: "bg-destructive/10 text-destructive",
              };
              const statusLabel: Record<string, string> = {
                SCHEDULED: "Scheduled", WAITING: "Waiting", LIVE: "Live",
                ENDED: "Ended", RECORDING_PROCESSING: "Processing",
                COMPLETED: "Completed", CANCELLED: "Cancelled",
              };
              return (
                <div key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                  <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">
                    #{allSessions.length - i}
                  </span>
                  <span
                    className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium ${statusColors[s.status] ?? "bg-muted text-muted-foreground"}`}
                  >
                    {statusLabel[s.status] ?? s.status}
                  </span>
                  <span className="flex-1 text-muted-foreground">
                    {s.startedAt
                      ? format(s.startedAt, "MMM d, yyyy · HH:mm")
                      : s.scheduledAt
                      ? format(s.scheduledAt, "MMM d, yyyy · HH:mm")
                      : "—"}
                  </span>
                  {durationSec !== null && (
                    <span className="text-xs text-muted-foreground">
                      {Math.floor(durationSec / 60)}m {durationSec % 60}s
                    </span>
                  )}
                  {s.peakParticipants > 0 && (
                    <span className="text-xs text-muted-foreground">
                      {s.peakParticipants} peak
                    </span>
                  )}
                  {s.recordingUrl && (
                    <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Recording
                    </span>
                  )}
                  {isCurrentSession && (
                    <span className="text-xs font-medium text-primary">Current</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
