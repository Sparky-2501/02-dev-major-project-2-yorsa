import { Router } from "express";
import {
    createMeeting,
    validateMeeting,
    appendTranscript,
    triggerSummarize,
    getMeetingSummary,
    updateMeetingNotes
} from "../controllers/meeting.controller.js";

const router = Router();

router.post("/create", createMeeting);
router.get("/:id/validate", validateMeeting);
router.post("/:id/transcript", appendTranscript);
router.post("/:id/summarize", triggerSummarize);
router.get("/:id/summary", getMeetingSummary);
router.put("/:id/notes", updateMeetingNotes);

export default router;
