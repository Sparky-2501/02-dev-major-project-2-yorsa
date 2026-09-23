import crypto from "crypto";
import httpStatus from "http-status";
import mongoose from "mongoose";
import { Meeting } from "../models/meeting.model.js";
import { Transcript } from "../models/transcript.model.js";
import { MeetingSummary } from "../models/meetingSummary.model.js";
import { generateSummaryAndMindMap } from "../services/aiService.js";

// In-memory fallback caches if MongoDB Atlas is offline or unreachable
const memMeetings = new Map();
const memTranscripts = new Map();
const memSummaries = new Map();

/**
 * Generate a short, unique meeting slug e.g. yorsa-a1b2-c3d4 or 8-char nanoid-like slug
 */
export const generateMeetingSlug = () => {
    const part1 = crypto.randomBytes(2).toString("hex");
    const part2 = crypto.randomBytes(2).toString("hex");
    return `yorsa-${part1}-${part2}`;
};

/**
 * POST /api/meetings/create
 * Creates a unique meeting room with hostId and expiry
 */
export const createMeeting = async (req, res) => {
    try {
        const { hostId, title, expiryHours = 24 } = req.body;
        const slug = generateMeetingSlug();
        const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

        const meetingData = {
            meetingCode: slug,
            roomId: slug,
            hostId: hostId || "GuestHost",
            user_id: hostId || "GuestHost",
            title: title || "Yorsa Executive Meeting",
            expiresAt,
            status: "active",
            micLocked: false,
            videoLocked: false,
            createdAt: new Date()
        };

        if (mongoose.connection.readyState === 1) {
            try {
                const meeting = new Meeting(meetingData);
                await meeting.save();
            } catch (dbErr) {
                console.warn("[Meeting Controller] DB save failed, persisting in-memory:", dbErr.message);
                memMeetings.set(slug, meetingData);
            }
        } else {
            memMeetings.set(slug, meetingData);
        }

        res.status(httpStatus.CREATED).json({
            success: true,
            meetingCode: slug,
            roomId: slug,
            hostId: meetingData.hostId,
            title: meetingData.title,
            expiresAt: meetingData.expiresAt,
            inviteLink: `/meeting/${slug}`
        });
    } catch (err) {
        console.error("Error creating meeting:", err);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            success: false,
            message: "Failed to create meeting: " + err.message
        });
    }
};

/**
 * GET /api/meetings/:id/validate
 * Validates whether a meeting link is valid or expired
 */
export const validateMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        let meeting = null;

        if (mongoose.connection.readyState === 1) {
            try {
                meeting = await Meeting.findOne({
                    $or: [{ meetingCode: id }, { roomId: id }]
                });
            } catch (dbErr) {
                console.warn("[Meeting Controller] DB query failed, falling back to memory:", dbErr.message);
            }
        }

        if (!meeting && memMeetings.has(id)) {
            meeting = memMeetings.get(id);
        }

        if (!meeting) {
            // Support ad-hoc room join
            return res.status(httpStatus.OK).json({
                valid: true,
                isAdHoc: true,
                roomId: id,
                title: "Yorsa Meeting"
            });
        }

        if (meeting.expiresAt && new Date() > new Date(meeting.expiresAt)) {
            return res.status(httpStatus.GONE).json({
                valid: false,
                reason: "Meeting has expired",
                expiredAt: meeting.expiresAt
            });
        }

        res.status(httpStatus.OK).json({
            valid: true,
            roomId: meeting.roomId || meeting.meetingCode,
            hostId: meeting.hostId,
            title: meeting.title,
            micLocked: meeting.micLocked || false,
            videoLocked: meeting.videoLocked || false,
            expiresAt: meeting.expiresAt
        });
    } catch (err) {
        console.error("Error validating meeting:", err);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
            valid: false,
            message: "Server error validating meeting"
        });
    }
};

/**
 * POST /api/meetings/:id/transcript
 * Append spoken transcript chunk from client STT
 */
export const appendTranscript = async (req, res) => {
    try {
        const { id } = req.params;
        const { sender = "Participant", text, duration = 0 } = req.body;

        if (!text || text.trim().length === 0) {
            return res.status(httpStatus.BAD_REQUEST).json({ message: "Text chunk is required" });
        }

        const chunk = { sender, text, duration, timestamp: new Date() };

        if (mongoose.connection.readyState === 1) {
            try {
                let transcript = await Transcript.findOne({ meetingId: id });
                if (!transcript) {
                    transcript = new Transcript({ meetingId: id, chunks: [], rawText: "" });
                }
                transcript.chunks.push(chunk);
                transcript.rawText = transcript.rawText 
                    ? `${transcript.rawText}\n[${sender}]: ${text}` 
                    : `[${sender}]: ${text}`;
                await transcript.save();
            } catch (dbErr) {
                console.warn("[Meeting Controller] DB transcript save failed, falling back to memory:", dbErr.message);
            }
        }

        // Maintain in-memory mirror
        let memT = memTranscripts.get(id) || { chunks: [], rawText: "" };
        memT.chunks.push(chunk);
        memT.rawText = memT.rawText ? `${memT.rawText}\n[${sender}]: ${text}` : `[${sender}]: ${text}`;
        memTranscripts.set(id, memT);

        res.status(httpStatus.OK).json({
            success: true,
            chunkCount: memT.chunks.length
        });
    } catch (err) {
        console.error("Error appending transcript:", err);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Failed to record transcript" });
    }
};

/**
 * POST /api/meetings/:id/summarize
 * Asynchronous trigger for AI Summarization and Mind Map generation
 */
export const triggerSummarize = async (req, res) => {
    try {
        const { id } = req.params;
        const { rawTextOverride } = req.body;

        // Retrieve transcript from DB or memory
        let rawText = rawTextOverride || "";
        if (!rawText && mongoose.connection.readyState === 1) {
            try {
                const transcript = await Transcript.findOne({ meetingId: id });
                if (transcript?.rawText) rawText = transcript.rawText;
            } catch (dbErr) {}
        }
        if (!rawText && memTranscripts.has(id)) {
            rawText = memTranscripts.get(id).rawText;
        }

        let title = "Yorsa Executive Meeting";
        if (memMeetings.has(id)) {
            title = memMeetings.get(id).title || title;
        }

        // Set pending summary
        const summaryPlaceholder = {
            meetingId: id,
            rawText,
            status: "pending",
            createdAt: new Date()
        };
        memSummaries.set(id, summaryPlaceholder);

        // Async job execution
        (async () => {
            try {
                const aiResult = await generateSummaryAndMindMap(rawText, title);
                const completedSummary = {
                    meetingId: id,
                    rawText,
                    summaryText: aiResult.summary || "",
                    keyTopics: aiResult.keyTopics || [],
                    actionItems: aiResult.actionItems || [],
                    mindMap: aiResult.mindMap || { nodes: [], edges: [] },
                    notes: `### Executive Summary Notes\n\n${aiResult.summary}\n\n### Key Action Items\n` +
                        (aiResult.actionItems || []).map(a => `- [ ] **${a.task}** (${a.owner}) - *${a.dueHint}*`).join("\n"),
                    status: "completed",
                    updatedAt: new Date()
                };

                memSummaries.set(id, completedSummary);

                if (mongoose.connection.readyState === 1) {
                    try {
                        let summaryDoc = await MeetingSummary.findOne({ meetingId: id });
                        if (!summaryDoc) summaryDoc = new MeetingSummary({ meetingId: id });
                        Object.assign(summaryDoc, completedSummary);
                        await summaryDoc.save();
                    } catch (dbErr) {
                        console.warn("[Meeting Controller] Could not persist summary to MongoDB:", dbErr.message);
                    }
                }
                console.log(`[Meeting Controller] AI Summary & Mind Map completed for meeting ${id}`);
            } catch (jobErr) {
                console.error(`[Meeting Controller] Async summarization failed for meeting ${id}:`, jobErr);
                if (memSummaries.has(id)) {
                    memSummaries.get(id).status = "failed";
                    memSummaries.get(id).errorMessage = jobErr.message;
                }
            }
        })();

        res.status(httpStatus.ACCEPTED).json({
            success: true,
            message: "Summarization job initiated",
            meetingId: id,
            status: "pending"
        });
    } catch (err) {
        console.error("Error triggering summarization:", err);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Failed to trigger summarization" });
    }
};

/**
 * GET /api/meetings/:id/summary
 * Fetch generated summary, mind map, and notes
 */
export const getMeetingSummary = async (req, res) => {
    try {
        const { id } = req.params;
        let summary = null;

        if (mongoose.connection.readyState === 1) {
            try {
                summary = await MeetingSummary.findOne({ meetingId: id });
            } catch (dbErr) {}
        }

        if (!summary && memSummaries.has(id)) {
            summary = memSummaries.get(id);
        }

        if (!summary) {
            return res.status(httpStatus.NOT_FOUND).json({
                success: false,
                message: "No summary found for this meeting"
            });
        }

        res.status(httpStatus.OK).json({
            success: true,
            summary
        });
    } catch (err) {
        console.error("Error fetching summary:", err);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Failed to fetch summary" });
    }
};

/**
 * PUT /api/meetings/:id/notes
 * Update participant notes independently from AI summary
 */
export const updateMeetingNotes = async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;

        let summary = null;
        if (memSummaries.has(id)) {
            summary = memSummaries.get(id);
            summary.notes = notes;
            summary.updatedAt = new Date();
        } else {
            summary = { meetingId: id, notes: notes || "", status: "completed" };
            memSummaries.set(id, summary);
        }

        if (mongoose.connection.readyState === 1) {
            try {
                let doc = await MeetingSummary.findOne({ meetingId: id });
                if (!doc) doc = new MeetingSummary({ meetingId: id, status: "completed" });
                doc.notes = notes;
                await doc.save();
            } catch (dbErr) {}
        }

        res.status(httpStatus.OK).json({
            success: true,
            notes: summary.notes
        });
    } catch (err) {
        console.error("Error updating notes:", err);
        res.status(httpStatus.INTERNAL_SERVER_ERROR).json({ message: "Failed to update notes" });
    }
};
