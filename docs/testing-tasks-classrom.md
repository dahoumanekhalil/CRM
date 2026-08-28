Here is a step-by-step manual testing guide for phases 0–10, one phase
at a time.

---

Prerequisites — before testing anything

# Start the full stack

docker compose up -d # LiveKit, Egress, MinIO, Redis,
Postgres
npm run dev # Next.js

Make sure you have:

- At least 2 browser windows (one Trainer, one Student) — use normal +
  incognito
- A Course with a CourseSession in the DB
- A Student with a confirmed Registration on that CourseSession
- A Trainer user with TRAINER role

---

Phase 0 — Baseline Audit

What to verify: The original POC still works.

1. Open /live-test — you should see a room-join form, no errors
2. Enter any room name → join → camera/mic should work
3. Open /join/[room] with a room name → guest join should work
4. Run npx tsc --noEmit → 0 errors
5. Run npm run lint → 0 errors
6. Run npm run build → clean build

Pass if: All 6 steps succeed with no errors.

---

Phase 1 — Live Session Domain

What to verify: A LiveSession is tied to a CourseSession and has a
lifecycle.

1. Navigate to a Course → click a Session → open the Live tab
2. You should see a "Set Up" or "Go Live" button (not just a blank
   tab)
3. Click Set Up → a LiveSession record should be created (SCHEDULED
   status)
4. Click Go Live → status changes to LIVE; room name is visible (not
   guessable — should look like live-{24hexchars})
5. Click End → status changes to ENDED
6. Verify /live-test still works (guest join, camera, mic)

Pass if: Status transitions SCHEDULED → LIVE → ENDED work cleanly and
the room name is not a readable slug.

---

Phase 2 — Role-Gated Classroom

What to verify: Trainer and Student get different permissions.

1. As Trainer → Go Live on a session → join the room → you should have
   camera + mic + screen share available
2. Open incognito → log in as Student → join the same session → you
   should have no camera/mic controls by default (subscribe-only)
3. As Trainer → in the moderator panel, find the student → click Allow
   Mic → student's mic button should activate
4. Trainer revokes → student's mic is disabled again

Pass if: Trainer has full publish rights, student starts muted, and
permission grant/revoke works.

---

Phase 3 — Course/Student Access Control

What to verify: Only enrolled students and assigned trainers can
enter.

1. Log in as a user with no enrollment on the course → try to join the
   live session → should get an authorization error, not enter the room
2. Log in as enrolled Student (CONFIRMED/ATTENDING/PENDING
   Registration) → join → should succeed
3. Try to manually supply a different room name in the URL → server
   should resolve liveSessionId → roomName from DB, not from the client;
   tampering should fail

Pass if: Unenrolled users are blocked; enrolled users enter; room name
is resolved server-side.

---

Phase 4 — Waiting Room

What to verify: Students wait until admitted.

1. Trainer goes live
2. Student joins → should land on a waiting screen (course name,
   "waiting for trainer to admit you", countdown)
3. Trainer sees student in the waiting list with Admit / Reject
   buttons
4. Trainer clicks Admit → student enters the classroom
5. Trainer clicks Reject on a second student → student gets a
   rejection message, does not enter

Pass if: Student holds in waiting room, trainer sees the list,
admit/reject both work.

---

Phase 5 — Trainer Moderation

What to verify: Full moderation panel works.

1. With 2+ students in the room as trainer:


    - Click Mute All → all students' mics go silent
    - Click Mute on one student → that student is muted
    - Click Disable Video on a student → their camera is force-disabled
    - Click Remove on a student → they are kicked out of the room

2. Click Lock Classroom → try to join as a new student → should be
   blocked
3. Click End Session → session status → ENDED, all participants
   disconnected

Pass if: All 6 moderation actions work without errors.

---

Phase 6 — Automatic Attendance

What to verify: Webhook-driven attendance records.

1. Make sure LIVEKIT_WEBHOOK_SECRET is configured and the webhook URL
   POST /api/livekit/webhook is reachable by your LiveKit server
2. Student joins a live session → wait ~10 seconds
3. Check DB: Attendance table should have a row with joinedAt set,
   checkInMethod = "livekit"
4. Student disconnects → leftAt and durationSeconds should be
   populated
5. Student reconnects and disconnects again → durationSeconds should
   accumulate (not restart)
6. Trigger the same webhook event twice (replay the request with the
   same event ID) → attendance record must not double-count

Pass if: joinedAt/leftAt/durationSeconds are correct; reconnects
accumulate; duplicate events are no-ops.

---

Phase 7 — Server-Side Recording

What to verify: Egress recording starts/stops server-side.

1. Trainer goes live → in the trainer UI, click Start Recording
2. DB: LiveSession.egressId should be populated; a spinner/indicator
   shows "recording"
3. Wait 15–30 seconds → click Stop Recording
4. DB: LiveSession.status → RECORDING_PROCESSING; egressId cleared
5. Check MinIO (open http://localhost:9001 → bucket) → an .mp4/.webm
   file should appear
6. Once Egress finishes, the webhook fires egress_ended →
   LiveSession.status → COMPLETED; recordingUrl is populated

Pass if: egressId is set on start, file appears in MinIO, status
transitions to COMPLETED after egress webhook.

---

Phase 8 — Recording Storage & Replay

What to verify: Recordings are secure and playable.

1. After Phase 7, the session card should show a Watch Recording
   button
2. Clicking it opens a dialog with a <video> player — the URL should
   be a signed URL (contains a X-Amz-Signature or Expires query param),
   not the raw MinIO path
3. The signed URL should expire — copy it, wait >1 hour (or shorten
   TTL for testing to 1 min), paste URL directly → should get 403 or
   expired error
4. Log in as a user with no enrollment → try to call getRecordingUrl
   server action for that session → should be blocked (403)
5. Log in as enrolled Student → call works → video plays

Pass if: Signed URL works for authorized users; raw storage URL is
inaccessible; unauthorized users are blocked.

---

Phase 9 — Persistent Chat

What to verify: Chat survives reconnects and is available
post-session.

1. Open live session as Trainer and Student
2. Both send several messages → messages appear in real-time for both
3. Student disconnects and reconnects → old messages must still be
   visible (loaded from DB, not lost)
4. End the session → navigate back to the session's Live tab → chat
   history should still show all messages
5. Unread badge: close the chat panel → have the other user send a
   message → badge appears on the Chat button in the header

Pass if: Messages persist across reconnects; chat history visible
post-session; unread badge works.

---

Phase 10 — Whiteboard v2

What to verify: Whiteboard is persisted and tied to the session.

1. Trainer goes live → opens the whiteboard panel → draws something
2. Wait ~10 seconds (10s debounce) → DB:
   LiveSession.whiteboardSnapshot should be a non-null JSON blob
3. Student joins → opens the whiteboard → should see the trainer's
   drawing immediately (not a blank board)
4. End the session → on the session card, click View Whiteboard → a
   read-only tldraw view opens showing the saved snapshot
5. Try to draw on the read-only view → brush/tools should be disabled

Pass if: Snapshot saves within ~10s, new joiners see persisted state,
post-session view is read-only.

---

Summary checklist

┌───────┬──────────────────┬──────────────────────────────────────┐
│ Phase │ Key check │ Pass indicator │
├───────┼──────────────────┼──────────────────────────────────────┤
│ 0 │ POC + build │ /live-test works, TS/lint/build │
│ │ │ clean │
├───────┼──────────────────┼──────────────────────────────────────┤
│ 1 │ Live tab + │ SCHEDULED → LIVE → ENDED │
│ │ lifecycle │ │
├───────┼──────────────────┼──────────────────────────────────────┤
│ 2 │ Role tokens │ Trainer has mic, student starts │
│ │ │ muted │
├───────┼──────────────────┼──────────────────────────────────────┤
│ 3 │ Access control │ Unenrolled blocked, room name from │
│ │ │ DB │
├───────┼──────────────────┼──────────────────────────────────────┤
│ 4 │ Waiting room │ Student waits, trainer │
│ │ │ admits/rejects │
├───────┼──────────────────┼──────────────────────────────────────┤
│ 5 │ Moderation │ All 6 actions work │
├───────┼──────────────────┼──────────────────────────────────────┤
│ 6 │ Attendance │ DB rows created, reconnect │
│ │ │ accumulates, no dups │
├───────┼──────────────────┼──────────────────────────────────────┤
│ 7 │ Egress recording │ File in MinIO, status → COMPLETED │
├───────┼──────────────────┼──────────────────────────────────────┤
│ 8 │ Secure replay │ Signed URL, unauthorized blocked │
├───────┼──────────────────┼──────────────────────────────────────┤
│ 9 │ Persistent chat │ History after reconnect + │
│ │ │ post-session │
├───────┼──────────────────┼──────────────────────────────────────┤
│ 10 │ Whiteboard │ Snapshot persists, read-only │
│ │ │ post-session │
└───────┴──────────────────┴──────────────────────────────────────┘

Start Phase 0 first — if TypeScript or the build fails, nothing else
is worth testing until it's clean.

✻ Cogitated for 59s

❯ HOW TO DO THIS "Phase 1 — Live Session Domain

    What to verify: A LiveSession is tied to a CourseSession and has a
    lifecycle.

    1. Navigate to a Course → click a Session → open the Live tab
    2. You should see a "Set Up" or "Go Live" button (not just a blank
    tab)
    3. Click Set Up → a LiveSession record should be created (SCHEDULED
    status)
    4. Click Go Live → status changes to LIVE; room name is visible

(not  
 guessable — should look like live-{24hexchars})  
 5. Click End → status changes to ENDED  
 6. Verify /live-test still works (guest join, camera, mic)

    Pass if: Status transitions SCHEDULED → LIVE → ENDED work cleanly

and  
 the room name is not a readable slug."

● Let me look at the actual code to give you exact navigation steps.

Read 4 files (ctrl+o to expand)

● Now I have everything I need. Here is the exact step-by-step guide
based on the real code:

---

Phase 1 — Exact Steps

Step 1 — Start the stack

docker compose up -d # LiveKit, Redis, Postgres, MinIO  
 npm run dev # Next.js on http://localhost:3000

Make sure Docker Desktop shows all containers green before continuing.

---

Step 2 — Log in as a user with live.host permission

The SessionLiveTab checks hasPermission(role, "live.host"). From the
code, only ADMIN, MANAGER, or TRAINER roles have this. Log in with one
of those accounts at http://localhost:3000.

---

Step 3 — Navigate to a Course Session

http://localhost:3000/courses
→ click a course
→ click any session in the list
→ you land on: /courses/[slug]/sessions/[sessionId]

---

Step 4 — Open the Live tab

Click the Live tab in the tab bar (it has a radio-wave icon). The URL
becomes:

/courses/[slug]/sessions/[sessionId]?tab=live

You should see a "Set Up Live Session" button (not a blank screen). If
you see "You don't have permission to view live session information",
your user's role is wrong — fix the role in the DB.

---

Step 5 — Click "Set Up"

Clicking it calls createLiveSession(courseSessionId, courseSlug). In
the DB, a new LiveSession row is created with:

status = "SCHEDULED"
roomName = "live-" + 24 hex chars (e.g.
live-3f9a2b8c1d0e4f5a6b7c8d9e)

Verify in DB:
npx prisma studio

# or

npx prisma db execute --stdin <<< "SELECT id, roomName, status FROM
LiveSession LIMIT 5;"

The roomName must look like live-3f9a2b8c1d0e4f5a6b7c8d9e — not the
course slug or anything readable.

---

Step 6 — Click "Go Live"

Clicking it calls goLive(liveSessionId, courseSlug, courseSessionId).
The status in the DB changes to "LIVE" and startedAt is set. The UI
opens the LiveKit room (you should see a video call interface).

Verify:
SELECT status, startedAt FROM LiveSession WHERE id = '<id>';
-- expected: status = "LIVE", startedAt = now

---

Step 7 — Click "End Session"

Clicking it calls endLiveSession(liveSessionId, ...). Status →
"ENDED", endedAt is set.

Verify:
SELECT status, endedAt FROM LiveSession WHERE id = '<id>';
-- expected: status = "ENDED", endedAt = now

---

Step 8 — Test invalid transitions (bonus)

Try to click "Go Live" again on an ended session — the state machine
(assertTransition) blocks it and you see an error message like
"Session is already ended". This proves the state machine works.

---

Step 9 — Verify /live-test still works

Open http://localhost:3000/live-test → enter any room name → join →
camera/mic should function normally. This confirms Phase 1 didn't
break the original POC.

---

What to check if something breaks

┌───────────────────────┬─────────────────────────────────────────┐
│ Symptom │ Cause │
├───────────────────────┼─────────────────────────────────────────┤
│ "You don't have │ │
│ permission" on Live │ User role is not ADMIN/MANAGER/TRAINER │
│ tab │ │
├───────────────────────┼─────────────────────────────────────────┤
│ "Set Up" button │ canHost is false — check role │
│ missing │ │
├───────────────────────┼─────────────────────────────────────────┤
│ "Failed to create │ LiveKit env vars missing or DB not │
│ live session" toast │ migrated │
├───────────────────────┼─────────────────────────────────────────┤
│ "Go Live" fails │ LIVEKIT_URL, LIVEKIT_API_KEY, │
│ │ LIVEKIT_API_SECRET not set in .env │
├───────────────────────┼─────────────────────────────────────────┤
│ Room name is a course │ Code was changed — generateRoomName() │
│ slug │ should always produce live-{24hex} │
└───────────────────────┴─────────────────────────────────────────┘

---

Phase 1 passes when

1. Live tab loads for TRAINER/ADMIN
2. "Set Up" creates a LiveSession with status=SCHEDULED and
   roomName=live-{24hex}
3. "Go Live" transitions to status=LIVE and opens the room
4. "End" transitions to status=ENDED
5. /live-test still works
