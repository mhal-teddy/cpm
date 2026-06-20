"use client";

import { useEffect, useState } from "react";

type TaskData = {
  id: number;
  name: string;
  duration: number;
};

type Props = {
  task: TaskData;
  onSave: (name: string, duration: number) => void;
  onDelete: () => void;
  onClose: () => void;
};

export default function TaskEditPanel({ task, onSave, onDelete, onClose }: Props) {
  const [name, setName] = useState(task.name);
  const [durationStr, setDurationStr] = useState(String(task.duration));
  const [error, setError] = useState("");
  const [focusedField, setFocusedField] = useState<"name" | "duration" | null>(null);

  useEffect(() => {
    setName(task.name);
    setDurationStr(String(task.duration));
    setError("");
  }, [task.id]);

  function handleSave() {
    const savedName = name.trim() === "" ? "0" : name.trim();
    const dur = Number(durationStr);
    if (!Number.isInteger(dur) || dur < 0) {
      setError("所要時間は 0 以上の整数を入力してください");
      return;
    }
    setError("");
    onSave(savedName, dur);
    onClose();
  }

  const inputBase: React.CSSProperties = {
    width: "100%",
    height: 40,
    backgroundColor: "#f4f4f4",
    border: "none",
    padding: "0 16px",
    fontSize: 14,
    color: "#161616",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: "inherit",
  };

  return (
    <div
      style={{
        position: "fixed",
        right: 0,
        top: 0,
        width: 320,
        height: "100vh",
        backgroundColor: "#ffffff",
        boxShadow: "-2px 0 6px rgba(0,0,0,0.3)",
        zIndex: 100,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ヘッダー */}
      <div
        style={{
          backgroundColor: "#161616",
          height: 48,
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "'Noto Sans Mono', 'IBM Plex Mono', monospace",
            fontSize: 14,
            color: "#f4f4f4",
          }}
        >
          タスク {task.id}
        </span>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            color: "#f4f4f4",
            fontSize: 20,
            cursor: "pointer",
            padding: "4px 8px",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          aria-label="閉じる"
        >
          ×
        </button>
      </div>

      {/* フォーム本体 */}
      <div
        style={{
          padding: "24px 16px",
          flex: 1,
          display: "flex",
          flexDirection: "column",
          gap: 24,
          overflowY: "auto",
        }}
      >
        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              color: "#525252",
              marginBottom: 8,
            }}
          >
            タスク名
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onFocus={() => setFocusedField("name")}
            onBlur={() => setFocusedField(null)}
            style={{
              ...inputBase,
              borderBottom:
                focusedField === "name"
                  ? "2px solid #0f62fe"
                  : "2px solid transparent",
            }}
          />
        </div>

        <div>
          <label
            style={{
              display: "block",
              fontSize: 12,
              color: "#525252",
              marginBottom: 8,
            }}
          >
            所要時間
          </label>
          <input
            type="number"
            step="1"
            min="0"
            value={durationStr}
            onChange={(e) => {
              setDurationStr(e.target.value);
              setError("");
            }}
            onFocus={() => setFocusedField("duration")}
            onBlur={() => setFocusedField(null)}
            style={{
              ...inputBase,
              borderBottom: error
                ? "2px solid #da1e28"
                : focusedField === "duration"
                ? "2px solid #0f62fe"
                : "2px solid transparent",
            }}
          />
          {error && (
            <p style={{ fontSize: 12, color: "#da1e28", marginTop: 8 }}>
              {error}
            </p>
          )}
        </div>
      </div>

      {/* ボタン */}
      <div style={{ flexShrink: 0 }}>
        <button
          onClick={handleSave}
          style={{
            width: "100%",
            height: 48,
            backgroundColor: "#0f62fe",
            color: "#ffffff",
            border: "none",
            borderRadius: 0,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          保存
        </button>
        <button
          onClick={onDelete}
          style={{
            width: "100%",
            height: 48,
            backgroundColor: "#da1e28",
            color: "#ffffff",
            border: "none",
            borderRadius: 0,
            fontSize: 14,
            cursor: "pointer",
            fontFamily: "inherit",
            marginTop: 1,
          }}
        >
          削除
        </button>
      </div>
    </div>
  );
}
