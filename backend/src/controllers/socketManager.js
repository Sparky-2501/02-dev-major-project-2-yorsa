import { Server } from "socket.io";
import mongoose from "mongoose";
import { AttendeeLog } from "../models/attendeeLog.model.js";
import { User } from "../models/user.model.js";
import { Meeting } from "../models/meeting.model.js";

let connections = {};
let messages = {};
let timeOnline = {};
let roomLocks = {}; // { [roomId]: { audioLocked: boolean, videoLocked: boolean } }
let roomHosts = {}; // { [roomId]: hostSocketId }
let participantLocks = {}; // { [roomId]: { [socketId]: { micLocked: boolean, videoLocked: boolean } } }
let participantUsernames = {}; // { [socketId]: username }

export const connectToSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });

    /**
     * Helper to verify if a socket is the authorized host for a given room
     */
    const verifyIsHost = async (socket, path) => {
        if (!connections[path] || connections[path].length === 0) return false;
        // Primary check: recorded host socket ID
        if (roomHosts[path] === socket.id) return true;
        // Fallback: first user in connection array
        if (connections[path][0] === socket.id) return true;

        // DB-level verification via token / username
        if (socket.userToken) {
            try {
                const user = await User.findOne({ token: socket.userToken });
                if (user) {
                    const meetingRecord = await Meeting.findOne({
                        $or: [{ meetingCode: path }, { roomId: path }]
                    });
                    if (meetingRecord && (meetingRecord.hostId === user.username || meetingRecord.user_id === user.username)) {
                        roomHosts[path] = socket.id;
                        return true;
                    }
                }
            } catch (err) {
                console.error("Error verifying host token:", err);
            }
        }
        return false;
    };

    io.on("connection", (socket) => {
        console.log(`[Socket Connected] ID: ${socket.id}`);

        socket.on("request-join", async (path, username, token, isCreatorLocal) => {
            socket.username = username || "Guest";
            socket.userToken = token;
            participantUsernames[socket.id] = socket.username;

            let isCreator = isCreatorLocal === true;
            if (token) {
                try {
                    const user = await User.findOne({ token: token });
                    if (user) {
                        const meetingRecord = await Meeting.findOne({
                            $or: [{ meetingCode: path }, { roomId: path }]
                        });
                        if (meetingRecord && (meetingRecord.hostId === user.username || meetingRecord.user_id === user.username)) {
                            isCreator = true;
                        }
                    }
                } catch (err) {
                    console.error("Error verifying creator status:", err);
                }
            }

            const currentUsersCount = connections[path] ? connections[path].length : 0;
            const shouldBypass = isCreator || (currentUsersCount === 0);

            if (shouldBypass) {
                const hostExists = connections[path] && connections[path].length > 0;
                const assignedHost = !hostExists || isCreator;
                if (assignedHost) {
                    roomHosts[path] = socket.id;
                }
                socket.emit("join-approved", { isHost: assignedHost });
            } else {
                const hostSocketId = roomHosts[path] || connections[path][0];
                socket.pendingRoom = path;
                io.to(hostSocketId).emit("user-waiting", socket.id, username);
            }
        });

        socket.on("approve-join", (guestId) => {
            io.to(guestId).emit("join-approved", { isHost: false });
        });

        socket.on("reject-join", (guestId) => {
            io.to(guestId).emit("join-rejected");
        });

        socket.on("join-call", async (path, token) => {
            socket.currentRoom = path;
            if (connections[path] === undefined) {
                connections[path] = [];
            }
            if (!connections[path].includes(socket.id)) {
                connections[path].push(socket.id);
            }

            // Assign first joiner as host if room host is unassigned
            if (!roomHosts[path]) {
                roomHosts[path] = socket.id;
            }

            timeOnline[socket.id] = new Date();

            let accountName = "Guest";
            if (token) {
                socket.userToken = token;
                try {
                    const user = await User.findOne({ token: token });
                    if (user) {
                        accountName = user.username;
                    }
                } catch (e) {
                    console.error("Error finding user by token:", e);
                }
            }

            if (mongoose.connection.readyState === 1) {
                try {
                    const ipAddress = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
                    const newLog = new AttendeeLog({
                        meetingCode: path,
                        username: socket.username || "Unknown",
                        accountName: accountName,
                        ipAddress: ipAddress,
                        joinTime: new Date()
                    });
                    await newLog.save();
                    socket.attendeeLogId = newLog._id;
                } catch (err) {
                    console.error("Error saving attendee log:", err);
                }
            }

            // Initialize room locks and participant lock states
            if (!roomLocks[path]) {
                roomLocks[path] = { audioLocked: false, videoLocked: false };
            }
            if (!participantLocks[path]) {
                participantLocks[path] = {};
            }
            if (!participantLocks[path][socket.id]) {
                participantLocks[path][socket.id] = { micLocked: false, videoLocked: false };
            }

            // Emit current lock state to newcomer (preserves lock on reload)
            socket.emit("room-lock-status", roomLocks[path]);
            socket.emit("participant:lockState", participantLocks[path][socket.id]);

            // Broadcast user-joined to all participants in this room
            const participantData = (connections[path] || []).map(sId => ({
                socketId: sId,
                username: participantUsernames[sId] || `User-${sId.substring(0, 4)}`,
                isHost: sId === roomHosts[path],
                micLocked: participantLocks[path]?.[sId]?.micLocked || false
            }));

            if (connections[path]) {
                for (let a = 0; a < connections[path].length; a++) {
                    io.to(connections[path][a]).emit("user-joined", socket.id, connections[path], participantData);
                }
            }

            // Replay previous chat history
            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender']);
                }
            }
        });

        // WebRTC Signaling Relay
        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        });

        // Chat messaging
        socket.on("chat-message", (data, sender) => {
            const matchingRoom = socket.currentRoom || Object.keys(connections).find(r => connections[r]?.includes(socket.id));
            if (matchingRoom) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = [];
                }
                messages[matchingRoom].push({ sender, data, "socket-id-sender": socket.id });

                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", data, sender, socket.id);
                });
            }
        });

        // Screen share broadcasting
        socket.on("screen-share-status", (isSharing) => {
            const room = socket.currentRoom || Object.keys(connections).find(r => connections[r]?.includes(socket.id));
            if (room && connections[room]) {
                connections[room].forEach((elem) => {
                    if (elem !== socket.id) {
                        io.to(elem).emit("screen-share-status-changed", socket.id, isSharing);
                    }
                });
            }
        });

        // =========================================================================
        // PART 1.6: Host Controls (Server-Side Verified)
        // =========================================================================

        /**
         * host:muteAll
         * Force mutes all participants except the host and locks their mic
         */
        socket.on("host:muteAll", async (path) => {
            const room = path || socket.currentRoom;
            if (!room || !connections[room]) return;

            const isHost = await verifyIsHost(socket, room);
            if (!isHost) {
                return socket.emit("host:error", { message: "Unauthorized: only the host can mute all." });
            }

            console.log(`[Host Control] Host ${socket.id} invoked muteAll in room: ${room}`);

            if (!participantLocks[room]) participantLocks[room] = {};

            connections[room].forEach((participantId) => {
                if (participantId !== socket.id) {
                    if (!participantLocks[room][participantId]) {
                        participantLocks[room][participantId] = {};
                    }
                    participantLocks[room][participantId].micLocked = true;

                    // Emit force mute event to participant
                    io.to(participantId).emit("participant:forceMute", {
                        locked: true,
                        reason: "You were muted by the meeting host."
                    });
                }
            });

            // Broadcast lock state update to all
            io.to(room).emit("room:participantLocksUpdated", participantLocks[room]);
        });

        /**
         * host:muteParticipant
         * Force mutes a specific participant
         */
        socket.on("host:muteParticipant", async ({ path, targetSocketId }) => {
            const room = path || socket.currentRoom;
            if (!room || !targetSocketId) return;

            const isHost = await verifyIsHost(socket, room);
            if (!isHost) {
                return socket.emit("host:error", { message: "Unauthorized: only the host can mute participants." });
            }

            io.to(targetSocketId).emit("participant:forceMute", {
                locked: false,
                reason: "Muted by host."
            });
        });

        /**
         * host:lockMic
         * Locks microphone access for a specific participant or all
         */
        socket.on("host:lockMic", async ({ path, targetSocketId }) => {
            const room = path || socket.currentRoom;
            if (!room || !targetSocketId) return;

            const isHost = await verifyIsHost(socket, room);
            if (!isHost) {
                return socket.emit("host:error", { message: "Unauthorized: only the host can lock mic access." });
            }

            if (!participantLocks[room]) participantLocks[room] = {};
            if (!participantLocks[room][targetSocketId]) participantLocks[room][targetSocketId] = {};
            participantLocks[room][targetSocketId].micLocked = true;

            io.to(targetSocketId).emit("participant:forceMute", {
                locked: true,
                reason: "Microphone access locked by host."
            });

            io.to(room).emit("room:participantLocksUpdated", participantLocks[room]);
        });

        /**
         * host:unlockMic
         * Unlocks microphone access for a specific participant
         */
        socket.on("host:unlockMic", async ({ path, targetSocketId }) => {
            const room = path || socket.currentRoom;
            if (!room || !targetSocketId) return;

            const isHost = await verifyIsHost(socket, room);
            if (!isHost) {
                return socket.emit("host:error", { message: "Unauthorized: only the host can unlock mic access." });
            }

            if (participantLocks[room] && participantLocks[room][targetSocketId]) {
                participantLocks[room][targetSocketId].micLocked = false;
            }

            io.to(targetSocketId).emit("participant:micUnlocked");
            io.to(room).emit("room:participantLocksUpdated", participantLocks[room]);
        });

        // Kick participant (Host only)
        socket.on("kick-user", async (guestId) => {
            const room = socket.currentRoom || Object.keys(connections).find(r => connections[r]?.includes(socket.id));
            if (room && connections[room]) {
                const isHost = await verifyIsHost(socket, room);
                if (isHost) {
                    io.to(guestId).emit("kicked-from-meeting");
                    const guestSocket = io.sockets.sockets.get(guestId);
                    if (guestSocket) {
                        guestSocket.disconnect();
                    }
                }
            }
        });

        // Legacy global lock toggles
        socket.on("toggle-audio-lock", async (path) => {
            const room = path || socket.currentRoom;
            const isHost = await verifyIsHost(socket, room);
            if (isHost) {
                if (!roomLocks[room]) roomLocks[room] = { audioLocked: false, videoLocked: false };
                roomLocks[room].audioLocked = !roomLocks[room].audioLocked;
                connections[room].forEach((elem) => {
                    io.to(elem).emit("audio-lock-changed", roomLocks[room].audioLocked);
                });
            }
        });

        socket.on("toggle-video-lock", async (path) => {
            const room = path || socket.currentRoom;
            const isHost = await verifyIsHost(socket, room);
            if (isHost) {
                if (!roomLocks[room]) roomLocks[room] = { audioLocked: false, videoLocked: false };
                roomLocks[room].videoLocked = !roomLocks[room].videoLocked;
                connections[room].forEach((elem) => {
                    io.to(elem).emit("video-lock-changed", roomLocks[room].videoLocked);
                });
            }
        });

        // Disconnect handler with host transition and lock cleanup
        socket.on("disconnect", async () => {
            console.log(`[Socket Disconnected] ID: ${socket.id}`);

            if (socket.attendeeLogId) {
                try {
                    await AttendeeLog.findByIdAndUpdate(socket.attendeeLogId, { leaveTime: new Date() });
                } catch (err) {
                    console.error("Error updating attendee log on disconnect:", err);
                }
            }

            if (socket.pendingRoom && connections[socket.pendingRoom] && connections[socket.pendingRoom].length > 0) {
                const hostSocketId = roomHosts[socket.pendingRoom] || connections[socket.pendingRoom][0];
                io.to(hostSocketId).emit("waiting-user-left", socket.id);
            }

            delete participantUsernames[socket.id];

            for (const [key, socketList] of Object.entries(connections)) {
                if (socketList.includes(socket.id)) {
                    // Notify remaining peers
                    for (let j = 0; j < socketList.length; ++j) {
                        if (socketList[j] !== socket.id) {
                            io.to(socketList[j]).emit("user-left", socket.id);
                        }
                    }

                    const index = socketList.indexOf(socket.id);
                    socketList.splice(index, 1);

                    // Clean up individual participant lock
                    if (participantLocks[key] && participantLocks[key][socket.id]) {
                        delete participantLocks[key][socket.id];
                    }

                    // Handle host leaving
                    if (roomHosts[key] === socket.id) {
                        if (socketList.length > 0) {
                            // Promote next participant to host
                            roomHosts[key] = socketList[0];
                            io.to(socketList[0]).emit("promoted-to-host");
                            console.log(`[Host Reassignment] Promoted ${socketList[0]} to host for room ${key}`);
                        } else {
                            delete roomHosts[key];
                        }
                    }

                    // Empty room cleanup
                    if (socketList.length === 0) {
                        delete connections[key];
                        delete messages[key];
                        delete roomLocks[key];
                        delete participantLocks[key];
                        delete roomHosts[key];
                    }
                    break;
                }
            }
        });
    });

    return io;
};
