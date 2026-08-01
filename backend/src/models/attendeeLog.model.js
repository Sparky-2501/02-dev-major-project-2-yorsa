import mongoose from "mongoose";

const attendeeLogSchema = new mongoose.Schema({
    meetingCode: { type: String, required: true },
    username: { type: String, required: true }, // Display name in meeting
    accountName: { type: String }, // Registered username if logged in
    ipAddress: { type: String },
    joinTime: { type: Date, default: Date.now },
    leaveTime: { type: Date }
});

const AttendeeLog = mongoose.model("AttendeeLog", attendeeLogSchema);

export { AttendeeLog };
