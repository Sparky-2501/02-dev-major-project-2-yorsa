import React, { useEffect, useRef, useState, useCallback } from 'react';
import io from "socket.io-client";
import { useParams, useNavigate } from 'react-router-dom';
import { Snackbar, CircularProgress } from '@mui/material';
import axios from 'axios';
import server from '../environment';
import MeetingControls from '../components/MeetingControls';
import VideoGrid from '../components/VideoGrid';
import SideDrawer from '../components/SideDrawer';
import InviteModal from '../components/InviteModal';
import NetworkQualityBanner from '../components/NetworkQualityBanner';

const peerConfigConnections = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" }
    ]
};

export default function VideoMeetComponent() {
    const { url, roomId } = useParams();
    const meetingRoomId = roomId || url;
    const navigate = useNavigate();

    // Sockets & WebRTC Refs
    const socketRef = useRef(null);
    const socketIdRef = useRef(null);
    const connectionsRef = useRef({});
    const localVideoRef = useRef(null);

    // Media & UI States
    const [localStream, setLocalStream] = useState(null);
    const [videoEnabled, setVideoEnabled] = useState(true);
    const [audioEnabled, setAudioEnabled] = useState(true);
    const [screenSharing, setScreenSharing] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(true);

    const [askForUsername, setAskForUsername] = useState(true);
    const [username, setUsername] = useState(() => localStorage.getItem("lastUsername") || "");
    const [waitingStatus, setWaitingStatus] = useState('none'); // 'none' | 'waiting' | 'approved' | 'rejected'
    const [isHost, setIsHost] = useState(false);

    // Host & Lock States (Part 1.6)
    const [micLocked, setMicLocked] = useState(false);
    const [participants, setParticipants] = useState([]);
    const [pendingParticipants, setPendingParticipants] = useState([]);

    // Video Grid & Panels
    const [remoteVideos, setRemoteVideos] = useState([]); // [{ socketId, stream, username }]
    const [pinnedUserId, setPinnedUserId] = useState(null);
    const [screenSharingUserId, setScreenSharingUserId] = useState(null);
    const [activePanel, setActivePanel] = useState(null); // 'chat' | 'participants' | 'ai' | null
    const [inviteModalOpen, setInviteModalOpen] = useState(false);

    // Chat & Messages
    const [messages, setMessages] = useState([]);
    const [newMessagesCount, setNewMessagesCount] = useState(0);

    // Speech Transcript & AI (Part 2: Opt-In Real-time Transcript Ingestion)
    const [liveTranscript, setLiveTranscript] = useState("");
    const [isAiListening, setIsAiListening] = useState(false);
    const speechRecognitionRef = useRef(null);

    // Feedback & System Toasts
    const [toastMessage, setToastMessage] = useState("");
    const [toastOpen, setToastOpen] = useState(false);
    const [lowBandwidth, setLowBandwidth] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    const showToast = useCallback((msg) => {
        setToastMessage(msg);
        setToastOpen(true);
    }, []);

    const toggleAiListening = useCallback(() => {
        setIsAiListening(prev => {
            const next = !prev;
            if (next) {
                showToast("AI Notetaker started listening. Meeting audio will be transcribed.");
            } else {
                showToast("AI Notetaker paused.");
            }
            return next;
        });
    }, [showToast]);

    // -------------------------------------------------------------
    // Initial Camera & Mic Preview
    // -------------------------------------------------------------
    useEffect(() => {
        let previewStream = null;
        async function setupPreview() {
            try {
                previewStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                setLocalStream(previewStream);
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = previewStream;
                }
            } catch (err) {
                console.warn("Could not capture initial camera/mic preview:", err.message);
            }
        }
        setupPreview();

        return () => {
            if (previewStream) {
                previewStream.getTracks().forEach(t => t.stop());
            }
        };
    }, []);

    // -------------------------------------------------------------
    // Speech-To-Text Feeder (Strictly Opt-in: Only runs when isAiListening is true)
    // -------------------------------------------------------------
    useEffect(() => {
        if (waitingStatus !== 'approved' || !isAiListening) {
            if (speechRecognitionRef.current) {
                try { speechRecognitionRef.current.stop(); } catch (e) {}
                speechRecognitionRef.current = null;
            }
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SpeechRecognition) {
            try {
                const recognition = new SpeechRecognition();
                recognition.continuous = true;
                recognition.interimResults = false;
                recognition.lang = 'en-US';

                recognition.onresult = (event) => {
                    const latestResult = event.results[event.results.length - 1];
                    if (latestResult.isFinal) {
                        const textChunk = latestResult[0].transcript.trim();
                        if (textChunk) {
                            setLiveTranscript(prev => `${prev}\n[${username || "Speaker"}]: ${textChunk}`);
                            // Feed chunk to backend transcript store
                            axios.post(`${server}/api/meetings/${meetingRoomId}/transcript`, {
                                sender: username || "Speaker",
                                text: textChunk
                            }).catch(() => {});
                        }
                    }
                };

                recognition.onerror = () => {};
                recognition.onend = () => {
                    if (waitingStatus === 'approved' && isAiListening) {
                        try { recognition.start(); } catch (e) {}
                    }
                };

                recognition.start();
                speechRecognitionRef.current = recognition;
            } catch (e) {
                console.debug("Web Speech Recognition unavailable:", e);
            }
        }

        return () => {
            if (speechRecognitionRef.current) {
                try { speechRecognitionRef.current.stop(); } catch (e) {}
                speechRecognitionRef.current = null;
            }
        };
    }, [waitingStatus, meetingRoomId, username, isAiListening]);

    // -------------------------------------------------------------
    // Socket.io Connection & Room Join Sequence
    // -------------------------------------------------------------
    const handleConnectToMeeting = () => {
        if (!username.trim()) {
            showToast("Please enter a display name to enter the lobby.");
            return;
        }

        localStorage.setItem("lastUsername", username);
        const token = localStorage.getItem("token");

        const socket = io(server, { forceNew: true });
        socketRef.current = socket;

        socket.on("connect", () => {
            socketIdRef.current = socket.id;
            socket.emit("request-join", meetingRoomId, username, token);
            setWaitingStatus('waiting');
        });

        socket.on("join-approved", ({ isHost: hostFlag }) => {
            setIsHost(hostFlag);
            setWaitingStatus('approved');
            setAskForUsername(false);
            socket.emit("join-call", meetingRoomId, token);
            showToast(hostFlag ? "Connected as Meeting Host" : "Joined Meeting Room");

            // Cache meeting in local recentMeetings for History page access
            try {
                const recent = JSON.parse(localStorage.getItem("recentMeetings") || "[]");
                if (!recent.some(m => (m.meetingCode === meetingRoomId || m.roomId === meetingRoomId))) {
                    recent.unshift({
                        meetingCode: meetingRoomId,
                        roomId: meetingRoomId,
                        createdAt: new Date().toISOString(),
                        date: new Date().toISOString()
                    });
                    localStorage.setItem("recentMeetings", JSON.stringify(recent.slice(0, 30)));
                }
            } catch (e) {}
        });

        socket.on("join-rejected", () => {
            setWaitingStatus('rejected');
            showToast("The host declined your join request.");
        });

        socket.on("user-waiting", (guestId, guestName) => {
            setPendingParticipants(prev => [...prev.filter(p => p.socketId !== guestId), { socketId: guestId, username: guestName }]);
            showToast(`${guestName} is waiting to join the meeting`);
        });

        socket.on("waiting-user-left", (guestId) => {
            setPendingParticipants(prev => prev.filter(p => p.socketId !== guestId));
        });

        // Room Lock & Participant Status
        socket.on("participant:lockState", (lockData) => {
            if (lockData?.micLocked) {
                setMicLocked(true);
                handleForceMuteAudio();
            }
        });

        socket.on("room:participantLocksUpdated", (locksMap) => {
            const myLock = locksMap[socket.id];
            if (myLock?.micLocked !== undefined) {
                setMicLocked(myLock.micLocked);
                if (myLock.micLocked) handleForceMuteAudio();
            }
        });

        // Force Mute Signal from Host (Part 1.6)
        socket.on("participant:forceMute", ({ locked, reason }) => {
            handleForceMuteAudio();
            if (locked) setMicLocked(true);
            showToast(reason || "Muted by host.");
        });

        socket.on("participant:micUnlocked", () => {
            setMicLocked(false);
            showToast("Your microphone was unlocked by the host.");
        });

        socket.on("promoted-to-host", () => {
            setIsHost(true);
            showToast("You are now the meeting host.");
        });

        socket.on("kicked-from-meeting", () => {
            showToast("You have been removed from the meeting by the host.");
            setTimeout(() => {
                window.location.href = "/home";
            }, 1200);
        });

        // Chat message reception
        socket.on("chat-message", (data, sender, socketIdSender) => {
            setMessages(prev => [...prev, { data, sender, socketId: socketIdSender }]);
            if (socketIdSender !== socket.id) {
                setNewMessagesCount(c => c + 1);
            }
        });

        // User joined room -> instantiate WebRTC peer connections
        socket.on("user-joined", (newSocketId, allSockets, participantList) => {
            if (participantList) {
                setParticipants(participantList);
            }

            // Establish peer connections with other clients
            allSockets.forEach((otherId) => {
                if (otherId === socket.id || connectionsRef.current[otherId]) return;

                const pc = new RTCPeerConnection(peerConfigConnections);
                connectionsRef.current[otherId] = pc;

                // Send ICE candidates
                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit("signal", otherId, JSON.stringify({ ice: event.candidate }));
                    }
                };

                // Handle incoming remote media tracks
                pc.ontrack = (event) => {
                    const [remoteStream] = event.streams;
                    setRemoteVideos(prev => {
                        const exists = prev.find(v => v.socketId === otherId);
                        if (exists) {
                            return prev.map(v => v.socketId === otherId ? { ...v, stream: remoteStream } : v);
                        }
                        return [...prev, { socketId: otherId, stream: remoteStream }];
                    });
                };

                // Add local tracks to new peer connection
                if (localStream) {
                    localStream.getTracks().forEach(track => {
                        pc.addTrack(track, localStream);
                    });
                }

                // If we are the initiating peer, create SDP offer
                pc.createOffer().then(offer => {
                    return pc.setLocalDescription(offer);
                }).then(() => {
                    socket.emit("signal", otherId, JSON.stringify({ sdp: pc.localDescription }));
                }).catch(err => console.debug("Create offer error:", err));
            });
        });

        // WebRTC Signaling Relay
        socket.on("signal", async (fromId, data) => {
            const signalData = JSON.parse(data);
            let pc = connectionsRef.current[fromId];

            if (!pc) {
                pc = new RTCPeerConnection(peerConfigConnections);
                connectionsRef.current[fromId] = pc;

                pc.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit("signal", fromId, JSON.stringify({ ice: event.candidate }));
                    }
                };

                pc.ontrack = (event) => {
                    const [remoteStream] = event.streams;
                    setRemoteVideos(prev => {
                        const exists = prev.find(v => v.socketId === fromId);
                        if (exists) {
                            return prev.map(v => v.socketId === fromId ? { ...v, stream: remoteStream } : v);
                        }
                        return [...prev, { socketId: fromId, stream: remoteStream }];
                    });
                };

                if (localStream) {
                    localStream.getTracks().forEach(track => pc.addTrack(track, localStream));
                }
            }

            if (signalData.sdp) {
                try {
                    await pc.setRemoteDescription(new RTCSessionDescription(signalData.sdp));
                    if (signalData.sdp.type === 'offer') {
                        const answer = await pc.createAnswer();
                        await pc.setLocalDescription(answer);
                        socket.emit("signal", fromId, JSON.stringify({ sdp: pc.localDescription }));
                    }
                } catch (e) {
                    console.debug("SDP signaling error:", e);
                }
            }

            if (signalData.ice) {
                try {
                    await pc.addIceCandidate(new RTCIceCandidate(signalData.ice));
                } catch (e) {
                    console.debug("ICE candidate error:", e);
                }
            }
        });

        // User Left
        socket.on("user-left", (leftId) => {
            if (connectionsRef.current[leftId]) {
                connectionsRef.current[leftId].close();
                delete connectionsRef.current[leftId];
            }
            setRemoteVideos(prev => prev.filter(v => v.socketId !== leftId));
            setParticipants(prev => prev.filter(p => p.socketId !== leftId));
            if (pinnedUserId === leftId) setPinnedUserId(null);
            if (screenSharingUserId === leftId) setScreenSharingUserId(null);
        });

        // Screen share status
        socket.on("screen-share-status-changed", (senderId, isSharing) => {
            setScreenSharingUserId(isSharing ? senderId : null);
        });
    };

    // -------------------------------------------------------------
    // Media Track Toggles
    // -------------------------------------------------------------
    const toggleVideo = () => {
        if (!localStream) return;
        const videoTrack = localStream.getVideoTracks()[0];
        if (videoTrack) {
            videoTrack.enabled = !videoTrack.enabled;
            setVideoEnabled(videoTrack.enabled);
        }
    };

    const toggleAudio = () => {
        if (micLocked) {
            showToast("Your microphone has been locked by the meeting host.");
            return;
        }
        if (!localStream) return;
        const audioTrack = localStream.getAudioTracks()[0];
        if (audioTrack) {
            audioTrack.enabled = !audioTrack.enabled;
            setAudioEnabled(audioTrack.enabled);
        }
    };

    const handleForceMuteAudio = () => {
        if (localStream) {
            const audioTrack = localStream.getAudioTracks()[0];
            if (audioTrack) audioTrack.enabled = false;
        }
        setAudioEnabled(false);
    };

    const toggleScreenShare = async () => {
        if (!screenSharing) {
            try {
                const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                const screenVideoTrack = screenStream.getVideoTracks()[0];

                // Replace outgoing video track on all peer connections
                for (let id in connectionsRef.current) {
                    const sender = connectionsRef.current[id].getSenders().find(s => s.track && s.track.kind === 'video');
                    if (sender) sender.replaceTrack(screenVideoTrack);
                }

                setScreenSharing(true);
                setScreenSharingUserId('local');
                socketRef.current?.emit("screen-share-status", true);

                screenVideoTrack.onended = () => {
                    stopScreenShare();
                };
            } catch (err) {
                console.warn("Screen share cancelled or failed:", err);
            }
        } else {
            stopScreenShare();
        }
    };

    const stopScreenShare = () => {
        if (localStream) {
            const originalVideoTrack = localStream.getVideoTracks()[0];
            for (let id in connectionsRef.current) {
                const sender = connectionsRef.current[id].getSenders().find(s => s.track && s.track.kind === 'video');
                if (sender && originalVideoTrack) sender.replaceTrack(originalVideoTrack);
            }
        }
        setScreenSharing(false);
        setScreenSharingUserId(null);
        socketRef.current?.emit("screen-share-status", false);
    };

    // -------------------------------------------------------------
    // Host Actions (Part 1.6)
    // -------------------------------------------------------------
    const handleHostMuteAll = () => {
        if (!socketRef.current || !isHost) return;
        socketRef.current.emit("host:muteAll", meetingRoomId);
        showToast("Muted all participants and locked microphones.");
    };

    const handleLockParticipantMic = (targetSocketId) => {
        if (!socketRef.current || !isHost) return;
        socketRef.current.emit("host:lockMic", { path: meetingRoomId, targetSocketId });
        showToast("Locked participant microphone.");
    };

    const handleUnlockParticipantMic = (targetSocketId) => {
        if (!socketRef.current || !isHost) return;
        socketRef.current.emit("host:unlockMic", { path: meetingRoomId, targetSocketId });
        showToast("Unlocked participant microphone.");
    };

    const handleApproveGuest = (guestId) => {
        socketRef.current?.emit("approve-join", guestId);
        setPendingParticipants(prev => prev.filter(p => p.socketId !== guestId));
    };

    const handleRejectGuest = (guestId) => {
        socketRef.current?.emit("reject-join", guestId);
        setPendingParticipants(prev => prev.filter(p => p.socketId !== guestId));
    };

    const handleKickParticipant = (guestId) => {
        socketRef.current?.emit("kick-user", guestId);
        showToast("Removed participant from meeting.");
    };

    // Chat
    const handleSendMessage = (text) => {
        if (!socketRef.current) return;
        socketRef.current.emit("chat-message", text, username || "Participant");
    };

    // End Call
    const handleEndCall = () => {
        if (localStream) {
            localStream.getTracks().forEach(t => t.stop());
        }
        if (socketRef.current) {
            socketRef.current.disconnect();
        }
        navigate("/home");
    };

    const togglePanel = (panelName) => {
        setActivePanel(curr => (curr === panelName ? null : panelName));
        if (panelName === 'chat') setNewMessagesCount(0);
    };

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('theme', nextTheme);
    };

    return (
        <div style={{
            position: 'relative',
            width: '100vw',
            height: '100vh',
            background: 'var(--bg-primary)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'row'
        }}>
            {/* Network Quality Heuristics Banner (Part 1.5) */}
            <NetworkQualityBanner
                connectionsRef={connectionsRef}
                localStream={localStream}
                isVideoEnabled={videoEnabled}
                setIsVideoEnabled={setVideoEnabled}
                onBandwidthAdjust={(isLow) => setLowBandwidth(isLow)}
            />

            {/* Pre-Join Screen / Lobby Stage */}
            {askForUsername ? (
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                    height: '100%',
                    padding: '1.5rem',
                    background: 'radial-gradient(circle at 50% 30%, #1e1f24 0%, #131314 100%)'
                }}>
                    <div style={{
                        maxWidth: '480px',
                        width: '100%',
                        background: 'var(--bg-secondary, #202124)',
                        border: '1px solid var(--border-subtle, #3c4043)',
                        borderRadius: '16px',
                        padding: '2.5rem 2rem',
                        boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                        textAlign: 'center'
                    }}>
                        <h2 style={{ fontSize: '1.75rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
                            Ready to join?
                        </h2>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Room ID: <strong style={{ color: '#8ab4f8', fontFamily: 'monospace' }}>{meetingRoomId}</strong>
                        </p>

                        <div style={{
                            width: '100%',
                            aspectRatio: '16/9',
                            background: '#000',
                            border: '1px solid var(--border-subtle, #3c4043)',
                            borderRadius: '16px',
                            overflow: 'hidden',
                            marginBottom: '1.5rem'
                        }}>
                            <video
                                ref={localVideoRef}
                                autoPlay
                                playsInline
                                muted
                                style={{ width: '100%', height: '100%', objectFit: 'cover', transform: 'scaleX(-1)' }}
                            />
                        </div>

                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your name"
                            disabled={waitingStatus === 'waiting'}
                            onKeyDown={(e) => e.key === 'Enter' && waitingStatus !== 'waiting' && handleConnectToMeeting()}
                            style={{
                                width: '100%',
                                padding: '13px 16px',
                                background: 'var(--bg-elevated, #28292a)',
                                border: '1px solid var(--border-subtle, #3c4043)',
                                color: 'var(--text-primary)',
                                fontSize: '0.95rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                                marginBottom: '1rem',
                                borderRadius: '8px',
                                transition: 'border-color 0.2s ease'
                            }}
                        />

                        {waitingStatus === 'waiting' ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', padding: '10px' }}>
                                <CircularProgress size={20} style={{ color: '#8ab4f8' }} />
                                <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Waiting for host approval...</span>
                            </div>
                        ) : waitingStatus === 'rejected' ? (
                            <div>
                                <p style={{ color: '#ea4335', fontSize: '0.85rem', marginBottom: '12px' }}>
                                    The host declined your admission.
                                </p>
                                <button className="btn-meet-primary" style={{ width: '100%' }} onClick={handleConnectToMeeting}>
                                    Try Again
                                </button>
                            </div>
                        ) : (
                            <button className="btn-meet-primary" style={{ width: '100%' }} onClick={handleConnectToMeeting}>
                                Join now
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                /* In-Meeting Live Room */
                <div style={{
                    display: 'flex',
                    flex: 1,
                    height: '100vh',
                    position: 'relative',
                    overflow: 'hidden',
                    marginRight: activePanel ? '380px' : '0px',
                    transition: 'margin-right 0.35s cubic-bezier(0.25, 1, 0.5, 1)'
                }}>
                    {/* Video Grid Canvas (reflows dynamically) */}
                    <VideoGrid
                        localStream={localStream}
                        username={username}
                        isVideoEnabled={videoEnabled}
                        isAudioEnabled={audioEnabled}
                        remoteVideos={remoteVideos}
                        pinnedUserId={pinnedUserId}
                        screenSharingUserId={screenSharingUserId}
                        isHost={isHost}
                        activePanel={activePanel}
                        onPinUser={(sId) => setPinnedUserId(curr => (curr === sId ? null : sId))}
                        onKickUser={handleKickParticipant}
                    />

                    {/* Google Meet-Style Fixed Bottom Controls */}
                    <MeetingControls
                        meetingRoomId={meetingRoomId}
                        video={videoEnabled}
                        audio={audioEnabled}
                        screen={screenSharing}
                        screenAvailable={screenAvailable}
                        micLocked={micLocked}
                        isHost={isHost}
                        activePanel={activePanel}
                        newMessagesCount={newMessagesCount}
                        lowBandwidth={lowBandwidth}
                        theme={theme}
                        isAiListening={isAiListening}
                        onToggleAiListening={toggleAiListening}
                        onToggleVideo={toggleVideo}
                        onToggleAudio={toggleAudio}
                        onToggleScreen={toggleScreenShare}
                        onTogglePanel={togglePanel}
                        onOpenInvite={() => setInviteModalOpen(true)}
                        onToggleLowBandwidth={() => setLowBandwidth(b => !b)}
                        onToggleTheme={toggleTheme}
                        onHostMuteAll={handleHostMuteAll}
                        onEndCall={handleEndCall}
                    />

                    {/* Side Drawer (Chat / Participants / AI Summary) */}
                    <SideDrawer
                        activePanel={activePanel}
                        onClose={() => setActivePanel(null)}
                        meetingId={meetingRoomId}
                        username={username}
                        isHost={isHost}
                        messages={messages}
                        onSendMessage={handleSendMessage}
                        participants={participants}
                        pendingParticipants={pendingParticipants}
                        onApproveGuest={handleApproveGuest}
                        onRejectGuest={handleRejectGuest}
                        onKickParticipant={handleKickParticipant}
                        onMuteAll={handleHostMuteAll}
                        onLockParticipantMic={handleLockParticipantMic}
                        onUnlockParticipantMic={handleUnlockParticipantMic}
                        liveTranscript={liveTranscript}
                        isAiListening={isAiListening}
                        onToggleAiListening={toggleAiListening}
                    />

                    {/* Invite Modal (Part 1.1) */}
                    <InviteModal
                        open={inviteModalOpen}
                        onClose={() => setInviteModalOpen(false)}
                        meetingCode={meetingRoomId}
                    />
                </div>
            )}

            {/* Notification Toast */}
            <Snackbar
                open={toastOpen}
                autoHideDuration={4000}
                onClose={() => setToastOpen(false)}
                message={toastMessage}
            />
        </div>
    );
}
