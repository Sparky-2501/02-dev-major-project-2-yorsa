import React, { useEffect, useRef, useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import PushPinIcon from '@mui/icons-material/PushPin';
import PersonRemoveIcon from '@mui/icons-material/PersonRemove';
import MicOffIcon from '@mui/icons-material/MicOff';

/**
 * VideoTile (Part 1.2 & 1.3)
 * Memoized video card with aspect-ratio 16/9, object-fit: cover,
 * skeleton mount loader, and GPU-accelerated hover actions.
 */
const VideoTile = React.memo(function VideoTile({
    stream,
    label,
    socketId,
    isLocal = false,
    isPinned = false,
    isHost = false,
    canKick = false,
    isAudioMuted = false,
    isVideoMuted = false,
    onPin,
    onKick
}) {
    const videoRef = useRef(null);
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        const currentVideo = videoRef.current;
        if (currentVideo && stream) {
            currentVideo.srcObject = stream;
            const handlePlaying = () => setIsLoaded(true);
            currentVideo.addEventListener('playing', handlePlaying);
            return () => {
                if (currentVideo) {
                    currentVideo.removeEventListener('playing', handlePlaying);
                }
            };
        }
    }, [stream]);

    return (
        <div style={{
            position: 'relative',
            width: '100%',
            aspectRatio: '16 / 9',
            background: 'var(--tile-bg, #202124)',
            borderRadius: '16px',
            border: isPinned ? '2px solid #8ab4f8' : '1px solid rgba(255, 255, 255, 0.08)',
            overflow: 'hidden',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
            transition: 'border-color 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            {/* Skeleton / Initial Fade Loader */}
            {!isLoaded && !isLocal && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: 'linear-gradient(90deg, #202124 0%, #303134 50%, #202124 100%)',
                    backgroundSize: '200% 100%',
                    animation: 'shimmer 1.8s infinite',
                    zIndex: 1
                }} />
            )}

            {/* Video Element */}
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={isLocal}
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    opacity: isLoaded || isLocal ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                    transform: isLocal ? 'scaleX(-1)' : 'none'
                }}
            />

            {/* Off Camera Avatar Fallback (Google Meet Clean Avatar) */}
            {isVideoMuted && (
                <div style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    background: '#202124',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    zIndex: 2
                }}>
                    <div style={{
                        width: '72px',
                        height: '72px',
                        borderRadius: '50%',
                        background: '#1a73e8',
                        boxShadow: '0 4px 12px rgba(26, 115, 232, 0.4)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontFamily: 'var(--font-family, sans-serif)',
                        fontSize: '1.8rem',
                        fontWeight: 600,
                        color: '#ffffff'
                    }}>
                        {(label || "U").charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.85rem', color: '#9aa0a6', fontWeight: 500 }}>Camera Off</span>
                </div>
            )}

            {/* Bottom Participant Tag (Google Meet Translucent Pill Badge) */}
            <div style={{
                position: 'absolute',
                bottom: '12px',
                left: '12px',
                background: 'rgba(0, 0, 0, 0.65)',
                backdropFilter: 'blur(8px)',
                borderRadius: '8px',
                padding: '4px 10px',
                fontSize: '0.82rem',
                fontWeight: 500,
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                zIndex: 4,
                boxShadow: '0 2px 6px rgba(0,0,0,0.3)'
            }}>
                <span>{label}</span>
                {isAudioMuted && <MicOffIcon style={{ fontSize: '0.95rem', color: '#ea4335' }} />}
            </div>

            {/* Action Buttons Overlay (Pin & Kick) */}
            <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                display: 'flex',
                gap: '8px',
                zIndex: 5
            }}>
                <Tooltip title={isPinned ? "Unpin" : "Pin"}>
                    <IconButton
                        size="small"
                        onClick={onPin}
                        style={{
                            background: 'rgba(0, 0, 0, 0.65)',
                            color: isPinned ? '#8ab4f8' : '#ffffff',
                            backdropFilter: 'blur(8px)',
                            borderRadius: '50%',
                            padding: '6px'
                        }}
                    >
                        <PushPinIcon style={{ fontSize: '1rem' }} />
                    </IconButton>
                </Tooltip>

                {canKick && onKick && (
                    <Tooltip title="Remove participant">
                        <IconButton
                            size="small"
                            onClick={onKick}
                            style={{
                                background: 'rgba(0, 0, 0, 0.65)',
                                color: '#ea4335',
                                backdropFilter: 'blur(8px)',
                                borderRadius: '50%',
                                padding: '6px'
                            }}
                        >
                            <PersonRemoveIcon style={{ fontSize: '1rem' }} />
                        </IconButton>
                    </Tooltip>
                )}
            </div>

            <style>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
            `}</style>
        </div>
    );
});

export default VideoTile;
