-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'EARNED', 'ADJUSTED', 'PAID', 'NO_COMMISSION', 'VOID');

-- CreateEnum
CREATE TYPE "LedgerEntryType" AS ENUM ('EARNED', 'REFUND_ADJUSTMENT', 'MANUAL_ADJUSTMENT', 'PAYOUT', 'REVERSAL', 'VOID');

-- CreateEnum
CREATE TYPE "PayoutStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RefundApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "LiveSessionStatus" AS ENUM ('SCHEDULED', 'WAITING', 'LIVE', 'ENDED', 'RECORDING_PROCESSING', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LivePollStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "LiveQuestionStatus" AS ENUM ('OPEN', 'PINNED', 'ANSWERED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "durationSeconds" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "joinedAt" TIMESTAMP(3),
ADD COLUMN     "lastJoinedAt" TIMESTAMP(3),
ADD COLUMN     "leftAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "ProcessedWebhookEvent" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TelegramBroadcast" (
    "id" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "sentById" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetRoles" TEXT[],
    "targetUserIds" TEXT[],
    "recipientCount" INTEGER NOT NULL DEFAULT 0,
    "sentCount" INTEGER NOT NULL DEFAULT 0,
    "failedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TelegramBroadcast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fixedAmount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DZD',
    "refundRetentionPercent" DECIMAL(5,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "courseId" TEXT,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesCommission" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "ruleId" TEXT,
    "ruleSnapshot" JSONB NOT NULL,
    "fixedAmount" DECIMAL(12,2) NOT NULL,
    "adjustedAmount" DECIMAL(12,2) NOT NULL,
    "finalAmount" DECIMAL(12,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "scenario" INTEGER,
    "earnedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "voidedAt" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SalesCommission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionLedgerEntry" (
    "id" TEXT NOT NULL,
    "commissionId" TEXT,
    "agentId" TEXT NOT NULL,
    "type" "LedgerEntryType" NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "description" TEXT NOT NULL,
    "referenceId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionLedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionPayout" (
    "id" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'DZD',
    "method" "PaymentMethod" NOT NULL,
    "reference" TEXT,
    "notes" TEXT,
    "status" "PayoutStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionPayout_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefundApproval" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "requestedAmount" DECIMAL(12,2) NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "RefundApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RefundApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSession" (
    "id" TEXT NOT NULL,
    "courseSessionId" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "hostId" TEXT,
    "status" "LiveSessionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "peakParticipants" INTEGER NOT NULL DEFAULT 0,
    "totalJoins" INTEGER NOT NULL DEFAULT 0,
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "egressId" TEXT,
    "recordingUrl" TEXT,
    "whiteboardSnapshot" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LiveSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakoutRoom" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "roomName" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "BreakoutRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreakoutAssignment" (
    "id" TEXT NOT NULL,
    "breakoutRoomId" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BreakoutAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveMessage" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "senderIdentity" TEXT NOT NULL,
    "senderName" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveSessionParticipant" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "userId" TEXT,
    "identity" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "leftAt" TIMESTAMP(3),
    "totalDurationSeconds" INTEGER NOT NULL DEFAULT 0,
    "lastJoinedAt" TIMESTAMP(3),

    CONSTRAINT "LiveSessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivePoll" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "options" JSONB NOT NULL,
    "status" "LivePollStatus" NOT NULL DEFAULT 'OPEN',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "LivePoll_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LivePollVote" (
    "id" TEXT NOT NULL,
    "pollId" TEXT NOT NULL,
    "voterIdentity" TEXT NOT NULL,
    "option" TEXT NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LivePollVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveQuestion" (
    "id" TEXT NOT NULL,
    "liveSessionId" TEXT NOT NULL,
    "askerIdentity" TEXT NOT NULL,
    "askerName" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "LiveQuestionStatus" NOT NULL DEFAULT 'OPEN',
    "answer" TEXT,
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),

    CONSTRAINT "LiveQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LiveQuestionUpvote" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "voterIdentity" TEXT NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LiveQuestionUpvote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProcessedWebhookEvent_processedAt_idx" ON "ProcessedWebhookEvent"("processedAt");

-- CreateIndex
CREATE INDEX "TelegramBroadcast_sentById_idx" ON "TelegramBroadcast"("sentById");

-- CreateIndex
CREATE INDEX "TelegramBroadcast_createdAt_idx" ON "TelegramBroadcast"("createdAt");

-- CreateIndex
CREATE INDEX "CommissionRule_isActive_idx" ON "CommissionRule"("isActive");

-- CreateIndex
CREATE INDEX "CommissionRule_courseId_idx" ON "CommissionRule"("courseId");

-- CreateIndex
CREATE INDEX "CommissionRule_createdAt_idx" ON "CommissionRule"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SalesCommission_registrationId_key" ON "SalesCommission"("registrationId");

-- CreateIndex
CREATE INDEX "SalesCommission_agentId_idx" ON "SalesCommission"("agentId");

-- CreateIndex
CREATE INDEX "SalesCommission_status_idx" ON "SalesCommission"("status");

-- CreateIndex
CREATE INDEX "SalesCommission_agentId_status_idx" ON "SalesCommission"("agentId", "status");

-- CreateIndex
CREATE INDEX "SalesCommission_earnedAt_idx" ON "SalesCommission"("earnedAt");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_commissionId_idx" ON "CommissionLedgerEntry"("commissionId");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_agentId_idx" ON "CommissionLedgerEntry"("agentId");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_agentId_type_idx" ON "CommissionLedgerEntry"("agentId", "type");

-- CreateIndex
CREATE INDEX "CommissionLedgerEntry_createdAt_idx" ON "CommissionLedgerEntry"("createdAt");

-- CreateIndex
CREATE INDEX "CommissionPayout_agentId_idx" ON "CommissionPayout"("agentId");

-- CreateIndex
CREATE INDEX "CommissionPayout_status_idx" ON "CommissionPayout"("status");

-- CreateIndex
CREATE INDEX "CommissionPayout_agentId_status_idx" ON "CommissionPayout"("agentId", "status");

-- CreateIndex
CREATE INDEX "CommissionPayout_createdAt_idx" ON "CommissionPayout"("createdAt");

-- CreateIndex
CREATE INDEX "RefundApproval_registrationId_idx" ON "RefundApproval"("registrationId");

-- CreateIndex
CREATE INDEX "RefundApproval_status_idx" ON "RefundApproval"("status");

-- CreateIndex
CREATE INDEX "RefundApproval_requestedById_idx" ON "RefundApproval"("requestedById");

-- CreateIndex
CREATE INDEX "RefundApproval_createdAt_idx" ON "RefundApproval"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "LiveSession_roomName_key" ON "LiveSession"("roomName");

-- CreateIndex
CREATE INDEX "LiveSession_status_idx" ON "LiveSession"("status");

-- CreateIndex
CREATE INDEX "LiveSession_courseSessionId_idx" ON "LiveSession"("courseSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "BreakoutRoom_roomName_key" ON "BreakoutRoom"("roomName");

-- CreateIndex
CREATE INDEX "BreakoutRoom_liveSessionId_idx" ON "BreakoutRoom"("liveSessionId");

-- CreateIndex
CREATE INDEX "BreakoutAssignment_breakoutRoomId_idx" ON "BreakoutAssignment"("breakoutRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "BreakoutAssignment_breakoutRoomId_identity_key" ON "BreakoutAssignment"("breakoutRoomId", "identity");

-- CreateIndex
CREATE INDEX "LiveMessage_liveSessionId_sentAt_idx" ON "LiveMessage"("liveSessionId", "sentAt");

-- CreateIndex
CREATE INDEX "LiveSessionParticipant_liveSessionId_idx" ON "LiveSessionParticipant"("liveSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveSessionParticipant_liveSessionId_identity_key" ON "LiveSessionParticipant"("liveSessionId", "identity");

-- CreateIndex
CREATE INDEX "LivePoll_liveSessionId_idx" ON "LivePoll"("liveSessionId");

-- CreateIndex
CREATE INDEX "LivePollVote_pollId_idx" ON "LivePollVote"("pollId");

-- CreateIndex
CREATE UNIQUE INDEX "LivePollVote_pollId_voterIdentity_key" ON "LivePollVote"("pollId", "voterIdentity");

-- CreateIndex
CREATE INDEX "LiveQuestion_liveSessionId_createdAt_idx" ON "LiveQuestion"("liveSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "LiveQuestionUpvote_questionId_idx" ON "LiveQuestionUpvote"("questionId");

-- CreateIndex
CREATE UNIQUE INDEX "LiveQuestionUpvote_questionId_voterIdentity_key" ON "LiveQuestionUpvote"("questionId", "voterIdentity");

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCommission" ADD CONSTRAINT "SalesCommission_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCommission" ADD CONSTRAINT "SalesCommission_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesCommission" ADD CONSTRAINT "SalesCommission_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "CommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_commissionId_fkey" FOREIGN KEY ("commissionId") REFERENCES "SalesCommission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionLedgerEntry" ADD CONSTRAINT "CommissionLedgerEntry_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionPayout" ADD CONSTRAINT "CommissionPayout_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundApproval" ADD CONSTRAINT "RefundApproval_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundApproval" ADD CONSTRAINT "RefundApproval_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefundApproval" ADD CONSTRAINT "RefundApproval_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_courseSessionId_fkey" FOREIGN KEY ("courseSessionId") REFERENCES "CourseSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSession" ADD CONSTRAINT "LiveSession_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakoutRoom" ADD CONSTRAINT "BreakoutRoom_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreakoutAssignment" ADD CONSTRAINT "BreakoutAssignment_breakoutRoomId_fkey" FOREIGN KEY ("breakoutRoomId") REFERENCES "BreakoutRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveMessage" ADD CONSTRAINT "LiveMessage_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSessionParticipant" ADD CONSTRAINT "LiveSessionParticipant_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveSessionParticipant" ADD CONSTRAINT "LiveSessionParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivePoll" ADD CONSTRAINT "LivePoll_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivePoll" ADD CONSTRAINT "LivePoll_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LivePollVote" ADD CONSTRAINT "LivePollVote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "LivePoll"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveQuestion" ADD CONSTRAINT "LiveQuestion_liveSessionId_fkey" FOREIGN KEY ("liveSessionId") REFERENCES "LiveSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LiveQuestionUpvote" ADD CONSTRAINT "LiveQuestionUpvote_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "LiveQuestion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

