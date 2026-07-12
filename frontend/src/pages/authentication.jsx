import * as React from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { Snackbar } from '@mui/material';
import "../App.css";

export default function Authentication() {
    const [username, setUsername] = React.useState("");
    const [password, setPassword] = React.useState("");
    const [name, setName] = React.useState("");
    const [error, setError] = React.useState("");
    const [message, setMessage] = React.useState("");
    const [formState, setFormState] = React.useState(0); // 0 = Login, 1 = Register
    const [open, setOpen] = React.useState(false);

    const { handleRegister, handleLogin } = React.useContext(AuthContext);

    let handleAuth = async (e) => {
        e.preventDefault();
        setError("");
        try {
            if (formState === 0) {
                await handleLogin(username, password);
            }
            if (formState === 1) {
                let result = await handleRegister(name, username, password);
                console.log(result);
                setUsername("");
                setMessage(result);
                setOpen(true);
                setError("");
                setFormState(0);
                setPassword("");
                setName("");
            }
        } catch (err) {
            console.log(err);
            let errMsg = err.response?.data?.message || "An error occurred";
            setError(errMsg);
        }
    };

    return (
        <div className="authContainer">
            <div className="authCard glass-container">
                <div className="authLogo">
                    Yorsa
                </div>

                <div className="authTabs">
                    <div className={`authTabIndicator ${formState === 1 ? 'registerActive' : ''}`} />
                    <button 
                        type="button" 
                        className={`authTabButton ${formState === 0 ? 'active' : ''}`}
                        onClick={() => { setFormState(0); setError(""); }}
                    >
                        Sign In
                    </button>
                    <button 
                        type="button" 
                        className={`authTabButton ${formState === 1 ? 'active' : ''}`}
                        onClick={() => { setFormState(1); setError(""); }}
                    >
                        Sign Up
                    </button>
                </div>

                <form className="authForm" onSubmit={handleAuth}>
                    <div className={`animateHeightContainer ${formState === 1 ? 'show' : ''}`}>
                        <div className="authInputGroup" style={{ marginBottom: formState === 1 ? '1.25rem' : '0' }}>
                            <input 
                                type="text"
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="authInputField"
                                placeholder=" "
                                required={formState === 1}
                            />
                            <label htmlFor="name" className="authInputLabel">Full Name</label>
                        </div>
                    </div>

                    <div className="authInputGroup">
                        <input 
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="authInputField"
                            placeholder=" "
                            required
                        />
                        <label htmlFor="username" className="authInputLabel">Username</label>
                    </div>

                    <div className="authInputGroup">
                        <input 
                            type="password"
                            id="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="authInputField"
                            placeholder=" "
                            required
                        />
                        <label htmlFor="password" className="authInputLabel">Password</label>
                    </div>

                    <div className="authErrorMessage">{error}</div>

                    <button type="submit" className="btn-yorsa" style={{ width: '100%', marginTop: '1rem' }}>
                        {formState === 0 ? "Login" : "Register"}
                    </button>
                </form>
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