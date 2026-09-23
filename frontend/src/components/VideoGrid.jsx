import React from 'react';
import VideoTile from './VideoTile';

/**
 * VideoGrid (Part 1.2 & 1.4)
 * Responsive CSS Grid container with 1-col mobile, 2-3 col tablet,
 * dynamic desktop reflow, spotlight pinning, and smooth drawer resize.
 */
export default function VideoGrid({
    localStream,
    username,
    isVideoEnabled,
    isAudioEnabled,
    remoteVideos, // [{ socketId, stream, username }]
    pinnedUserId,
    screenSharingUserId,
    isHost,
    activePanel,
    onPinUser,
    onKickUser
}) {
    const activeSpotlightId = screenSharingUserId !== null ? screenSharingUserId : pinnedUserId;

    // Identify spotlight video and rail videos
    let spotlightVideo = null;
    let railVideos = [];

    if (activeSpotlightId === 'local') {
        spotlightVideo = {
            socketId: 'local',
            stream: localStream,
            label: `${username || "You"} (Spotlight)`,
            isLocal: true,
            isAudioMuted: !isAudioEnabled,
            isVideoMuted: !isVideoEnabled
        };
        railVideos = remoteVideos;
    } else if (activeSpotlightId !== null) {
        const found = remoteVideos.find(v => v.socketId === activeSpotlightId);
        if (found) {
            spotlightVideo = {
                socketId: found.socketId,
                stream: found.stream,
                label: `${found.username || `Participant (${found.socketId.substring(0, 5)})`}`,
                isLocal: false
            };
            railVideos = [
                {
                    socketId: 'local',
                    stream: localStream,
                    label: `${username || "You"}`,
                    isLocal: true,
                    isAudioMuted: !isAudioEnabled,
                    isVideoMuted: !isVideoEnabled
                },
                ...remoteVideos.filter(v => v.socketId !== activeSpotlightId)
            ];
        }
    }

    return (
        <div style={{
            flex: 1,
            height: '100%',
            overflowY: 'auto',
            padding: '16px 20px 96px 20px',
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            transition: 'all 0.35s cubic-bezier(0.25, 1, 0.5, 1)'
        }}>
            {activeSpotlightId !== null && spotlightVideo ? (
                /* Spotlight Layout Mode */
                <div style={{
                    display: 'flex',
                    flexDirection: 'row',
                    gap: '16px',
                    height: '100%',
                    maxHeight: 'calc(100vh - 120px)',
                    width: '100%'
                }} className="spotlight-responsive-wrapper">
                    {/* Main Spotlight View */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <VideoTile
                            stream={spotlightVideo.stream}
                            label={spotlightVideo.label}
                            socketId={spotlightVideo.socketId}
                            isLocal={spotlightVideo.isLocal}
                            isPinned={true}
                            isHost={isHost}
                            isAudioMuted={spotlightVideo.isAudioMuted}
                            isVideoMuted={spotlightVideo.isVideoMuted}
                            onPin={() => onPinUser(spotlightVideo.socketId)}
                        />
                    </div>

                    {/* Side Rail for Other Participants */}
                    {railVideos.length > 0 && (
                        <div style={{
                            width: '260px',
                            minWidth: '220px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '12px',
                            overflowY: 'auto',
                            maxHeight: '100%'
                        }} className="spotlight-side-rail">
                            {railVideos.map(video => (
                                <VideoTile
                                    key={video.socketId}
                                    stream={video.stream}
                                    label={video.label || video.username || `User-${video.socketId.substring(0, 4)}`}
                                    socketId={video.socketId}
                                    isLocal={video.isLocal || false}
                                    isPinned={false}
                                    isHost={isHost}
                                    canKick={isHost && !video.isLocal}
                                    isAudioMuted={video.isAudioMuted}
                                    isVideoMuted={video.isVideoMuted}
                                    onPin={() => onPinUser(video.socketId)}
                                    onKick={() => onKickUser && onKickUser(video.socketId)}
                                />
                            ))}
                        </div>
                    )}
                </div>
            ) : (
                /* Dynamic Auto-Fit Grid Layout */
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '16px',
                    width: '100%',
                    maxWidth: '1600px',
                    margin: '0 auto',
                    alignContent: 'center'
                }} className="responsive-video-grid">
                    {/* Local User Tile */}
                    <VideoTile
                        stream={localStream}
                        label={`${username || "You"} (You)`}
                        socketId="local"
                        isLocal={true}
                        isPinned={pinnedUserId === 'local'}
                        isHost={isHost}
                        isAudioMuted={!isAudioEnabled}
                        isVideoMuted={!isVideoEnabled}
                        onPin={() => onPinUser('local')}
                    />

                    {/* Remote Participants */}
                    {remoteVideos.map(video => (
                        <VideoTile
                            key={video.socketId}
                            stream={video.stream}
                            label={video.username || `Participant (${video.socketId.substring(0, 5)})`}
                            socketId={video.socketId}
                            isLocal={false}
                            isPinned={pinnedUserId === video.socketId}
                            isHost={isHost}
                            canKick={isHost}
                            onPin={() => onPinUser(video.socketId)}
                            onKick={() => onKickUser && onKickUser(video.socketId)}
                        />
                    ))}
                </div>
            )}

            <style>{`
                /* Responsive Breakpoints (<768px mobile, 768-1024px tablet, >1024px desktop) */
                @media (max-width: 768px) {
                    .responsive-video-grid {
                        grid-template-columns: 1fr !important;
                        gap: 10px !important;
                    }
                    .spotlight-responsive-wrapper {
                        flex-direction: column !important;
                    }
                    .spotlight-side-rail {
                        width: 100% !important;
                        flex-direction: row !important;
                        overflow-x: auto !important;
                        min-height: 120px !important;
                    }
                }
                @media (min-width: 768px) and (max-width: 1024px) {
                    .responsive-video-grid {
                        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)) !important;
                    }
                }
            `}</style>
        </div>
    );
}
