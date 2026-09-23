import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ListAltIcon from '@mui/icons-material/ListAlt';
import CloseIcon from '@mui/icons-material/Close';
import { IconButton, Dialog, DialogContent, Tabs, Tab, CircularProgress, Tooltip } from '@mui/material';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import axios from 'axios';
import server from '../environment';
import MindMapViewer from '../components/MindMapViewer';
import NotesEditor from '../components/NotesEditor';

export default function History() {
    const { getHistoryOfUser, getMeetingAudit } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([]);
    const [selectedAuditLog, setSelectedAuditLog] = useState(null);
    const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
    const [loadingAudit, setLoadingAudit] = useState(false);

    // AI Summary Modal state
    const [summaryModalOpen, setSummaryModalOpen] = useState(false);
    const [selectedSummaryMeetingId, setSelectedSummaryMeetingId] = useState(null);
    const [summaryData, setSummaryData] = useState(null);
    const [loadingSummary, setLoadingSummary] = useState(false);
    const [activeAiTab, setActiveAiTab] = useState(0);

    const navigate = useNavigate();
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('theme', nextTheme);
    };

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                let remoteMeetings = [];
                try {
                    remoteMeetings = await getHistoryOfUser();
                } catch (err) {
                    console.warn("Could not fetch remote history, checking local cache:", err);
                }

                // Retrieve local history backup (for guest sessions and offline resilience)
                const localList = JSON.parse(localStorage.getItem("recentMeetings") || "[]");
                const merged = [...(remoteMeetings || [])];
                localList.forEach(loc => {
                    const code = loc.meetingCode || loc.roomId;
                    if (code && !merged.some(m => (m.meetingCode === code || m.roomId === code))) {
                        merged.push(loc);
                    }
                });

                setMeetings(merged);
            } catch (err) {
                console.error("Error fetching meeting history:", err);
            }
        };
        fetchHistory();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) return "Recent session";
        const date = new Date(dateString);
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const handleViewAudit = async (meetingCode) => {
        setLoadingAudit(true);
        setIsAuditModalOpen(true);
        try {
            const logs = await getMeetingAudit(meetingCode);
            setSelectedAuditLog({ meetingCode, logs });
        } catch (err) {
            setSelectedAuditLog({ meetingCode, logs: [], error: "No attendee records available." });
        } finally {
            setLoadingAudit(false);
        }
    };

    const handleViewSummary = async (meetingCode) => {
        setSelectedSummaryMeetingId(meetingCode);
        setSummaryModalOpen(true);
        setLoadingSummary(true);
        setActiveAiTab(0);
        try {
            const res = await axios.get(`${server}/api/meetings/${meetingCode}/summary`);
            setSummaryData(res.data?.summary || null);
        } catch (err) {
            setSummaryData(null);
        } finally {
            setLoadingSummary(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-primary, #131314)",
            color: "var(--text-primary, #e8eaed)",
            padding: "2rem 6%"
        }}>
            {/* Google Meet Modern Header */}
            <div style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "2.5rem",
                paddingBottom: "1.25rem",
                borderBottom: "1px solid var(--border-subtle, #3c4043)"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
                    <Tooltip title="Back to Dashboard">
                        <IconButton 
                            onClick={() => navigate("/home")}
                            style={{
                                color: "var(--text-primary, #e8eaed)",
                                border: "1px solid var(--border-subtle, #3c4043)",
                                borderRadius: "50%",
                                padding: "8px"
                            }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                    </Tooltip>
                    <div>
                        <h1 style={{ fontSize: "1.8rem", fontWeight: 600, margin: 0, color: "var(--text-primary)" }}>
                            Meeting Records & AI Intelligence
                        </h1>
                        <p style={{ margin: "4px 0 0 0", color: "var(--text-secondary, #9aa0a6)", fontSize: "0.9rem" }}>
                            Past video conferences, executive summaries, interactive mind maps, and attendee logs
                        </p>
                    </div>
                </div>
                
                <Tooltip title="Toggle Theme">
                    <IconButton 
                        onClick={toggleTheme} 
                        style={{ color: "var(--text-secondary)", border: "1px solid var(--border-subtle, #3c4043)", borderRadius: "50%" }}
                    >
                        {theme === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                    </IconButton>
                </Tooltip>
            </div>

            {/* Meeting Cards Grid */}
            {meetings.length !== 0 ? (
                <div style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                    gap: "1.5rem"
                }}>
                    {meetings.map((m, i) => {
                        const code = m.meetingCode || m.roomId;
                        return (
                            <div 
                                key={i} 
                                style={{
                                    background: "var(--bg-secondary, #202124)",
                                    border: "1px solid var(--border-subtle, #3c4043)",
                                    borderRadius: "16px",
                                    padding: "1.5rem",
                                    boxShadow: "0 4px 20px rgba(0,0,0,0.3)",
                                    display: "flex",
                                    flexDirection: "column",
                                    justifyContent: "space-between",
                                    transition: "transform 0.2s ease, border-color 0.2s ease"
                                }}
                            >
                                <div>
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#8ab4f8" }}>
                                            <MeetingRoomIcon fontSize="small" />
                                            <span style={{ fontSize: "0.8rem", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase" }}>Room Key</span>
                                        </div>
                                        <span style={{ fontSize: "0.8rem", color: "var(--text-muted, #80868b)" }}>
                                            {formatDate(m.date || m.createdAt)}
                                        </span>
                                    </div>
                                    <h3 style={{
                                        fontSize: "1.15rem",
                                        fontWeight: 600,
                                        color: "var(--text-primary)",
                                        wordBreak: "break-all",
                                        margin: "0 0 1.5rem 0",
                                        fontFamily: "monospace"
                                    }}>
                                        {code}
                                    </h3>
                                </div>

                                <div style={{ display: "flex", gap: "10px" }}>
                                    <button
                                        onClick={() => handleViewSummary(code)}
                                        className="btn-meet-primary"
                                        style={{ flex: 1, padding: "8px 12px", fontSize: "0.82rem", borderRadius: "9999px" }}
                                    >
                                        <AutoAwesomeIcon style={{ fontSize: "0.95rem" }} />
                                        AI Notes & Map
                                    </button>
                                    <button
                                        onClick={() => handleViewAudit(code)}
                                        className="btn-meet-secondary"
                                        style={{ padding: "8px 14px", fontSize: "0.82rem", borderRadius: "9999px" }}
                                    >
                                        <ListAltIcon style={{ fontSize: "0.95rem" }} />
                                        Audit
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div style={{ textAlign: "center", margin: "5rem auto", color: "var(--text-secondary)" }}>
                    <p style={{ fontSize: "1.3rem", fontWeight: 600, color: "var(--text-primary)" }}>No past sessions found</p>
                    <p style={{ fontSize: "0.95rem", maxWidth: "420px", margin: "8px auto 20px auto" }}>
                        Initiate a video meeting from the dashboard and use the AI Notetaker to generate summaries and mind maps.
                    </p>
                    <button
                        className="btn-meet-primary"
                        onClick={() => navigate('/home')}
                    >
                        Start a Meeting Now
                    </button>
                </div>
            )}

            {/* AI Summary, Mind Map & Collaborative Notes Modal */}
            <Dialog
                open={summaryModalOpen}
                onClose={() => setSummaryModalOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    style: {
                        background: 'var(--bg-secondary, #202124)',
                        border: '1px solid var(--border-subtle, #3c4043)',
                        borderRadius: '16px',
                        color: 'var(--text-primary)',
                        maxHeight: '90vh'
                    }
                }}
            >
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '16px 24px',
                    borderBottom: '1px solid var(--border-subtle, #3c4043)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AutoAwesomeIcon style={{ color: '#8ab4f8' }} />
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, margin: 0, color: 'var(--text-primary)' }}>
                            Meeting Intelligence: <span style={{ color: '#8ab4f8', fontFamily: 'monospace' }}>{selectedSummaryMeetingId}</span>
                        </h2>
                    </div>
                    <IconButton onClick={() => setSummaryModalOpen(false)} style={{ color: 'var(--text-secondary)' }}>
                        <CloseIcon />
                    </IconButton>
                </div>

                <Tabs
                    value={activeAiTab}
                    onChange={(e, val) => setActiveAiTab(val)}
                    textColor="inherit"
                    TabIndicatorProps={{ style: { background: '#1a73e8' } }}
                    style={{ borderBottom: '1px solid var(--border-subtle, #3c4043)', padding: '0 16px' }}
                >
                    <Tab label="Executive Summary" style={{ textTransform: 'none', color: activeAiTab === 0 ? '#8ab4f8' : 'var(--text-secondary)' }} />
                    <Tab label="Mind Map Tree" style={{ textTransform: 'none', color: activeAiTab === 1 ? '#8ab4f8' : 'var(--text-secondary)' }} />
                    <Tab label="Collaborative Notes" style={{ textTransform: 'none', color: activeAiTab === 2 ? '#8ab4f8' : 'var(--text-secondary)' }} />
                </Tabs>

                <DialogContent style={{ padding: '24px' }}>
                    {loadingSummary ? (
                        <div style={{ textAlign: 'center', padding: '3rem' }}>
                            <CircularProgress style={{ color: '#8ab4f8' }} />
                            <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading session intelligence...</p>
                        </div>
                    ) : summaryData ? (
                        activeAiTab === 0 ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                                <div style={{
                                    background: 'var(--bg-elevated, #28292a)',
                                    border: '1px solid var(--border-subtle, #3c4043)',
                                    borderRadius: '12px',
                                    padding: '18px'
                                }}>
                                    <h4 style={{ margin: '0 0 10px 0', color: '#8ab4f8', fontSize: '1.05rem', fontWeight: 600 }}>
                                        Executive Brief
                                    </h4>
                                    <p style={{ margin: 0, lineHeight: 1.7, fontSize: '0.92rem' }}>{summaryData.summaryText}</p>
                                </div>

                                {summaryData.keyTopics?.length > 0 && (
                                    <div>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                                            Primary Themes
                                        </h4>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                                            {summaryData.keyTopics.map((topic, idx) => (
                                                <span key={idx} style={{
                                                    background: 'rgba(26, 115, 232, 0.15)',
                                                    border: '1px solid rgba(138, 180, 248, 0.3)',
                                                    color: '#8ab4f8',
                                                    borderRadius: '16px',
                                                    padding: '4px 12px',
                                                    fontSize: '0.8rem'
                                                }}>
                                                    {topic}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {summaryData.actionItems?.length > 0 && (
                                    <div>
                                        <h4 style={{ margin: '0 0 8px 0', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                                            Action Deliverables
                                        </h4>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            {summaryData.actionItems.map((item, idx) => (
                                                <div key={idx} style={{
                                                    background: 'var(--bg-elevated, #28292a)',
                                                    border: '1px solid var(--border-subtle, #3c4043)',
                                                    borderRadius: '8px',
                                                    padding: '12px 16px'
                                                }}>
                                                    <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{item.task}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                                        <span>Owner: {item.owner}</span>
                                                        <span>Due: {item.dueHint}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : activeAiTab === 1 ? (
                            <MindMapViewer mindMap={summaryData.mindMap} />
                        ) : (
                            <NotesEditor meetingId={selectedSummaryMeetingId} initialNotes={summaryData.notes || ""} />
                        )
                    ) : (
                        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                            <p style={{ margin: '0 0 14px 0', fontSize: '0.95rem' }}>No AI summary has been generated for this session yet.</p>
                            <button
                                className="btn-meet-primary"
                                onClick={async () => {
                                    setLoadingSummary(true);
                                    try {
                                        await axios.post(`${server}/api/meetings/${selectedSummaryMeetingId}/summarize`, {});
                                        setTimeout(() => handleViewSummary(selectedSummaryMeetingId), 2000);
                                    } catch (e) {
                                        setLoadingSummary(false);
                                    }
                                }}
                            >
                                <AutoAwesomeIcon fontSize="small" />
                                Generate AI Synthesis Now
                            </button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Attendee Audit Log Modal */}
            <Dialog
                open={isAuditModalOpen}
                onClose={() => setIsAuditModalOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    style: {
                        background: 'var(--bg-secondary, #202124)',
                        border: '1px solid var(--border-subtle, #3c4043)',
                        borderRadius: '16px',
                        color: 'var(--text-primary)'
                    }
                }}
            >
                <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border-subtle, #3c4043)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ margin: 0, fontWeight: 600, color: 'var(--text-primary)' }}>
                        Audit Log: {selectedAuditLog?.meetingCode}
                    </h3>
                    <IconButton onClick={() => setIsAuditModalOpen(false)} style={{ color: 'var(--text-secondary)' }}>
                        <CloseIcon />
                    </IconButton>
                </div>
                <DialogContent style={{ padding: '20px' }}>
                    {loadingAudit ? (
                        <div style={{ textAlign: 'center', padding: '2rem' }}>
                            <CircularProgress style={{ color: '#8ab4f8' }} />
                        </div>
                    ) : selectedAuditLog?.logs?.length > 0 ? (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                            <thead>
                                <tr style={{ borderBottom: '1px solid var(--border-subtle, #3c4043)', textAlign: 'left', color: 'var(--text-muted)' }}>
                                    <th style={{ padding: '8px' }}>User</th>
                                    <th style={{ padding: '8px' }}>Account</th>
                                    <th style={{ padding: '8px' }}>IP</th>
                                    <th style={{ padding: '8px' }}>Join Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedAuditLog.logs.map((log, idx) => (
                                    <tr key={idx} style={{ borderBottom: '1px solid var(--border-subtle, #3c4043)' }}>
                                        <td style={{ padding: '8px' }}>{log.username}</td>
                                        <td style={{ padding: '8px' }}>{log.accountName || "Guest"}</td>
                                        <td style={{ padding: '8px' }}>{log.ipAddress || "Unknown"}</td>
                                        <td style={{ padding: '8px' }}>{new Date(log.joinTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <p style={{ textAlign: 'center', color: 'var(--text-muted)', margin: '2rem 0' }}>No attendee logs recorded for this meeting.</p>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
