export type CpmTaskResult = {
  es: number;
  lc: number;
  isCritical: boolean;
  isIsolated: boolean;
};

export type CpmOutput =
  | { ok: true; results: Map<number, CpmTaskResult> }
  | { ok: false; error: string };

export function computeCpm(
  tasks: { id: number; duration: number }[],
  arrows: { fromTaskId: number; toTaskId: number }[]
): CpmOutput {
  if (tasks.length === 0) {
    return { ok: true, results: new Map() };
  }

  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  const preds = new Map<number, Set<number>>();
  const succs = new Map<number, Set<number>>();
  for (const t of tasks) {
    preds.set(t.id, new Set());
    succs.set(t.id, new Set());
  }
  for (const a of arrows) {
    succs.get(a.fromTaskId)?.add(a.toTaskId);
    preds.get(a.toTaskId)?.add(a.fromTaskId);
  }

  const isolated = new Set<number>();
  const nonIsolated: number[] = [];
  for (const t of tasks) {
    if (preds.get(t.id)!.size === 0 && succs.get(t.id)!.size === 0) {
      isolated.add(t.id);
    } else {
      nonIsolated.push(t.id);
    }
  }

  // Kahn's topological sort on non-isolated tasks
  const inDegree = new Map<number, number>();
  for (const id of nonIsolated) {
    let deg = 0;
    for (const p of preds.get(id)!) {
      if (!isolated.has(p)) deg++;
    }
    inDegree.set(id, deg);
  }

  const queue: number[] = [];
  for (const id of nonIsolated) {
    if (inDegree.get(id) === 0) queue.push(id);
  }

  const topoOrder: number[] = [];
  while (queue.length > 0) {
    const cur = queue.shift()!;
    topoOrder.push(cur);
    for (const s of succs.get(cur)!) {
      if (isolated.has(s)) continue;
      const deg = inDegree.get(s)! - 1;
      inDegree.set(s, deg);
      if (deg === 0) queue.push(s);
    }
  }

  if (topoOrder.length < nonIsolated.length) {
    return { ok: false, error: "循環依存が検出されました" };
  }

  // Forward pass
  const es = new Map<number, number>();
  const ef = new Map<number, number>();
  for (const id of topoOrder) {
    es.set(id, 0);
  }
  for (const id of topoOrder) {
    const task = taskMap.get(id)!;
    const efVal = es.get(id)! + task.duration;
    ef.set(id, efVal);
    for (const s of succs.get(id)!) {
      if (isolated.has(s)) continue;
      if ((es.get(s) ?? 0) < efVal) {
        es.set(s, efVal);
      }
    }
  }

  // Backward pass
  const lc = new Map<number, number>();
  for (const id of topoOrder) {
    lc.set(id, Infinity);
  }
  // End nodes (out-degree = 0 among non-isolated)
  for (const id of topoOrder) {
    let hasNonIsolatedSucc = false;
    for (const s of succs.get(id)!) {
      if (!isolated.has(s)) { hasNonIsolatedSucc = true; break; }
    }
    if (!hasNonIsolatedSucc) {
      lc.set(id, ef.get(id)!);
    }
  }
  for (let i = topoOrder.length - 1; i >= 0; i--) {
    const id = topoOrder[i];
    const lcVal = lc.get(id)!;
    const dur = taskMap.get(id)!.duration;
    for (const p of preds.get(id)!) {
      if (isolated.has(p)) continue;
      const newLc = lcVal - dur;
      if (newLc < (lc.get(p) ?? Infinity)) {
        lc.set(p, newLc);
      }
    }
  }

  const results = new Map<number, CpmTaskResult>();

  for (const id of nonIsolated) {
    const esVal = es.get(id)!;
    const lcVal = lc.get(id)!;
    const dur = taskMap.get(id)!.duration;
    results.set(id, {
      es: esVal,
      lc: lcVal,
      isCritical: lcVal - esVal - dur === 0,
      isIsolated: false,
    });
  }

  for (const id of isolated) {
    const dur = taskMap.get(id)!.duration;
    results.set(id, {
      es: 0,
      lc: dur,
      isCritical: false,
      isIsolated: true,
    });
  }

  return { ok: true, results };
}
