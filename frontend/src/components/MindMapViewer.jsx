import React, { useState, useRef } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import ZoomInIcon from '@mui/icons-material/ZoomIn';
import ZoomOutIcon from '@mui/icons-material/ZoomOut';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

/**
 * MindMapViewer (Part 2.5)
 * Interactive SVG visual tree rendering hierarchical mind map nodes and bezier edges.
 * Supports pan, zoom, node selection, and editorial luxury styling.
 */
export default function MindMapViewer({ mindMap }) {
    const [zoom, setZoom] = useState(1);
    const [pan, setPan] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
    const [selectedNodeId, setSelectedNodeId] = useState(null);

    const nodes = mindMap?.nodes || [];
    const edges = mindMap?.edges || [];

    // Calculate layout coordinates for nodes by level
    const nodeCoords = useRef(new Map());

    // Position root in center, level 1 radially or horizontally, level 2 branching outward
    const rootNode = nodes.find(n => n.level === 0) || nodes[0] || { id: 'root', label: 'Meeting Root' };
    const level1Nodes = nodes.filter(n => n.level === 1);
    const level2Nodes = nodes.filter(n => n.level >= 2);

    const centerX = 400;
    const centerY = 280;

    nodeCoords.current.set(rootNode.id, { x: centerX, y: centerY, label: rootNode.label, level: 0 });

    // Place Level 1 nodes horizontally / branched
    const l1Count = level1Nodes.length || 1;
    level1Nodes.forEach((node, idx) => {
        const angle = ((idx + 0.5) / l1Count) * Math.PI * 2;
        const radius = 170;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        nodeCoords.current.set(node.id, { x, y, label: node.label, level: 1, angle });
    });

    // Place Level 2 nodes extending outward from parent level 1 node
    level2Nodes.forEach((node, idx) => {
        // Find which level 1 node points to it
        const parentEdge = edges.find(e => e.to === node.id);
        const parentCoord = parentEdge ? nodeCoords.current.get(parentEdge.from) : null;

        if (parentCoord && parentCoord.angle !== undefined) {
            const childRadius = 110;
            const jitter = (idx % 2 === 0 ? 0.25 : -0.25);
            const x = parentCoord.x + Math.cos(parentCoord.angle + jitter) * childRadius;
            const y = parentCoord.y + Math.sin(parentCoord.angle + jitter) * childRadius;
            nodeCoords.current.set(node.id, { x, y, label: node.label, level: 2 });
        } else {
            // Fallback grid placement
            nodeCoords.current.set(node.id, {
                x: 100 + (idx % 3) * 220,
                y: 440 + Math.floor(idx / 3) * 80,
                label: node.label,
                level: 2
            });
        }
    });

    const handleMouseDown = (e) => {
        setIsDragging(true);
        setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;
        setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const handleReset = () => {
        setZoom(1);
        setPan({ x: 0, y: 0 });
    };

    if (nodes.length === 0) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                No mind map generated yet. Click "Generate Summary" to produce visual intelligence.
            </div>
        );
    }

    return (
        <div 
            style={{
                position: 'relative',
                width: '100%',
                height: '520px',
                background: '#0d0c0b',
                border: '1px solid var(--border-editorial)',
                overflow: 'hidden',
                userSelect: 'none',
                cursor: isDragging ? 'grabbing' : 'grab'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
        >
            {/* Zoom / Pan Controls Toolbar */}
            <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                display: 'flex',
                gap: '6px',
                background: 'rgba(20, 19, 18, 0.9)',
                border: '1px solid var(--border-editorial)',
                padding: '4px',
                zIndex: 10
            }}>
                <Tooltip title="Zoom In">
                    <IconButton size="small" onClick={() => setZoom(z => Math.min(z + 0.15, 2.2))} style={{ color: 'var(--accent-gold)' }}>
                        <ZoomInIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Zoom Out">
                    <IconButton size="small" onClick={() => setZoom(z => Math.max(z - 0.15, 0.5))} style={{ color: 'var(--accent-gold)' }}>
                        <ZoomOutIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
                <Tooltip title="Reset View">
                    <IconButton size="small" onClick={handleReset} style={{ color: 'var(--text-secondary)' }}>
                        <RestartAltIcon fontSize="small" />
                    </IconButton>
                </Tooltip>
            </div>

            {/* SVG Interactive Canvas */}
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 800 600"
                style={{ overflow: 'visible' }}
            >
                <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`} transform-origin="400 300">
                    <defs>
                        <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#C89D5C" stopOpacity="0.7" />
                            <stop offset="100%" stopColor="#9D4EDD" stopOpacity="0.4" />
                        </linearGradient>
                    </defs>

                    {/* Render Edges (Smooth Curved Bezier Connectors) */}
                    {edges.map((edge, idx) => {
                        const fromCoord = nodeCoords.current.get(edge.from);
                        const toCoord = nodeCoords.current.get(edge.to);
                        if (!fromCoord || !toCoord) return null;

                        const midX = (fromCoord.x + toCoord.x) / 2;
                        const midY = (fromCoord.y + toCoord.y) / 2 - 20;

                        return (
                            <path
                                key={`edge-${idx}`}
                                d={`M ${fromCoord.x} ${fromCoord.y} Q ${midX} ${midY} ${toCoord.x} ${toCoord.y}`}
                                fill="none"
                                stroke="url(#edgeGrad)"
                                strokeWidth="2"
                                strokeDasharray={fromCoord.level === 1 ? "none" : "4,4"}
                            />
                        );
                    })}

                    {/* Render Nodes */}
                    {Array.from(nodeCoords.current.entries()).map(([id, node]) => {
                        const isRoot = node.level === 0;
                        const isLevel1 = node.level === 1;
                        const isSelected = selectedNodeId === id;

                        const width = isRoot ? 160 : (isLevel1 ? 140 : 120);
                        const height = isRoot ? 46 : (isLevel1 ? 40 : 34);

                        const bgColor = isRoot 
                            ? '#C89D5C' 
                            : (isLevel1 ? '#1E1B24' : '#141312');
                        const textColor = isRoot ? '#121110' : '#FBF9F5';
                        const borderColor = isSelected 
                            ? '#E0BE85' 
                            : (isRoot ? '#E0BE85' : (isLevel1 ? '#9D4EDD' : 'rgba(200, 157, 92, 0.3)'));

                        return (
                            <g
                                key={`node-${id}`}
                                transform={`translate(${node.x - width / 2}, ${node.y - height / 2})`}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedNodeId(id === selectedNodeId ? null : id);
                                }}
                                style={{ cursor: 'pointer' }}
                            >
                                <rect
                                    width={width}
                                    height={height}
                                    rx="2"
                                    fill={bgColor}
                                    stroke={borderColor}
                                    strokeWidth={isSelected ? "2.5" : "1.5"}
                                    style={{ filter: isSelected ? 'drop-shadow(0 0 10px rgba(200, 157, 92, 0.4))' : 'drop-shadow(0 4px 12px rgba(0,0,0,0.6))' }}
                                />
                                <text
                                    x={width / 2}
                                    y={height / 2 + 5}
                                    textAnchor="middle"
                                    fill={textColor}
                                    fontSize={isRoot ? "13px" : (isLevel1 ? "11px" : "10px")}
                                    fontWeight={isRoot ? "700" : "500"}
                                    fontFamily={isRoot ? "var(--font-serif)" : "var(--font-sans)"}
                                    letterSpacing="0.02em"
                                >
                                    {node.label.length > 20 ? `${node.label.substring(0, 18)}...` : node.label}
                                </text>
                            </g>
                        );
                    })}
                </g>
            </svg>
        </div>
    );
}
