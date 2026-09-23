import React, { useState } from 'react';
import { Dialog, IconButton } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import EmailIcon from '@mui/icons-material/Email';
import CheckIcon from '@mui/icons-material/Check';

export default function InviteModal({ open, onClose, meetingCode }) {
    const [copied, setCopied] = useState(false);

    const fullUrl = typeof window !== 'undefined' 
        ? `${window.location.origin}/meeting/${meetingCode}` 
        : `/meeting/${meetingCode}`;

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(fullUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error("Clipboard copy failed:", err);
        }
    };

    const handleWhatsAppShare = () => {
        const text = encodeURIComponent(`Join my executive meeting on YORSA: ${fullUrl}`);
        window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
    };

    const handleEmailShare = () => {
        const subject = encodeURIComponent(`Invitation to YORSA Meeting`);
        const body = encodeURIComponent(
            `You are invited to an executive video conference on YORSA.\n\nMeeting Link: ${fullUrl}\nMeeting ID: ${meetingCode}\n\nSee you there!`
        );
        window.open(`mailto:?subject=${subject}&body=${body}`, '_blank');
    };

    return (
        <Dialog 
            open={open} 
            onClose={onClose}
            PaperProps={{
                style: {
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-editorial)',
                    borderRadius: '0px',
                    color: 'var(--text-primary)',
                    maxWidth: '480px',
                    width: '90%',
                    padding: '2rem 1.5rem',
                    boxShadow: '0 25px 60px rgba(0,0,0,0.7)'
                }
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                <div>
                    <h2 style={{ fontFamily: 'var(--font-serif)', fontSize: '1.6rem', margin: 0, color: 'var(--accent-gold)' }}>
                        Invite Participants
                    </h2>
                    <p style={{ margin: '6px 0 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                        Share this private access link with meeting attendees.
                    </p>
                </div>
                <IconButton onClick={onClose} style={{ color: 'var(--text-muted)', padding: 4 }}>
                    <CloseIcon />
                </IconButton>
            </div>

            {/* URL Input Box & Copy Button */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'rgba(0,0,0,0.3)',
                border: '1px solid var(--border-subtle)',
                padding: '6px 10px',
                marginBottom: '1.75rem'
            }}>
                <input 
                    type="text" 
                    readOnly 
                    value={fullUrl}
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '0.9rem',
                        outline: 'none',
                        fontFamily: 'var(--font-sans)'
                    }}
                />
                <button
                    onClick={handleCopy}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        background: copied ? '#2a9d8f' : 'var(--accent-gold)',
                        color: '#121110',
                        border: 'none',
                        padding: '8px 14px',
                        cursor: 'pointer',
                        fontSize: '0.85rem',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        transition: 'all 0.2s ease'
                    }}
                >
                    {copied ? <CheckIcon style={{ fontSize: '1rem' }} /> : <ContentCopyIcon style={{ fontSize: '1rem' }} />}
                    {copied ? 'Copied' : 'Copy'}
                </button>
            </div>

            {/* Share via Social/Email Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>
                    Quick Share Options
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                        onClick={handleWhatsAppShare}
                        className="btn-editorial-secondary"
                        style={{ padding: '10px 14px', fontSize: '0.85rem', textTransform: 'none' }}
                    >
                        <WhatsAppIcon style={{ color: '#25D366', fontSize: '1.2rem' }} />
                        WhatsApp
                    </button>
                    <button
                        onClick={handleEmailShare}
                        className="btn-editorial-secondary"
                        style={{ padding: '10px 14px', fontSize: '0.85rem', textTransform: 'none' }}
                    >
                        <EmailIcon style={{ color: 'var(--accent-gold)', fontSize: '1.2rem' }} />
                        Email Invite
                    </button>
                </div>
            </div>
        </Dialog>
    );
}
