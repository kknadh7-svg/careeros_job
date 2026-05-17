"use client";

import { useState } from "react";

export default function AdminUpgradePage() {
  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);

  async function upgrade() {
    setLoading(true);
    setStatus("Upgrading...");
    try {
      const res = await fetch("/api/v1/admin/set-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.success) {
        setStatus(`✅ Success! ${data.email} upgraded to ${data.plan}. Please refresh the page.`);
      } else {
        setStatus(`❌ Error: ${JSON.stringify(data.error)}`);
      }
    } catch (e) {
      setStatus(`❌ Failed: ${e}`);
    }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "100vh", gap: 20, fontFamily: "sans-serif" }}>
      <h1>Admin Account Upgrade</h1>
      <button
        onClick={upgrade}
        disabled={loading}
        style={{ padding: "12px 32px", fontSize: 16, background: "#6366f1", color: "white", border: "none", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer" }}
      >
        {loading ? "Upgrading..." : "Upgrade My Account to PRO"}
      </button>
      {status && <p style={{ fontSize: 16, color: status.startsWith("✅") ? "green" : "red" }}>{status}</p>}
    </div>
  );
}
