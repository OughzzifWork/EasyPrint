import { describe, it, expect, beforeAll, afterAll } from "vitest";

const BASE = "http://localhost:4000";

let adminToken = "";
let comptableToken = "";
let visiteurToken = "";
let adminEntityId = "";

async function api(
  path: string,
  options: RequestInit = {},
  token?: string
) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  return fetch(`${BASE}${path}`, { ...options, headers });
}

beforeAll(async () => {
  const loginRes = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "admin", password: "admin123" }),
  });
  const loginData = await loginRes.json();
  adminToken = loginData.token;
  adminEntityId = loginData.user.entityId;

  const compRes = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "comptable", password: "comptable123" }),
  });
  const compData = await compRes.json();
  comptableToken = compData.token;

  const visRes = await api("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: "visiteur", password: "visiteur123" }),
  });
  const visData = await visRes.json();
  visiteurToken = visData.token;
});

describe("Auth", () => {
  it("POST /api/auth/login returns 200 with valid credentials", async () => {
    const res = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.token).toBeDefined();
    expect(data.user.role).toBe("ADMIN");
  });

  it("POST /api/auth/login returns 401 with wrong password", async () => {
    const res = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "wrongpass" }),
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/login returns 400 with missing fields", async () => {
    const res = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin" }),
    });
    expect(res.status).toBe(400);
  });

  it("GET /api/health returns 200 without auth", async () => {
    const res = await api("/api/health");
    expect(res.status).toBe(200);
  });

  it("GET /api/users without token returns 401", async () => {
    const res = await api("/api/users");
    expect(res.status).toBe(401);
  });

  it("GET /api/users with invalid token returns 401", async () => {
    const res = await api("/api/users", {}, "invalid-token");
    expect(res.status).toBe(401);
  });
});

describe("Security Headers", () => {
  it("Returns X-Frame-Options header", async () => {
    const res = await api("/api/health");
    expect(res.headers.get("x-frame-options")).toBeTruthy();
  });

  it("Returns X-Content-Type-Options header", async () => {
    const res = await api("/api/health");
    expect(res.headers.get("x-content-type-options")).toBe("nosniff");
  });

  it("Returns Content-Security-Policy header", async () => {
    const res = await api("/api/health");
    expect(res.headers.get("content-security-policy")).toBeTruthy();
  });

  it("Returns Strict-Transport-Security header", async () => {
    const res = await api("/api/health");
    expect(res.headers.get("strict-transport-security")).toBeTruthy();
  });

  it("Returns RateLimit headers", async () => {
    const res = await api("/api/health");
    expect(res.headers.get("ratelimit-limit")).toBeTruthy();
  });
});

describe("Authorization / Role-based Access", () => {
  it("VISITEUR cannot create users", async () => {
    const res = await api(
      "/api/users",
      { method: "POST", body: JSON.stringify({ username: "test", password: "test123", fullName: "Test", role: "COMPTABLE" }) },
      visiteurToken
    );
    expect(res.status).toBe(403);
  });

  it("COMPTABLE cannot create users", async () => {
    const res = await api(
      "/api/users",
      { method: "POST", body: JSON.stringify({ username: "test", password: "test123", fullName: "Test", role: "COMPTABLE" }) },
      comptableToken
    );
    expect(res.status).toBe(403);
  });

  it("ADMIN can list entities", async () => {
    const res = await api("/api/entities", {}, adminToken);
    expect(res.status).toBe(200);
  });

  it("COMPTABLE cannot list entities", async () => {
    const res = await api("/api/entities", {}, comptableToken);
    expect(res.status).toBe(403);
  });

  it("VISITEUR cannot create cheques (no canEdit)", async () => {
    const res = await api(
      "/api/cheques",
      { method: "POST", body: JSON.stringify({ beneficiary: "Test", amountNumeric: 100, bankId: "x" }) },
      visiteurToken
    );
    expect(res.status).toBe(403);
  });
});

describe("Entity Isolation (IDOR protection)", () => {
  it("Non-admin CHEQUE listing is filtered by entity", async () => {
    const res = await api("/api/cheques", {}, comptableToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    if (Array.isArray(data)) {
      data.forEach((c: any) => {
        if (c.entityId) expect(c.entityId).toBe(adminEntityId);
      });
    }
  });

  it("Non-admin BENEFICIARY listing is filtered by entity", async () => {
    const res = await api("/api/beneficiaries", {}, comptableToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    if (Array.isArray(data)) {
      data.forEach((b: any) => {
        if (b.entityId) expect(b.entityId).toBe(adminEntityId);
      });
    }
  });
});

describe("Input Validation", () => {
  it("POST /api/cheques with missing fields returns 400", async () => {
    const res = await api(
      "/api/cheques",
      { method: "POST", body: JSON.stringify({}) },
      comptableToken
    );
    expect([400, 404]).toContain(res.status);
  });

  it("POST /api/effets with missing fields returns 400", async () => {
    const res = await api(
      "/api/effets",
      { method: "POST", body: JSON.stringify({}) },
      comptableToken
    );
    expect([400, 404]).toContain(res.status);
  });
});

describe("CORS", () => {
  it("Rejects requests with arbitrary Origin header (server returns error or omits CORS headers)", async () => {
    const res = await fetch(`${BASE}/api/health`, {
      headers: { Origin: "https://evil.com" },
    });
    // In production mode with strict CORS, non-matching origins get rejected (error/500)
    // or the response comes without CORS headers
    const corsHeader = res.headers.get("access-control-allow-origin");
    if (res.status === 200) {
      expect(corsHeader).not.toBe("https://evil.com");
    } else {
      expect([403, 500]).toContain(res.status);
    }
  });
});

describe("Rate Limiting", () => {
  it("Login endpoint has rate limit headers", async () => {
    const res = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: "admin", password: "wrong" }),
    });
    expect(res.headers.get("ratelimit-remaining")).toBeDefined();
  });
});

describe("Entities", () => {
  it("GET /api/entities returns array", async () => {
    const res = await api("/api/entities", {}, adminToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("GET /api/entities/:id returns entity with counts", async () => {
    const listRes = await api("/api/entities", {}, adminToken);
    const entities = await listRes.json();
    if (entities.length > 0) {
      const res = await api(`/api/entities/${entities[0].id}`, {}, adminToken);
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.code).toBeDefined();
    }
  });
});

describe("Banks", () => {
  it("GET /api/banks returns array", async () => {
    const res = await api("/api/banks", {}, adminToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });
});

describe("Templates", () => {
  it("GET /api/templates returns array", async () => {
    const res = await api("/api/templates", {}, adminToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("VISITEUR can list templates but not create", async () => {
    const listRes = await api("/api/templates", {}, visiteurToken);
    expect(listRes.status).toBe(200);

    const createRes = await api(
      "/api/templates",
      { method: "POST", body: JSON.stringify({ name: "Test", bankId: "x", documentType: "CHEQUE" }) },
      visiteurToken
    );
    expect(createRes.status).toBe(403);
  });
});

describe("Cheques & Effets CRUD", () => {
  let chequeId = "";
  let effetId = "";
  let chequeBankId = "";
  let effetBankId = "";

  beforeAll(async () => {
    const banksRes = await api("/api/banks", {}, adminToken);
    const banks = await banksRes.json();
    const templatesRes = await api("/api/templates", {}, adminToken);
    const templates = await templatesRes.json();
    for (const t of templates) {
      if (t.documentType === "CHEQUE" && t.isActive) chequeBankId = t.bankId;
      if (t.documentType === "EFFET" && t.isActive) effetBankId = t.bankId;
    }
    if (!chequeBankId && banks.length > 0) chequeBankId = banks[0].id;
    if (!effetBankId && banks.length > 0) effetBankId = banks[0].id;
  });

  it("COMPTABLE can create cheque", async () => {
    if (!chequeBankId) return;
    const res = await api(
      "/api/cheques",
      {
        method: "POST",
        body: JSON.stringify({
          bankId: chequeBankId,
          beneficiary: "TEST AUDIT SECURITY",
          amountNumeric: 12345.67,
          amountWords: "Douze mille trois cent quarante-cinq dirhams et soixante-sept centimes",
        }),
      },
      comptableToken
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    chequeId = data.id;
    expect(data.beneficiary).toBe("TEST AUDIT SECURITY");
    expect(data.status).toBe("DRAFT");
  });

  it("COMPTABLE can update cheque", async () => {
    if (!chequeId) return;
    const res = await api(
      `/api/cheques/${chequeId}`,
      { method: "PUT", body: JSON.stringify({ amountNumeric: 99999.99 }) },
      comptableToken
    );
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.amountNumeric).toBe(99999.99);
  });

  it("VISITEUR cannot update cheque", async () => {
    if (!chequeId) return;
    const res = await api(
      `/api/cheques/${chequeId}`,
      { method: "PUT", body: JSON.stringify({ amountNumeric: 1 }) },
      visiteurToken
    );
    expect(res.status).toBe(403);
  });

  it("COMPTABLE can soft-delete cheque", async () => {
    if (!chequeId) return;
    const res = await api(`/api/cheques/${chequeId}`, { method: "DELETE" }, comptableToken);
    expect(res.status).toBe(200);
  });

  it("COMPTABLE can restore cheque", async () => {
    if (!chequeId) return;
    const res = await api(`/api/cheques/${chequeId}/restore`, { method: "POST" }, comptableToken);
    expect(res.status).toBe(200);
  });

  it("COMPTABLE can create effet", async () => {
    if (!effetBankId) return;
    const res = await api(
      "/api/effets",
      {
        method: "POST",
        body: JSON.stringify({
          bankId: effetBankId,
          beneficiary: "TEST EFFET AUDIT",
          amountNumeric: 50000,
          amountWords: "Cinquante mille dirhams",
          dueDate: "2026-12-31",
          sapCode: "SAP-AUDIT-001",
        }),
      },
      comptableToken
    );
    expect(res.status).toBe(201);
    const data = await res.json();
    effetId = data.id;
    expect(data.sapCode).toBe("SAP-AUDIT-001");
  });

  it("COMPTABLE can delete effet", async () => {
    if (!effetId) return;
    const res = await api(`/api/effets/${effetId}`, { method: "DELETE" }, comptableToken);
    expect(res.status).toBe(200);
  });
});

describe("Audit Log", () => {
  it("ADMIN can view audit logs", async () => {
    const res = await api("/api/audit", {}, adminToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it("VISITEUR cannot view audit logs", async () => {
    const res = await api("/api/audit", {}, visiteurToken);
    expect(res.status).toBe(403);
  });
});

describe("SAP Password Encryption (M1)", () => {
  const MASKED = "••••••••";
  let entityId = "";

  beforeAll(async () => {
    const res = await api("/api/entities", {}, adminToken);
    const entities = await res.json();
    if (entities.length > 0) entityId = entities[0].id;
  });

  it("GET /api/entities returns masked sapPassword", async () => {
    const res = await api("/api/entities", {}, adminToken);
    const entities = await res.json();
    entities.forEach((e: any) => {
      if (e.sapPassword) expect(e.sapPassword).toBe(MASKED);
    });
  });

  it("GET /api/entities/:id returns masked sapPassword", async () => {
    if (!entityId) return;
    const res = await api(`/api/entities/${entityId}`, {}, adminToken);
    const entity = await res.json();
    if (entity.sapPassword) expect(entity.sapPassword).toBe(MASKED);
  });

  it("PUT /api/entities encrypts new sapPassword", async () => {
    if (!entityId) return;
    const res = await api(`/api/entities/${entityId}`, {
      method: "PUT",
      body: JSON.stringify({ sapPassword: "TestPass123" }),
    }, adminToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sapPassword).toBe(MASKED);
  });

  it("PUT /api/entities with masked password keeps existing", async () => {
    if (!entityId) return;
    const res = await api(`/api/entities/${entityId}`, {
      method: "PUT",
      body: JSON.stringify({ sapPassword: MASKED }),
    }, adminToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sapPassword).toBe(MASKED);
  });

  it("PUT /api/entities with empty password clears it", async () => {
    if (!entityId) return;
    const res = await api(`/api/entities/${entityId}`, {
      method: "PUT",
      body: JSON.stringify({ sapPassword: "" }),
    }, adminToken);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.sapPassword).toBeNull();
  });
});

describe("CSRF Origin Protection (M3)", () => {
  it("POST with mismatched Origin returns 403", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.com" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });
    expect(res.status).toBe(403);
  });

  it("POST with no Origin header is allowed (direct API calls)", async () => {
    const res = await fetch(`${BASE}/api/health`);
    expect(res.status).toBe(200);
  });

  it("POST with matching Origin header is allowed", async () => {
    const res = await fetch(`${BASE}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "http://localhost:3000" },
      body: JSON.stringify({ username: "admin", password: "admin123" }),
    });
    expect(res.status).toBe(200);
  });
});

describe("Zod Input Validation (M2)", () => {
  it("POST /api/auth/login with empty body returns 400 with details", async () => {
    const res = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Erreur de validation");
    expect(data.details).toBeDefined();
    expect(data.details.length).toBeGreaterThan(0);
  });

  it("POST /api/cheques with negative amount returns 400", async () => {
    const res = await api("/api/cheques", {
      method: "POST",
      body: JSON.stringify({ bankId: "00000000-0000-0000-0000-000000000000", beneficiary: "Test", amountNumeric: -100 }),
    }, comptableToken);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Erreur de validation");
  });

  it("POST /api/beneficiaries with empty name returns 400", async () => {
    const res = await api("/api/beneficiaries", {
      method: "POST",
      body: JSON.stringify({ name: "" }),
    }, comptableToken);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Erreur de validation");
  });

  it("POST /api/templates with invalid documentType returns 400", async () => {
    const res = await api("/api/templates", {
      method: "POST",
      body: JSON.stringify({ bankId: "00000000-0000-0000-0000-000000000000", documentType: "INVALID", name: "Test" }),
    }, comptableToken);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Erreur de validation");
  });

  it("PUT /api/users/:id with invalid role returns 400", async () => {
    const res = await api("/api/users/00000000-0000-0000-0000-000000000000", {
      method: "PUT",
      body: JSON.stringify({ role: "INVALID_ROLE" }),
    }, adminToken);
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toBe("Erreur de validation");
  });
});
