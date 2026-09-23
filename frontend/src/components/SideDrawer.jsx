import React, { useState, useEffect, useRef } from 'react';
import { IconButton, Tabs, Tab, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import PeopleIcon from '@mui/icons-material/People';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SendIcon from '@mui/icons-material/Send';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import axios from 'axios';
import server from '../environment';
import MindMapViewer from './MindMapViewer';
import NotesEditor from './NotesEditor';

export default function SideDrawer({
    activePanel,
    onClose,
    meetingId,
    username,
    isHost,
    // Chat props
    messages = [],
    onSendMessage,
    // Participants props
    participants = [],
    pendingParticipants = [],
    onApproveGuest,
    onRejectGuest,
    onKickParticipant,
    onMuteAll,
    onLockParticipantMic,
    onUnlockParticipantMic,
    // AI props
    liveTranscript = "",
    isAiListening = false,
    onToggleAiListening
}) {
    const [aiSubTab, setAiSubTab] = useState(0); // 0: Summary, 1: Mind Map, 2: Notes
    const [chatInput, setChatInput] = useState("");
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [aiSummaryData, setAiSummaryData] = useState(null);
    const [muteAllConfirmOpen, setMuteAllConfirmOpen] = useState(false);
    const chatEndRef = useRef(null);

    // Auto-scroll chat to bottom
    useEffect(() => {
        if (activePanel === 'chat') {
            chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }
    }, [messages, activePanel]);

    // Fetch existing AI summary if available
    useEffect(() => {
        if (activePanel === 'ai' && meetingId) {
            fetchSummary();
        }
    }, [activePanel, meetingId]);

    const fetchSummary = async () => {
        try {
            const res = await axios.get(`${server}/api/meetings/${meetingId}/summary`);
            if (res.data?.summary) {
                setAiSummaryData(res.data.summary);
            }
        } catch (err) {
            // Not yet generated
        }
    };

    const handleSendChat = (e) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        onSendMessage(chatInput.trim());
        setChatInput("");
    };

    const handleTriggerSummarize = async () => {
        if (!meetingId) return;
        setIsGeneratingAi(true);
        try {
            if (isAiListening && onToggleAiListening) {
                onToggleAiListening(); // Stop listening
            }

            await axios.post(`${server}/api/meetings/${meetingId}/summarize`, {
                rawTextOverride: liveTranscript || undefined
            });

            // Poll for completion
            let attempts = 0;
            const pollInterval = setInterval(async () => {
                attempts++;
                try {
                    const res = await axios.get(`${server}/api/meetings/${meetingId}/summary`);
                    if (res.data?.summary?.status === 'completed' || res.data?.summary?.summaryText) {
                        setAiSummaryData(res.data.summary);
                        setIsGeneratingAi(false);
                        clearInterval(pollInterval);
                    }
                } catch (e) {}

                if (attempts > 20) {
                    setIsGeneratingAi(false);
                    clearInterval(pollInterval);
                }
            }, 1500);
        } catch (err) {
            console.error("Summarization error:", err);
            setIsGeneratingAi(false);
        }
    };

    if (!activePanel) return null;

    return (
        <aside style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '380px',
            maxWidth: '100vw',
            height: '100vh',
            background: 'var(--bg-secondary, #202124)',
            borderLeft: '1px solid var(--border-subtle, #3c4043)',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.5)',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 900,
            transition: 'transform 0.35s cubic-bezier(0.25, 1, 0.5, 1)',
            boxSizing: 'border-box'
        }}>
            {/* Drawer Header (Google Meet Style) */}
            <div style={{
                padding: '16px 20px',
                borderBottom: '1px solid var(--border-subtle, #3c4043)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                background: 'var(--bg-secondary, #202124)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {activePanel === 'chat' && <ChatIcon style={{ color: '#8ab4f8' }} />}
                    {activePanel === 'participants' && <PeopleIcon style={{ color: '#8ab4f8' }} />}
                    {activePanel === 'ai' && <AutoAwesomeIcon style={{ color: '#8ab4f8' }} />}
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                        {activePanel === 'chat' && "In-call messages"}
                        {activePanel === 'participants' && `People (${participants.length})`}
                        {activePanel === 'ai' && "AI Notetaker & Insights"}
                    </h3>
                </div>
                <IconButton onClick={onClose} style={{ color: 'var(--text-secondary)', padding: 6 }}>
                    <CloseIcon fontSize="small" />
                </IconButton>
            </div>

            {/* =========================================================================
                PANEL 1: CHAT
               ========================================================================= */}
            {activePanel === 'chat' && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '16px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                    }}>
                        {messages.length === 0 ? (
                            <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '3rem', fontSize: '0.9rem' }}>
                                No chat messages yet. Say hello to participants!
                            </p>
                        ) : (
                            messages.map((item, idx) => {
                                const isMe = item.sender === username;
                                return (
                                    <div
                                        key={idx}
                                        style={{
                                            alignSelf: isMe ? 'flex-end' : 'flex-start',
                                            maxWidth: '82%',
                                            background: isMe ? 'var(--accent-gold)' : 'var(--bg-elevated)',
                                            color: isMe ? '#121110' : 'var(--text-primary)',
                                            border: `1px solid ${isMe ? 'var(--accent-gold-light)' : 'var(--border-subtle)'}`,
                                            padding: '8px 14px',
                                            borderRadius: '0px',
                                            fontSize: '0.9rem',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                        }}
                                    >
                                        {!isMe && (
                                            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-gold-light)', marginBottom: '3px' }}>
                                                {item.sender}
                                            </div>
                                        )}
                                        <div style={{ wordBreak: 'break-word', lineHeight: '1.4' }}>{item.data}</div>
                                    </div>
                                );
                            })
                        )}
                        <div ref={chatEndRef} />
                    </div>

                    {/* Chat Input Bar */}
                    <form onSubmit={handleSendChat} style={{
                        display: 'flex',
                        padding: '12px 16px',
                        borderTop: '1px solid var(--border-subtle)',
                        background: 'rgba(0,0,0,0.3)',
                        gap: '8px'
                    }}>
                        <input
                            type="text"
                            value={chatInput}
                            onChange={(e) => setChatInput(e.target.value)}
                            placeholder="Type a message..."
                            style={{
                                flex: 1,
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--border-editorial)',
                                color: 'var(--text-primary)',
                                padding: '10px 14px',
                                outline: 'none',
                                fontSize: '0.9rem',
                                fontFamily: 'var(--font-sans)',
                                borderRadius: '0px'
                            }}
                        />
                        <button
                            type="submit"
                            style={{
                                background: 'var(--accent-gold)',
                                color: '#121110',
                                border: 'none',
                                padding: '0 16px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <SendIcon fontSize="small" />
                        </button>
                    </form>
                </div>
            )}

            {/* =========================================================================
                PANEL 2: PARTICIPANTS & HOST CONTROLS
               ========================================================================= */}
            {activePanel === 'participants' && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto', padding: '16px' }}>
                    {/* Host Top-Level Mute All Action (Part 1.6) */}
                    {isHost && (
                        <div style={{
                            padding: '12px',
                            background: 'rgba(200, 157, 92, 0.08)',
                            border: '1px solid var(--border-editorial)',
                            marginBottom: '16px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between'
                        }}>
                            <div>
                                <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--accent-gold)' }}>Host Actions</span>
                                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Mute everyone & lock mic</p>
                            </div>
                            <button
                                onClick={() => setMuteAllConfirmOpen(true)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: '#ff5252',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '8px 12px',
                                    fontSize: '0.8rem',
                                    fontWeight: 600,
                                    cursor: 'pointer'
                                }}
                            >
                                <VolumeOffIcon fontSize="small" />
                                Mute All
                            </button>
                        </div>
                    )}

                    {/* Waiting Room Queue (if any) */}
                    {isHost && pendingParticipants.length > 0 && (
                        <div style={{ marginBottom: '18px' }}>
                            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent-gold)' }}>
                                Waiting Room ({pendingParticipants.length})
                            </span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                                {pendingParticipants.map(guest => (
                                    <div key={guest.socketId} style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: 'rgba(255,255,255,0.04)',
                                        border: '1px solid var(--border-subtle)',
                                        padding: '8px 12px'
                                    }}>
                                        <span style={{ fontSize: '0.85rem' }}>{guest.username}</span>
                                        <div style={{ display: 'flex', gap: '6px' }}>
                                            <button
                                                onClick={() => onApproveGuest(guest.socketId)}
                                                style={{ background: '#2a9d8f', color: '#fff', border: 'none', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
                                            >
                                                Admit
                                            </button>
                                            <button
                                                onClick={() => onRejectGuest(guest.socketId)}
                                                style={{ background: '#ff5252', color: '#fff', border: 'none', padding: '4px 10px', fontSize: '0.75rem', cursor: 'pointer' }}
                                            >
                                                Deny
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Active In-Meeting Participants List */}
                    <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                        In Meeting
                    </span>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {participants.map(p => {
                            const isMe = p.socketId === 'local' || p.username === username;
                            return (
                                <div key={p.socketId} style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    background: 'var(--bg-elevated)',
                                    border: '1px solid var(--border-subtle)',
                                    padding: '10px 14px'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>
                                            {p.username} {isMe && "(You)"}
                                        </span>
                                        {p.isHost && (
                                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', fontWeight: 600 }}>HOST</span>
                                        )}
                                    </div>

                                    {/* Action Icons */}
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        {p.micLocked && (
                                            <span title="Mic Locked" style={{ display: 'flex', alignItems: 'center', color: '#ff5252', marginRight: 4 }}>
                                                <LockIcon fontSize="small" />
                                            </span>
                                        )}

                                        {isHost && !isMe && (
                                            <>
                                                {/* Lock / Unlock Mic toggle */}
                                                <IconButton
                                                    size="small"
                                                    onClick={() => p.micLocked ? onUnlockParticipantMic(p.socketId) : onLockParticipantMic(p.socketId)}
                                                    title={p.micLocked ? "Unlock Participant Mic" : "Lock Participant Mic"}
                                                    style={{ color: p.micLocked ? '#ff5252' : 'var(--text-secondary)' }}
                                                >
                                                    {p.micLocked ? <LockOpenIcon fontSize="small" /> : <LockIcon fontSize="small" />}
                                                </IconButton>

                                                {/* Kick user */}
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onKickParticipant(p.socketId)}
                                                    title="Remove participant"
                                                    style={{ color: '#ff5252' }}
                                                >
                                                    <PersonRemoveIcon fontSize="small" />
                                                </IconButton>
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* =========================================================================
                PANEL 3: AI INTELLIGENCE (SUMMARY, MIND MAP, NOTES)
               ========================================================================= */}
            {activePanel === 'ai' && (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
                    {/* AI Sub-Tabs */}
                    <Tabs
                        value={aiSubTab}
                        onChange={(e, val) => setAiSubTab(val)}
                        textColor="inherit"
                        indicatorColor="primary"
                        TabIndicatorProps={{ style: { background: '#1a73e8' } }}
                        style={{ borderBottom: '1px solid var(--border-subtle, #3c4043)', minHeight: '44px' }}
                    >
                        <Tab label="Summary" style={{ fontSize: '0.85rem', textTransform: 'none', color: aiSubTab === 0 ? '#8ab4f8' : 'var(--text-secondary)' }} />
                        <Tab label="Mind Map" style={{ fontSize: '0.85rem', textTransform: 'none', color: aiSubTab === 1 ? '#8ab4f8' : 'var(--text-secondary)' }} />
                        <Tab label="Notes" style={{ fontSize: '0.85rem', textTransform: 'none', color: aiSubTab === 2 ? '#8ab4f8' : 'var(--text-secondary)' }} />
                    </Tabs>

                    {/* AI Subtab Body */}
                    <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
                        {/* Opt-In Privacy & Trigger Card */}
                        {!isAiListening ? (
                            <div style={{
                                background: 'rgba(26, 115, 232, 0.08)',
                                border: '1px solid rgba(138, 180, 248, 0.25)',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '16px',
                                textAlign: 'center'
                            }}>
                                <AutoAwesomeIcon style={{ color: '#8ab4f8', fontSize: '1.8rem', marginBottom: '8px' }} />
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                                    AI Notetaker is Inactive
                                </h4>
                                <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    For confidentiality, speech is not monitored or transcribed. Click below to start live notetaking.
                                </p>
                                <button
                                    onClick={onToggleAiListening}
                                    className="btn-meet-primary"
                                    style={{ width: '100%', fontSize: '0.85rem', padding: '10px 16px' }}
                                >
                                    <AutoAwesomeIcon fontSize="small" />
                                    Start AI Notetaker
                                </button>
                            </div>
                        ) : (
                            <div style={{
                                background: 'rgba(234, 67, 53, 0.08)',
                                border: '1px solid rgba(234, 67, 53, 0.35)',
                                borderRadius: '12px',
                                padding: '16px',
                                marginBottom: '16px'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{
                                            width: '10px',
                                            height: '10px',
                                            borderRadius: '50%',
                                            background: '#ea4335',
                                            display: 'inline-block',
                                            animation: 'pulseRec 1.2s infinite'
                                        }} />
                                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#ea4335' }}>
                                            Listening & Capturing Speech...
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Opt-in Active</span>
                                </div>
                                <p style={{ margin: '0 0 12px 0', fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                    Transcribing conversation chunks. When ready, stop to generate executive notes & mind map.
                                </p>
                                <button
                                    onClick={handleTriggerSummarize}
                                    disabled={isGeneratingAi}
                                    style={{
                                        width: '100%',
                                        background: '#ea4335',
                                        color: '#ffffff',
                                        border: 'none',
                                        borderRadius: '9999px',
                                        padding: '10px 16px',
                                        fontSize: '0.85rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        transition: 'background 0.2s ease'
                                    }}
                                >
                                    {isGeneratingAi ? <CircularProgress size={16} color="inherit" /> : <AutoAwesomeIcon fontSize="small" />}
                                    {isGeneratingAi ? "Synthesizing AI Summary..." : "Stop & Generate Summary"}
                                </button>
                            </div>
                        )}

                        {/* Summary Sub-Tab */}
                        {aiSubTab === 0 && (
                            <div>
                                {aiSummaryData?.summaryText ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                        {/* Executive Summary Card */}
                                        <div style={{
                                            background: 'var(--bg-elevated, #28292a)',
                                            border: '1px solid var(--border-subtle, #3c4043)',
                                            borderRadius: '12px',
                                            padding: '16px'
                                        }}>
                                            <h4 style={{ margin: '0 0 8px 0', color: '#8ab4f8', fontSize: '0.95rem', fontWeight: 600 }}>
                                                Executive Summary
                                            </h4>
                                            <p style={{ margin: 0, fontSize: '0.88rem', lineHeight: '1.6', color: 'var(--text-primary)' }}>
                                                {aiSummaryData.summaryText}
                                            </p>
                                        </div>

                                        {/* Key Topics */}
                                        {aiSummaryData.keyTopics?.length > 0 && (
                                            <div>
                                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                                                    Key Discussed Topics
                                                </h4>
                                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                                    {aiSummaryData.keyTopics.map((topic, i) => (
                                                        <span key={i} style={{
                                                            background: 'rgba(26, 115, 232, 0.15)',
                                                            border: '1px solid rgba(138, 180, 248, 0.3)',
                                                            color: '#8ab4f8',
                                                            borderRadius: '16px',
                                                            padding: '4px 12px',
                                                            fontSize: '0.78rem'
                                                        }}>
                                                            {topic}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Action Items */}
                                        {aiSummaryData.actionItems?.length > 0 && (
                                            <div>
                                                <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)' }}>
                                                    Action Items
                                                </h4>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                    {aiSummaryData.actionItems.map((item, i) => (
                                                        <div key={i} style={{
                                                            background: 'var(--bg-elevated, #28292a)',
                                                            border: '1px solid var(--border-subtle, #3c4043)',
                                                            borderRadius: '8px',
                                                            padding: '10px 14px',
                                                            fontSize: '0.85rem'
                                                        }}>
                                                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.task}</div>
                                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                                                <span>Owner: {item.owner}</span>
                                                                <span>Timeline: {item.dueHint}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div style={{ textAlign: 'center', padding: '2rem 1rem', color: 'var(--text-muted)' }}>
                                        <p style={{ margin: '0 0 12px 0', fontSize: '0.88rem' }}>
                                            No summary generated yet. When you are ready, click "Start AI Notetaker" above or on the bottom bar, and then "Stop & Generate Summary".
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Mind Map Sub-Tab */}
                        {aiSubTab === 1 && (
                            <div>
                                <MindMapViewer mindMap={aiSummaryData?.mindMap} />
                            </div>
                        )}

                        {/* Notes Sub-Tab */}
                        {aiSubTab === 2 && (
                            <NotesEditor
                                meetingId={meetingId}
                                initialNotes={aiSummaryData?.notes || ""}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Mute All Confirmation Modal */}
            <Dialog
                open={muteAllConfirmOpen}
                onClose={() => setMuteAllConfirmOpen(false)}
                PaperProps={{
                    style: {
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-editorial)',
                        borderRadius: '0px',
                        color: 'var(--text-primary)'
                    }
                }}
            >
                <DialogTitle style={{ fontFamily: 'var(--font-serif)', color: 'var(--accent-gold)' }}>
                    Mute All Participants?
                </DialogTitle>
                <DialogContent>
                    <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        This will immediately mute the microphone of everyone in the meeting and lock their ability to unmute until you unlock them.
                    </p>
                </DialogContent>
                <DialogActions style={{ padding: '16px' }}>
                    <Button onClick={() => setMuteAllConfirmOpen(false)} style={{ color: 'var(--text-muted)' }}>
                        Cancel
                    </Button>
                    <Button
                        onClick={() => {
                            onMuteAll();
                            setMuteAllConfirmOpen(false);
                        }}
                        style={{ background: '#ff5252', color: '#fff', padding: '6px 16px', borderRadius: '0px' }}
                    >
                        Mute All
                    </Button>
                </DialogActions>
            </Dialog>
        </aside>
    );
}
