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

type DraggingTask = {
  taskId: number;
  ghostCol: number;
  ghostRow: number;
  originCol: number;
  originRow: number;
  didMove: boolean;
};

type SelectedItem =
  | { type: "task"; id: number }
  | { type: "arrow"; id: number };

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
  const [draggingTask, setDraggingTask] = useState<DraggingTask | null>(null);
  const [selectedItem, setSelectedItem] = useState<SelectedItem | null>(null);

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

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Backspace" && e.key !== "Delete") return;
      if (!selectedItem) return;
      if (selectedItem.type === "task") {
        const id = selectedItem.id;
        setTasks((prev) => prev.filter((t) => t.id !== id));
        setArrows((prev) =>
          prev.filter((a) => a.fromTaskId !== id && a.toTaskId !== id)
        );
      } else {
        const id = selectedItem.id;
        setArrows((prev) => prev.filter((a) => a.id !== id));
      }
      setSelectedItem(null);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedItem]);

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

  function canPlaceExcluding(col: number, row: number, excludeId: number): boolean {
    if (col < 1 || row < 1 || col > cols - 1 || row > rows - 1) return false;
    return tasks.every(
      (t) => t.id === excludeId || Math.abs(t.col - col) >= 2 || Math.abs(t.row - row) >= 2
    );
  }

  function getEffectiveTask(task: Task): Task {
    if (draggingTask && task.id === draggingTask.taskId) {
      return { ...task, col: draggingTask.ghostCol, row: draggingTask.ghostRow };
    }
    return task;
  }

  function addTask(col: number, row: number) {
    setTasks((prev) => [...prev, { id: nextId, col, row }]);
    setNextId((prev) => prev + 1);
  }

  function handleTaskMouseDown(e: React.MouseEvent, taskId: number) {
    if (draggingArrow) return;
    e.stopPropagation();
    const task = tasks.find((t) => t.id === taskId)!;
    setDraggingTask({
      taskId,
      ghostCol: task.col,
      ghostRow: task.row,
      originCol: task.col,
      originRow: task.row,
      didMove: false,
    });
  }

  function handleMouseMove(e: React.MouseEvent<SVGSVGElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (draggingArrow) {
      setDraggingArrow((prev) => prev && { ...prev, curX: x, curY: y });
    }

    if (draggingTask) {
      const col = Math.round(x / CELL_SIZE);
      const row = Math.round(y / CELL_SIZE);
      const newCol = Math.max(1, Math.min(cols - 1, col));
      const newRow = Math.max(1, Math.min(rows - 1, row));
      const moved =
        newCol !== draggingTask.originCol || newRow !== draggingTask.originRow;
      setDraggingTask((prev) =>
        prev && {
          ...prev,
          ghostCol: newCol,
          ghostRow: newRow,
          didMove: prev.didMove || moved,
        }
      );
      return;
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
    if (draggingTask) {
      const { taskId, ghostCol, ghostRow, didMove } = draggingTask;
      if (!didMove) {
        setSelectedItem({ type: "task", id: taskId });
      } else if (canPlaceExcluding(ghostCol, ghostRow, taskId)) {
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, col: ghostCol, row: ghostRow } : t))
        );
      }
      setDraggingTask(null);
      return;
    }

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
    !draggingArrow &&
    !draggingTask;

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
            setDraggingTask(null);
          }}
          onMouseUp={handleMouseUp}
          onClick={() => setSelectedItem(null)}
          style={{ cursor: draggingArrow ? "crosshair" : draggingTask ? "grabbing" : "default" }}
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
              id="arrowhead-selected"
              markerWidth="8"
              markerHeight="6"
              refX="7"
              refY="3"
              orient="auto"
            >
              <path d="M0,0 L0,6 L8,3 z" fill="#0f62fe" />
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
            const effFrom = getEffectiveTask(fromTask);
            const effTo = getEffectiveTask(toTask);
            const from = getConnectorPoint(effFrom, arrow.fromSide);
            const to = getConnectorPoint(effTo, arrow.toSide);
            const isSelected =
              selectedItem?.type === "arrow" && selectedItem.id === arrow.id;
            return (
              <g key={arrow.id}>
                {/* ヒットエリア用透明線 */}
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke="transparent"
                  strokeWidth={12}
                  style={{ cursor: "pointer" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedItem({ type: "arrow", id: arrow.id });
                  }}
                />
                {/* 表示用線 */}
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  stroke={isSelected ? "#0f62fe" : "#161616"}
                  strokeWidth={isSelected ? 2 : 1.5}
                  markerEnd={
                    isSelected ? "url(#arrowhead-selected)" : "url(#arrowhead)"
                  }
                  pointerEvents="none"
                />
              </g>
            );
          })}

          {/* タスク */}
          {tasks.map((task) => {
            const eff = getEffectiveTask(task);
            const isDragging = draggingTask?.taskId === task.id;
            const isSelected =
              selectedItem?.type === "task" && selectedItem.id === task.id;
            const dropValid =
              isDragging &&
              canPlaceExcluding(draggingTask!.ghostCol, draggingTask!.ghostRow, task.id);

            let strokeColor = "#c6c6c6";
            let strokeWidth = 1;
            if (isDragging) {
              strokeColor = dropValid ? "#0f62fe" : "#da1e28";
              strokeWidth = 2;
            } else if (isSelected) {
              strokeColor = "#0f62fe";
              strokeWidth = 2;
            }

            return (
              <g key={task.id} opacity={isDragging ? 0.85 : 1}>
                <rect
                  x={(eff.col - 1) * CELL_SIZE}
                  y={(eff.row - 1) * CELL_SIZE}
                  width={TASK_SIZE}
                  height={TASK_SIZE}
                  fill="#f4f4f4"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  style={{ cursor: isDragging ? "grabbing" : "grab" }}
                  onMouseDown={(e) => handleTaskMouseDown(e, task.id)}
                />
                <text
                  x={eff.col * CELL_SIZE}
                  y={eff.row * CELL_SIZE}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontFamily="'Noto Sans Mono', 'IBM Plex Mono', monospace"
                  fontSize={14}
                  fill="#161616"
                  pointerEvents="none"
                >
                  {task.id}
                </text>

                {/* コネクタポイント */}
                {SIDES.map((side) => {
                  const pt = getConnectorPoint(eff, side);
                  const isHovered =
                    hoveredConnector?.taskId === task.id &&
                    hoveredConnector?.side === side;
                  const isTarget =
                    targetConnector?.taskId === task.id &&
                    targetConnector?.side === side;
                  const showConnector =
                    !draggingTask && (isHovered || isTarget || !!draggingArrow);
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
            );
          })}

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
