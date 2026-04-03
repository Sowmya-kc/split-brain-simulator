import { useState, useEffect } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";

// ── NodeCard Component ─────────────────────────────────
function NodeCard({ node, conflictKeys }) {
  const isIsolated = node.status === "ISOLATED";
  const hasConflict = Object.keys(node.data)
    .some(k => conflictKeys.includes(k));

  const borderColor = isIsolated
    ? "border-red-500 shadow-red-500/30"
    : hasConflict
    ? "border-yellow-400 shadow-yellow-400/40 animate-pulse"
    : "border-green-500 shadow-green-500/20";

  return (
    <div className={`
      bg-slate-900 border-2 rounded-2xl p-6 w-64
      shadow-lg transition-all duration-500
      ${borderColor}
    `}>
      {/* Node Title */}
      <div className="text-purple-300 font-bold text-lg mb-2">
        🖥️ {node.id}
      </div>

      {/* Status Badge */}
      <div className={`
        inline-block px-3 py-1 rounded-full text-xs font-semibold mb-4
        ${isIsolated
          ? "bg-red-900 text-red-300"
          : "bg-green-900 text-green-300"}
      `}>
        {isIsolated ? "🔴 ISOLATED" : "🟢 ONLINE"}
      </div>

      {/* Database */}
      <div className="space-y-2">
        {Object.keys(node.data).length === 0 ? (
          <div className="text-slate-500 text-sm">(empty)</div>
        ) : (
          Object.entries(node.data).map(([key, val]) => {
            const isConflict = conflictKeys.includes(key);
            return (
              <div key={key}
                className="flex justify-between bg-slate-800 
                           rounded-lg px-3 py-2">
                <span className="text-sky-300 text-sm">{key}</span>
                <span className={`text-sm font-bold
                  ${isConflict ? "text-orange-400" : "text-yellow-300"}`}>
                  {isConflict && "⚡"}{val}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── LinkRow Component ──────────────────────────────────
function LinkRow({ link }) {
  return (
    <div className={`
      px-6 py-2 rounded-full text-sm font-medium
      transition-all duration-300
      ${link.partitioned
        ? "bg-red-900 text-red-300 animate-pulse"
        : "bg-green-900 text-green-300"}
    `}>
      {link.partitioned
        ? `✂️  ${link.a}  ✕  ${link.b}  [PARTITIONED]`
        : `🔗  ${link.a}  ↔  ${link.b}  [CONNECTED]`}
    </div>
  );
}

// ── Main App ───────────────────────────────────────────
export default function App() {
  const [state, setState] = useState(null);
  const [connected, setConnected] = useState(false);
  const [log, setLog] = useState([]);

  useEffect(() => {
    const ws = new ReconnectingWebSocket("ws://localhost:8887");

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setState(data);
      // Add to event log
      setLog(prev => [{
        time: new Date().toLocaleTimeString(),
        phase: data.phase
      }, ...prev].slice(0, 8)); // keep last 8 events
    };

    return () => ws.close();
  }, []);

  // Find keys with conflicting values across nodes
  const conflictKeys = state ? (() => {
    const keyVals = {};
    state.nodes.forEach(node => {
      Object.entries(node.data).forEach(([k, v]) => {
        if (!keyVals[k]) keyVals[k] = new Set();
        keyVals[k].add(v);
      });
    });
    return Object.entries(keyVals)
      .filter(([, vals]) => vals.size > 1)
      .map(([k]) => k);
  })() : [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-8">

      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-purple-400 
                       tracking-widest mb-2">
          🧠 Split Brain Simulator
        </h1>
        <p className="text-slate-400 text-sm">
          Distributed Systems — CAP Theorem in Action
        </p>

        {/* Connection status */}
        <div className={`
          inline-flex items-center gap-2 mt-3 px-4 py-1 
          rounded-full text-xs font-semibold
          ${connected ? "bg-green-900 text-green-300" 
                      : "bg-red-900 text-red-300"}
        `}>
          <span className={`w-2 h-2 rounded-full
            ${connected ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
          {connected ? "Connected to Java Backend" : "Waiting for Java backend..."}
        </div>
      </div>

      {/* Phase Banner */}
      {state && (
        <div className="bg-slate-800 border border-slate-600 
                        rounded-xl px-6 py-3 text-center mb-8
                        text-slate-200 font-medium text-lg">
          {state.phase}
        </div>
      )}

      {/* Conflict Alert */}
      {conflictKeys.length > 0 && (
        <div className="bg-orange-900/50 border-2 border-orange-400 
                        rounded-xl px-6 py-3 text-center mb-6
                        text-orange-300 font-bold animate-pulse">
          ⚠️ CONFLICT DETECTED on key(s): {conflictKeys.join(", ")}
          — Nodes DISAGREE!
        </div>
      )}

      {/* Node Cards */}
      {state ? (
        <div className="flex gap-6 justify-center mb-8 flex-wrap">
          {state.nodes.map(node => (
            <NodeCard
              key={node.id}
              node={node}
              conflictKeys={conflictKeys}
            />
          ))}
        </div>
      ) : (
        <div className="text-center text-slate-500 mb-8">
          Waiting for simulation data...
        </div>
      )}

      {/* Network Links */}
      {state && (
        <div className="flex flex-col items-center gap-3 mb-8">
          <div className="text-slate-500 text-xs uppercase 
                          tracking-widest mb-1">
            Network Links
          </div>
          {state.links.map((link, i) => (
            <LinkRow key={i} link={link} />
          ))}
        </div>
      )}

      {/* Event Log */}
      <div className="max-w-2xl mx-auto">
        <div className="text-slate-500 text-xs uppercase 
                        tracking-widest mb-3">
          Event Log
        </div>
        <div className="bg-slate-900 rounded-xl p-4 space-y-2
                        border border-slate-700">
          {log.length === 0 ? (
            <div className="text-slate-600 text-sm">
              No events yet...
            </div>
          ) : (
            log.map((entry, i) => (
              <div key={i} className="flex gap-3 text-sm">
                <span className="text-slate-500 shrink-0">
                  {entry.time}
                </span>
                <span className="text-slate-300">{entry.phase}</span>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}