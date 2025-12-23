export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Map destinations to node base URLs; fall back to API_BASE_URL if unset
export const DESTINATION_NODE_URLS = {
  USA: process.env.NEXT_PUBLIC_NODE1_URL || "http://localhost:8001",
  EU: process.env.NEXT_PUBLIC_NODE2_URL || "http://localhost:8002",
  IN: process.env.NEXT_PUBLIC_NODE3_URL || "http://localhost:8003",
  AUS: process.env.NEXT_PUBLIC_NODE4_URL || "http://localhost:8004",
};

const headers = {
  "Content-Type": "application/json",
};

export async function submitIntake(payload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/intake`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function fetchCase(intakeId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/cases/${encodeURIComponent(intakeId)}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function requestSharingPackage(payload) {
  // Sharing feature removed - focusing on text disinformation MVP
  throw new Error("Sharing feature has been disabled");
}

// ==================== Analyst Decision APIs ====================

/**
 * Submit an analyst decision for a case (Flag/Monitor/Escalate/Dismiss)
 */
export async function submitAnalystDecision(intakeId, decision, notes = "", analystId = "analyst") {
  const res = await fetch(`${API_BASE_URL}/api/v1/cases/${encodeURIComponent(intakeId)}/decision`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      intake_id: intakeId,
      decision,
      notes,
      analyst_id: analystId,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Fetch audit trail for a case
 */
export async function fetchAuditTrail(intakeId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/cases/${encodeURIComponent(intakeId)}/audit`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * List all analyzed cases
 */
export async function listCases(limit = 50) {
  const res = await fetch(`${API_BASE_URL}/api/v1/cases?limit=${limit}`);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

// Simple Server-Sent Events (SSE) stream for live updates
export function createEventStream(onEvent, onError) {
  const url = `${API_BASE_URL}/api/v1/events/stream`;
  const source = new EventSource(url);

  source.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      onEvent && onEvent(data);
    } catch (err) {
      console.error("Failed to parse event", err);
    }
  };

  source.onerror = () => {
    onError && onError();
  };

  return source;
}
