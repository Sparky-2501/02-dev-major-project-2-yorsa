import mongoose, { Schema } from "mongoose";

const transcriptChunkSchema = new Schema({
    sender: { type: String, default: "Participant" },
    text: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    duration: { type: Number, default: 0 }
});

const transcriptSchema = new Schema(
    {
        meetingId: { type: String, required: true, index: true },
        chunks: [transcriptChunkSchema],
        rawText: { type: String, default: "" },
        createdAt: { type: Date, default: Date.now }
    },
    { timestamps: true }
);

const Transcript = mongoose.model("Transcript", transcriptSchema);

export { Transcript };
