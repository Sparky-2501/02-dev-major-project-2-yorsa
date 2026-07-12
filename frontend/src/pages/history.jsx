import React, { useContext, useEffect, useState } from 'react'
import { AuthContext } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import MeetingRoomIcon from '@mui/icons-material/MeetingRoom';
import { IconButton } from '@mui/material';

export default function History() {
    const { getHistoryOfUser } = useContext(AuthContext);
    const [meetings, setMeetings] = useState([])
    const routeTo = useNavigate();

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const history = await getHistoryOfUser();
                setMeetings(history);
            } catch {
                // error handling
            }
        }
        fetchHistory();
    }, [])

    let formatDate = (dateString) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0")
        const year = date.getFullYear();
        return `${day}/${month}/${year}`
    }

    return (
        <div className="historyContainer">
            <div className="historyHeader">
                <IconButton 
                    onClick={() => routeTo("/home")}
                    style={{ color: "var(--text-primary)", background: "rgba(255, 255, 255, 0.05)" }}
                >
                    <ArrowBackIcon />
                </IconButton>
                <h1 className="historyTitle">Meeting History</h1>
            </div>

            {meetings.length !== 0 ? (
                <div className="historyGrid">
                    {meetings.map((e, i) => (
                        <div key={i} className="historyCard glass-container">
                            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "1rem" }}>
                                <MeetingRoomIcon style={{ color: "var(--accent-purple-light)" }} />
                                <span style={{ fontWeight: "700", fontSize: "1.1rem" }}>Room Code</span>
                            </div>
                            <h2 style={{ fontSize: "1.3rem", fontWeight: "600", marginBottom: "1.5rem", color: "#fff", wordBreak: "break-all" }}>
                                {e.meetingCode}
                            </h2>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
                                <CalendarTodayIcon style={{ fontSize: "1rem" }} />
                                <span>{formatDate(e.date)}</span>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div style={{ textAlign: "center", marginTop: "4rem", color: "var(--text-secondary)" }}>
                    <p style={{ fontSize: "1.2rem" }}>No past meetings found.</p>
                </div>
            )}
        </div>
    )
}
