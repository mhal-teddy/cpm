"use client";

import { useEffect, useRef, useState } from "react";

const CELL_SIZE = 32;
const TASK_SIZE = 2 * CELL_SIZE;
const DOT_RADIUS = 3;
const DOT_COLOR = "#c6c6c6"; // Gray 30 / --cds-border-subtle

type Task = {
  id: number;
  col: number;
  row: number;
};

export default function GridCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [nextId, setNextId] = useState(1);
  const [hoveredDot, setHoveredDot] = useState<{ col: number; row: number } | null>(null);

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

  function canPlace(col: number, row: number): boolean {
    if (col < 1 || row < 1 || col > cols - 1 || row > rows - 1) return false;
    return tasks.every(
      (t) => Math.abs(t.col - col) >= 2 || Math.abs(t.row - row) >= 2
    );
  }

  function addTask(col: number, row: number) {
    setTasks((prev) => [...prev, { id: nextId, col, row }]);
    setNextId((prev) => prev + 1);
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const col = Math.round(x / CELL_SIZE);
    const row = Math.round(y / CELL_SIZE);
    if (col >= 0 && col <= cols && row >= 0 && row <= rows) {
      setHoveredDot({ col, row });
    } else {
      setHoveredDot(null);
    }
  }

  const showPlus = hoveredDot !== null && canPlace(hoveredDot.col, hoveredDot.row);

  return (
    <div
      ref={containerRef}
      className="flex-1 flex items-center justify-center overflow-hidden bg-white"
    >
      {containerSize.width > 0 && (
        <svg
          width={gridWidth}
          height={gridHeight}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoveredDot(null)}
        >
          {tasks.map((task) => (
            <g key={task.id}>
              <rect
                x={(task.col - 1) * CELL_SIZE}
                y={(task.row - 1) * CELL_SIZE}
                width={TASK_SIZE}
                height={TASK_SIZE}
                fill="#f4f4f4"
                stroke="#c6c6c6"
                strokeWidth={1}
              />
              <text
                x={task.col * CELL_SIZE}
                y={task.row * CELL_SIZE}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="'Noto Sans Mono', 'IBM Plex Mono', monospace"
                fontSize={14}
                fill="#161616"
              >
                {task.id}
              </text>
            </g>
          ))}

          {dots.map(({ x, y }) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r={DOT_RADIUS}
              fill={DOT_COLOR}
            />
          ))}

          {showPlus && (
            <g
              transform={`translate(${hoveredDot!.col * CELL_SIZE}, ${hoveredDot!.row * CELL_SIZE})`}
              onClick={() => addTask(hoveredDot!.col, hoveredDot!.row)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={0} cy={0} r={10} fill="#0f62fe" />
              <text
                x={0}
                y={0}
                textAnchor="middle"
                dominantBaseline="central"
                fill="white"
                fontSize={14}
                style={{ pointerEvents: "none", userSelect: "none" }}
              >
                +
              </text>
            </g>
          )}
        </svg>
      )}
    </div>
  );
}
