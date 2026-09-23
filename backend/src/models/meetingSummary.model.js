import mongoose, { Schema } from "mongoose";

const actionItemSchema = new Schema({
    task: { type: String, required: true },
    owner: { type: String, default: "Unassigned" },
    dueHint: { type: String, default: "TBD" }
});

const mindMapNodeSchema = new Schema({
    id: { type: String, required: true },
    label: { type: String, required: true },
    level: { type: Number, default: 0 },
    color: { type: String }
}, { _id: false });

const mindMapEdgeSchema = new Schema({
    from: { type: String, required: true },
    to: { type: String, required: true },
    label: { type: String }
}, { _id: false });

const meetingSummarySchema = new Schema(
    {
        meetingId: { type: String, required: true, index: true },
        rawText: { type: String, default: "" },
        summaryText: { type: String, default: "" },
        keyTopics: [{ type: String }],
        actionItems: [actionItemSchema],
        mindMap: {
            nodes: [mindMapNodeSchema],
            edges: [mindMapEdgeSchema]
        },
        notes: { type: String, default: "" },
        status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" },
        errorMessage: { type: String }
    },
    { timestamps: true }
);

const MeetingSummary = mongoose.model("MeetingSummary", meetingSummarySchema);

export { MeetingSummary };
