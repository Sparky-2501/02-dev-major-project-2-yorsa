import React, { useEffect, useState, useRef } from 'react';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

/**
 * NetworkQualityBanner (Part 1.5)
 * Monitors RTCPeerConnection stats with RTT/packet-loss thresholds,
 * displays non-blocking status, and manages automatic video track pause/recovery with hysteresis.
 */
export default function NetworkQualityBanner({
    connectionsRef,
    localStream,
    isVideoEnabled,
    setIsVideoEnabled,
    onBandwidthAdjust
}) {
    const [qualityState, setQualityState] = useState('good'); // 'good' | 'poor' | 'recovering'
    const [statsMetrics, setStatsMetrics] = useState({ rtt: 0, packetLoss: 0 });
    const goodReadingsCountRef = useRef(0);
    const wasAutoPausedRef = useRef(false);

    useEffect(() => {
        const intervalId = setInterval(async () => {
            if (!connectionsRef?.current) return;

            let totalLoss = 0;
            let totalPackets = 0;
            let maxRtt = 0;
            let activeConnections = 0;

            for (let id in connectionsRef.current) {
                const pc = connectionsRef.current[id];
                if (!pc || pc.connectionState === 'closed') continue;

                try {
                    const stats = await pc.getStats();
                    stats.forEach(report => {
                        // Inbound packet loss
                        if (report.type === 'inbound-rtp' && (report.kind === 'video' || report.kind === 'audio')) {
                            if (report.packetsLost !== undefined && report.packetsReceived !== undefined) {
                                totalLoss += report.packetsLost;
                                totalPackets += (report.packetsReceived + report.packetsLost);
                                activeConnections++;
                            }
                        }
                        // Round-trip time (RTT)
                        if (report.type === 'candidate-pair' && report.state === 'succeeded' && report.currentRoundTripTime !== undefined) {
                            const rttMs = Math.round(report.currentRoundTripTime * 1000);
                            if (rttMs > maxRtt) maxRtt = rttMs;
                        }
                    });
                } catch (e) {
                    console.debug("[Network Quality] getStats error:", e);
                }
            }

            if (activeConnections > 0 && totalPackets > 0) {
                const lossRate = (totalLoss / totalPackets) * 100;
                setStatsMetrics({ rtt: maxRtt, packetLoss: Math.round(lossRate) });

                // Thresholds: RTT > 300ms OR Packet Loss > 5%
                const isPoor = maxRtt > 300 || lossRate > 5.0;

                if (isPoor) {
                    goodReadingsCountRef.current = 0;
                    if (qualityState !== 'poor') {
                        console.warn(`[Network Quality] Degradation detected: RTT=${maxRtt}ms, Loss=${lossRate.toFixed(1)}%. Initiating bandwidth conservation.`);
                        setQualityState('poor');

                        // Automatically pause outgoing video track to protect audio continuity
                        if (localStream && isVideoEnabled) {
                            const videoTrack = localStream.getVideoTracks()[0];
                            if (videoTrack && videoTrack.enabled) {
                                videoTrack.enabled = false;
                                wasAutoPausedRef.current = true;
                                if (setIsVideoEnabled) setIsVideoEnabled(false);
                            }
                        }

                        // Adjust audio bitrate lower if supported
                        adjustAudioBitrate(connectionsRef.current, 24000); // 24kbps speech optimization
                        if (onBandwidthAdjust) onBandwidthAdjust(true);
                    }
                } else {
                    // Connection is good — apply hysteresis (require 3 consecutive good readings)
                    goodReadingsCountRef.current += 1;

                    if (qualityState === 'poor') {
                        setQualityState('recovering');
                    }

                    if (goodReadingsCountRef.current >= 3) {
                        if (qualityState !== 'good') {
                            console.log("[Network Quality] Connection stabilized. Restoring standard parameters.");
                            setQualityState('good');

                            // Restore video track if it was automatically paused
                            if (wasAutoPausedRef.current && localStream) {
                                const videoTrack = localStream.getVideoTracks()[0];
                                if (videoTrack) {
                                    videoTrack.enabled = true;
                                    wasAutoPausedRef.current = false;
                                    if (setIsVideoEnabled) setIsVideoEnabled(true);
                                }
                            }

                            // Restore standard audio bitrate
                            adjustAudioBitrate(connectionsRef.current, 64000); // 64kbps full quality
                            if (onBandwidthAdjust) onBandwidthAdjust(false);
                        }
                    }
                }
            }
        }, 4000);

        return () => clearInterval(intervalId);
    }, [connectionsRef, localStream, isVideoEnabled, qualityState]);

    /**
     * Helper to adjust audio sender bitrate via RTCRtpSender.setParameters()
     */
    const adjustAudioBitrate = async (connections, maxBitrate) => {
        for (let id in connections) {
            const pc = connections[id];
            if (!pc || !pc.getSenders) continue;

            const audioSender = pc.getSenders().find(s => s.track && s.track.kind === 'audio');
            if (audioSender && audioSender.getParameters) {
                try {
                    const params = audioSender.getParameters();
                    if (!params.encodings || params.encodings.length === 0) {
                        params.encodings = [{}];
                    }
                    params.encodings[0].maxBitrate = maxBitrate;
                    await audioSender.setParameters(params);
                } catch (err) {
                    console.debug("[Network Quality] Audio parameter adjustment error:", err);
                }
            }
        }
    };

    if (qualityState === 'good') return null;

    return (
        <div style={{
            position: 'absolute',
            top: '16px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: qualityState === 'poor' ? 'rgba(197, 85, 30, 0.92)' : 'rgba(42, 157, 143, 0.92)',
            color: '#fff',
            padding: '8px 18px',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.25)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '0.85rem',
            fontWeight: 500,
            backdropFilter: 'blur(10px)',
            transition: 'all 0.3s ease'
        }}>
            {qualityState === 'poor' ? (
                <>
                    <SpeedIcon style={{ fontSize: '1.1rem' }} />
                    <span>
                        Weak network detected ({statsMetrics.packetLoss}% loss, {statsMetrics.rtt}ms RTT). Video temporarily paused for call stability.
                    </span>
                </>
            ) : (
                <>
                    <CheckCircleOutlineIcon style={{ fontSize: '1.1rem' }} />
                    <span>Network stabilizing... restoring video stream.</span>
                </>
            )}
        </div>
    );
}
