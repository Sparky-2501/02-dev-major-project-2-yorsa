import React, { useEffect } from 'react';
import './App.css';
import { Route, BrowserRouter as Router, Routes, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import LandingPage from './pages/landing';
import Authentication from './pages/authentication';
import { AuthProvider } from './contexts/AuthContext';
import VideoMeetComponent from './pages/VideoMeet';
import HomeComponent from './pages/home';
import History from './pages/history';

function PageWrapper({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.35, ease: [0.25, 1, 0.5, 1] }}
      style={{ width: "100%", minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      {children}
    </motion.div>
  );
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path='/' element={<PageWrapper><LandingPage /></PageWrapper>} />
        <Route path='/auth' element={<PageWrapper><Authentication /></PageWrapper>} />
        <Route path='/home' element={<PageWrapper><HomeComponent /></PageWrapper>} />
        <Route path='/history' element={<PageWrapper><History /></PageWrapper>} />
        {/* Support both standardized /meeting/:roomId and legacy /:url routes */}
        <Route path='/meeting/:roomId' element={<PageWrapper><VideoMeetComponent /></PageWrapper>} />
        <Route path='/:url' element={<PageWrapper><VideoMeetComponent /></PageWrapper>} />
      </Routes>
    </AnimatePresence>
  );
}

function App() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  return (
    <div className="App">
      <div className="bg-animations">
        <div className="bg-blob bg-blob-1"></div>
        <div className="bg-blob bg-blob-2"></div>
      </div>

      <Router>
        <AuthProvider>
          <AnimatedRoutes />
        </AuthProvider>
      </Router>
    </div>
  );
}

export default App;
