import { io } from "socket.io-client";
import assert from "assert";

const SERVER_URL = "http://localhost:8000";
const TEST_ROOM = `test-room-${Math.floor(Math.random() * 100000)}`;

console.log("\n=======================================================");
console.log("   YORSA INTEGRATED ARCHITECTURE & FEATURE TEST SUITE");
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
            const timeout = setTimeout(() => reject(new Error("Host approval timeout")), 6000);
            
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
        await delay(400);

        // -------------------------------------------------------------
        // TEST 2: Guest Join & Waiting Room Gatekeeper
        // -------------------------------------------------------------
        console.log("\n👉 TEST 2: Guest joining, testing waiting queue gatekeeper...");
        guestSocket = io(SERVER_URL, { forceNew: true });

        let waitingUserSocketId = null;

        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Guest waiting room timeout")), 6000);

            guestSocket.on("connect", () => {
                guestSocket.emit("request-join", TEST_ROOM, "GuestStudent");
            });

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
            const timeout = setTimeout(() => reject(new Error("Guest admission timeout")), 6000);

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

            hostSocket.emit("approve-join", waitingUserSocketId);
        });

        guestSocket.emit("join-call", TEST_ROOM, null);
        await delay(400);

        // -------------------------------------------------------------
        // TEST 4: Chat Message Relay
        // -------------------------------------------------------------
        console.log("\n👉 TEST 4: Verifying chat message broadcasting...");
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Chat relay timeout")), 6000);

            guestSocket.on("chat-message", (data, sender) => {
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

            hostSocket.emit("chat-message", "Hello team, welcome to Yorsa!", "HostPrathamesh");
        });

        // -------------------------------------------------------------
        // TEST 5: Part 1.6 Host Controls - Mute All & Mic Lock
        // -------------------------------------------------------------
        console.log("\n👉 TEST 5: Testing Part 1.6 Host Mute-All and Mic Lock enforcement...");
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("host:muteAll timeout")), 6000);

            guestSocket.on("participant:forceMute", (data) => {
                clearTimeout(timeout);
                try {
                    assert.strictEqual(data.locked, true, "Mic should be locked by host");
                    console.log(`   ✅ Guest received participant:forceMute with locked: true ("${data.reason}")`);
                    resolve();
                } catch (err) {
                    reject(err);
                }
            });

            // Host emits muteAll
            hostSocket.emit("host:muteAll", TEST_ROOM);
        });

        // Test unlocking mic
        console.log("   Testing host:unlockMic for specific participant...");
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("host:unlockMic timeout")), 6000);

            guestSocket.on("participant:micUnlocked", () => {
                clearTimeout(timeout);
                console.log("   ✅ Guest received participant:micUnlocked signal!");
                resolve();
            });

            hostSocket.emit("host:unlockMic", { path: TEST_ROOM, targetSocketId: guestSocket.id });
        });

        // -------------------------------------------------------------
        // TEST 6: WebRTC Signal Relays
        // -------------------------------------------------------------
        console.log("\n👉 TEST 6: Testing WebRTC signaling loop...");
        await new Promise((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("WebRTC signaling timeout")), 6000);
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

            guestSocket.emit("signal", hostSocket.id, JSON.stringify({ sdp: mockSDP }));
        });

        // Clean up initial sockets
        hostSocket.disconnect();
        guestSocket.disconnect();

        // -------------------------------------------------------------
        // TEST 7: REST API Validation & AI Summary Pipeline
        // -------------------------------------------------------------
        console.log("\n👉 TEST 7: Testing REST endpoints for Meeting Validation & AI Pipeline...");
        
        // 7a: Create Meeting
        const createRes = await fetch(`${SERVER_URL}/api/meetings/create`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: "Architecture Sync", hostId: "testHost" })
        });
        const createData = await createRes.json();
        assert.strictEqual(createRes.status, 201, "Meeting creation should return 201");
        assert.ok(createData.roomId, "Created meeting should contain roomId");
        console.log(`   ✅ POST /api/meetings/create -> Generated roomId: ${createData.roomId}`);

        // 7b: Validate Meeting
        const valRes = await fetch(`${SERVER_URL}/api/meetings/${createData.roomId}/validate`);
        const valData = await valRes.json();
        assert.strictEqual(valRes.status, 200, "Validation should return 200");
        assert.strictEqual(valData.valid, true, "Meeting must be valid");
        console.log(`   ✅ GET /api/meetings/:id/validate -> Valid: ${valData.valid}`);

        // 7c: Append Transcript
        const transRes = await fetch(`${SERVER_URL}/api/meetings/${createData.roomId}/transcript`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                sender: "Host",
                text: "Today we discussed the WebRTC network adaptation and AI meeting summary layer."
            })
        });
        assert.strictEqual(transRes.status, 200, "Transcript chunk should be appended");
        console.log("   ✅ POST /api/meetings/:id/transcript -> Successfully ingested speech chunk");

        // 7d: Trigger Summarize & Verify Fallback/AI
        const sumRes = await fetch(`${SERVER_URL}/api/meetings/${createData.roomId}/summarize`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({})
        });
        assert.strictEqual(sumRes.status, 202, "Summarize should return 202 Accepted");
        console.log("   ✅ POST /api/meetings/:id/summarize -> Dispatched async job");

        // Wait for async job to finish
        await delay(1200);

        const getSumRes = await fetch(`${SERVER_URL}/api/meetings/${createData.roomId}/summary`);
        const getSumData = await getSumRes.json();
        assert.strictEqual(getSumRes.status, 200, "Get summary should return 200");
        assert.ok(getSumData.summary.summaryText, "Summary must include summaryText");
        assert.ok(getSumData.summary.mindMap.nodes.length > 0, "Mind Map must contain nodes");
        assert.ok(getSumData.summary.mindMap.edges.length > 0, "Mind Map must contain edges");
        console.log(`   ✅ GET /api/meetings/:id/summary -> Retrieved summary & mind map (${getSumData.summary.mindMap.nodes.length} nodes, ${getSumData.summary.mindMap.edges.length} edges)`);

        console.log("\n=======================================================");
        console.log("   🎉 ALL FUNCTIONAL, SOCKET, AND AI TESTS PASSED!");
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
