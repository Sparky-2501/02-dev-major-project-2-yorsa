import * as React from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import VideocamIcon from '@mui/icons-material/Videocam';

export default function Authentication() {
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [name, setName] = React.useState("");
    const [error, setError] = React.useState("");
    const [message, setMessage] = React.useState("");
    const [formState, setFormState] = React.useState(0); // 0 = Login, 1 = Register
    const [open, setOpen] = React.useState(false);

    const { handleRegister, handleLogin } = React.useContext(AuthContext);
    const navigate = useNavigate();

    const handleAuth = async (e) => {
        e.preventDefault();
        setError("");
        try {
            if (formState === 0) {
                await handleLogin(username, password);
            }
            if (formState === 1) {
                let result = await handleRegister(name, username, password);
                setUsername("");
                setMessage(result);
                setOpen(true);
                setError("");
                setFormState(0);
                setPassword("");
                setName("");
            }
        } catch (err) {
            console.error(err);
            let errMsg = err.response?.data?.message || "An authentication error occurred.";
            setError(errMsg);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '2rem 1.5rem',
            background: 'var(--bg-primary, #131314)'
        }}>
            <div style={{
                maxWidth: '440px',
                width: '100%',
                background: 'var(--bg-secondary, #202124)',
                border: '1px solid var(--border-subtle, #3c4043)',
                borderRadius: '24px',
                padding: '3rem 2.5rem',
                boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
                display: 'flex',
                flexDirection: 'column'
            }}>
                {/* Google Meet Logo & Header */}
                <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
                    <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #1a73e8 0%, #34a853 50%, #fbbc04 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px auto',
                        boxShadow: '0 4px 14px rgba(26, 115, 232, 0.4)'
                    }}>
                        <VideocamIcon style={{ color: '#ffffff', fontSize: '1.8rem' }} />
                    </div>

                    <h1 style={{
                        fontSize: '1.6rem',
                        fontWeight: 500,
                        color: 'var(--text-primary, #e8eaed)',
                        margin: '0 0 6px 0'
                    }}>
                        {formState === 0 ? "Sign in" : "Create an account"}
                    </h1>
                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary, #9aa0a6)' }}>
                        to continue to Yorsa Meet
                    </p>
                </div>

                <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {formState === 1 && (
                        <div>
                            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary, #9aa0a6)', marginBottom: '6px' }}>
                                Full Name
                            </label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required={formState === 1}
                                placeholder="Your full name"
                                style={{
                                    width: '100%',
                                    padding: '12px 14px',
                                    background: 'var(--bg-elevated, #28292a)',
                                    border: '1px solid var(--border-subtle, #3c4043)',
                                    borderRadius: '8px',
                                    color: 'var(--text-primary, #e8eaed)',
                                    fontSize: '0.95rem',
                                    boxSizing: 'border-box',
                                    outline: 'none',
                                    transition: 'border-color 0.2s ease'
                                }}
                            />
                        </div>
                    )}

                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary, #9aa0a6)', marginBottom: '6px' }}>
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            placeholder="Enter your username"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: 'var(--bg-elevated, #28292a)',
                                border: '1px solid var(--border-subtle, #3c4043)',
                                borderRadius: '8px',
                                color: 'var(--text-primary, #e8eaed)',
                                fontSize: '0.95rem',
                                boxSizing: 'border-box',
                                outline: 'none',
                                transition: 'border-color 0.2s ease'
                            }}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 500, color: 'var(--text-secondary, #9aa0a6)', marginBottom: '6px' }}>
                            Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Enter your password"
                            style={{
                                width: '100%',
                                padding: '12px 14px',
                                background: 'var(--bg-elevated, #28292a)',
                                border: '1px solid var(--border-subtle, #3c4043)',
                                borderRadius: '8px',
                                color: 'var(--text-primary, #e8eaed)',
                                fontSize: '0.95rem',
                                boxSizing: 'border-box',
                                outline: 'none',
                                transition: 'border-color 0.2s ease'
                            }}
                        />
                    </div>

                    {error && (
                        <div style={{ color: '#ea4335', fontSize: '0.85rem', marginTop: '2px', textAlign: 'center' }}>
                            {error}
                        </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px' }}>
                        <button
                            type="button"
                            onClick={() => {
                                setFormState(s => (s === 0 ? 1 : 0));
                                setError("");
                            }}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#8ab4f8',
                                fontSize: '0.88rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                padding: 0
                            }}
                        >
                            {formState === 0 ? "Create account" : "Sign in instead"}
                        </button>

                        <button
                            type="submit"
                            className="btn-meet-primary"
                            style={{ padding: '10px 24px', fontSize: '0.9rem' }}
                        >
                            {formState === 0 ? "Next" : "Create"}
                        </button>
                    </div>
                </form>

                <div style={{ marginTop: '2.5rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle, #3c4043)', paddingTop: '1.25rem' }}>
                    <button
                        onClick={() => navigate(`/meeting/yorsa-guest-${Math.random().toString(36).substring(2, 6)}`)}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-secondary, #9aa0a6)',
                            fontSize: '0.85rem',
                            cursor: 'pointer'
                        }}
                    >
                        Skip and join as guest →
                    </button>
                </div>
            </div>

            <Snackbar
                open={open}
                autoHideDuration={4000}
                onClose={() => setOpen(false)}
                message={message}
            />
        </div>
    );
}