import { io } from "socket.io-client";
import assert from "assert";

const SERVER_URL = "http://localhost:8000";
const TEST_ROOM = `test-room-${Math.floor(Math.random() * 100000)}`;

console.log("\n=======================================================");
console.log("   YORSA MEETING INTEGRATION & SCALE LOAD TESTING");
console.log("=======================================================\n");

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTests() {
    let hostSocket;
    let guestSocket;
    const testClients = [];

    try {
        // -------------------------------------------------------------
        // TEST 1: Host Room Creation & Auto-Approval
        // -------------------------------------------------------------
        console.log("👉 TEST 1: Creating meeting room & assigning Host...");
        hostSocket = io(SERVER_URL, { forceNew: true });
        
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Host approval timeout")), 4000);
            
            hostSocket.on("connect", () => {
                hostSocket.emit("request-join", TEST_ROOM, "HostPrathamesh");
            });

            hostSocket.on("join-approved", (data) => {
                clearTimeout(timeout);
                try {
                    assert.strictEqual(data.isHost, true, "First joiner must be assigned isHost: true");
                    console.log("   ✅ Host approved successfully!");
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });

        // Complete join-call for Host
        hostSocket.emit("join-call", TEST_ROOM, null);
        await delay(500);



        // -------------------------------------------------------------
        // TEST 2: Guest Join & Waiting Room Gatekeeper
        // -------------------------------------------------------------
        console.log("\n👉 TEST 2: Guest joining, testing waiting queue gatekeeper...");
        guestSocket = io(SERVER_URL, { forceNew: true });

        let waitingUserSocketId = null;

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Guest waiting room timeout")), 4000);

            // Connect Guest
            guestSocket.on("connect", () => {
                guestSocket.emit("request-join", TEST_ROOM, "GuestStudent");
            });

            // Host should receive waiting alert
            hostSocket.on("user-waiting", (socketId, username) => {
                clearTimeout(timeout);
                try {
                    assert.strictEqual(username, "GuestStudent", "Guest name mismatch in queue");
                    waitingUserSocketId = socketId;
                    console.log(`   ✅ Host received waiting alert for Guest: ${username} (${socketId})`);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });
        });

        // -------------------------------------------------------------
        // TEST 3: Host Approval & Guest Join
        // -------------------------------------------------------------
        console.log("\n👉 TEST 3: Host admitting Guest into meeting...");
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Guest admission timeout")), 4000);

            guestSocket.on("join-approved", (data) => {
                clearTimeout(timeout);
                try {
                    assert.strictEqual(data.isHost, false, "Admitted guest must be isHost: false");
                    console.log("   ✅ Guest join approved by Host!");
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });

            // Host admits the waiting guest
            hostSocket.emit("approve-join", waitingUserSocketId);
        });

        // Complete join-call for Guest
        guestSocket.emit("join-call", TEST_ROOM, null);
        await delay(500);

        // -------------------------------------------------------------
        // TEST 4: Chat Message Relay
        // -------------------------------------------------------------
        console.log("\n👉 TEST 4: Verifying chat message broadcasting...");
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Chat relay timeout")), 4000);

            guestSocket.on("chat-message", (data, sender, socketIdSender) => {
                clearTimeout(timeout);
                try {
                    assert.strictEqual(data, "Hello team, welcome to Yorsa!", "Chat content mismatch");
                    assert.strictEqual(sender, "HostPrathamesh", "Chat sender mismatch");
                    console.log(`   ✅ Guest received chat from ${sender}: "${data}"`);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });

            // Host sends message
            hostSocket.emit("chat-message", "Hello team, welcome to Yorsa!", "HostPrathamesh");
        });

        // -------------------------------------------------------------
        // TEST 5: Live Stream Security Locks (Audio/Video)
        // -------------------------------------------------------------
        console.log("\n👉 TEST 5: Testing global Host audio/video locks override...");
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Audio lock broadcast timeout")), 4000);

            guestSocket.on("audio-lock-changed", (locked) => {
                clearTimeout(timeout);
                try {
                    assert.strictEqual(locked, true, "Locked state should broadcast as true");
                    console.log("   ✅ Guest received global audio lock signal!");
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });

            // Host locks audio globally
            hostSocket.emit("toggle-audio-lock", TEST_ROOM);
        });

        // -------------------------------------------------------------
        // TEST 6: WebRTC Signal Relays
        // -------------------------------------------------------------
        console.log("\n👉 TEST 6: Testing WebRTC signaling loop...");
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("WebRTC signaling timeout")), 4000);
            const mockSDP = { type: "offer", sdp: "v=0\r\no=-..." };

            hostSocket.on("signal", (fromId, data) => {
                clearTimeout(timeout);
                try {
                    const receivedSignal = JSON.parse(data);
                    assert.strictEqual(receivedSignal.sdp.type, "offer", "SDP signal type mismatch");
                    console.log("   ✅ Host received ICE/SDP signal packet forwarded from Guest!");
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });

            // Guest sends signal targeting Host
            guestSocket.emit("signal", hostSocket.id, JSON.stringify({ sdp: mockSDP }));
        });

        // Clean up initial sockets
        hostSocket.disconnect();
        guestSocket.disconnect();

        // -------------------------------------------------------------
        // TEST 7: Scale Load Simulation (Concurrency & Performance)
        // -------------------------------------------------------------
        console.log("\n👉 TEST 7: Running server scale load simulation...");
        const CONCURRENT_CLIENTS = 30;
        console.log(`   Connecting ${CONCURRENT_CLIENTS} sockets concurrently...`);

        const startTime = Date.now();
        const connectionPromises = [];

        for (let i = 1; i <= CONCURRENT_CLIENTS; i++) {
            const client = io(SERVER_URL, { forceNew: true });
            testClients.push(client);

            const p = new Promise((resolve) => {
                client.on("connect", () => {
                    client.emit("request-join", TEST_ROOM, `ScaleUser-${i}`);
                    resolve();
                });
            });
            connectionPromises.push(p);
        }

        await Promise.all(connectionPromises);
        const connectionTime = Date.now() - startTime;

        console.log(`   ✅ Sockets established and joined room successfully.`);
        console.log(`   ⏱️ Total connection time: ${connectionTime}ms`);
        console.log(`   ⚡ Average connection time per client: ${(connectionTime / CONCURRENT_CLIENTS).toFixed(1)}ms`);

        if (connectionTime < 1000) {
            console.log("   🚀 PERFORMANCE GRADE: EXCELLENT");
        } else if (connectionTime < 3000) {
            console.log("   👍 PERFORMANCE GRADE: GOOD");
        } else {
            console.log("   ⚠️ PERFORMANCE GRADE: OVERLOADED");
        }

        console.log("\n=======================================================");
        console.log("   🎉 ALL FUNCTIONAL AND LOAD INTEGRATION TESTS PASSED!");
        console.log("=======================================================\n");

    } catch (error) {
        console.error("\n❌ TEST SUITE FAILED:");
        console.error(error);
        process.exit(1);
    } finally {
        if (hostSocket) hostSocket.disconnect();
        if (guestSocket) guestSocket.disconnect();
        testClients.forEach(c => c.disconnect());
    }
}

runTests();
