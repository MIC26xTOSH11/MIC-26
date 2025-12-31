export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

// Map destinations to node base URLs; fall back to API_BASE_URL if unset
export const DESTINATION_NODE_URLS = {
  USA: process.env.NEXT_PUBLIC_NODE1_URL || "http://localhost:8001",
  EU: process.env.NEXT_PUBLIC_NODE2_URL || "http://localhost:8002",
  IN: process.env.NEXT_PUBLIC_NODE3_URL || "http://localhost:8003",
  AUS: process.env.NEXT_PUBLIC_NODE4_URL || "http://localhost:8004",
};

// Helper to get auth token
function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
  return {
    "Content-Type": "application/json",
    ...(token && { "Authorization": `Bearer ${token}` }),
  };
}

const headers = {
  "Content-Type": "application/json",
};

export async function submitIntake(payload) {
  const res = await fetch(`${API_BASE_URL}/api/v1/intake`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getUserLocation() {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/location`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      return null;
    }
    return res.json();
  } catch (error) {
    console.error("Failed to detect location:", error);
    return null;
  }
}

export async function fetchCase(intakeId) {
  const res = await fetch(`${API_BASE_URL}/api/v1/cases/${encodeURIComponent(intakeId)}`, {
    headers: getAuthHeaders(),
  });
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
    headers: getAuthHeaders(),
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
  const res = await fetch(`${API_BASE_URL}/api/v1/cases/${encodeURIComponent(intakeId)}/audit`, {
    headers: getAuthHeaders(),
  });
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
  const res = await fetch(`${API_BASE_URL}/api/v1/cases?limit=${limit}`, {
    headers: getAuthHeaders(),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return res.json();
}

// Simple Server-Sent Events (SSE) stream for live updates
export function createEventStream(onEvent, onError) {
  const url = `${API_BASE_URL}/api/v1/events/stream`;
  console.log('[EventStream] Connecting to:', url);
  const source = new EventSource(url);

  source.onopen = () => {
    console.log('[EventStream] Connection opened');
  };

  source.onmessage = (e) => {
    console.log('[EventStream] Received event:', e.data);
    try {
      const data = JSON.parse(e.data);
      console.log('[EventStream] Parsed event:', data);
      onEvent && onEvent(data);
    } catch (err) {
      console.error("[EventStream] Failed to parse event", err);
    }
  };

  source.onerror = (err) => {
    console.error('[EventStream] Error:', err);
    console.log('[EventStream] ReadyState:', source.readyState);
    onError && onError();
  };

  return source;
}
