import mongoose, { Schema } from "mongoose";

const meetingSchema = new Schema(
    {
        user_id: { type: String }, // Legacy support for username
        meetingCode: { type: String, required: true, index: true },
        roomId: { type: String, index: true },
        hostId: { type: String }, // Host username
        coHosts: [{ type: String }],
        title: { type: String, default: "Yorsa Meeting" },
        date: { type: Date, default: Date.now, required: true },
        createdAt: { type: Date, default: Date.now },
        expiresAt: { type: Date },
        micLocked: { type: Boolean, default: false },
        videoLocked: { type: Boolean, default: false },
        status: { type: String, enum: ["active", "ended"], default: "active" }
    },
    { timestamps: true }
);

const Meeting = mongoose.model("Meeting", meetingSchema);

export { Meeting };