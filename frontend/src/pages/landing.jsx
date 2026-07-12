import React from 'react'
import "../App.css"
import { Link, useNavigate } from 'react-router-dom'

export default function LandingPage() {
    const router = useNavigate();

    return (
        <div className='landingPageContainer'>
            <nav className='landingNavbar glass-container'>
                <div className='navHeader'>
                    <h2 className='logoText'>Yorsa <span className="logoSubtext">meeting platform</span></h2>
                </div>
                <div className='navlist'>
                    <button className='btn-yorsa-secondary' onClick={() => {
                        router("/aljk23")
                    }}>Join as Guest</button>
                    <button className='btn-yorsa' onClick={() => {
                        router("/auth")
                    }}>Login / Register</button>
                </div>
            </nav>

            <div className="landingMainContainer">
                <div className="landingHeroText">
                    <h1><span className="gradientText">Connect</span> with your loved ones</h1>
                    <p className="heroSubtitle">Bridge any distance and enjoy seamless, high-quality collaboration on Yorsa - a modern meeting platform designed for you.</p>
                    <div style={{ marginTop: '2.5rem' }}>
                        <Link to={"/auth"} className="btn-yorsa" style={{ textDecoration: 'none' }}>
                            Get Started
                        </Link>
                    </div>
                </div>
                <div className="landingHeroImage">
                    <img src="/mobile.png" alt="Yorsa Mockup" />
                </div>
            </div>
        </div>
    )
}
