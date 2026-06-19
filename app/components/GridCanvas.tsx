"use client";

import { useEffect, useRef, useState } from "react";

const CELL_SIZE = 32;
const DOT_RADIUS = 3;
const DOT_COLOR = "#c6c6c6"; // Gray 30 / --cds-border-subtle

export default function GridCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setContainerSize({ width, height });
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const cols = Math.floor(containerSize.width / CELL_SIZE);
  const rows = Math.floor(containerSize.height / CELL_SIZE);
  const gridWidth = cols * CELL_SIZE;
  const gridHeight = rows * CELL_SIZE;

  const dots: { x: number; y: number }[] = [];
  for (let j = 0; j <= rows; j++) {
    for (let i = 0; i <= cols; i++) {
      dots.push({ x: i * CELL_SIZE, y: j * CELL_SIZE });
    }
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center overflow-hidden bg-white"
    >
      {containerSize.width > 0 && (
        <svg width={gridWidth} height={gridHeight}>
          {dots.map(({ x, y }) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r={DOT_RADIUS}
              fill={DOT_COLOR}
            />
          ))}
        </svg>
      )}
    </div>
  );
}
