import React, { useContext, useState, useEffect } from 'react';
import withAuth from '../utils/withAuth';
import { useNavigate } from 'react-router-dom';
import { IconButton, Tooltip, Menu, MenuItem } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import HistoryIcon from '@mui/icons-material/History';
import LogoutIcon from '@mui/icons-material/Logout';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ShareIcon from '@mui/icons-material/Share';
import SecurityIcon from '@mui/icons-material/Security';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';
import ArrowBackIosNewIcon from '@mui/icons-material/ArrowBackIosNew';
import { AuthContext } from '../contexts/AuthContext';
import axios from 'axios';
import server from '../environment';
import InviteModal from '../components/InviteModal';

function HomeComponent() {
    const navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const [isCreating, setIsCreating] = useState(false);
    const [createdCode, setCreatedCode] = useState(null);
    const [inviteModalOpen, setInviteModalOpen] = useState(false);
    const [anchorEl, setAnchorEl] = useState(null);
    const [currentTime, setCurrentTime] = useState("");
    const [currentSlide, setCurrentSlide] = useState(0);

    const { addToUserHistory } = useContext(AuthContext);
    const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'dark');
    const username = localStorage.getItem("lastUsername") || "User";

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        document.documentElement.setAttribute('data-theme', nextTheme);
        localStorage.setItem('theme', nextTheme);
    };

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const dateStr = now.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
            setCurrentTime(`${timeStr} • ${dateStr}`);
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    const slides = [
        {
            title: "Get a link you can share",
            desc: "Click New meeting to get a link you can send to people you want to meet with.",
            icon: <ShareIcon style={{ fontSize: '3rem', color: '#8ab4f8' }} />
        },
        {
            title: "AI Summaries & Mind Maps",
            desc: "Privacy-first opt-in notetaking synthesizes discussions, action items, and mind maps automatically saved to your History.",
            icon: <AutoAwesomeIcon style={{ fontSize: '3rem', color: '#8ab4f8' }} />
        },
        {
            title: "Your meeting is safe & governed",
            desc: "No unauthorized guests can enter without host admission, and host controls prevent unwanted interruptions.",
            icon: <SecurityIcon style={{ fontSize: '3rem', color: '#8ab4f8' }} />
        }
    ];

    const handleJoinVideoCall = async (e) => {
        e?.preventDefault();
        if (!meetingCode.trim()) return;
        let code = meetingCode.trim();
        if (code.includes("/meeting/")) {
            code = code.split("/meeting/")[1];
        } else if (code.startsWith("http")) {
            const parts = code.split("/");
            code = parts[parts.length - 1];
        }

        try {
            await addToUserHistory(code);
        } catch (err) {}
        navigate(`/meeting/${code}`);
    };

    const handleStartInstant = async () => {
        setAnchorEl(null);
        setIsCreating(true);
        try {
            const res = await axios.post(`${server}/api/meetings/create`, {
                title: "Executive Video Meeting",
                hostId: username
            });
            const code = res.data.roomId || res.data.meetingCode;
            try { await addToUserHistory(code); } catch (e) {}
            navigate(`/meeting/${code}`);
        } catch (err) {
            const fallback = `yorsa-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
            navigate(`/meeting/${fallback}`);
        } finally {
            setIsCreating(false);
        }
    };

    const handleCreateForLater = async () => {
        setAnchorEl(null);
        setIsCreating(true);
        try {
            const res = await axios.post(`${server}/api/meetings/create`, {
                title: "Scheduled Video Meeting",
                hostId: username
            });
            const code = res.data.roomId || res.data.meetingCode;
            try { await addToUserHistory(code); } catch (e) {}
            setCreatedCode(code);
            setInviteModalOpen(true);
        } catch (err) {
            const fallback = `yorsa-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 6)}`;
            setCreatedCode(fallback);
            setInviteModalOpen(true);
        } finally {
            setIsCreating(false);
        }
    };

    return (
        <div style={{
            minHeight: "100vh",
            display: "flex",
            flexDirection: "column",
            background: "var(--bg-primary, #131314)",
            color: "var(--text-primary, #e8eaed)"
        }}>
            {/* Google Meet Navigation Bar */}
            <header style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 28px",
                borderBottom: "1px solid var(--border-subtle, #3c4043)",
                background: "var(--bg-primary, #131314)"
            }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", cursor: "pointer" }} onClick={() => navigate('/home')}>
                    <div style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "10px",
                        background: "linear-gradient(135deg, #1a73e8 0%, #34a853 50%, #fbbc04 100%)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 2px 8px rgba(26, 115, 232, 0.4)"
                    }}>
                        <VideocamIcon style={{ color: "#ffffff", fontSize: "1.4rem" }} />
                    </div>
                    <span style={{ fontSize: "1.4rem", fontWeight: 600, letterSpacing: "-0.02em", color: "var(--text-primary, #e8eaed)" }}>
                        Yorsa <span style={{ color: "#8ab4f8", fontWeight: 400 }}>Meet</span>
                    </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                    <span style={{ fontSize: "0.95rem", color: "var(--text-secondary, #9aa0a6)" }} className="home-clock">
                        {currentTime}
                    </span>

                    <Tooltip title="Toggle Theme">
                        <IconButton onClick={toggleTheme} style={{ color: "var(--text-secondary, #9aa0a6)" }}>
                            {theme === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>

                    <button
                        className="btn-meet-secondary"
                        onClick={() => navigate("/history")}
                        style={{ padding: "8px 16px", fontSize: "0.88rem", display: "flex", alignItems: "center", gap: "6px" }}
                    >
                        <HistoryIcon fontSize="small" />
                        Meeting History & AI Notes
                    </button>

                    <Tooltip title={`Signed in as ${username}`}>
                        <div style={{
                            width: "36px",
                            height: "36px",
                            borderRadius: "50%",
                            background: "#1a73e8",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontWeight: 600,
                            fontSize: "0.95rem"
                        }}>
                            {username.charAt(0).toUpperCase()}
                        </div>
                    </Tooltip>

                    <Tooltip title="Sign Out">
                        <IconButton
                            onClick={() => {
                                localStorage.removeItem("token");
                                navigate("/auth");
                            }}
                            style={{ color: "var(--text-secondary, #9aa0a6)" }}
                        >
                            <LogoutIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </div>
            </header>

            {/* Google Meet Split Hero View */}
            <main style={{
                flex: 1,
                display: "grid",
                gridTemplateColumns: "1.1fr 1fr",
                gap: "3rem",
                alignItems: "center",
                maxWidth: "1350px",
                width: "100%",
                margin: "0 auto",
                padding: "4rem 2rem"
            }} className="meet-hero-grid">
                {/* Left Side: Headlines & Action Inputs */}
                <div style={{ maxWidth: "580px" }}>
                    <h1 style={{
                        fontSize: "clamp(2.4rem, 4.5vw, 3.4rem)",
                        fontWeight: 500,
                        lineHeight: 1.15,
                        letterSpacing: "-0.02em",
                        marginBottom: "1.25rem",
                        color: "var(--text-primary)"
                    }}>
                        Premium video meetings. Now free for everyone.
                    </h1>

                    <p style={{
                        fontSize: "1.15rem",
                        lineHeight: 1.6,
                        color: "var(--text-secondary, #9aa0a6)",
                        marginBottom: "2.5rem"
                    }}>
                        Start an instant video meeting with AI summarization, generate an invite link for later, or enter an active meeting code.
                    </p>

                    {/* Action Bar */}
                    <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "16px",
                        flexWrap: "wrap",
                        marginBottom: "2rem"
                    }}>
                        <button
                            className="btn-meet-primary"
                            onClick={(e) => setAnchorEl(e.currentTarget)}
                            disabled={isCreating}
                            style={{ height: "48px", padding: "0 22px", fontSize: "0.95rem" }}
                        >
                            <VideocamIcon />
                            New meeting
                        </button>

                        <Menu
                            anchorEl={anchorEl}
                            open={Boolean(anchorEl)}
                            onClose={() => setAnchorEl(null)}
                            PaperProps={{
                                style: {
                                    background: "var(--bg-elevated, #28292a)",
                                    borderRadius: "8px",
                                    color: "var(--text-primary)",
                                    border: "1px solid var(--border-subtle, #3c4043)",
                                    boxShadow: "0 8px 24px rgba(0,0,0,0.5)"
                                }
                            }}
                        >
                            <MenuItem onClick={handleCreateForLater} style={{ gap: "10px", fontSize: "0.9rem", padding: "12px 18px" }}>
                                <ShareIcon fontSize="small" style={{ color: "#8ab4f8" }} />
                                Create a meeting for later
                            </MenuItem>
                            <MenuItem onClick={handleStartInstant} style={{ gap: "10px", fontSize: "0.9rem", padding: "12px 18px" }}>
                                <VideocamIcon fontSize="small" style={{ color: "#8ab4f8" }} />
                                Start an instant meeting
                            </MenuItem>
                        </Menu>

                        <form onSubmit={handleJoinVideoCall} style={{
                            display: "flex",
                            alignItems: "center",
                            background: "var(--bg-elevated, #28292a)",
                            border: "1px solid var(--border-subtle, #3c4043)",
                            borderRadius: "8px",
                            padding: "0 12px",
                            height: "48px",
                            flex: 1,
                            minWidth: "240px"
                        }}>
                            <KeyboardIcon style={{ color: "var(--text-muted, #80868b)", marginRight: "8px" }} />
                            <input
                                type="text"
                                value={meetingCode}
                                onChange={e => setMeetingCode(e.target.value)}
                                placeholder="Enter a code or link"
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    color: "var(--text-primary, #e8eaed)",
                                    fontSize: "0.95rem",
                                    outline: "none",
                                    width: "100%"
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!meetingCode.trim()}
                                style={{
                                    background: "transparent",
                                    border: "none",
                                    color: meetingCode.trim() ? "#8ab4f8" : "var(--text-muted, #80868b)",
                                    fontWeight: 600,
                                    fontSize: "0.9rem",
                                    cursor: meetingCode.trim() ? "pointer" : "default",
                                    padding: "4px 8px"
                                }}
                            >
                                Join
                            </button>
                        </form>
                    </div>

                    <div style={{ height: "1px", background: "var(--border-subtle, #3c4043)", marginBottom: "1.5rem" }} />

                    <div>
                        <button
                            onClick={() => navigate("/history")}
                            style={{
                                background: "transparent",
                                border: "none",
                                color: "#8ab4f8",
                                fontSize: "0.95rem",
                                fontWeight: 500,
                                cursor: "pointer",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "6px"
                            }}
                        >
                            <AutoAwesomeIcon fontSize="small" />
                            View your past meeting summaries & mind maps →
                        </button>
                    </div>
                </div>

                {/* Right Side: Google Meet Card Showcase */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <div style={{
                        width: "100%",
                        maxWidth: "440px",
                        background: "var(--bg-secondary, #202124)",
                        border: "1px solid var(--border-subtle, #3c4043)",
                        borderRadius: "24px",
                        padding: "40px 32px",
                        textAlign: "center",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
                        minHeight: "340px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        position: "relative"
                    }}>
                        <div style={{
                            width: "90px",
                            height: "90px",
                            borderRadius: "50%",
                            background: "rgba(26, 115, 232, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            marginBottom: "24px"
                        }}>
                            {slides[currentSlide].icon}
                        </div>

                        <h3 style={{ fontSize: "1.3rem", fontWeight: 600, marginBottom: "12px", color: "var(--text-primary)" }}>
                            {slides[currentSlide].title}
                        </h3>

                        <p style={{ fontSize: "0.92rem", color: "var(--text-secondary, #9aa0a6)", lineHeight: 1.5, margin: 0 }}>
                            {slides[currentSlide].desc}
                        </p>

                        <div style={{
                            position: "absolute",
                            left: "12px",
                            top: "50%",
                            transform: "translateY(-50%)"
                        }}>
                            <IconButton
                                size="small"
                                onClick={() => setCurrentSlide(prev => (prev === 0 ? slides.length - 1 : prev - 1))}
                                style={{ color: "var(--text-secondary)" }}
                            >
                                <ArrowBackIosNewIcon fontSize="small" />
                            </IconButton>
                        </div>

                        <div style={{
                            position: "absolute",
                            right: "12px",
                            top: "50%",
                            transform: "translateY(-50%)"
                        }}>
                            <IconButton
                                size="small"
                                onClick={() => setCurrentSlide(prev => (prev + 1) % slides.length)}
                                style={{ color: "var(--text-secondary)" }}
                            >
                                <ArrowForwardIosIcon fontSize="small" />
                            </IconButton>
                        </div>

                        <div style={{ display: "flex", gap: "8px", marginTop: "28px" }}>
                            {slides.map((_, i) => (
                                <button
                                    key={i}
                                    onClick={() => setCurrentSlide(i)}
                                    style={{
                                        width: i === currentSlide ? "20px" : "8px",
                                        height: "8px",
                                        borderRadius: "4px",
                                        background: i === currentSlide ? "#1a73e8" : "var(--border-subtle, #3c4043)",
                                        border: "none",
                                        cursor: "pointer",
                                        transition: "all 0.25s ease"
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </main>

            {/* Invite Modal for newly created meeting */}
            <InviteModal
                open={inviteModalOpen}
                onClose={() => {
                    setInviteModalOpen(false);
                    if (createdCode) navigate(`/meeting/${createdCode}`);
                }}
                meetingCode={createdCode || ""}
            />

            <footer style={{
                textAlign: "center", 
                padding: "20px", 
                fontSize: "0.82rem", 
                color: "var(--text-muted, #80868b)",
                borderTop: "1px solid var(--border-subtle, #3c4043)",
                marginTop: "auto"
            }}>
                Yorsa Meet • Built with WebRTC and Hugging Face AI
            </footer>

            <style>{`
                @media (max-width: 900px) {
                    .meet-hero-grid {
                        grid-template-columns: 1fr !important;
                        padding: 2.5rem 1.5rem !important;
                    }
                    .home-clock {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}

export default withAuth(HomeComponent);