"use client";

import { useEffect, useRef, useState } from "react";

const CELL_SIZE = 32;
const TASK_SIZE = 2 * CELL_SIZE;
const DOT_RADIUS = 3;
const DOT_COLOR = "#c6c6c6";
const CONNECTOR_RADIUS = 5;
const CONNECTOR_RADIUS_HOVER = 7;
const SIDES = ["top", "bottom", "left", "right"] as const;

type Side = (typeof SIDES)[number];

type Task = {
  id: number;
  col: number;
  row: number;
};

type Arrow = {
  id: number;
  fromTaskId: number;
  fromSide: Side;
  toTaskId: number;
  toSide: Side;
};

type ConnectorRef = { taskId: number; side: Side };

type DraggingArrow = {
  fromTaskId: number;
  fromSide: Side;
  curX: number;
  curY: number;
};

function getConnectorPoint(task: Task, side: Side): { x: number; y: number } {
  const cx = task.col * CELL_SIZE;
  const cy = task.row * CELL_SIZE;
  switch (side) {
    case "top":    return { x: cx, y: cy - CELL_SIZE };
    case "bottom": return { x: cx, y: cy + CELL_SIZE };
    case "left":   return { x: cx - CELL_SIZE, y: cy };
    case "right":  return { x: cx + CELL_SIZE, y: cy };
  }
}

function isDuplicateArrow(fromTaskId: number, toTaskId: number, arrows: Arrow[]): boolean {
  return arrows.some((a) => a.fromTaskId === fromTaskId && a.toTaskId === toTaskId);
}

export default function GridCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [tasks, setTasks] = useState<Task[]>([]);
  const [nextId, setNextId] = useState(1);
  const [hoveredDot, setHoveredDot] = useState<{ col: number; row: number } | null>(null);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [nextArrowId, setNextArrowId] = useState(1);
  const [hoveredConnector, setHoveredConnector] = useState<ConnectorRef | null>(null);
  const [draggingArrow, setDraggingArrow] = useState<DraggingArrow | null>(null);
  const [targetConnector, setTargetConnector] = useState<ConnectorRef | null>(null);

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

    if (draggingArrow) {
      setDraggingArrow((prev) => prev && { ...prev, curX: x, curY: y });
    }

    const col = Math.round(x / CELL_SIZE);
    const row = Math.round(y / CELL_SIZE);
    if (col >= 0 && col <= cols && row >= 0 && row <= rows) {
      setHoveredDot({ col, row });
    } else {
      setHoveredDot(null);
    }
  }

  function handleMouseUp() {
    if (draggingArrow && targetConnector) {
      const { fromTaskId, fromSide } = draggingArrow;
      const { taskId: toTaskId, side: toSide } = targetConnector;
      if (
        fromTaskId !== toTaskId &&
        !isDuplicateArrow(fromTaskId, toTaskId, arrows)
      ) {
        setArrows((prev) => [
          ...prev,
          { id: nextArrowId, fromTaskId, fromSide, toTaskId, toSide },
        ]);
        setNextArrowId((prev) => prev + 1);
      }
    }
    setDraggingArrow(null);
    setTargetConnector(null);
  }

  function handleConnectorMouseDown(e: React.MouseEvent, taskId: number, side: Side) {
    e.stopPropagation();
    const svgRect = (e.currentTarget.closest("svg") as SVGSVGElement).getBoundingClientRect();
    setDraggingArrow({
      fromTaskId: taskId,
      fromSide: side,
      curX: e.clientX - svgRect.left,
      curY: e.clientY - svgRect.top,
    });
  }

  function handleConnectorMouseEnter(taskId: number, side: Side) {
    setHoveredConnector({ taskId, side });
    if (draggingArrow) {
      setTargetConnector({ taskId, side });
    }
  }

  function handleConnectorMouseLeave() {
    setHoveredConnector(null);
    setTargetConnector(null);
  }

  const showPlus =
    hoveredDot !== null &&
    canPlace(hoveredDot.col, hoveredDot.row) &&
    !draggingArrow;

  const draggingFromTask = draggingArrow
    ? tasks.find((t) => t.id === draggingArrow.fromTaskId)
    : null;

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
          onMouseLeave={() => {
            setHoveredDot(null);
            setDraggingArrow(null);
            setTargetConnector(null);
          }}
          onMouseUp={handleMouseUp}
          style={{ cursor: draggingArrow ? "crosshair" : "default" }}
        >
          <defs>
            <marker
              id="arrowhead"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill="#161616" />
            </marker>
            <marker
              id="arrowhead-preview"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill="#0f62fe" />
            </marker>
          </defs>

          {/* 確定済み矢印 */}
          {arrows.map((arrow) => {
            const fromTask = tasks.find((t) => t.id === arrow.fromTaskId);
            const toTask = tasks.find((t) => t.id === arrow.toTaskId);
            if (!fromTask || !toTask) return null;
            const from = getConnectorPoint(fromTask, arrow.fromSide);
            const to = getConnectorPoint(toTask, arrow.toSide);
            return (
              <line
                key={arrow.id}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="#161616"
                strokeWidth={1.5}
                markerEnd="url(#arrowhead)"
                pointerEvents="none"
              />
            );
          })}

          {/* タスク */}
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

              {/* コネクタポイント */}
              {SIDES.map((side) => {
                const pt = getConnectorPoint(task, side);
                const isHovered =
                  hoveredConnector?.taskId === task.id &&
                  hoveredConnector?.side === side;
                const isTarget =
                  targetConnector?.taskId === task.id &&
                  targetConnector?.side === side;
                const showConnector = isHovered || isTarget || !!draggingArrow;
                return (
                  <circle
                    key={side}
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered || isTarget ? CONNECTOR_RADIUS_HOVER : CONNECTOR_RADIUS}
                    fill={
                      isTarget
                        ? "#0043ce"
                        : isHovered
                        ? "#0f62fe"
                        : "#c6c6c6"
                    }
                    opacity={showConnector ? 1 : 0}
                    style={{ cursor: "crosshair" }}
                    onMouseEnter={() => handleConnectorMouseEnter(task.id, side)}
                    onMouseLeave={handleConnectorMouseLeave}
                    onMouseDown={(e) =>
                      handleConnectorMouseDown(e, task.id, side)
                    }
                  />
                );
              })}
            </g>
          ))}

          {/* グリッドドット */}
          {dots.map(({ x, y }) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r={DOT_RADIUS}
              fill={DOT_COLOR}
              pointerEvents="none"
            />
          ))}

          {/* タスク追加ボタン */}
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

          {/* ドラッグ中の仮矢印 */}
          {draggingArrow && draggingFromTask && (
            <line
              x1={getConnectorPoint(draggingFromTask, draggingArrow.fromSide).x}
              y1={getConnectorPoint(draggingFromTask, draggingArrow.fromSide).y}
              x2={draggingArrow.curX}
              y2={draggingArrow.curY}
              stroke="#0f62fe"
              strokeWidth={2}
              strokeDasharray="6 3"
              markerEnd="url(#arrowhead-preview)"
              pointerEvents="none"
            />
          )}
        </svg>
      )}
    </div>
  );
}
