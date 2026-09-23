import express from "express";
import { createServer } from "node:http";
import mongoose from "mongoose";
import { connectToSocket } from "./controllers/socketManager.js";
import cors from "cors";
import userRoutes from "./routes/users.routes.js";
import meetingRoutes from "./routes/meeting.routes.js";
import dotenv from "dotenv";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";

dotenv.config();

const app = express();

// Security middleware with relaxed cross-origin embedder policy for WebRTC media streams
app.use(helmet({
    crossOriginEmbedderPolicy: false
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { message: "Too many requests from this IP, please try again after 15 minutes." }
});

const server = createServer(app);
const io = connectToSocket(server);

app.set("port", (process.env.PORT || 8000));
app.use(cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

// Support higher payload for audio blobs and full meeting transcripts
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({
        status: "healthy",
        timestamp: new Date(),
        uptime: process.uptime(),
        version: "2.0.0"
    });
});

app.use("/api/v1/users", limiter);
app.use("/api/v1/users", userRoutes);

// Mount Meeting and AI Summary routes
app.use("/api/meetings", meetingRoutes);
app.use("/api/v1/meetings", meetingRoutes);

const start = async () => {
    mongoose.set('bufferCommands', false);
    try {
        if (process.env.MONGO_URI) {
            const connectionDb = await mongoose.connect(process.env.MONGO_URI, {
                serverSelectionTimeoutMS: 3000
            });
            console.log(`MONGO Connected DB Host: ${connectionDb.connection.host}`);
        } else {
            console.warn("MONGO_URI not specified. Running with in-memory persistence.");
        }
    } catch (error) {
        console.log(`COULD NOT CONNECT TO DATABASE: ${error.message}. Running with resilient in-memory mode.`);
    }

    const PORT = app.get("port");
    server.listen(PORT, () => {
        console.log(`YORSA SERVER LISTENING ON PORT ${PORT}`);
    });
};

start();

export { app, server, io };