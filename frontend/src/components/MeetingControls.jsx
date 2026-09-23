import React, { useState, useEffect } from 'react';
import { IconButton, Badge, Tooltip, Menu, MenuItem } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import PresentToAllIcon from '@mui/icons-material/PresentToAll';
import CancelPresentationIcon from '@mui/icons-material/CancelPresentation';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CallEndIcon from '@mui/icons-material/CallEnd';
import LockIcon from '@mui/icons-material/Lock';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import SpeedIcon from '@mui/icons-material/Speed';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

export default function MeetingControls({
    meetingRoomId,
    video,
    audio,
    screen,
    screenAvailable,
    micLocked,
    isHost,
    activePanel,
    newMessagesCount,
    lowBandwidth,
    theme,
    // AI Notetaker Opt-in states
    isAiListening,
    onToggleAiListening,
    // Actions
    onToggleVideo,
    onToggleAudio,
    onToggleScreen,
    onTogglePanel,
    onOpenInvite,
    onToggleLowBandwidth,
    onToggleTheme,
    onHostMuteAll,
    onEndCall
}) {
    const [currentTime, setCurrentTime] = useState("");
    const [anchorEl, setAnchorEl] = useState(null);
    const isMenuOpen = Boolean(anchorEl);

    useEffect(() => {
        const updateClock = () => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
        };
        updateClock();
        const timer = setInterval(updateClock, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleMenuClick = (event) => setAnchorEl(event.currentTarget);
    const handleMenuClose = () => setAnchorEl(null);

    return (
        <div style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            height: '80px',
            background: 'var(--bg-primary)',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 24px',
            zIndex: 100,
            boxSizing: 'border-box'
        }}>
            {/* LEFT: Meeting Time & ID (Google Meet Style) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: '220px' }} className="meet-bottom-left">
                <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                    {currentTime}
                </span>
                <span style={{ color: 'var(--border-subtle)' }}>|</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                        {meetingRoomId}
                    </span>
                    <Tooltip title="Copy invite link">
                        <IconButton size="small" onClick={onOpenInvite} style={{ color: 'var(--text-muted)' }}>
                            <ContentCopyIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </div>
            </div>

            {/* CENTER: Iconic Circular Controls & Red Pill End Call */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Microphone Toggle */}
                <Tooltip title={micLocked ? "Locked by host" : (audio ? "Turn off microphone (ctrl + d)" : "Turn on microphone (ctrl + d)")}>
                    <span>
                        <IconButton
                            onClick={onToggleAudio}
                            disabled={micLocked}
                            style={{
                                width: '48px',
                                height: '48px',
                                background: micLocked ? 'rgba(234, 67, 53, 0.2)' : (audio ? '#3c4043' : '#ea4335'),
                                color: '#ffffff',
                                borderRadius: '50%',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {micLocked ? <LockIcon fontSize="small" /> : (audio ? <MicIcon fontSize="small" /> : <MicOffIcon fontSize="small" />)}
                        </IconButton>
                    </span>
                </Tooltip>

                {/* Camera Toggle */}
                <Tooltip title={video ? "Turn off camera (ctrl + e)" : "Turn on camera (ctrl + e)"}>
                    <IconButton
                        onClick={onToggleVideo}
                        style={{
                            width: '48px',
                            height: '48px',
                            background: video ? '#3c4043' : '#ea4335',
                            color: '#ffffff',
                            borderRadius: '50%',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {video ? <VideocamIcon fontSize="small" /> : <VideocamOffIcon fontSize="small" />}
                    </IconButton>
                </Tooltip>

                {/* OPT-IN AI NOTETAKER (Privacy-First Explicit Toggle) */}
                <Tooltip title={isAiListening ? "AI Notetaker is listening... Click to stop & synthesize" : "Start AI Notetaker (transcribes & generates summary)"}>
                    <button
                        onClick={onToggleAiListening}
                        style={{
                            height: '48px',
                            padding: isAiListening ? '0 18px' : '0 16px',
                            background: isAiListening ? '#1a73e8' : '#3c4043',
                            color: '#ffffff',
                            border: isAiListening ? '2px solid #8ab4f8' : 'none',
                            borderRadius: '9999px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.25s ease',
                            boxShadow: isAiListening ? '0 0 15px rgba(26, 115, 232, 0.5)' : 'none'
                        }}
                    >
                        {isAiListening && (
                            <span style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: '#ea4335',
                                display: 'inline-block',
                                animation: 'pulseRec 1.2s infinite'
                            }} />
                        )}
                        <AutoAwesomeIcon fontSize="small" style={{ color: isAiListening ? '#fff' : '#8ab4f8' }} />
                        <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>
                            {isAiListening ? "AI Listening..." : "AI Notetaker"}
                        </span>
                    </button>
                </Tooltip>

                {/* Screen Share */}
                {screenAvailable && (
                    <Tooltip title={screen ? "Stop presenting" : "Present now"}>
                        <IconButton
                            onClick={onToggleScreen}
                            style={{
                                width: '48px',
                                height: '48px',
                                background: screen ? '#8ab4f8' : '#3c4043',
                                color: screen ? '#131314' : '#ffffff',
                                borderRadius: '50%',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {screen ? <CancelPresentationIcon fontSize="small" /> : <PresentToAllIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                )}

                {/* Host Mute-All Button */}
                {isHost && (
                    <Tooltip title="Mute all participants">
                        <IconButton
                            onClick={onHostMuteAll}
                            style={{
                                width: '48px',
                                height: '48px',
                                background: '#3c4043',
                                color: '#ea4335',
                                borderRadius: '50%'
                            }}
                        >
                            <VolumeOffIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}

                {/* More Options Menu */}
                <Tooltip title="More options">
                    <IconButton
                        onClick={handleMenuClick}
                        style={{
                            width: '48px',
                            height: '48px',
                            background: '#3c4043',
                            color: '#ffffff',
                            borderRadius: '50%'
                        }}
                    >
                        <MoreVertIcon fontSize="small" />
                    </IconButton>
                </Tooltip>

                {/* End Call (Iconic Google Meet Red Pill) */}
                <Tooltip title="Leave call">
                    <button
                        onClick={onEndCall}
                        style={{
                            height: '48px',
                            padding: '0 24px',
                            background: '#ea4335',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '9999px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background 0.2s ease'
                        }}
                    >
                        <CallEndIcon fontSize="small" />
                    </button>
                </Tooltip>
            </div>

            {/* RIGHT: Meeting Info & Side Panels (Google Meet Right Icons) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '220px', justifyContent: 'flex-end' }}>
                <Tooltip title="Meeting details">
                    <IconButton onClick={onOpenInvite} style={{ color: 'var(--text-secondary)' }}>
                        <InfoOutlinedIcon />
                    </IconButton>
                </Tooltip>

                {/* People / Participants Panel */}
                <Tooltip title="People">
                    <IconButton
                        onClick={() => onTogglePanel('participants')}
                        style={{
                            color: activePanel === 'participants' ? '#8ab4f8' : 'var(--text-secondary)',
                            background: activePanel === 'participants' ? 'rgba(138, 180, 248, 0.15)' : 'transparent'
                        }}
                    >
                        <PeopleAltOutlinedIcon />
                    </IconButton>
                </Tooltip>

                {/* Chat Panel */}
                <Tooltip title="Chat with everyone">
                    <IconButton
                        onClick={() => onTogglePanel('chat')}
                        style={{
                            color: activePanel === 'chat' ? '#8ab4f8' : 'var(--text-secondary)',
                            background: activePanel === 'chat' ? 'rgba(138, 180, 248, 0.15)' : 'transparent'
                        }}
                    >
                        <Badge badgeContent={newMessagesCount} color="primary">
                            <ChatBubbleOutlineIcon />
                        </Badge>
                    </IconButton>
                </Tooltip>

                {/* AI Summary / Activities Panel */}
                <Tooltip title="AI Activities & Mind Map">
                    <IconButton
                        onClick={() => onTogglePanel('ai')}
                        style={{
                            color: activePanel === 'ai' ? '#8ab4f8' : 'var(--text-secondary)',
                            background: activePanel === 'ai' ? 'rgba(138, 180, 248, 0.15)' : 'transparent'
                        }}
                    >
                        <AutoAwesomeIcon />
                    </IconButton>
                </Tooltip>
            </div>

            {/* Overflow Options Menu */}
            <Menu
                anchorEl={anchorEl}
                open={isMenuOpen}
                onClose={handleMenuClose}
                PaperProps={{
                    style: {
                        background: 'var(--bg-elevated)',
                        borderRadius: '8px',
                        color: 'var(--text-primary)',
                        border: '1px solid var(--border-subtle)'
                    }
                }}
            >
                <MenuItem onClick={() => { onToggleLowBandwidth(); handleMenuClose(); }}>
                    <SpeedIcon style={{ marginRight: 10, fontSize: '1.1rem', color: lowBandwidth ? '#fbbc04' : 'inherit' }} />
                    {lowBandwidth ? "Disable Data Saver" : "Enable Data Saver (Audio Priority)"}
                </MenuItem>
                <MenuItem onClick={() => { onToggleTheme(); handleMenuClose(); }}>
                    {theme === 'dark' ? <LightModeIcon style={{ marginRight: 10, fontSize: '1.1rem' }} /> : <DarkModeIcon style={{ marginRight: 10, fontSize: '1.1rem' }} />}
                    {theme === 'dark' ? "Switch to Light Theme" : "Switch to Dark Theme"}
                </MenuItem>
            </Menu>

            <style>{`
                @keyframes pulseRec {
                    0% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(1.3); opacity: 0.5; }
                    100% { transform: scale(1); opacity: 1; }
                }
                @media (max-width: 800px) {
                    .meet-bottom-left {
                        display: none !important;
                    }
                }
            `}</style>
        </div>
    );
}
