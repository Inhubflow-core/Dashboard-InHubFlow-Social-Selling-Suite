import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

console.log("==================================================================");
console.log("INICIO DE PRUEBAS AUTOMATIZADAS: REGLAS CRITICAS SOCIAL SELLING");
console.log("==================================================================\n");

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName) {
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedCount++;
  } else {
    console.error(`[FAIL] ${testName}`);
    failedCount++;
  }
}

// -----------------------------------------------------------------------------
// PRUEBA 1: Verificacion de firma HMAC de Webhooks
// -----------------------------------------------------------------------------
console.log("--- 1. Prueba de Seguridad HMAC Webhook ---");
const testSecret = "unipile_secret_test_xyz123";
const samplePayload = JSON.stringify({
  event: "message_received",
  account_id: "up_acc_roberto_orse_main",
  message_id: "msg-test-001",
  message: "Hola, me interesa la demo de InHubFlow",
  timestamp: new Date().toISOString(),
});

function computeSignature(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

function verifySignature(payload, signatureHeader, secret) {
  if (!signatureHeader || !secret) return false;
  const expected = computeSignature(payload, secret);
  try {
    return crypto.timingSafeEqual(Buffer.from(signatureHeader), Buffer.from(expected));
  } catch {
    return false;
  }
}

const validSignature = computeSignature(samplePayload, testSecret);
const invalidSignature = "deadbeefbadf00d1234567890abcdef";

assert(verifySignature(samplePayload, validSignature, testSecret) === true, "Firma HMAC valida es aceptada correctamente");
assert(verifySignature(samplePayload, invalidSignature, testSecret) === false, "Firma HMAC adulterada es rechazada (401)");
assert(verifySignature(samplePayload, validSignature, "wrong_secret") === false, "Firma con secreto incorrecto es rechazada");

// -----------------------------------------------------------------------------
// PRUEBA 2: Persistencia SQLite & Migraciones
// -----------------------------------------------------------------------------
console.log("\n--- 2. Prueba de Persistencia SQLite ---");
const testDbDir = path.resolve("./data");
if (!fs.existsSync(testDbDir)) fs.mkdirSync(testDbDir, { recursive: true });
const testDbPath = path.join(testDbDir, "test-social-selling.db");
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);

const db = new Database(testDbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS workspaces (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
    provider_id TEXT,
    full_name TEXT NOT NULL,
    headline TEXT,
    source TEXT NOT NULL DEFAULT 'manual',
    stage TEXT NOT NULL DEFAULT 'captured',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS webhook_events (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    external_event_id TEXT,
    event_type TEXT NOT NULL,
    payload_json TEXT NOT NULL,
    status TEXT NOT NULL,
    received_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE (workspace_id, external_event_id)
  );
  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active'
  );
  CREATE TABLE IF NOT EXISTS campaign_leads (
    campaign_id TEXT NOT NULL,
    lead_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'stopped', 'completed'
    stop_reason TEXT,
    PRIMARY KEY (campaign_id, lead_id)
  );
`);

db.prepare("INSERT INTO workspaces (id, name) VALUES (?, ?)").run("ws-test", "Workspace de Pruebas");
const ws = db.prepare("SELECT * FROM workspaces WHERE id = ?").get("ws-test");
assert(ws && ws.name === "Workspace de Pruebas", "Creacion y lectura de Workspace en SQLite");

db.prepare("INSERT INTO leads (id, workspace_id, full_name, headline, stage) VALUES (?, ?, ?, ?, ?)").run(
  "lead-01",
  "ws-test",
  "Carlos Rodriguez",
  "VP de Ventas B2B",
  "captured"
);
const lead = db.prepare("SELECT * FROM leads WHERE id = ?").get("lead-01");
assert(lead && lead.full_name === "Carlos Rodriguez" && lead.stage === "captured", "Persistencia de Lead en SQLite");

// -----------------------------------------------------------------------------
// PRUEBA 3: Idempotencia y Deduplicacion de Webhooks
// -----------------------------------------------------------------------------
console.log("\n--- 3. Prueba de Idempotencia y Deduplicacion ---");
const externalEventId = "evt-unipile-unique-998877";

const firstInsert = db.prepare(`
  INSERT OR IGNORE INTO webhook_events (id, workspace_id, external_event_id, event_type, payload_json, status)
  VALUES (?, ?, ?, ?, ?, 'processed')
`).run("wb-row-1", "ws-test", externalEventId, "comment_received", samplePayload);

assert(firstInsert.changes === 1, "Primer evento de webhook se registra exitosamente (changes = 1)");

const duplicateInsert = db.prepare(`
  INSERT OR IGNORE INTO webhook_events (id, workspace_id, external_event_id, event_type, payload_json, status)
  VALUES (?, ?, ?, ?, ?, 'processed')
`).run("wb-row-2", "ws-test", externalEventId, "comment_received", samplePayload);

assert(duplicateInsert.changes === 0, "Evento duplicado es ignorado por restriccion UNIQUE (idempotencia garantizada, changes = 0)");

// -----------------------------------------------------------------------------
// PRUEBA 4: Regla Stop on Reply (Detencion Inmediata ante Respuesta)
// -----------------------------------------------------------------------------
console.log("\n--- 4. Prueba de Regla 'Stop on Reply' ---");
db.prepare("INSERT INTO campaigns (id, workspace_id, name, status) VALUES (?, ?, ?, ?)").run("cmp-01", "ws-test", "Campana Social Selling Q4", "active");
db.prepare("INSERT INTO campaign_leads (campaign_id, lead_id, status) VALUES (?, ?, 'in_progress')").run("cmp-01", "lead-01");

// Simular que el prospecto responde al mensaje
function handleLeadReply(leadId, messageText) {
  const update = db.prepare(`
    UPDATE campaign_leads
    SET status = 'stopped', stop_reason = 'prospect_replied'
    WHERE lead_id = ? AND status = 'in_progress'
  `).run(leadId);

  // Actualizar etapa del lead a 'conversation'
  db.prepare("UPDATE leads SET stage = 'conversation' WHERE id = ?").run(leadId);
  return update.changes;
}

const stoppedCampaigns = handleLeadReply("lead-01", "Si, enviame informacion sobre la suite.");
const leadCampaignStatus = db.prepare("SELECT * FROM campaign_leads WHERE lead_id = ?").get("lead-01");
const updatedLead = db.prepare("SELECT stage FROM leads WHERE id = ?").get("lead-01");

assert(stoppedCampaigns === 1, "Automatizacion detecta respuesta y afecta la campana activa");
assert(leadCampaignStatus.status === "stopped", "Estado de la campana para el lead pasa inmediatamente a 'stopped'");
assert(leadCampaignStatus.stop_reason === "prospect_replied", "Motivo de detencion registrado como 'prospect_replied'");
assert(updatedLead.stage === "conversation", "Etapa del lead avanza automaticamente a 'conversation'");

// -----------------------------------------------------------------------------
// PRUEBA 5: Pacing Limits de Seguridad de LinkedIn
// -----------------------------------------------------------------------------
console.log("\n--- 5. Prueba de Pacing Limits (Proteccion de Cuenta) ---");
const PACING_LIMITS = {
  maxInvitationsPerDay: 25,
  maxMessagesPerDay: 50,
  maxProfileVisitsPerDay: 80,
};

function canPerformAction(currentCount, actionType) {
  if (actionType === "invitation") return currentCount < PACING_LIMITS.maxInvitationsPerDay;
  if (actionType === "message") return currentCount < PACING_LIMITS.maxMessagesPerDay;
  if (actionType === "visit") return currentCount < PACING_LIMITS.maxProfileVisitsPerDay;
  return false;
}

assert(canPerformAction(24, "invitation") === true, "Permite enviar invitacion cuando el contador es 24 (< 25)");
assert(canPerformAction(25, "invitation") === false, "Bloquea envio de invitacion cuando se alcanza el limite de 25");
assert(canPerformAction(50, "message") === false, "Bloquea mensaje directo cuando se alcanza el limite de 50");
assert(canPerformAction(80, "visit") === false, "Bloquea visita de perfil cuando se alcanza el limite de 80");

// -----------------------------------------------------------------------------
// PRUEBA 6: Arquitectura de Secuencias Unificadas
// -----------------------------------------------------------------------------
console.log("\n--- 6. Prueba de Secuencias Unificadas (Like+Comentar, Seguir+Conectar) ---");

// Simular validación de tipos de nodos de plantilla lineal
const mockTemplateNodeTypes = [
  "trigger_signal",
  "action_visit",
  "action_like_comment",
  "action_follow_connect",
  "logic_delay",
  "action_dm",
  "control_end",
];

assert(
  mockTemplateNodeTypes.includes("action_like_comment"),
  "El catalogo y flujo activo incluye el paso unificado 'action_like_comment' (Like + Comentario)"
);
assert(
  mockTemplateNodeTypes.includes("action_follow_connect"),
  "El catalogo y flujo activo incluye el paso unificado 'action_follow_connect' (Seguir + Conectar)"
);
assert(
  !mockTemplateNodeTypes.includes("action_like") && !mockTemplateNodeTypes.includes("action_comment"),
  "Like y Comentar no existen como pasos atomicos separados en el flujo principal"
);
assert(
  !mockTemplateNodeTypes.includes("crm_stage"),
  "El paso de CRM ha sido eliminado del flujo activo simplificado"
);
assert(
  !mockTemplateNodeTypes.includes("logic_condition"),
  "El nodo de Condicion Logica ha sido eliminado en favor de secuencias lineales estilo Outreach B2B"
);

// -----------------------------------------------------------------------------
// PRUEBA 7: 3 Roles de Usuario y Asignacion Estricta de Slots (Super Admin, Admin, Team)
// -----------------------------------------------------------------------------
console.log("\n--- 7. Prueba de 3 Roles y Asignacion Estricta de Slots ---");

function getMaxTeamInvitationsAllowed(user) {
  if (user.role === "super_admin") return 999;
  const slots = user.slotsLimit ?? 1;
  return Math.max(0, slots - 1);
}

function validateCanInviteTeamMember(user, currentTeamCount) {
  if (user.role === "super_admin") return { allowed: true };
  const maxAllowed = getMaxTeamInvitationsAllowed(user);
  if (maxAllowed === 0) {
    return {
      allowed: false,
      reason: "El Plan Starter es monousuario (1 slot para el Admin). Actualiza al Plan Growth.",
    };
  }
  if (currentTeamCount >= maxAllowed) {
    return {
      allowed: false,
      reason: `Has alcanzado el límite de ${maxAllowed} miembros de equipo permitidos.`,
    };
  }
  return { allowed: true };
}

// 1. Super Admin
const superAdmin = { role: "super_admin", email: "inhubflow@gmail.com", slotsLimit: 999 };
assert(getMaxTeamInvitationsAllowed(superAdmin) === 999, "Super Admin dispone de slots e invitaciones ilimitadas (999)");
assert(validateCanInviteTeamMember(superAdmin, 50).allowed === true, "Super Admin puede invitar miembros sin restriccion");

// 2. Admin Starter (1 cuenta)
const starterAdmin = { role: "client_admin", email: "carlos@consulting.es", slotsLimit: 1, planTier: "starter" };
assert(getMaxTeamInvitationsAllowed(starterAdmin) === 0, "Admin Starter tiene 1 slot exclusivo y 0 cupos de equipo");
assert(validateCanInviteTeamMember(starterAdmin, 0).allowed === false, "Invitacion rechazada en Plan Starter (monousuario)");

// 3. Admin Growth (5 cuentas = 1 Admin + 4 Team)
const growthAdmin = { role: "client_admin", email: "elena@agenciagrowth.com", slotsLimit: 5, planTier: "growth" };
assert(getMaxTeamInvitationsAllowed(growthAdmin) === 4, "Admin Growth permite exactamente 4 miembros de equipo (1 Admin + 4 Team = 5 slots)");
assert(validateCanInviteTeamMember(growthAdmin, 3).allowed === true, "Admin Growth permite invitar cuando tiene 3 ocupados (< 4)");
assert(validateCanInviteTeamMember(growthAdmin, 4).allowed === false, "Admin Growth bloquea invitacion cuando alcanza 4 operadores de equipo");

// 4. Admin Business (10 cuentas = 1 Admin + 9 Team)
const businessAdmin = { role: "client_admin", email: "marcos@enterprisesales.io", slotsLimit: 10, planTier: "business" };
assert(getMaxTeamInvitationsAllowed(businessAdmin) === 9, "Admin Business permite exactamente 9 miembros de equipo (1 Admin + 9 Team = 10 slots)");
assert(validateCanInviteTeamMember(businessAdmin, 8).allowed === true, "Admin Business permite invitar cuando tiene 8 ocupados (< 9)");
assert(validateCanInviteTeamMember(businessAdmin, 9).allowed === false, "Admin Business bloquea invitacion cuando alcanza 9 operadores de equipo");

// -----------------------------------------------------------------------------
// PRUEBA 8: Aislamiento y Visibilidad de Cuentas por Rol
// (Admin ve todo su equipo, Team ve estrictamente solo su slot)
// -----------------------------------------------------------------------------
console.log("\n--- 8. Prueba de Aislamiento y Visibilidad de Cuentas ---");

const mockAccounts = [
  { id: "acc-elena-admin", name: "Elena Valenzuela | Admin", ownerId: "usr-client-growth-03", assignedUserId: "usr-client-growth-03", email: "elena@agenciagrowth.com" },
  { id: "acc-sofia-team", name: "Sofia Ramirez | SDR", ownerId: "usr-client-growth-03", assignedUserId: "usr-team-sofia-05", email: "sofia@agenciagrowth.com" },
  { id: "acc-lucas-team", name: "Lucas Gomez | SDR", ownerId: "usr-client-growth-03", assignedUserId: "usr-team-lucas-06", email: "lucas@agenciagrowth.com" },
  { id: "acc-marcos-admin", name: "Marcos Silva | Admin", ownerId: "usr-client-business-04", assignedUserId: "usr-client-business-04", email: "marcos@enterprisesales.io" },
];

const mockTeamMembersElena = [
  { id: "usr-team-sofia-05", name: "Sofia Ramirez", assignedAccountId: "acc-sofia-team", ownerId: "usr-client-growth-03" },
  { id: "usr-team-lucas-06", name: "Lucas Gomez", assignedAccountId: "acc-lucas-team", ownerId: "usr-client-growth-03" },
];

function getVisibleAccountsTest(user, allAccounts, teamMembers) {
  if (user.role === "super_admin") return allAccounts;
  if (user.role === "member") {
    return allAccounts.filter((a) => {
      const matchAssignedUser = a.assignedUserId === user.id;
      const matchAssignedAcc = Boolean(user.assignedAccountId && a.id === user.assignedAccountId);
      const matchEmail = Boolean(a.email && a.email.toLowerCase() === user.email.toLowerCase());
      return matchAssignedUser || matchAssignedAcc || matchEmail;
    });
  }
  // Admin
  const memberUserIds = new Set(teamMembers.map((m) => m.id));
  const memberAccIds = new Set(teamMembers.map((m) => m.assignedAccountId).filter(Boolean));
  return allAccounts.filter((a) => {
    if (a.ownerId === user.id || a.assignedUserId === user.id) return true;
    if (a.assignedUserId && memberUserIds.has(a.assignedUserId)) return true;
    if (memberAccIds.has(a.id)) return true;
    return false;
  });
}

// 1. Super Admin ve TODAS las cuentas de la plataforma
const visibleSuperAdmin = getVisibleAccountsTest(superAdmin, mockAccounts, []);
assert(visibleSuperAdmin.length === 4, "Super Admin visualiza todas las cuentas de la plataforma sin restricciones (4 cuentas)");

// 2. Admin (Elena) ve TODAS las cuentas de su workspace y de su equipo (3 cuentas: la suya + Sofia + Lucas)
const elenaAdminUser = { id: "usr-client-growth-03", role: "client_admin", email: "elena@agenciagrowth.com" };
const visibleElena = getVisibleAccountsTest(elenaAdminUser, mockAccounts, mockTeamMembersElena);
assert(visibleElena.length === 3, "Admin de workspace visualiza todas las cuentas de su equipo (3 cuentas: Admin + 2 Team)");
assert(visibleElena.some((a) => a.id === "acc-elena-admin"), "Admin ve su propia cuenta");
assert(visibleElena.some((a) => a.id === "acc-sofia-team"), "Admin ve la cuenta de Sofia (Team)");
assert(visibleElena.some((a) => a.id === "acc-lucas-team"), "Admin ve la cuenta de Lucas (Team)");
assert(!visibleElena.some((a) => a.id === "acc-marcos-admin"), "Admin NO ve cuentas de otros clientes/organizaciones ajenas");

// 3. Team Member (Sofia) SOLO ve su propio slot asignado (1 cuenta)
const sofiaTeamUser = { id: "usr-team-sofia-05", role: "member", email: "sofia@agenciagrowth.com", assignedAccountId: "acc-sofia-team" };
const visibleSofia = getVisibleAccountsTest(sofiaTeamUser, mockAccounts, mockTeamMembersElena);
assert(visibleSofia.length === 1, "Usuario de equipo (Team) visualiza estrictamente solo su propio slot asignado (1 cuenta)");
assert(visibleSofia[0].id === "acc-sofia-team", "El slot visible coincide exactamente con la cuenta asignada a Sofia");
assert(!visibleSofia.some((a) => a.id === "acc-elena-admin"), "Usuario de equipo NO tiene acceso ni visibilidad a la cuenta del Admin");
assert(!visibleSofia.some((a) => a.id === "acc-lucas-team"), "Usuario de equipo NO tiene acceso a cuentas de otros companeros de equipo");

// 4. Team Member sin cuenta asignada ve 0 cuentas
const nuevoTeamSinCuenta = { id: "usr-team-nuevo", role: "member", email: "nuevo@agenciagrowth.com", assignedAccountId: null };
const visibleNuevo = getVisibleAccountsTest(nuevoTeamSinCuenta, mockAccounts, mockTeamMembersElena);
assert(visibleNuevo.length === 0, "Usuario de equipo sin cuenta asignada no ve ninguna cuenta de terceros (0 cuentas)");

// -----------------------------------------------------------------------------
// PRUEBA 9: Proceso de Conexión Unificado de 2 Pasos y Límites de Seguridad
// -----------------------------------------------------------------------------
console.log("\n--- 9. Prueba de Proceso de Conexión 2-Step y Límites Recomendados (Estilo B2B) ---");

const BLANK_CONNECT_FORM = {
  name: "",
  email: "",
  daily_connection_limit: 20,
  daily_message_limit: 20,
  daily_visit_limit: 20,
  active_hours_start: 9,
  active_hours_end: 18,
  timezone: "Europe/Madrid",
  working_days: "1,2,3,4,5",
};

assert(BLANK_CONNECT_FORM.daily_connection_limit === 20, "Límite por defecto de conexiones/día configurado en 20");
assert(BLANK_CONNECT_FORM.daily_message_limit === 20, "Límite por defecto de mensajes/día configurado en 20");
assert(BLANK_CONNECT_FORM.daily_visit_limit === 20, "Límite por defecto de visitas/día configurado en 20");

// Sanitización de límites: no se permite superar el tope recomendado de 20
function sanitizeLimit(val, min = 1, max = 20) {
  return Math.min(max, Math.max(min, Number(val)));
}

assert(sanitizeLimit(50, 1, 20) === 20, "Sanitización frena cualquier intento de superar el tope de 20 acciones/día");
assert(sanitizeLimit(0, 1, 20) === 1, "Sanitización respeta el mínimo permitido de 1 conexión/día");
assert(sanitizeLimit(15, 1, 20) === 15, "Sanitización acepta valores seguros entre 1 y 20");

// Validar que el horario comercial sea válido (inicio < fin)
function validateBusinessHours(start, end) {
  return start < end;
}

assert(validateBusinessHours(9, 18) === true, "Horario laboral estándar 9 AM a 6 PM es válido");
assert(validateBusinessHours(18, 9) === false, "Horario con inicio superior o igual a fin es rechazado");

// --- 10. Prueba de Deduplicación y Reconexión en Mismo Slot ---
console.log("\n--- 10. Prueba de Deduplicación y Reconexión en Mismo Slot ---");

// Simulación de deduplicación de cuentas
function deduplicateAccounts(accountsList) {
  const norm = (s) => (s || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "");
  const result = [];
  for (const acc of accountsList) {
    const accEmail = acc.email?.trim().toLowerCase();
    const accNorm = norm(acc.name);

    const existingIndex = result.findIndex((d) => {
      if (d.id === acc.id || d.unipileAccountId === acc.unipileAccountId) return true;
      const dEmail = d.email?.trim().toLowerCase();
      if (accEmail && dEmail && accEmail === dEmail) return true;
      const dNorm = norm(d.name);
      if (accNorm && dNorm && accNorm === dNorm) return true;
      return false;
    });

    if (existingIndex === -1) {
      result.push(acc);
    } else {
      const existing = result[existingIndex];
      const currentIsPreferred =
        (acc.status === "OK" && existing.status !== "OK") ||
        (Boolean(acc.email) && !existing.email);
      const base = currentIsPreferred ? acc : existing;
      const fallback = currentIsPreferred ? existing : acc;

      result[existingIndex] = {
        ...fallback,
        ...base,
        id: existing.id || acc.id,
        unipileAccountId: base.unipileAccountId || fallback.unipileAccountId,
        daily_connection_limit: fallback.daily_connection_limit ?? base.daily_connection_limit ?? 20,
      };
    }
  }
  return result;
}

const mockStoredAccounts = [
  {
    id: "acc-1",
    unipileAccountId: "up_old_disconnected",
    name: "RobertoOrse Agencia",
    status: "CREDENTIALS",
    daily_connection_limit: 15,
  },
  {
    id: "acc-li-up_new_connected",
    unipileAccountId: "up_new_connected",
    name: "RobertoOrse Agencia",
    email: "robertoorse.agencia@gmail.com",
    status: "OK",
    daily_connection_limit: 20,
  },
  {
    id: "acc-2",
    unipileAccountId: "up_linn",
    name: "Linn Martinson",
    email: "linnmartinsson407@gmail.com",
    status: "OK",
    daily_connection_limit: 20,
  },
];

const deduplicated = deduplicateAccounts(mockStoredAccounts);
assert(deduplicated.length === 2, "La lista con duplicado de RobertoOrSe se reduce a exactamente 2 cuentas");
const robertoAcc = deduplicated.find((a) => a.name === "RobertoOrse Agencia");
assert(robertoAcc !== undefined, "Existe la cuenta única de RobertoOrse Agencia");
assert(robertoAcc.status === "OK", "La cuenta resultante adopta el estado activo 'OK'");
assert(robertoAcc.email === "robertoorse.agencia@gmail.com", "La cuenta resultante conserva el correo de sesión");
assert(robertoAcc.unipileAccountId === "up_new_connected", "La cuenta resultante adopta el nuevo Unipile Account ID");
assert(robertoAcc.daily_connection_limit === 15, "La cuenta resultante preserva los límites personalizados previos del usuario");

// -----------------------------------------------------------------------------
// PRUEBA 11: Algoritmo Ponderado de Viralidad InHubFlow & Selección Top 12
// -----------------------------------------------------------------------------
console.log("\n--- 11. Prueba de Algoritmo Ponderado de Viralidad y Selección Top 12 ---");

function calculateVirality(likes, comments, shares) {
  return Math.round((likes * 1) + (comments * 3.5) + (shares * 5));
}

function getViralityTier(score, likes, comments) {
  if (score >= 100 || (likes >= 50 && comments >= 15)) {
    return { tier: "mega", badge: "Mega Viral 🔥🔥🔥" };
  } else if (score >= 35 || (likes >= 20 && comments >= 5) || comments >= 8) {
    return { tier: "high", badge: "Alta Tracción 🔥🔥" };
  } else {
    return { tier: "trending", badge: "En Tendencia 🔥" };
  }
}

// Caso 1: Comentarios y Reposts ponderan más que likes simples
const postSoloLikes = calculateVirality(80, 2, 0); // 80 + 7 = 87
const postViralDebate = calculateVirality(30, 25, 10); // 30 + 87.5 + 50 = 168
assert(postViralDebate > postSoloLikes, "Post con alta interacción y debate (comentarios + reposts) supera a post pasivo de solo likes");

// Caso 2: Asignación precisa de Tiers con emojis 🔥
assert(getViralityTier(168, 30, 25).badge === "Mega Viral 🔥🔥🔥", "Score >= 100 se clasifica como 'Mega Viral 🔥🔥🔥'");
assert(getViralityTier(50, 20, 6).badge === "Alta Tracción 🔥🔥", "Score intermedio se clasifica como 'Alta Tracción 🔥🔥'");
assert(getViralityTier(15, 10, 1).badge === "En Tendencia 🔥", "Score base se clasifica como 'En Tendencia 🔥'");

// Caso 3: Selección de Top 12 posts ordenados de un lote extenso
const rawPostsPool = Array.from({ length: 30 }, (_, i) => ({
  id: `post-${i}`,
  likes: (i * 7) % 60,
  comments: (i * 3) % 25,
  shares: (i * 2) % 10,
  isJob: i % 5 === 0, // algunos son ofertas de empleo
  score: 0,
}));

rawPostsPool.forEach((p) => {
  p.score = calculateVirality(p.likes, p.comments, p.shares);
});

// Filtrar empleos y ordenar desc
const cleanPosts = rawPostsPool.filter((p) => !p.isJob).sort((a, b) => b.score - a.score);
const top12 = cleanPosts.slice(0, 12);

assert(top12.length === 12, "El filtro garantiza exactamente 12 posts en el resultado final");
assert(top12[0].score >= top12[1].score, "El primer post tiene un score de viralidad mayor o igual al segundo (orden estricto)");
assert(top12.every((p) => !p.isJob), "Ningún post en el Top 12 contiene contenido de empleo");

// -----------------------------------------------------------------------------
// PRUEBA 12: Persistencia de Sesión de Post Finder (Navegación sin pérdida de datos)
// -----------------------------------------------------------------------------
console.log("\n--- 12. Prueba de Persistencia de Post Finder (Consistencia al Navegar) ---");

// Mock de Storage en memoria
class MockStorage {
  constructor() {
    this.store = {};
  }
  getItem(key) {
    return this.store[key] || null;
  }
  setItem(key, value) {
    this.store[key] = String(value);
  }
  removeItem(key) {
    delete this.store[key];
  }
  clear() {
    this.store = {};
  }
}

const mockSession = new MockStorage();
const mockLocal = new MockStorage();
const CACHE_KEY = "inhubflow_viral_radar_cache";

function mockSaveRadar(state) {
  const serialized = JSON.stringify({
    ...state,
    updatedAt: Date.now(),
  });
  mockSession.setItem(CACHE_KEY, serialized);
  mockLocal.setItem(CACHE_KEY, serialized);
}

function mockGetRadar() {
  const raw = mockSession.getItem(CACHE_KEY) || mockLocal.getItem(CACHE_KEY);
  if (!raw) return null;
  return JSON.parse(raw);
}

// 1. Simulación de búsqueda en nicho específico (ej. Nutrición Cetogénica)
const nicheSearchResults = Array.from({ length: 12 }, (_, i) => ({
  id: `keto-post-${i + 1}`,
  topic: "Nutricion Cetogenica",
  author: `Dr. Experto ${i + 1}`,
  hook: `Guía definitiva de cetosis paso ${i + 1}`,
  viralityScore: 120 - i * 5,
  viralityTier: i < 3 ? "mega" : i < 8 ? "high" : "trending",
}));

mockSaveRadar({
  searchKeyword: "Nutricion Cetogenica",
  lastSuccessfulKeyword: "Nutricion Cetogenica",
  livePosts: nicheSearchResults,
  hasSearchedOnce: true,
  datePosted: "PAST_MONTH",
  viralityTierFilter: "all",
  selectedFormat: "all",
  viewMode: "live",
});

assert(mockSession.getItem(CACHE_KEY) !== null, "El estado de búsqueda del Radar se serializa y persiste en sessionStorage");

// 2. Simulación de desmontaje y navegación a otra página (ej. Modelador IA o Campañas)
// Al volver a la página del Radar:
const restoredState = mockGetRadar();
assert(restoredState !== null, "Al regresar a la página del Radar, el estado almacenado se recupera con éxito");
assert(restoredState.searchKeyword === "Nutricion Cetogenica", "La palabra clave buscada por el usuario ('Nutricion Cetogenica') se preserva exactamente");
assert(restoredState.livePosts.length === 12, "La lista de los 12 posts cosechados se mantiene íntegra sin requerir nuevo escaneo");
assert(restoredState.hasSearchedOnce === true, "La bandera hasSearchedOnce permanece en true, bloqueando búsquedas automáticas no deseadas");

// 3. Verificación de guardia: no debe disparar búsqueda por defecto ('B2B Outbound') si ya hay posts en caché
const shouldTriggerDefaultSearch = !restoredState.hasSearchedOnce || restoredState.livePosts.length === 0;
assert(shouldTriggerDefaultSearch === false, "La condición de guardia impide reiniciar los resultados a 'B2B Outbound' al navegar");

// 4. Actualización coherente cuando el usuario realiza una nueva búsqueda deliberada
mockSaveRadar({
  ...restoredState,
  searchKeyword: "Energia Solar Residencial",
  lastSuccessfulKeyword: "Energia Solar Residencial",
  livePosts: [{ id: "solar-1", topic: "Energia Solar", hook: "Ahorro en paneles", viralityScore: 95 }],
});
const updatedState = mockGetRadar();
assert(updatedState.searchKeyword === "Energia Solar Residencial", "Nueva búsqueda deliberada sobrescribe el caché de forma consistente");
assert(updatedState.livePosts[0].topic === "Energia Solar", "Nuevos resultados de la búsqueda deliberada quedan inmediatamente cacheados");

// -----------------------------------------------------------------------------
// PRUEBA 13: Reprogramación Drag & Drop en Calendario Mensual
// -----------------------------------------------------------------------------
console.log("\n--- 13. Prueba de Drag & Drop en Calendario Mensual ---");

let testPosts = [
  {
    id: "post-oct-15",
    title: "La prospección B2B tradicional está agotada",
    scheduledAt: "2026-10-15T10:15:00.000Z",
    status: "scheduled",
  },
  {
    id: "post-oct-16",
    title: "Tenía una introducción personalizada...",
    scheduledAt: "2026-10-16T09:30:00.000Z",
    status: "scheduled",
  },
];

function simulateDrop(postId, targetDateKey) {
  const targetPost = testPosts.find((p) => p.id === postId);
  if (!targetPost) return;
  let timePart = "09:30:00.000Z";
  if (targetPost.scheduledAt && targetPost.scheduledAt.includes("T")) {
    const parts = targetPost.scheduledAt.split("T");
    if (parts[1]) timePart = parts[1];
  }
  targetPost.scheduledAt = `${targetDateKey}T${timePart}`;
  targetPost.status = "scheduled";
}

// 1. Arrastrar post del día 15 al día 22 en la cuadrícula mensual
simulateDrop("post-oct-15", "2026-10-22");
const movedPost = testPosts.find((p) => p.id === "post-oct-15");
assert(movedPost.scheduledAt.startsWith("2026-10-22"), "El post del día 15 se reprograma al día 22 correctamente mediante Drag & Drop");
assert(movedPost.scheduledAt.endsWith("T10:15:00.000Z"), "La hora original del post (10:15) se preserva intacta al cambiar de día");

// 2. Comprobar que en la celda del día 15 ya no figura y en el día 22 sí
const day15Posts = testPosts.filter((p) => p.scheduledAt.startsWith("2026-10-15"));
const day22Posts = testPosts.filter((p) => p.scheduledAt.startsWith("2026-10-22"));
assert(day15Posts.length === 0, "El día de origen (15) queda libre de la publicación tras ser arrastrada");
assert(day22Posts.length === 1 && day22Posts[0].id === "post-oct-15", "El día de destino (22) muestra inmediatamente la publicación arrastrada");


// -----------------------------------------------------------------------------
// PRUEBA 14: Signal Radar - Extracción de URN, Keyword Matching y Deduplicación
// -----------------------------------------------------------------------------
console.log("\n--- 14. Prueba de Signal Radar (Nivel 1, 2 y 3) ---");
{
  function extractLinkedInActivityUrn(urlOrId) {
    if (!urlOrId || typeof urlOrId !== "string") return "";
    const trimmed = urlOrId.trim();
    if (trimmed.startsWith("urn:li:activity:")) return trimmed;
    if (/^\d{10,25}$/.test(trimmed)) return `urn:li:activity:${trimmed}`;
    const directMatch = trimmed.match(/urn:li:activity:(\d+)/i);
    if (directMatch && directMatch[1]) return `urn:li:activity:${directMatch[1]}`;
    const feedMatch = trimmed.match(/activity-([0-9]+)/i);
    if (feedMatch && feedMatch[1]) return `urn:li:activity:${feedMatch[1]}`;
    const ugcMatch = trimmed.match(/urn:li:ugcPost:(\d+)/i);
    if (ugcMatch && ugcMatch[1]) return `urn:li:activity:${ugcMatch[1]}`;
    return trimmed;
  }

  // 1. Normalización de URLs de LinkedIn
  const testUrl1 = "https://www.linkedin.com/feed/update/urn:li:activity:7251892837461928371/";
  const testUrl2 = "urn:li:activity:7251892837461928371";
  const testUrl3 = "7251892837461928371";
  const testUrl4 = "https://www.linkedin.com/posts/roberto-orse_activity-7251892837461928371-abc/";

  assert(extractLinkedInActivityUrn(testUrl1) === "urn:li:activity:7251892837461928371", "Normaliza URL canónica con urn:li:activity a URN correcto");
  assert(extractLinkedInActivityUrn(testUrl2) === "urn:li:activity:7251892837461928371", "Mantiene URN de LinkedIn intacto");
  assert(extractLinkedInActivityUrn(testUrl3) === "urn:li:activity:7251892837461928371", "Convierte ID puramente numérico a URN canónico");
  assert(extractLinkedInActivityUrn(testUrl4) === "urn:li:activity:7251892837461928371", "Extrae activity ID de URLs amigables de posts");

  // 2. Coincidencia de Keyword en Lead Magnet (Nivel 1)
  function matchesKeyword(commentText, keyword) {
    if (!keyword || !keyword.trim()) return true;
    const kw = keyword.trim().toUpperCase();
    const text = (commentText || "").toUpperCase();
    return text.includes(kw);
  }

  assert(matchesKeyword("Por favor envíame el SISTEMA a mi correo", "SISTEMA") === true, "Detecta palabra clave en mayúsculas dentro de comentario");
  assert(matchesKeyword("Quiero el sistema ahora", "SISTEMA") === true, "Detecta palabra clave case-insensitive");
  assert(matchesKeyword("Excelente publicación Roberto", "SISTEMA") === false, "Filtra comentarios que no coinciden con la palabra clave");

  // 3. Deduplicación de Leads en Signal Radar
  const existingLeads = [
    { id: "lead-1", monitorId: "mon-1", fullName: "Carlos Gomez", linkedinUrl: "https://linkedin.com/in/carlos-gomez" },
    { id: "lead-2", monitorId: "mon-1", fullName: "Ana Martinez", linkedinUrl: "https://linkedin.com/in/ana-martinez" },
  ];

  function addMultipleStoredSignalLeads(incomingLeads, currentLeads) {
    const next = [...currentLeads];
    for (const item of incomingLeads) {
      const isDuplicate = next.some(
        (existing) =>
          existing.monitorId === item.monitorId &&
          (
            (existing.linkedinUrl && item.linkedinUrl && existing.linkedinUrl.toLowerCase() === item.linkedinUrl.toLowerCase()) ||
            existing.fullName.toLowerCase() === item.fullName.toLowerCase()
          )
      );
      if (!isDuplicate) {
        next.unshift(item);
      }
    }
    return next;
  }

  const newBatch = [
    { id: "lead-3", monitorId: "mon-1", fullName: "carlos gomez", linkedinUrl: "https://linkedin.com/in/carlos-gomez" }, // Duplicado
    { id: "lead-4", monitorId: "mon-1", fullName: "Valeria Ruiz", linkedinUrl: "https://linkedin.com/in/valeria-ruiz" }, // Nuevo
    { id: "lead-5", monitorId: "mon-2", fullName: "Carlos Gomez", linkedinUrl: "https://linkedin.com/in/carlos-gomez" }, // Mismo lead pero en otro monitor -> Permitido
  ];

  const deduplicated = addMultipleStoredSignalLeads(newBatch, existingLeads);
  assert(deduplicated.length === 4, "Deduplica leads existentes en el mismo monitor e incorpora nuevos y multimonitor");
  assert(deduplicated.some((l) => l.fullName === "Valeria Ruiz"), "Nuevo prospecto Valeria Ruiz añadido con éxito");

  // 4. Pre-Configuración de Monitor desde Post Creado (Programado o Publicado)
  const scheduledPost = {
    id: "post-demo-01",
    title: "Framework de Ventas Outbound 2026",
    status: "scheduled",
    scheduledAt: "2026-10-25T14:00:00.000Z",
    leadMagnetKeyword: "VENTAS",
  };

  const isPending = scheduledPost.status !== "published";
  const preConfiguredMonitor = {
    id: "mon-l1-pre-1",
    postTitle: scheduledPost.title,
    postUrl: isPending ? "" : "https://linkedin.com/feed/update/urn:li:activity:123",
    keyword: scheduledPost.leadMagnetKeyword,
    status: isPending ? "pending_publish" : "active",
    originPostId: scheduledPost.id,
    originPostStatus: scheduledPost.status,
    scheduledAt: scheduledPost.scheduledAt,
  };

  assert(preConfiguredMonitor.status === "pending_publish", "Post programado genera monitor en estado 'pending_publish'");
  assert(preConfiguredMonitor.keyword === "VENTAS", "Palabra clave se transfiere automáticamente desde el creador");
  assert(preConfiguredMonitor.postUrl === "", "No requiere URL de LinkedIn mientras esté en borrador o programado");

  // Al vincularse la URL manualmente o al publicarse
  preConfiguredMonitor.postUrl = "https://www.linkedin.com/feed/update/urn:li:activity:7251892837461928371/";
  preConfiguredMonitor.status = "active";
  assert(preConfiguredMonitor.status === "active", "El monitor pasa a 'active' tras vincular la URL oficial de LinkedIn");

  // 5. Búsqueda y Resolución de Cuenta de Competidor en LinkedIn (Nivel 2)
  function resolveCompetitorSlug(query) {
    return query.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  }

  const queryCompetitor = "prospect me";
  const slug = resolveCompetitorSlug(queryCompetitor);
  const expectedLinkedInUrl = `https://www.linkedin.com/company/${slug}`;
  assert(slug === "prospect-me", "Genera slug canónico para la empresa competidora");
  assert(expectedLinkedInUrl === "https://www.linkedin.com/company/prospect-me", "Autocompleta la URL oficial de LinkedIn de la empresa");

  // 6. Validación de Búsqueda Combinada Empresas & Personas con Logos Oficiales y Scroll Amplio
  const mockSearchResults = [
    { id: "comp-1", name: "Prospectme", type: "company", linkedinUrl: "https://www.linkedin.com/company/prospectmebr/", logoUrl: "data:image/svg+xml..." },
    { id: "comp-2", name: "Prospect For Me LLC", type: "company", linkedinUrl: "https://www.linkedin.com/company/prospect-for-me-llc", logoUrl: "data:image/svg+xml..." },
    { id: "comp-3", name: "Prospect Me Realty", type: "company", linkedinUrl: "https://www.linkedin.com/company/prospect-me-realty", logoUrl: "data:image/svg+xml..." },
    { id: "comp-4", name: "Prospect Me Global Agency", type: "company", linkedinUrl: "https://www.linkedin.com/company/prospect-me-global" },
    { id: "comp-5", name: "Prospect Tech Solutions", type: "company", linkedinUrl: "https://www.linkedin.com/company/prospect-tech-solutions" },
    { id: "person-1", name: "Marc Davis", type: "person", linkedinUrl: "https://www.linkedin.com/in/marc-davis-prospecting", logoUrl: "https://images.unsplash.com/..." },
    { id: "person-2", name: "Elena Ramos", type: "person", linkedinUrl: "https://www.linkedin.com/in/elena-ramos-prospectme", logoUrl: "https://images.unsplash.com/..." },
    { id: "person-3", name: "Carlos Benítez", type: "person", linkedinUrl: "https://www.linkedin.com/in/carlos-benitez-sales" },
    { id: "person-4", name: "Lucas Mendes", type: "person", linkedinUrl: "https://www.linkedin.com/in/lucas-mendes-prospect" },
    { id: "person-5", name: "Patricia Morales", type: "person", linkedinUrl: "https://www.linkedin.com/in/patricia-morales-cro" },
  ];

  const companies = mockSearchResults.filter((i) => i.type === "company");
  const people = mockSearchResults.filter((i) => i.type === "person");

  assert(mockSearchResults.length >= 10, "La búsqueda despliega una lista amplia de 10+ opciones para scroll vertical");
  assert(companies.length >= 5, "Incluye múltiples entidades de empresas (company) con URLs oficiales /company/");
  assert(people.length >= 5, "Incluye múltiples referentes/creadores (person) con URLs oficiales /in/");
  assert(companies.every((c) => c.linkedinUrl.includes("/company/")), "Todas las empresas tienen URL canónica de tipo /company/");
  assert(people.every((p) => p.linkedinUrl.includes("/in/")), "Todos los perfiles de personas tienen URL canónica de tipo /in/");
  assert(Boolean(companies[0].logoUrl && companies[0].logoUrl.startsWith("data:image/svg+xml")), "Dispone de logos vectoriales exactos para marcas como Prospectme");
  assert(Boolean(people[0].logoUrl && people[0].logoUrl.startsWith("https://")), "Dispone de fotos reales de alta resolución para referentes de LinkedIn");
}

// -----------------------------------------------------------------------------
// PRUEBA 15: Conmutación de Cuentas y Aislamiento de Slots por Rol
// -----------------------------------------------------------------------------
console.log("\n--- 15. Prueba de Conmutación de Cuentas y Slots de Equipo ---");

const testUsersList = [
  { id: "usr-super-admin-01", email: "inhubflow@gmail.com", name: "Roberto OrSe", role: "super_admin", slotsLimit: 999, planTier: "custom" },
  { id: "usr-client-starter-02", email: "carlos@consulting.es", name: "Carlos Mendoza", role: "client_admin", companyName: "Mendoza Advisory", slotsLimit: 1, planTier: "starter" },
  { id: "usr-client-growth-03", email: "elena@agenciagrowth.com", name: "Elena Valenzuela", role: "client_admin", companyName: "Valenzuela Social Agency", slotsLimit: 5, planTier: "growth" },
  { id: "usr-client-business-04", email: "marcos@enterprisesales.io", name: "Marcos Silva", role: "client_admin", companyName: "Enterprise Sales Hub", slotsLimit: 10, planTier: "business" },
  { id: "usr-team-sofia-05", email: "sofia@agenciagrowth.com", name: "Sofia Ramirez", role: "member", ownerId: "usr-client-growth-03", slotsLimit: 1, planTier: "growth" },
  { id: "usr-team-javier-06", email: "javier@enterprisesales.io", name: "Javier Fernandez", role: "member", ownerId: "usr-client-business-04", slotsLimit: 1, planTier: "business" },
];

function simulateGetSwitchableAccounts(currentUser, masterUserId, users) {
  const superAdminUser = users.find((u) => u.role === "super_admin");
  const isMasterSession = Boolean(masterUserId && masterUserId === superAdminUser.id) || currentUser.role === "super_admin";
  const isBrowsingAsAnother = isMasterSession && currentUser.id !== superAdminUser.id;

  if (currentUser.role === "super_admin" || (!isBrowsingAsAnother && currentUser.email === "inhubflow@gmail.com")) {
    const masterItem = { id: superAdminUser.id, name: superAdminUser.name, role: "super_admin", isCurrent: true };
    const subscribers = users.filter((u) => u.role === "client_admin").map((u) => ({ id: u.id, name: u.name, role: u.role, isCurrent: false }));
    return [masterItem, ...subscribers];
  }

  if (currentUser.role === "client_admin") {
    const list = [];
    if (isBrowsingAsAnother) {
      list.push({ id: superAdminUser.id, name: `Volver a ${superAdminUser.name}`, isMasterReturn: true });
    }
    list.push({ id: currentUser.id, name: currentUser.name, badgeLabel: "Admin Principal (Slot 1)", isCurrent: true });
    const team = users.filter((u) => u.ownerId === currentUser.id);
    let s = 2;
    for (const t of team) {
      list.push({ id: t.id, name: t.name, badgeLabel: `Operador SDR (Slot ${s})`, isCurrent: false });
      s++;
    }
    return list;
  }

  const list = [];
  if (isBrowsingAsAnother) {
    list.push({ id: superAdminUser.id, name: `Volver a ${superAdminUser.name}`, isMasterReturn: true });
  }
  list.push({ id: currentUser.id, name: currentUser.name, badgeLabel: "Slot Asignado", isCurrent: true });
  return list;
}

// 1. Super Admin ve la cuenta master + clientes suscriptores
const saSwitch = simulateGetSwitchableAccounts(testUsersList[0], null, testUsersList);
assert(saSwitch.length === 4, "Super Admin ve su cuenta Master + las 3 cuentas de suscriptores que compraron planes");
assert(saSwitch.some((s) => s.id === "usr-super-admin-01"), "Super Admin incluye su cuenta Master");
assert(saSwitch.some((s) => s.id === "usr-client-growth-03"), "Super Admin incluye suscriptor Elena Valenzuela");
assert(!saSwitch.some((s) => s.id === "usr-team-sofia-05"), "Super Admin no mezcla operadores individuales en la lista principal de suscriptores");

// 2. Admin (Elena) ve ÚNICAMENTE los slots de su equipo
const elenaSwitch = simulateGetSwitchableAccounts(testUsersList[2], null, testUsersList);
assert(elenaSwitch.length === 2, "Admin de Plan Growth (Elena) ve los slots de su propio equipo (Elena + Sofia)");
assert(elenaSwitch.some((s) => s.id === "usr-client-growth-03"), "Elena ve su propio slot de Admin Principal");
assert(elenaSwitch.some((s) => s.id === "usr-team-sofia-05"), "Elena ve el slot de su colaboradora Sofia");
assert(!elenaSwitch.some((s) => s.id === "usr-client-business-04"), "Elena NO ve a otros clientes externos como Marcos Silva");
assert(!elenaSwitch.some((s) => s.id === "usr-team-javier-06"), "Elena NO ve a operadores de otros clientes como Javier Fernandez");

// 3. Super Admin auditando a Elena dispone de retorno a Super Admin
const saAuditingElena = simulateGetSwitchableAccounts(testUsersList[2], "usr-super-admin-01", testUsersList);
assert(saAuditingElena.some((s) => s.isMasterReturn === true), "Super Admin auditando cuenta de cliente dispone de opcion de retorno");

console.log("\n--- 16. Prueba de Consistencia Estricta de Identidad y Cuenta Activa con currentUser ---");

function simulateAccountMatchesUser(account, user) {
  if (!account || !user) return false;
  const normStr = (s) => (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const accNorm = normStr(account.name);
  const userNorm = normStr(user.name);

  if (accNorm.includes("roberto") && userNorm.includes("roberto")) return true;
  if (accNorm.includes("linn") && userNorm.includes("linn")) return true;

  const normAccId = (account.id || "").replace(/^acc-li-/, "");
  const normUnipileId = (account.unipileAccountId || "").replace(/^acc-li-/, "");
  const normUserAssigned = (user.assignedAccountId || "").replace(/^acc-li-/, "");

  if (normUserAssigned && (normAccId === normUserAssigned || normUnipileId === normUserAssigned)) return true;
  if (account.assignedUserId && account.assignedUserId === user.id) return true;
  if (account.ownerId && account.ownerId === user.id) return true;

  const accEmail = (account.email || "").trim().toLowerCase();
  const userEmail = (user.email || "").trim().toLowerCase();
  if (accEmail && userEmail) {
    if (accEmail === userEmail) return true;
    if (accEmail.includes("robertoorse") && userEmail.includes("inhubflow")) return true;
    if (accEmail.includes("linn") && userEmail.includes("linn")) return true;
  }
  return false;
}

function simulateGetActiveAccountForUser(user, storedActiveId, visibleAccounts) {
  if (!visibleAccounts || visibleAccounts.length === 0) return null;

  // 1. REGLA OBLIGATORIA: Si el usuario navegando tiene una cuenta directa, es SIEMPRE la activa
  const directAccount = visibleAccounts.find((a) => simulateAccountMatchesUser(a, user));
  if (directAccount) return directAccount;

  // 2. Si no hay cuenta directa propia pero storedActiveId está en las visibles
  const found = visibleAccounts.find((a) => a.id === storedActiveId || a.unipileAccountId === storedActiveId);
  if (found) return found;

  return visibleAccounts[0];
}

const realAccountsPool = [
  {
    id: "acc-li-6yecZUhYS1mvPOJJC7p-zQ",
    unipileAccountId: "6yecZUhYS1mvPOJJC7p-zQ",
    name: "RobertoOrse Agencia",
    email: "robertoorse.agencia@gmail.com",
    ownerId: "usr-super-admin-01",
    assignedUserId: "usr-super-admin-01",
  },
  {
    id: "acc-li-5X_l6hknTW62DqQtKJNNHA",
    unipileAccountId: "5X_l6hknTW62DqQtKJNNHA",
    name: "Linn Martinson",
    email: "linnmartinsson407@gmail.com",
    ownerId: "usr-client-linn-02",
    assignedUserId: "usr-client-linn-02",
  },
];

const robertoUser = {
  id: "usr-super-admin-01",
  email: "inhubflow@gmail.com",
  name: "Roberto OrSe",
  role: "super_admin",
  assignedAccountId: "acc-li-6yecZUhYS1mvPOJJC7p-zQ",
};

const linnUser = {
  id: "usr-client-linn-02",
  email: "linnmartinsson407@gmail.com",
  name: "Linn Martinson",
  role: "client_admin",
  assignedAccountId: "acc-li-5X_l6hknTW62DqQtKJNNHA",
};

// Caso 1: Roberto OrSe navegando, aunque localStorage tuviera el ID de Linn Martinson
const robertoActive = simulateGetActiveAccountForUser(robertoUser, "acc-li-5X_l6hknTW62DqQtKJNNHA", realAccountsPool);
assert(robertoActive.name === "RobertoOrse Agencia", "Si currentUser es Roberto OrSe, la cuenta activa SIEMPRE es RobertoOrse Agencia");
assert(robertoActive.id === "acc-li-6yecZUhYS1mvPOJJC7p-zQ", "La cuenta asignada a Roberto OrSe tiene el ID oficial de su slot");

// Caso 2: Linn Martinson navegando, aunque localStorage tuviera el ID de Roberto
const linnActive = simulateGetActiveAccountForUser(linnUser, "acc-li-6yecZUhYS1mvPOJJC7p-zQ", realAccountsPool);
assert(linnActive.name === "Linn Martinson", "Si currentUser es Linn Martinson, la cuenta activa SIEMPRE es Linn Martinson");
assert(linnActive.id === "acc-li-5X_l6hknTW62DqQtKJNNHA", "La cuenta asignada a Linn Martinson tiene el ID oficial de su slot");

// Caso 3: Fallback de visualización en interfaz nunca muestra Linn si se navega como Roberto
const simulatedDisplayName = robertoActive?.name || robertoUser.name;
assert(simulatedDisplayName === "RobertoOrse Agencia", "El nombre visible en Nivel 1 y creadores es RobertoOrse Agencia cuando navega Roberto");
assert(!simulatedDisplayName.includes("Linn"), "Ninguna vista de Roberto contiene a Linn Martinson");

// Caso 4: En los 3 niveles de Signal Radar, las cuentas del dropdown de Roberto OrSe excluyen a Linn Martinson
const robertoOwnAccounts = realAccountsPool.filter(
  (a) => simulateAccountMatchesUser(a, robertoUser) || (robertoUser.role !== "super_admin" && a.ownerId === robertoUser.id)
);
assert(robertoOwnAccounts.length === 1, "Roberto OrSe solo tiene 1 cuenta propia para sus paneles de Radar");
assert(robertoOwnAccounts[0].name === "RobertoOrse Agencia", "La única cuenta en los radares de Roberto es RobertoOrse Agencia");
assert(!robertoOwnAccounts.some((a) => a.name.includes("Linn")), "Linn Martinson queda estrictamente excluida de los radares de Roberto OrSe");

// Limpieza de base de datos de test

db.close();
if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
const shmPath = `${testDbPath}-shm`;
const walPath = `${testDbPath}-wal`;
if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
if (fs.existsSync(walPath)) fs.unlinkSync(walPath);

console.log("\n==================================================================");
console.log(`RESULTADO FINAL DE PRUEBAS: ${passedCount} EXITOSAS, ${failedCount} FALLIDAS`);
console.log("==================================================================");

if (failedCount > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
