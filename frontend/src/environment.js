const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
const server = isLocalhost ? "http://localhost:8000" : "https://yorsa-a-meeting-platform.onrender.com";

export default server;