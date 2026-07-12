import React, { useContext, useState } from 'react'
import withAuth from '../utils/withAuth'
import { useNavigate } from 'react-router-dom'
import "../App.css";
import { IconButton } from '@mui/material';
import RestoreIcon from '@mui/icons-material/Restore';
import LogoutIcon from '@mui/icons-material/Logout';
import VideoCallIcon from '@mui/icons-material/VideoCall';
import { AuthContext } from '../contexts/AuthContext';

function HomeComponent() {
    let navigate = useNavigate();
    const [meetingCode, setMeetingCode] = useState("");
    const { addToUserHistory } = useContext(AuthContext);

    let handleJoinVideoCall = async () => {
        if (!meetingCode.trim()) return;
        await addToUserHistory(meetingCode);
        navigate(`/${meetingCode}`);
    };

    let handleCreateMeeting = async () => {
        // Generate a random meeting code in format yorsa-xxxx-xxxx
        const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
        let code = 'yorsa-';
        for (let i = 0; i < 4; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        code += '-';
        for (let i = 0; i < 4; i++) {
            code += chars[Math.floor(Math.random() * chars.length)];
        }
        await addToUserHistory(code);
        navigate(`/${code}`);
    };

    return (
        <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <div className="navBar">
                <div style={{ display: "flex", alignItems: "center" }}>
                    <h2 className="logoText" style={{ fontSize: "1.75rem" }}>
                        Yorsa <span className="logoSubtext">Lobby</span>
                    </h2>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <IconButton 
                        onClick={() => navigate("/history")} 
                        style={{ color: "var(--text-primary)", background: "rgba(255,255,255,0.05)", padding: "10px" }}
                    >
                        <RestoreIcon />
                    </IconButton>
                    
                    <button 
                        className="btn-yorsa-secondary" 
                        onClick={() => {
                            localStorage.removeItem("token");
                            navigate("/auth");
                        }}
                        style={{ display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
                    >
                        <LogoutIcon style={{ fontSize: "1.1rem" }} />
                        Logout
                    </button>
                </div>
            </div>

            <div className="meetContainer">
                <div className="leftPanel">
                    <div>
                        <h2>Connect with your team instantly.</h2>
                        <p style={{ color: "var(--text-secondary)", marginBottom: "2rem", fontSize: "1.1rem", lineHeight: "1.5" }}>
                            Yorsa makes video meetings elegant and simple. Enter a meeting code to join an ongoing call, or create a brand new room in one click.
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: "1.25rem", maxWidth: "450px" }}>
                            <div className="authInputGroup">
                                <input 
                                    type="text" 
                                    id="meetingCode"
                                    value={meetingCode} 
                                    onChange={e => setMeetingCode(e.target.value)} 
                                    className="authInputField" 
                                    placeholder=" "
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleJoinVideoCall();
                                    }}
                                />
                                <label htmlFor="meetingCode" className="authInputLabel">Enter Meeting Code</label>
                            </div>
                            
                            <div style={{ display: 'flex', gap: "12px" }}>
                                <button 
                                    onClick={handleJoinVideoCall} 
                                    className="btn-yorsa" 
                                    style={{ flex: 1 }}
                                    disabled={!meetingCode.trim()}
                                >
                                    Join Meeting
                                </button>
                                <button 
                                    onClick={handleCreateMeeting} 
                                    className="btn-yorsa-secondary" 
                                    style={{ display: "flex", alignItems: "center", gap: "6px" }}
                                >
                                    <VideoCallIcon />
                                    New Meeting
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className='rightPanel'>
                    <img src='/logo3.png' alt="Yorsa Lobby Logo" />
                </div>
            </div>
        </div>
    )
}

export default withAuth(HomeComponent)