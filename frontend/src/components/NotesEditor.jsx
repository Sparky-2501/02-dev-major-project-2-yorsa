import React, { useState, useEffect } from 'react';
import axios from 'axios';
import server from '../environment';
import SaveIcon from '@mui/icons-material/Save';
import CheckIcon from '@mui/icons-material/Check';

export default function NotesEditor({ meetingId, initialNotes = "" }) {
    const [notes, setNotes] = useState(initialNotes);
    const [isSaving, setIsSaving] = useState(false);
    const [savedStatus, setSavedStatus] = useState(false);

    useEffect(() => {
        setNotes(initialNotes);
    }, [initialNotes]);

    const handleSave = async () => {
        if (!meetingId) return;
        setIsSaving(true);
        try {
            await axios.put(`${server}/api/meetings/${meetingId}/notes`, { notes });
            setSavedStatus(true);
            setTimeout(() => setSavedStatus(false), 2000);
        } catch (err) {
            console.error("Failed to save notes:", err);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '10px'
            }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Personal and team collaborative notes (saved separately from AI summary)
                </span>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: savedStatus ? '#2a9d8f' : 'var(--accent-gold)',
                        color: '#121110',
                        border: 'none',
                        padding: '6px 14px',
                        cursor: 'pointer',
                        fontSize: '0.8rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        borderRadius: '0px'
                    }}
                >
                    {savedStatus ? <CheckIcon style={{ fontSize: '1rem' }} /> : <SaveIcon style={{ fontSize: '1rem' }} />}
                    {savedStatus ? "Saved" : (isSaving ? "Saving..." : "Save Notes")}
                </button>
            </div>

            <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Type meeting minutes, decisions, and takeaways here..."
                style={{
                    flex: 1,
                    minHeight: '260px',
                    width: '100%',
                    background: 'rgba(10, 9, 8, 0.7)',
                    border: '1px solid var(--border-editorial)',
                    color: 'var(--text-primary)',
                    fontFamily: 'var(--font-sans)',
                    fontSize: '0.95rem',
                    lineHeight: '1.6',
                    padding: '14px',
                    boxSizing: 'border-box',
                    resize: 'vertical',
                    outline: 'none'
                }}
            />
        </div>
    );
}
