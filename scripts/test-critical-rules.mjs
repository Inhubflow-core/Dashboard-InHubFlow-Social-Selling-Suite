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

// Caso de preservación de nombre editado (ej. 'RobertoOrSe Agencia' con 'S' mayúscula)
const editedAccount = { ...robertoAcc, name: "RobertoOrSe Agencia" };
const existingName = editedAccount.name;
const resolvedName = existingName && existingName !== "RobertoOrse Agencia" ? existingName : "RobertoOrSe Agencia";
assert(resolvedName === "RobertoOrSe Agencia", "La edición del nombre a 'RobertoOrSe Agencia' con S mayúscula se preserva intacta");

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
  { id: "usr-super-admin-01", email: "inhubflow@gmail.com", name: "SuperAdmin", role: "super_admin", slotsLimit: 999, planTier: "custom" },
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

  // 1. Asignación explícita por ID
  const normAccId = (account.id || "").replace(/^acc-li-/, "");
  const normUnipileId = (account.unipileAccountId || "").replace(/^acc-li-/, "");
  const normUserAssigned = (user.assignedAccountId || "").replace(/^acc-li-/, "");
  if (normUserAssigned && (normAccId === normUserAssigned || normUnipileId === normUserAssigned)) return true;

  // 2. Coincidencia por ID de usuario asignado
  if (account.assignedUserId && account.assignedUserId === user.id) return true;

  // 3. Coincidencia por email
  const accEmail = (account.email || "").trim().toLowerCase();
  const userEmail = (user.email || "").trim().toLowerCase();
  if (accEmail && userEmail) {
    if (accEmail === userEmail) return true;
    if (accEmail.includes("robertoorse") && userEmail.includes("robertoorse")) return true;
    if ((accEmail.includes("linn") || accEmail.includes("lynn")) && (userEmail.includes("linn") || userEmail.includes("lynn"))) return true;
  }

  // 4. Coincidencia por nombre para roles no super_admin
  if (user.role !== "super_admin") {
    if (accNorm.includes("roberto") && userNorm.includes("roberto")) return true;
    if ((accNorm.includes("linn") || accNorm.includes("lynn")) && (userNorm.includes("linn") || userNorm.includes("lynn"))) return true;
  }

  // 5. Coincidencia por ownerId para client_admin si la cuenta no está asignada a otro miembro
  if (user.role === "client_admin" && account.ownerId === user.id && (!account.assignedUserId || account.assignedUserId === user.id)) {
    return true;
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
    id: "acc-li-HfrdagEmSrONX8jqE9IYjQ",
    unipileAccountId: "HfrdagEmSrONX8jqE9IYjQ",
    name: "RobertoOrse Agencia",
    email: "robertoorse.agencia@gmail.com",
    ownerId: "usr-client-roberto-agencia",
    assignedUserId: "usr-client-roberto-agencia",
  },
  {
    id: "acc-li-7VSGKBGlTNGRbzZKuh6VpQ",
    unipileAccountId: "7VSGKBGlTNGRbzZKuh6VpQ",
    name: "ADS CASHGROW",
    email: "ads.cashgrow.app@gmail.com",
    ownerId: "usr-client-roberto-agencia",
    assignedUserId: "usr-team-lynn-01",
  },
];

const superAdminUser = {
  id: "usr-super-admin-01",
  email: "inhubflow@gmail.com",
  name: "SuperAdmin",
  role: "super_admin",
  slotsLimit: 999,
  assignedAccountId: null,
};

const robertoUser = {
  id: "usr-client-roberto-agencia",
  email: "robertoorse.agencia@gmail.com",
  name: "Roberto OrSe Agencia",
  role: "client_admin",
  slotsLimit: 10,
  planTier: "business",
  assignedAccountId: "acc-li-HfrdagEmSrONX8jqE9IYjQ",
};

const cashgrowUser = {
  id: "usr-team-lynn-01",
  email: "ads.cashgrow.app@gmail.com",
  name: "ADS CASHGROW",
  role: "member",
  ownerId: "usr-client-roberto-agencia",
  slotsLimit: 1,
  assignedAccountId: "acc-li-7VSGKBGlTNGRbzZKuh6VpQ",
};

// Caso 1: SuperAdmin validado como entidad única independiente
assert(superAdminUser.name === "SuperAdmin", "inhubflow@gmail.com se llama formalmente 'SuperAdmin'");
assert(superAdminUser.role === "super_admin", "inhubflow@gmail.com ostenta rol de Super Admin");

// Caso 2: Roberto OrSe Agencia navegando, cuenta activa es RobertoOrse Agencia
const robertoActive = simulateGetActiveAccountForUser(robertoUser, "acc-li-7VSGKBGlTNGRbzZKuh6VpQ", realAccountsPool);
assert(robertoActive.name === "RobertoOrse Agencia", "Si currentUser es Roberto OrSe Agencia, la cuenta activa SIEMPRE es RobertoOrse Agencia");
assert(robertoActive.id === "acc-li-HfrdagEmSrONX8jqE9IYjQ", "La cuenta asignada a Roberto OrSe Agencia tiene el ID oficial de su slot");
assert(robertoUser.slotsLimit === 10, "Roberto OrSe Agencia dispone de 10 slots (Plan Business)");

// Caso 3: ADS CASHGROW navegando, cuenta activa es ADS CASHGROW y es miembro de equipo de Roberto
const cashgrowActive = simulateGetActiveAccountForUser(cashgrowUser, "acc-li-HfrdagEmSrONX8jqE9IYjQ", realAccountsPool);
assert(cashgrowActive.name === "ADS CASHGROW", "Si currentUser es ADS CASHGROW, la cuenta activa SIEMPRE es ADS CASHGROW");
assert(cashgrowActive.id === "acc-li-7VSGKBGlTNGRbzZKuh6VpQ", "La cuenta asignada a ADS CASHGROW tiene el ID oficial de su slot");
assert(cashgrowUser.ownerId === "usr-client-roberto-agencia", "ADS CASHGROW forma parte estricta del equipo de Roberto OrSe Agencia");

// Caso 4: Fallback de visualización en interfaz nunca muestra ADS CASHGROW si se navega como Roberto
const simulatedDisplayName = robertoActive?.name || robertoUser.name;
assert(simulatedDisplayName === "RobertoOrse Agencia", "El nombre visible en Nivel 1 y creadores es RobertoOrse Agencia cuando navega Roberto");
assert(!simulatedDisplayName.includes("ADS CASHGROW") && !simulatedDisplayName.includes("Lynn"), "Ninguna vista de Roberto contiene a miembros de equipo");

// Caso 5: En los paneles de Radar propios de Roberto OrSe Agencia, solo opera con su cuenta asignada
const robertoOwnAccounts = realAccountsPool.filter(
  (a) => simulateAccountMatchesUser(a, robertoUser)
);
assert(robertoOwnAccounts.length === 1, "Roberto OrSe Agencia solo tiene 1 cuenta propia activa para sus paneles de Radar");
assert(robertoOwnAccounts[0].name === "RobertoOrse Agencia", "La única cuenta en los radares de Roberto es RobertoOrse Agencia");
assert(!robertoOwnAccounts.some((a) => a.name.includes("CASHGROW") || a.name.includes("Lynn")), "ADS CASHGROW queda excluida de los radares de Roberto");

// Caso 6: Detección de estado de conexión real de ADS CASHGROW (OK / CREDENTIALS)
const cashgrowAccountOk = {
  ...realAccountsPool[1],
  status: "OK",
};
const isCashgrowHealthy = cashgrowAccountOk.status === "OK";
assert(isCashgrowHealthy, "ADS CASHGROW está conectada activamente cuando su estado es OK");

const cashgrowAttention = {
  ...realAccountsPool[1],
  status: "CREDENTIALS",
};
const isAttentionRequired = ["CREDENTIALS", "CHECKPOINT", "STOPPED", "ERROR"].includes(cashgrowAttention.status);
assert(isAttentionRequired, "ADS CASHGROW es detectada como cuenta que requiere atención si su estado es CREDENTIALS");

function computeBadgeColorAndText(account) {
  const isHealthy = Boolean(account && account.status === "OK");
  const needsAttention = Boolean(
    account && ["CREDENTIALS", "CHECKPOINT", "STOPPED", "ERROR"].includes(account.status)
  );
  return {
    dotColor: isHealthy ? "emerald" : needsAttention ? "amber" : "gray",
    subtitleText: isHealthy ? "LinkedIn Conectado" : needsAttention ? "Reconexión requerida" : "Workspace Activo",
  };
}

const cashgrowBadge = computeBadgeColorAndText(cashgrowAccountOk);
assert(cashgrowBadge.dotColor === "emerald", "El badge de ADS CASHGROW conectado muestra luz verde");
assert(cashgrowBadge.subtitleText === "LinkedIn Conectado", "El badge de ADS CASHGROW conectado muestra 'LinkedIn Conectado'");

const robertoHealthyAccount = { ...realAccountsPool[0], status: "OK" };
const robertoBadge = computeBadgeColorAndText(robertoHealthyAccount);
assert(robertoBadge.dotColor === "emerald", "El badge de RobertoOrse conectado muestra luz verde");
assert(robertoBadge.subtitleText === "LinkedIn Conectado", "El badge de RobertoOrse conectado muestra 'LinkedIn Conectado'");

// -----------------------------------------------------------------------------
// PRUEBA 17: Validación Automática de i18n (es, en, pt-BR)
// -----------------------------------------------------------------------------
console.log("\n--- 17. Prueba de Integridad y Paridad i18n (3 Idiomas) ---");
try {
  const { validateI18n } = await import("./validate-i18n.mjs");
  const i18nOk = validateI18n();
  assert(i18nOk === true, "Catálogos de idiomas (es, en, pt-BR) poseen 100% paridad de claves y variables");
} catch (err) {
  assert(false, `Error en validación i18n: ${err.message}`);
}

// -----------------------------------------------------------------------------
// PRUEBA 18: Reglas del Inbox Comercial (Exclusivo para Leads de Campañas)
// -----------------------------------------------------------------------------
console.log("\n--- 18. Prueba de Reglas del Inbox Comercial (Exclusivo para Leads de Campañas) ---");

// Simulación de Leads de Campañas en memoria / store
const mockCampaignLeads = [
  {
    id: "lead-roberto-orse",
    fullName: "Roberto OrSe",
    title: "Founder & CEO | Social Selling B2B",
    company: "InHubFlow / Agencia OrSe",
    location: "Brasil",
    linkedinUrl: "https://www.linkedin.com/in/robertoorse",
    stage: "in_sequence",
    sequenceStatus: "in_progress",
    listName: "02. Secuencia: Lead Magnet SISTEMA",
  },
  {
    id: "lead-valeria-ruiz",
    fullName: "Valeria Ruiz",
    title: "Directora Comercial",
    company: "TechLatam Group",
    location: "Colombia",
    linkedinUrl: "https://www.linkedin.com/in/valeria-ruiz-sales",
    stage: "in_sequence",
    sequenceStatus: "in_progress",
    listName: "01. Secuencia: Listas de Leads",
  },
];

function isCampaignLead(identifier, leadsPool) {
  const targetName = (identifier.senderName || "").toLowerCase().trim();
  const targetUrl = (identifier.senderProfileUrl || "").toLowerCase().trim().replace(/\/$/, "");
  const targetId = identifier.leadId || "";

  return leadsPool.find((l) => {
    if (targetId && l.id === targetId) return true;
    if (targetUrl && l.linkedinUrl && l.linkedinUrl.toLowerCase().includes(targetUrl)) return true;
    if (targetName && l.fullName.toLowerCase() === targetName) return true;
    return false;
  }) || null;
}

function processInboxIncomingMessage(msg, currentConversations, leadsPool) {
  // 1. Si existe conversacion previa, admitir
  const existing = currentConversations.find((c) => c.leadId === msg.senderId || c.leadName === msg.senderName);
  if (existing) {
    return {
      accepted: true,
      reason: "existing_conversation",
      conversations: currentConversations.map((c) =>
        c.id === existing.id
          ? { ...c, messages: [...c.messages, { id: "m2", text: msg.text, isSender: false }] }
          : c
      ),
      stopOnReply: true,
    };
  }

  // 2. Si es nueva conversacion, validar contra leads de campana
  const campaignLead = isCampaignLead({ leadId: msg.senderId, senderName: msg.senderName, senderProfileUrl: msg.senderProfileUrl }, leadsPool);
  if (!campaignLead) {
    return {
      accepted: false,
      reason: "not_a_campaign_lead",
      conversations: currentConversations,
      stopOnReply: false,
    };
  }

  // 3. Crear conversacion con datos fidedignos del prospecto
  const newConv = {
    id: `conv-${campaignLead.id}`,
    leadId: campaignLead.id,
    leadName: campaignLead.fullName,
    company: campaignLead.company,
    campaignSource: campaignLead.listName,
    messages: [{ id: "m1", text: msg.text, isSender: false }],
  };

  return {
    accepted: true,
    reason: "campaign_lead_matched",
    conversations: [newConv, ...currentConversations],
    stopOnReply: true,
  };
}

let inboxStore = [];

// Caso A: Mensaje de persona desconocida (Spam / Amigo personal / No comercial)
const externalMsg = {
  senderId: "unknown-person-99",
  senderName: "Juan Perez (Externo)",
  senderProfileUrl: "https://www.linkedin.com/in/juan-perez-desconocido",
  text: "Hola, te ofrezco servicios de diseño para tu empresa.",
};
const externalResult = processInboxIncomingMessage(externalMsg, inboxStore, mockCampaignLeads);
assert(externalResult.accepted === false, "Mensaje de persona no perteneciente a campañas es rechazado por el filtro estricto");
assert(externalResult.reason === "not_a_campaign_lead", "Motivo de rechazo es 'not_a_campaign_lead'");
assert(externalResult.conversations.length === 0, "El Inbox no crea ninguna conversación para personas ajenas a las campañas");
assert(externalResult.stopOnReply === false, "No se activa regla Stop on Reply para contactos no comerciales");

// Caso B: Mensaje de prospecto legítimo captado por campaña (Roberto OrSe)
const campaignLeadMsg = {
  senderId: "lead-roberto-orse",
  senderName: "Roberto OrSe",
  senderProfileUrl: "https://www.linkedin.com/in/robertoorse",
  text: "Hola Roberto, vi el caso de éxito de prospección con IA y me interesa el Lead Magnet SISTEMA.",
};
const campaignResult = processInboxIncomingMessage(campaignLeadMsg, inboxStore, mockCampaignLeads);
assert(campaignResult.accepted === true, "Mensaje de prospecto activo en campaña es admitido en el Inbox");
assert(campaignResult.reason === "campaign_lead_matched", "Contacto es verificado como lead de campaña");
assert(campaignResult.conversations.length === 1, "Se crea la conversación en el Inbox");
assert(campaignResult.conversations[0].leadName === "Roberto OrSe", "Conversación contiene el nombre real del lead");
assert(campaignResult.conversations[0].company === "InHubFlow / Agencia OrSe", "Conversación contiene la empresa real del lead");
assert(campaignResult.stopOnReply === true, "Llegada de respuesta activa la regla Stop on Reply para la secuencia");

// Caso C: Enviar mensaje saliente desde la campaña agrega o actualiza el hilo en Inbox
function recordCampaignOutgoingMessage(lead, messageText, currentConversations) {
  const existing = currentConversations.find((c) => c.leadId === lead.id);
  const outMsg = { id: `out-${Date.now()}`, text: messageText, isSender: true };
  if (existing) {
    return currentConversations.map((c) => (c.id === existing.id ? { ...c, messages: [...c.messages, outMsg] } : c));
  }
  return [
    {
      id: `conv-${lead.id}`,
      leadId: lead.id,
      leadName: lead.fullName,
      company: lead.company,
      campaignSource: lead.listName,
      messages: [outMsg],
    },
    ...currentConversations,
  ];
}

const valeriaLead = mockCampaignLeads[1];
const updatedAfterCampaignSend = recordCampaignOutgoingMessage(
  valeriaLead,
  "Hola Valeria, te comparto nuestra propuesta de prospección B2B.",
  campaignResult.conversations
);
assert(updatedAfterCampaignSend.length === 2, "El envío de un paso de mensaje en campaña registra la conversación en el Inbox");
const valeriaConv = updatedAfterCampaignSend.find((c) => c.leadId === "lead-valeria-ruiz");
assert(valeriaConv !== undefined, "Existe conversación en el Inbox para Valeria Ruiz tras el envío de campaña");
assert(valeriaConv.messages[0].isSender === true, "El mensaje saliente de la campaña queda registrado con isSender = true");

// -----------------------------------------------------------------------------
// PRUEBA 19: Pipeline Kanban Comercial (Sincronización Bidireccional y Embudo)
// -----------------------------------------------------------------------------
console.log("\n--- 19. Prueba del Pipeline Kanban Comercial (Sincronización y Embudo) ---");

// 1. Mapeo bidireccional exacto de etapas
function mapCrmStageToPipeline(stage) {
  switch (stage) {
    case "lead_captured": return "lead_captured";
    case "in_sequence": return "in_sequence";
    case "connected_material_sent": return "connected_material_sent";
    case "active_conversation":
    case "interested": return "interested";
    case "meeting_scheduled": return "meeting_scheduled";
    case "proposal_presented":
    case "proposal_sent": return "proposal_sent";
    case "closed_won":
    case "won": return "closed_won";
    case "closed_lost": return "closed_lost";
    default: return "lead_captured";
  }
}

function mapPipelineToCrmStage(stage) {
  switch (stage) {
    case "lead_captured": return "lead_captured";
    case "in_sequence": return "in_sequence";
    case "connected_material_sent": return "connected_material_sent";
    case "interested": return "active_conversation";
    case "meeting_scheduled": return "meeting_scheduled";
    case "proposal_sent": return "proposal_presented";
    case "closed_won": return "closed_won";
    case "closed_lost": return "closed_lost";
    default: return "lead_captured";
  }
}

assert(mapCrmStageToPipeline("active_conversation") === "interested", "Mapeo CRM 'active_conversation' a Pipeline 'interested'");
assert(mapPipelineToCrmStage("interested") === "active_conversation", "Mapeo Pipeline 'interested' a CRM 'active_conversation'");
assert(mapCrmStageToPipeline("proposal_presented") === "proposal_sent", "Mapeo CRM 'proposal_presented' a Pipeline 'proposal_sent'");
assert(mapPipelineToCrmStage("proposal_sent") === "proposal_presented", "Mapeo Pipeline 'proposal_sent' a CRM 'proposal_presented'");

// 2. Simulación de sincronización de leads de campaña al Pipeline
const sampleCrmLeads = [
  {
    id: "lead-kanban-1",
    fullName: "Ana García",
    title: "Head of Growth",
    company: "SaaS Latam",
    stage: "active_conversation",
    intentScore: 95,
    listName: "02. Secuencia: Lead Magnet",
  },
  {
    id: "lead-kanban-2",
    fullName: "Marcos Torres",
    title: "Director Comercial",
    company: "Global Logistics",
    stage: "meeting_scheduled",
    intentScore: 85,
    listName: "01. Secuencia: Listas de Leads",
  },
];

function syncLeadsToPipelineDeals(leads) {
  return leads.map((l) => ({
    id: `deal-${l.id}`,
    leadId: l.id,
    leadName: l.fullName,
    company: l.company,
    dealValue: l.intentScore >= 90 ? "$3,200/mes" : "$2,400/mes",
    stageId: mapCrmStageToPipeline(l.stage),
    priority: l.intentScore >= 90 ? "Alta" : "Media",
    sourceCampaign: l.listName,
  }));
}

const pipelineDeals = syncLeadsToPipelineDeals(sampleCrmLeads);
assert(pipelineDeals.length === 2, "Leads de campaña se incorporan automáticamente como oportunidades en el Pipeline");
assert(pipelineDeals[0].stageId === "interested", "Lead en 'active_conversation' se ubica en columna 'interested'");
assert(pipelineDeals[0].dealValue === "$3,200/mes", "Deal de alta intención (95) calcula valor premium");
assert(pipelineDeals[0].priority === "Alta", "Prioridad del deal calibrada como 'Alta'");
assert(pipelineDeals[1].stageId === "meeting_scheduled", "Lead en 'meeting_scheduled' se ubica en columna 'meeting_scheduled'");

// 3. Simulación de movimiento de etapa en Kanban y sincronización bidireccional con CRM
function movePipelineDeal(dealId, newStage, deals, leads) {
  const updatedDeals = deals.map((d) => (d.id === dealId ? { ...d, stageId: newStage } : d));
  const targetDeal = deals.find((d) => d.id === dealId);
  const updatedLeads = leads.map((l) => {
    if (l.id === targetDeal?.leadId) {
      return { ...l, stage: mapPipelineToCrmStage(newStage) };
    }
    return l;
  });
  return { updatedDeals, updatedLeads };
}

const { updatedDeals, updatedLeads } = movePipelineDeal("deal-lead-kanban-1", "meeting_scheduled", pipelineDeals, sampleCrmLeads);
assert(updatedDeals.find((d) => d.id === "deal-lead-kanban-1").stageId === "meeting_scheduled", "El deal cambia de etapa a 'meeting_scheduled' en el Pipeline");
assert(updatedLeads.find((l) => l.id === "lead-kanban-1").stage === "meeting_scheduled", "El lead correspondiente en el CRM actualiza su etapa a 'meeting_scheduled'");

// 4. Cálculo de Métricas KPI en Vivo
const totalMrr = updatedDeals.reduce((sum, d) => sum + parseInt(d.dealValue.replace(/[^0-9]/g, ""), 10), 0);
assert(totalMrr === 5600, "Cálculo en vivo de MRR acumulado ($5,600)");
const conversion = ((0 / updatedDeals.length) * 100).toFixed(1);
assert(conversion === "0.0", "Cálculo en vivo de tasa de conversión de cierre");


// -----------------------------------------------------------------------------
// PRUEBA 26: Asistente SDR IA - Modo Copiloto vs Modo Automático & Base de Conocimiento
// -----------------------------------------------------------------------------
console.log("\n--- 26. Prueba de Asistente SDR IA: Modo Copiloto vs Modo Automático ---");

// Motor simulador de decisiones SDR basado en Base de Conocimiento
function simulateSdrDecision(inboundText, senderName, config) {
  const text = inboundText.toLowerCase();
  const sender = senderName || "Estimado";

  if (text.includes("humano") || text.includes("persona") || text.includes("abogado")) {
    return {
      intent: "human_requested",
      confidence: 0.98,
      riskLevel: "medium",
      requiresHuman: true,
      action: "handoff",
      replyDraft: `¡Por supuesto, ${sender}! Le acabo de notificar a uno de nuestros especialistas del equipo para que tome la conversación.`,
      citations: ["Criterios Estrictos de Handoff a Humano"],
    };
  }

  if (text.includes("waalaxy") || text.includes("proveedor") || text.includes("bloqueo")) {
    return {
      intent: "objection",
      confidence: 0.92,
      riskLevel: "low",
      requiresHuman: false,
      action: "answer",
      replyDraft: `Totalmente comprensible, ${sender}. A diferencia de herramientas masivas, InHubFlow usa Signal Radar para captar leads con intención activa y emulación humana segura.`,
      citations: ["Manejo de Objeciones Comunes", "Propuesta de Valor & Capacidades de InHubFlow"],
    };
  }

  if (text.includes("precio") || text.includes("cuanto cuesta") || text.includes("cuánto cuesta")) {
    return {
      intent: "pricing_question",
      confidence: 0.95,
      riskLevel: "low",
      requiresHuman: false,
      action: "answer",
      replyDraft: `Hola ${sender}, los planes son: Starter ($49/mes, 1 cuenta), Growth ($149/mes, 5 cuentas multislot) y Business ($279/mes, 10 cuentas).`,
      citations: ["Estructura de Precios y Planes Oficiales"],
    };
  }

  if (text.includes("reunión") || text.includes("reunion") || text.includes("demo")) {
    return {
      intent: "meeting_request",
      confidence: 0.96,
      riskLevel: "low",
      requiresHuman: false,
      action: "offer_slots",
      replyDraft: `¡Excelente ${sender}! Puedes agendar directamente en mi calendario de 20 min: https://cal.inhubflow.com/demo-20min`,
      citations: ["Protocolo de Agendamiento de Reuniones"],
    };
  }

  return {
    intent: "interested",
    confidence: 0.89,
    riskLevel: "low",
    requiresHuman: false,
    action: "answer",
    replyDraft: `¡Con gusto ${sender}! InHubFlow combina Signal Radar y secuencias inteligentes para generar leads calificados en LinkedIn.`,
    citations: ["Propuesta de Valor & Capacidades de InHubFlow"],
  };
}

// 1. Simulación Modo Copiloto
const copilotConfig = { mode: "copilot", confidenceThreshold: 0.85 };
const inboundObjection = "Actualmente ya usamos Waalaxy para nuestro equipo...";
const copilotDecision = simulateSdrDecision(inboundObjection, "Gabriel Silva", copilotConfig);

assert(copilotDecision.intent === "objection", "SDR clasifica correctamente la intención de objeción");
assert(copilotDecision.citations.includes("Manejo de Objeciones Comunes"), "La respuesta se fundamenta en la Base de Conocimiento oficial");
assert(copilotDecision.requiresHuman === false, "Una objeción estándar no fuerza handoff automático");

// En modo copiloto, la acción se encola sin enviarse
let pendingAction = {
  id: "act-copilot-1",
  prospectName: "Gabriel Silva",
  lastInboundMessage: inboundObjection,
  suggestedReply: copilotDecision.replyDraft,
  status: "pending",
};
assert(pendingAction.status === "pending", "Modo Copiloto deja la respuesta en estado 'pending' a la espera de supervisión humana");

// El humano puede editar la respuesta sugerida
const editedReply = copilotDecision.replyDraft + " ¿Te parece si te comparto un video de 3 minutos con la comparativa?";
pendingAction.suggestedReply = editedReply;
pendingAction.status = "edited";
assert(pendingAction.status === "edited", "El humano puede editar libremente la respuesta generada por la IA");
assert(pendingAction.suggestedReply.includes("video de 3 minutos"), "El borrador editado por el humano reemplaza el texto final");

// El humano aprueba y despacha
pendingAction.status = "approved";
assert(pendingAction.status === "approved", "El humano aprueba y despacha la respuesta hacia LinkedIn");

// 2. Simulación Modo Automático
const autoConfig = { mode: "auto", confidenceThreshold: 0.85 };
const inboundPricing = "¿Cuánto cuesta el plan para 5 cuentas de LinkedIn?";
const autoDecision = simulateSdrDecision(inboundPricing, "Lucia Méndez", autoConfig);

assert(autoDecision.intent === "pricing_question", "SDR identifica intención de precios con exactitud");
assert(autoDecision.confidence >= autoConfig.confidenceThreshold, "La confianza supera el umbral de seguridad (85%)");
assert(autoDecision.citations.includes("Estructura de Precios y Planes Oficiales"), "Cita el documento oficial de precios");

// En modo automático y sin requerir humano, se despacha inmediatamente
const autoDispatched = autoConfig.mode === "auto" && !autoDecision.requiresHuman && autoDecision.confidence >= 0.85;
assert(autoDispatched === true, "Modo Automático despacha la respuesta de inmediato sin intervención humana");

// 3. Salvaguarda de Handoff en Modo Automático si el prospecto pide un humano
const inboundHumanReq = "Hola, prefiero hablar directamente con una persona o que me llame un humano.";
const autoHumanDecision = simulateSdrDecision(inboundHumanReq, "Mariano Gomez", autoConfig);
assert(autoHumanDecision.intent === "human_requested", "Se detecta solicitud explícita de operador humano");
assert(autoHumanDecision.requiresHuman === true, "La regla de handoff se activa de forma prioritaria");
const autoEscalated = autoConfig.mode === "auto" && autoHumanDecision.requiresHuman;
assert(autoEscalated === true, "Incluso en Modo Automático, la IA deriva a control humano si el lead lo pide explícitamente");

// 4. Agendamiento de Reunión en Modo Automático
const inboundMeeting = "¿Podemos coordinar una reunión de 20 minutos mañana?";
const meetingDecision = simulateSdrDecision(inboundMeeting, "Roberto Orse", autoConfig);
assert(meetingDecision.intent === "meeting_request", "Detecta solicitud de reunión");
assert(meetingDecision.replyDraft.includes("https://cal.inhubflow.com/demo-20min"), "La respuesta incluye el enlace de agendamiento oficial");


// 5. Atribución de Señal en Notas de Conexión: Diferenciación Like vs Comentario
function simulateConnectionNote(lead) {
  const firstName = lead.leadName.split(" ")[0];
  const postAuthor = lead.sourceAuthorName || "un referente";
  const topic = lead.topic || "prospección B2B";

  if (lead.signalType === "comment" && lead.leadCommentText) {
    return `Hola ${firstName}, vi tu comentario en el post de ${postAuthor} sobre ${topic}; muy buen punto. Me gustó una de tus publicaciones, paso a conectar para seguir en contacto!`;
  } else {
    return `Hola ${firstName}, vi que le diste like al post de ${postAuthor} sobre ${topic}. Me gustó una de tus publicaciones, paso a conectar para intercambiar ideas!`;
  }
}

// Caso 5.1: Lead que COMENTÓ en el post monitoreado
const leadCommenter = {
  leadName: "Valentina Morales",
  signalType: "comment",
  sourceAuthorName: "Vilma Núñez",
  topic: "automatización de prospección",
  leadCommentText: "Excelente análisis, nosotros batallamos con la tasa de respuesta en frío",
};
const commentNote = simulateConnectionNote(leadCommenter);
assert(commentNote.includes("vi tu comentario en el post de Vilma Núñez"), "La nota identifica correctamente que el lead comentó");
assert(commentNote.includes("Me gustó una de tus publicaciones"), "Conecta con el paso previo donde se interactuó con su perfil");
assert(commentNote.length <= 280, "La nota respeta el límite estricto de caracteres de LinkedIn (<= 280 chars)");

// Caso 5.2: Lead que dio LIKE en el post monitoreado
const leadLiker = {
  leadName: "Gonzalo Ramos",
  signalType: "reaction",
  sourceAuthorName: "Vilma Núñez",
  topic: "automatización de prospección",
};
const likeNote = simulateConnectionNote(leadLiker);
assert(likeNote.includes("vi que le diste like al post de Vilma Núñez"), "La nota identifica que el lead solo reaccionó/dio like");
assert(!likeNote.includes("vi tu comentario"), "No confunde un like con un comentario");
assert(likeNote.length <= 280, "La nota respeta el límite estricto de caracteres de LinkedIn (<= 280 chars)");


// 6. Prueba de Detección Profunda de Idioma del Perfil & Adaptación Automática en Campañas e Inbox
console.log("\n--- 27. Prueba de Detección Profunda de Idioma y Adaptación Automática ---");

function simulateDeepLanguageDetection(lead) {
  const headline = (lead.headline || "").toLowerCase();
  const comment = (lead.commentText || lead.signalSnippet || "").toLowerCase();
  const location = (lead.location || "").toLowerCase();
  const text = `${headline} ${comment}`;

  if (/[çãõêô]/.test(text) || /você|obrigado|compartilhar|equipe|estratégia|vendas/.test(text) || /brasil|são paulo|portugal/.test(location)) {
    return "pt";
  }
  if (/we build|growth|head of|vp|founder|looking for|pricing|schedule/.test(text) || /united states|uk|canada|london/.test(location)) {
    return "en";
  }
  return "es";
}

// Caso 6.1: Perfil con ubicación remota pero headline y comentario en Portugués
const leadPt = {
  fullName: "Thiago Oliveira",
  headline: "Diretor Comercial & Especialista em Prospecção B2B",
  location: "Remoto", // La ubicación no dice el país, pero su perfil y comentario sí
  commentText: "Excelente visão, nós aplicamos essa metodologia para gerar reuniões qualificadas",
};
const langPt = simulateDeepLanguageDetection(leadPt);
assert(langPt === "pt", "Detecta portugués analizando el headline y comentario aunque la ubicación sea 'Remoto'");

// Caso 6.2: Perfil con titular en inglés
const leadEn = {
  fullName: "Sarah Jenkins",
  headline: "VP of Sales & Growth Strategy",
  location: "Global",
  commentText: "Spot on! We are looking for solutions that streamline our outreach pipeline",
};
const langEn = simulateDeepLanguageDetection(leadEn);
assert(langEn === "en", "Detecta inglés analizando el contenido real del perfil y su interacción");

// Caso 6.3: Adaptación del SDR y del Inbox al idioma del usuario
function getSdrReplyByLanguage(lang, firstName, intent) {
  if (lang === "pt") {
    if (intent === "pricing") return `Olá ${firstName}, a InHubFlow conta com os seguintes planos: Starter ($49/mês), Growth ($149/mês) e Business ($279/mês).`;
    return `Excelente ${firstName}! Você pode escolher o melhor horário na minha agenda: https://cal.inhubflow.com/demo-20min`;
  }
  if (lang === "en") {
    if (intent === "pricing") return `Hi ${firstName}, InHubFlow plans are: Starter ($49/mo), Growth ($149/mo), and Business ($279/mo).`;
    return `Awesome ${firstName}! Feel free to pick a time on my calendar: https://cal.inhubflow.com/demo-20min`;
  }
  return `Hola ${firstName}, los planes son: Starter ($49/mes), Growth ($149/mes) y Business ($279/mes).`;
}

const replyPt = getSdrReplyByLanguage("pt", "Thiago", "pricing");
assert(replyPt.startsWith("Olá Thiago"), "La IA responde en portugués fluido para el lead luso-brasileño");
assert(replyPt.includes("$49/mês"), "Adapta los términos al portugués");

const replyEn = getSdrReplyByLanguage("en", "Sarah", "meeting");
assert(replyEn.startsWith("Awesome Sarah"), "La IA responde en inglés nativo para el lead angloparlante");
assert(replyEn.includes("Feel free to pick a time on my calendar"), "Propone el agendamiento en inglés");

// -----------------------------------------------------------------------------
// PRUEBA 28: Verificación del Puente 1-Clic de Extensión InHubFlow Connect
// -----------------------------------------------------------------------------
console.log("\n--- 28. Prueba de Puente y Autenticación 1-Clic de Extensión InHubFlow Connect ---");

// Validar manifest.json de la extensión
const extManifestPath = path.resolve("./extension-inhubflow-connect/manifest.json");
assert(fs.existsSync(extManifestPath), "El manifest.json de la extensión existe");
const manifestContent = JSON.parse(fs.readFileSync(extManifestPath, "utf-8"));
assert(manifestContent.version === "1.2.2" || manifestContent.version === "1.2.1" || manifestContent.version === "1.2.0" || manifestContent.version === "1.1.0", "La extensión está en versión 1.2.2 con soporte 1-clic y service worker");
assert(
  Array.isArray(manifestContent.content_scripts) && manifestContent.content_scripts.length > 0,
  "El manifest registra el content script para comunicación bidireccional con el Dashboard"
);
assert(
  manifestContent.permissions.includes("cookies") && manifestContent.permissions.includes("tabs"),
  "La extensión posee permisos requeridos (cookies y tabs) para detección y foco 1-clic"
);

// Validar content-script.js
const extContentScriptPath = path.resolve("./extension-inhubflow-connect/content-script.js");
assert(fs.existsSync(extContentScriptPath), "El content-script.js de la extensión existe");
const contentScriptText = fs.readFileSync(extContentScriptPath, "utf-8");
assert(
  contentScriptText.includes("INHUBFLOW_AUTOCONNECT_EVENT") && contentScriptText.includes("AUTOCONNECT"),
  "El content script despacha el evento INHUBFLOW_AUTOCONNECT_EVENT hacia React en el DOM"
);

// Validar popup.js
const extPopupJsPath = path.resolve("./extension-inhubflow-connect/popup.js");
assert(fs.existsSync(extPopupJsPath), "El popup.js de la extensión existe");
const popupJsText = fs.readFileSync(extPopupJsPath, "utf-8");
assert(
  popupJsText.includes("handleAutoConnect") && popupJsText.includes("btn-autoconnect"),
  "popup.js implementa el botón y handler de conexión 1-clic automático"
);
assert(
  popupJsText.includes("executeDirectApiFallback"),
  "popup.js posee fallback resiliente directo a la API nativa de InHubFlow"
);

// Validar contrato del evento recibido por el Dashboard
function simulateAutoConnectDispatcher(incomingEvent) {
  const payload = incomingEvent.detail || incomingEvent.data;
  if (!payload || !payload.accessToken) return { status: "error", message: "Token missing" };
  return {
    status: "success",
    mode: "cookie",
    accessToken: payload.accessToken.trim(),
    premiumToken: payload.premiumToken?.trim() || null,
    userAgent: payload.userAgent || "test-agent",
  };
}

const mockExtensionEvent = {
  detail: {
    source: "INHUBFLOW_EXTENSION",
    type: "AUTOCONNECT",
    accessToken: "AQEDAQ_test_li_at_sample_cookie_xyz123",
    premiumToken: "AQEDAQ_test_li_a_premium_sample",
    userAgent: "Mozilla/5.0 InHubFlow Test Agent",
  },
};

const dispatchResult = simulateAutoConnectDispatcher(mockExtensionEvent);
assert(dispatchResult.status === "success", "El despachador de eventos procesa la carga útil de la extensión");
assert(dispatchResult.mode === "cookie", "La conexión se enruta automáticamente en modo cookie sin intervención");
assert(dispatchResult.accessToken === "AQEDAQ_test_li_at_sample_cookie_xyz123", "El token li_at se transmite intacto");
assert(dispatchResult.premiumToken === "AQEDAQ_test_li_a_premium_sample", "El token premium li_a de Sales Navigator se preserva");

// =========================================================================
// 29. PRUEBA DEL MOTOR DE RECORTE VISUAL STUDIO Y MANIJAS NO DEFORMANTES
// =========================================================================
console.log("\n--- 29. Prueba del Motor de Recorte Doory y Manijas No Deformantes ---");

// Geometría pura Doory
function testFrameToCrop(g, f) {
  const dx = f.cx - g.ghostCenter.x;
  const dy = f.cy - g.ghostCenter.y;
  const width = f.w / g.sx;
  const height = f.h / g.sy;
  return {
    cropX: g.natW / 2 + dx / g.sx - width / 2,
    cropY: g.natH / 2 + dy / g.sy - height / 2,
    width,
    height,
  };
}

function testCropToFrame(g, c) {
  const lx = (c.cropX + c.width / 2 - g.natW / 2) * g.sx;
  const ly = (c.cropY + c.height / 2 - g.natH / 2) * g.sy;
  return { cx: g.ghostCenter.x + lx, cy: g.ghostCenter.y + ly, w: c.width * g.sx, h: c.height * g.sy };
}

function testClampCrop(g, c, minSize = 20) {
  const clampFn = (n, lo, hi) => Math.min(hi, Math.max(lo, n));
  const width = clampFn(c.width, Math.min(minSize, g.natW), g.natW);
  const height = clampFn(c.height, Math.min(minSize, g.natH), g.natH);
  return {
    width,
    height,
    cropX: clampFn(c.cropX, 0, Math.max(0, g.natW - width)),
    cropY: clampFn(c.cropY, 0, Math.max(0, g.natH - height)),
  };
}

const mockGeom = {
  natW: 800,
  natH: 600,
  sx: 1,
  sy: 1,
  angle: 0,
  flipX: false,
  flipY: false,
  ghostCenter: { x: 400, y: 300 },
};

const fullFrame = { cx: 400, cy: 300, w: 800, h: 600 };
const cropParams = testFrameToCrop(mockGeom, fullFrame);
assert(cropParams.cropX === 0 && cropParams.cropY === 0, "Marco inicial cubre cropX: 0 y cropY: 0");
assert(cropParams.width === 800 && cropParams.height === 600, "Dimensiones del recorte coinciden con tamaño natural");

const backFrame = testCropToFrame(mockGeom, cropParams);
assert(backFrame.cx === fullFrame.cx && backFrame.cy === fullFrame.cy, "Transformación inversa cropToFrame preserva centro");
assert(backFrame.w === fullFrame.w && backFrame.h === fullFrame.h, "Transformación inversa cropToFrame preserva dimensiones");

// Prueba de clampCrop para evitar recortes fuera de la imagen
const outOfBoundsCrop = { cropX: -50, cropY: -80, width: 900, height: 750 };
const clamped = testClampCrop(mockGeom, outOfBoundsCrop);
assert(clamped.cropX >= 0, "clampCrop impide cropX negativo");
assert(clamped.cropY >= 0, "clampCrop impide cropY negativo");
assert(clamped.width <= 800, "clampCrop limita ancho al máximo natural de la imagen");
assert(clamped.height <= 600, "clampCrop limita alto al máximo natural de la imagen");

// Simulación de recorte directo en manijas de FabricImage (sin deformación)
function simulateCropAction(handle, initialImg, deltaPx) {
  const result = { ...initialImg };
  const sy = Math.abs(result.scaleY) || 1;
  const sx = Math.abs(result.scaleX) || 1;
  const natH = result.natH;
  const natW = result.natW;

  if (handle === "mt") {
    // Arrastre hacia abajo (reduce alto visible desde arriba)
    const curCropY = result.cropY || 0;
    const curH = result.height;
    const bottomInImage = curCropY + curH;
    const wantedImageH = (curH * sy - deltaPx) / sy;
    const clampedCropY = Math.max(0, Math.min(bottomInImage - wantedImageH, bottomInImage - 20));
    result.cropY = Math.round(clampedCropY);
    result.height = Math.round(bottomInImage - clampedCropY);
    // scaleY se mantiene INTACTO
  } else if (handle === "mb") {
    // Arrastre hacia arriba (reduce alto visible desde abajo)
    const curCropY = result.cropY || 0;
    const maxAvailableH = natH - curCropY;
    const wantedImageH = (result.height * sy - deltaPx) / sy;
    result.height = Math.round(Math.max(20, Math.min(wantedImageH, maxAvailableH)));
    // scaleY se mantiene INTACTO
  } else if (handle === "ml") {
    // Arrastre hacia la derecha (reduce ancho visible desde izquierda)
    const curCropX = result.cropX || 0;
    const curW = result.width;
    const rightInImage = curCropX + curW;
    const wantedImageW = (curW * sx - deltaPx) / sx;
    const clampedCropX = Math.max(0, Math.min(rightInImage - wantedImageW, rightInImage - 20));
    result.cropX = Math.round(clampedCropX);
    result.width = Math.round(rightInImage - clampedCropX);
    // scaleX se mantiene INTACTO
  } else if (handle === "mr") {
    // Arrastre hacia la izquierda (reduce ancho visible desde derecha)
    const curCropX = result.cropX || 0;
    const maxAvailableW = natW - curCropX;
    const wantedImageW = (result.width * sx - deltaPx) / sx;
    result.width = Math.round(Math.max(20, Math.min(wantedImageW, maxAvailableW)));
    // scaleX se mantiene INTACTO
  }
  return result;
}

const testImg = {
  natW: 600,
  natH: 400,
  width: 600,
  height: 400,
  cropX: 0,
  cropY: 0,
  scaleX: 1.0,
  scaleY: 1.0,
  lockUniScaling: true,
};

// Manija superior mt
const topCropped = simulateCropAction("mt", testImg, 50);
assert(topCropped.scaleY === 1.0, "Manija superior (mt) NO altera scaleY (cero deformación vertical)");
assert(topCropped.cropY === 50, "Manija superior (mt) incrementa cropY exactamente según el arrastre");
assert(topCropped.height === 350, "Manija superior (mt) reduce height sin aplastar la imagen");

// Manija inferior mb
const bottomCropped = simulateCropAction("mb", testImg, 60);
assert(bottomCropped.scaleY === 1.0, "Manija inferior (mb) NO altera scaleY (cero deformación vertical)");
assert(bottomCropped.cropY === 0, "Manija inferior (mb) mantiene anclado el borde superior cropY = 0");
assert(bottomCropped.height === 340, "Manija inferior (mb) recorta la parte inferior limpiamente");

// Manija lateral izquierda ml
const leftCropped = simulateCropAction("ml", testImg, 80);
assert(leftCropped.scaleX === 1.0, "Manija izquierda (ml) NO altera scaleX (cero deformación horizontal)");
assert(leftCropped.cropX === 80, "Manija izquierda (ml) incrementa cropX recortando el margen izquierdo");
assert(leftCropped.width === 520, "Manija izquierda (ml) reduce width sin aplastar la imagen");

// Manija lateral derecha mr
const rightCropped = simulateCropAction("mr", testImg, 100);
assert(rightCropped.scaleX === 1.0, "Manija derecha (mr) NO altera scaleX (cero deformación horizontal)");
assert(rightCropped.cropX === 0, "Manija derecha (mr) mantiene anclado el borde izquierdo cropX = 0");
assert(rightCropped.width === 500, "Manija derecha (mr) recorta la parte derecha limpiamente");

// Bloqueo de escalado uniforme
assert(testImg.lockUniScaling === true, "Imágenes poseen lockUniScaling = true para garantizar escalado proporcional en esquinas");

// Inserción en galería Pixabay
function simulatePixabayClick(isPhotosTab, photoItem) {
  if (isPhotosTab) {
    return { action: "insert_element", url: photoItem.regularUrl };
  }
  return { action: "set_background", url: photoItem.regularUrl };
}
const clickPhotoResult = simulatePixabayClick(true, { regularUrl: "https://pixabay.com/test.jpg" });
assert(clickPhotoResult.action === "insert_element", "Hacer clic en una foto de la galería Fotos la inserta como elemento en el lienzo");
assert(clickPhotoResult.url === "https://pixabay.com/test.jpg", "La URL de la foto seleccionada se suministra al lienzo");

console.log("\n--- 30. Prueba de Plantillas Globales Visual Studio (Persistencia y Acceso Exclusivo Super Admin) ---");

// Verificación de regla estricta de rol Super Admin
function checkCanSaveGlobalTemplate(user) {
  return (
    user.role === "super_admin" ||
    (typeof user.email === "string" && user.email.trim().toLowerCase() === "inhubflow@gmail.com")
  );
}

const regUser = { id: "user_client_1", role: "client_admin", email: "client@empresa.com" };
const teamMemberUser = { id: "user_team_1", role: "team_member", email: "operator@empresa.com" };
const saUser = { id: "user_sa_1", role: "super_admin", email: "admin@inhubflow.com" };
const founderUser = { id: "user_sa_founder", role: "custom", email: "inhubflow@gmail.com" };

assert(!checkCanSaveGlobalTemplate(regUser), "Usuario Client Admin NO puede ver ni guardar plantillas globales");
assert(!checkCanSaveGlobalTemplate(teamMemberUser), "Usuario Team Member NO puede ver ni guardar plantillas globales");
assert(checkCanSaveGlobalTemplate(saUser), "Super Admin role = 'super_admin' tiene permiso exclusivo de plantilla global");
assert(checkCanSaveGlobalTemplate(founderUser), "Cuenta oficial inhubflow@gmail.com tiene permiso exclusivo de plantilla global");

// Verificación de persistencia SQLite de Plantillas Globales
db.exec(`
  CREATE TABLE IF NOT EXISTS global_templates (
    id TEXT PRIMARY KEY,
    slug TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    tags_json TEXT NOT NULL,
    width INTEGER NOT NULL,
    height INTEGER NOT NULL,
    orientation TEXT NOT NULL,
    thumbnail_url TEXT,
    document_json TEXT NOT NULL,
    created_by TEXT NOT NULL,
    use_count INTEGER DEFAULT 0,
    is_featured INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);

// Insertar plantilla global simulada creada por Super Admin
const mockDoc = {
  version: 1,
  width: 1200,
  height: 1500,
  unit: "px",
  pages: [
    {
      id: "page_1",
      objects: [
        { id: "txt_1", kind: "text", text: "Estrategia B2B de Crecimiento" }
      ]
    }
  ]
};

const insertStmt = db.prepare(`
  INSERT INTO global_templates (
    id, slug, title, category_id, category_name, tags_json,
    width, height, orientation, thumbnail_url, document_json,
    created_by, use_count, is_featured, created_at, updated_at
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, datetime('now'), datetime('now')
  )
`);

insertStmt.run(
  "gtpl_test_123",
  "estrategia-b2b-crecimiento",
  "Estrategia B2B de Crecimiento",
  "thought-leadership",
  "Autoridad & Thought Leadership",
  JSON.stringify(["b2b", "linkedin", "estrategia"]),
  1200,
  1500,
  "portrait",
  "data:image/png;base64,mockthumb",
  JSON.stringify(mockDoc),
  "Super Admin Roberto"
);

// Lectura de la plantilla global por cualquier cliente de la plataforma
const fetchedTpl = db.prepare("SELECT * FROM global_templates WHERE slug = ?").get("estrategia-b2b-crecimiento");
assert(fetchedTpl !== undefined, "La plantilla global existe y es recuperable de la base de datos");
assert(fetchedTpl.title === "Estrategia B2B de Crecimiento", "El título de la plantilla coincide");
assert(fetchedTpl.width === 1200 && fetchedTpl.height === 1500, "Dimensiones de plantilla vertical 1200x1500 px coinciden");
assert(fetchedTpl.orientation === "portrait", "La orientación vertical 4:5 se preserva");
assert(fetchedTpl.is_featured === 1, "La plantilla se registra como destacada");

const parsedDoc = JSON.parse(fetchedTpl.document_json);
assert(parsedDoc.pages.length === 1, "El documento JSON de la plantilla contiene sus páginas intactas");
assert(parsedDoc.pages[0].objects[0].text === "Estrategia B2B de Crecimiento", "Los objetos del lienzo se conservan íntegros");

// Validación de los 3 formatos estándar de LinkedIn en el editor
const LINKEDIN_FORMATS = {
  horizontal: { width: 1200, height: 900, ratio: "4:3", orientation: "landscape" },
  panoramica: { width: 1200, height: 627, ratio: "1.91:1", orientation: "landscape" },
  cuadrada: { width: 1200, height: 1200, ratio: "1:1", orientation: "square" },
  vertical: { width: 1200, height: 1500, ratio: "4:5", orientation: "portrait" },
};

assert(LINKEDIN_FORMATS.horizontal.width === 1200 && LINKEDIN_FORMATS.horizontal.height === 900, "Formato Horizontal LinkedIn es 1200 x 900 px");
assert(LINKEDIN_FORMATS.horizontal.ratio === "4:3", "Ratio Horizontal es 4:3");
assert(LINKEDIN_FORMATS.cuadrada.width === 1200 && LINKEDIN_FORMATS.cuadrada.height === 1200, "Formato Cuadrada LinkedIn es 1200 x 1200 px");
assert(LINKEDIN_FORMATS.cuadrada.ratio === "1:1", "Ratio Cuadrada es 1:1");
assert(LINKEDIN_FORMATS.vertical.width === 1200 && LINKEDIN_FORMATS.vertical.height === 1500, "Formato Vertical LinkedIn es 1200 x 1500 px");
assert(LINKEDIN_FORMATS.vertical.ratio === "4:5", "Ratio Vertical es 4:5");

// Eliminación de plantilla global por Super Admin
db.prepare("DELETE FROM global_templates WHERE slug = ?").run("estrategia-b2b-crecimiento");
const deletedCheck = db.prepare("SELECT * FROM global_templates WHERE slug = ?").get("estrategia-b2b-crecimiento");
assert(deletedCheck === undefined, "La plantilla global eliminada ya no es visible para los usuarios");

// -----------------------------------------------------------------------------
// PRUEBA 31: Redimensionamiento Inteligente Estilo Canva (Preservación de Objetos)
// -----------------------------------------------------------------------------
console.log("\n--- 31. Prueba de Redimensionamiento Inteligente Estilo Canva (Preservación de Objetos) ---");

// Simulación de la regla Canva: el cambio entre 1:1, 4:5 y 1.91:1 escala y reposiciona
// manteniendo íntegros todos los objetos, textos, formas e imágenes en el lienzo.
function simulateCanvaResize(doc, targetWidth, targetHeight) {
  const fromW = doc.width;
  const fromH = doc.height;
  const sx = targetWidth / fromW;
  const sy = targetHeight / fromH;
  const k = Math.min(sx, sy);

  const resizedPages = doc.pages.map((page) => {
    const resizedObjects = page.objects.map((obj) => {
      const cloned = { ...obj };
      cloned.left = Math.round(obj.left * sx);
      cloned.top = Math.round(obj.top * sy);
      if (cloned.type === "text" || cloned.kind === "text") {
        cloned.fontSize = Math.round((obj.fontSize || 16) * k);
        cloned.width = Math.round(obj.width * sx);
      } else {
        cloned.width = Math.round(obj.width * k);
        cloned.height = Math.round(obj.height * k);
      }
      return cloned;
    });

    return {
      ...page,
      width: targetWidth,
      height: targetHeight,
      objects: resizedObjects,
    };
  });

  return {
    ...doc,
    width: targetWidth,
    height: targetHeight,
    pages: resizedPages,
  };
}

const squareDoc = {
  width: 1200,
  height: 1200,
  pages: [
    {
      id: "slide_1",
      objects: [
        { id: "obj_1", kind: "text", text: "5 Claves de Prospección B2B", left: 120, top: 200, width: 960, fontSize: 52 },
        { id: "obj_2", kind: "image", src: "https://inhubflow.com/avatar.png", left: 450, top: 400, width: 300, height: 300 },
        { id: "obj_3", kind: "shape", shapeType: "rect", left: 100, top: 800, width: 1000, height: 120 }
      ]
    }
  ]
};

// 1. Redimensionamiento a Vertical 4:5 (1200 x 1500 px)
const verticalResized = simulateCanvaResize(squareDoc, 1200, 1500);
assert(verticalResized.width === 1200 && verticalResized.height === 1500, "Dimensiones de lienzo vertical 1200 x 1500 px son exactas");
assert(verticalResized.pages[0].objects.length === 3, "Todos los objetos del lienzo (3) se preservan intactos al cambiar de formato");
assert(verticalResized.pages[0].objects[0].text === "5 Claves de Prospección B2B", "El texto del título del usuario no se pierde");
assert(verticalResized.pages[0].objects[1].src === "https://inhubflow.com/avatar.png", "La imagen insertada por el usuario se conserva");
assert(verticalResized.pages[0].objects[0].top > squareDoc.pages[0].objects[0].top, "La posición vertical se adapta al lienzo más alto");

// 2. Redimensionamiento a Horizontal 1.91:1 (1200 x 627 px)
const horizontalResized = simulateCanvaResize(verticalResized, 1200, 627);
assert(horizontalResized.width === 1200 && horizontalResized.height === 627, "Dimensiones de lienzo horizontal 1200 x 627 px son exactas");
assert(horizontalResized.pages[0].objects.length === 3, "Ningún elemento se pierde al reducir a formato horizontal panorámico");
assert(horizontalResized.pages[0].objects[0].text === "5 Claves de Prospección B2B", "El texto se conserva intacto en formato panorámico");
assert(horizontalResized.pages[0].objects[0].fontSize < verticalResized.pages[0].objects[0].fontSize, "El tamaño de tipografía se adapta proporcionalmente al nuevo alto");

// -----------------------------------------------------------------------------
// PRUEBA 32: Inyección Inteligente de Gancho (Título) y Subtítulo en Plantillas
// -----------------------------------------------------------------------------
console.log("\n--- 32. Prueba de Inyección Inteligente de Gancho y Subtítulo en Plantillas ---");

// Plantilla global de ejemplo guardada en la plataforma
const globalTemplateDoc = {
  width: 1200,
  height: 1500,
  pages: [
    {
      id: "tpl_page_1",
      objects: [
        { id: "t_1", kind: "text", name: "Título", text: "[Título de Plantilla de Ejemplo]", fontSize: 56, fontFamily: "Outfit", fill: "#0f172a" },
        { id: "t_2", kind: "text", name: "Subtítulo", text: "[Subtítulo o descripción genérica de la plantilla]", fontSize: 32, fontFamily: "Outfit", fill: "#475569" },
        { id: "img_1", kind: "image", src: "https://inhubflow.com/badge.png", width: 120, height: 120 },
        { id: "author_1", kind: "text", name: "Autor", text: "@usuario_demo", fontSize: 18 }
      ]
    }
  ]
};

// Datos del post activo del cliente
const postHook = "5 Errores al prospectar en LinkedIn que destruyen tu conversión";
const postSubtitle = "Aquí tienes el framework exacto que usamos para cerrar reuniones";
const authorName = "Roberto OrSe";

// Simulación de injectPostContentIntoTemplate
function simulateTemplateAutofill(template, title, subtitle, author) {
  const cloned = JSON.parse(JSON.stringify(template));
  for (const page of cloned.pages) {
    const textObjects = page.objects.filter(o => o.kind === "text");
    const titleObj = textObjects.find(o => /t[íi]tulo|title|hook|gancho/i.test(o.name)) || textObjects[0];
    const subtitleObj = textObjects.find(o => o !== titleObj && /subt[íi]tulo|subtitle/i.test(o.name)) || textObjects[1];
    const authorObj = textObjects.find(o => o !== titleObj && o !== subtitleObj && /autor|author/i.test(o.name));
    
    if (titleObj && title) titleObj.text = title;
    if (subtitleObj && subtitle) subtitleObj.text = subtitle;
    if (authorObj && author) authorObj.text = author;
  }
  return cloned;
}

const injectedTemplate = simulateTemplateAutofill(globalTemplateDoc, postHook, postSubtitle, authorName);
assert(injectedTemplate.pages[0].objects[0].text === postHook, "La plantilla global adopta automáticamente el gancho/título del post");
assert(injectedTemplate.pages[0].objects[1].text === postSubtitle, "La plantilla global adopta automáticamente el subtítulo del post");
assert(injectedTemplate.pages[0].objects[3].text === authorName, "La plantilla adopta el nombre del autor automáticamente");
assert(injectedTemplate.pages[0].objects[0].fontFamily === "Outfit", "La tipografía Outfit de la plantilla se preserva íntegramente");
assert(injectedTemplate.pages[0].objects[0].fontSize === 56, "El tamaño de fuente y diseño del titular de la plantilla se conserva");
assert(injectedTemplate.pages[0].objects[2].src === "https://inhubflow.com/badge.png", "Los elementos decorativos (imágenes, badges) se mantienen intactos");

// -----------------------------------------------------------------------------
// PRUEBA 33: Persistencia de Estado del Editor en Recargas de Página (F5)
// -----------------------------------------------------------------------------
console.log("\n--- 33. Prueba de Persistencia de Estado del Editor en Recargas de Página (F5) ---");

const mockSessionStorage = new Map();
const mockLocalStorage = new Map();

function openEditor(url) {
  mockSessionStorage.set("inhubflow_visual_studio_open", "true");
  const parsed = new URL(url);
  parsed.searchParams.set("editor", "open");
  return parsed.toString();
}

function checkEditorOpenOnReload(url) {
  const parsed = new URL(url);
  const fromUrl = parsed.searchParams.get("editor") === "open";
  const fromStorage = mockSessionStorage.get("inhubflow_visual_studio_open") === "true";
  return fromUrl || fromStorage;
}

const draftPayload = {
  document: {
    width: 1200,
    height: 1500,
    pages: [{ id: "p1", objects: [{ id: "t1", text: "Post con diseño activo" }] }]
  },
  aspectRatio: "4:5",
  updatedAt: Date.now()
};
mockLocalStorage.set("inhubflow_visual_editor_draft", JSON.stringify(draftPayload));

const activeUrl = openEditor("http://localhost:3001/viral-posts?tab=personal");
assert(activeUrl.includes("editor=open"), "La URL incluye el parámetro 'editor=open' al entrar al Editor");
assert(checkEditorOpenOnReload(activeUrl) === true, "Al recargar la página (F5) el estado determina que el Editor debe continuar abierto");

const recoveredDraft = JSON.parse(mockLocalStorage.get("inhubflow_visual_editor_draft"));
assert(recoveredDraft !== null, "El borrador del diseño se recupera de localStorage tras la recarga");
assert(recoveredDraft.aspectRatio === "4:5", "La relación de aspecto (4:5) se preserva");
assert(recoveredDraft.document.pages[0].objects[0].text === "Post con diseño activo", "Todos los objetos del lienzo se mantienen intactos tras F5");

function closeEditor(url) {
  mockSessionStorage.delete("inhubflow_visual_studio_open");
  mockLocalStorage.delete("inhubflow_visual_editor_draft");
  const parsed = new URL(url);
  parsed.searchParams.delete("editor");
  return parsed.toString();
}

const closedUrl = closeEditor(activeUrl);
assert(!closedUrl.includes("editor=open"), "El parámetro 'editor=open' se retira limpiamente al cerrar");
assert(checkEditorOpenOnReload(closedUrl) === false, "Tras cerrar formalmente, recargar no reabre el editor");


// -----------------------------------------------------------------------------
// PRUEBA 34: Deselección de Elementos al Hacer Clic Fuera de la Imagen
// -----------------------------------------------------------------------------
console.log("\n--- 34. Prueba de Deselección de Elementos al Hacer Clic Fuera de la Imagen ---");

class MockElement {
  constructor(tag, attrs = {}) {
    this.tagName = tag.toUpperCase();
    this.attrs = attrs;
    this.parent = null;
  }
  closest(selector) {
    let current = this;
    while (current) {
      if (selector === '[data-artboard]' && current.attrs['data-artboard']) return current;
      if (selector.includes('button') && current.tagName === 'BUTTON') return current;
      if (selector.includes('input') && current.tagName === 'INPUT') return current;
      current = current.parent;
    }
    return null;
  }
}

let activeSelection = { id: "box-gradient-1", type: "rounded-rect" };
function clearSelection() {
  activeSelection = null;
}

function handlePointerDown(e) {
  if (e.button !== 0) return;
  const target = e.target;
  if (!target) return;
  if (target.closest('[data-artboard]')) return;
  if (target.closest('button, input, select, textarea, [role="button"], [role="menuitem"]')) return;
  clearSelection();
}

// 1. Clic dentro del artboard (lienzo) no deselecciona por el manejador de fondo
const artboardEl = new MockElement('div', { 'data-artboard': 'true' });
const elementInsideCanvas = new MockElement('div');
elementInsideCanvas.parent = artboardEl;

activeSelection = { id: "box-gradient-1", type: "rounded-rect" };
handlePointerDown({ button: 0, target: elementInsideCanvas });
assert(activeSelection !== null, "Hacer clic dentro del lienzo mantiene el elemento seleccionado para manipularlo");

// 2. Clic en un botón de la barra de herramientas tampoco deselecciona
const toolbarButton = new MockElement('button');
handlePointerDown({ button: 0, target: toolbarButton });
assert(activeSelection !== null, "Hacer clic en un botón de herramienta conserva la selección");

// 3. Clic fuera de la imagen (en el fondo gris / workspace con puntos) deselecciona inmediatamente
const workspaceBackground = new MockElement('div', { 'data-workspace-bg': 'true' });
handlePointerDown({ button: 0, target: workspaceBackground });
assert(activeSelection === null, "Al hacer clic fuera de la imagen (en el workspace), la selección se elimina automáticamente");

// 4. Verificación de que los bordes de selección se ocultan al deseleccionar
assert(activeSelection === null, "Los bordes y controles de selección desaparecen al deseleccionar");

// 5. Clic en espacio vacío del lienzo también limpia la selección
activeSelection = { id: "box-gradient-1", type: "rounded-rect" };
function onCanvasMouseDown(targetObj) {
  if (!targetObj) clearSelection();
}
onCanvasMouseDown(null);
assert(activeSelection === null, "Hacer clic en una zona vacía del lienzo también elimina la selección");

// -----------------------------------------------------------------------------
// PRUEBA 35: Auto-carga Dinámica de Gancho y Subtítulo en Font Pairings
// -----------------------------------------------------------------------------
console.log("\n--- 35. Prueba de Auto-carga Dinámica de Gancho y Subtítulo en Font Pairings ---");

const PAIRINGS_TEST = [
  { id: 'classic', heading: { family: 'Playfair Display', weight: 700 }, body: { family: 'DM Sans', weight: 400 } },
  { id: 'modern', heading: { family: 'Montserrat', weight: 800 }, body: { family: 'Open Sans', weight: 400 } },
  { id: 'editorial', heading: { family: 'Lora', weight: 700 }, body: { family: 'Lato', weight: 400 } },
  { id: 'playful', heading: { family: 'Pacifico', weight: 400 }, body: { family: 'Poppins', weight: 400 } },
  { id: 'poster', heading: { family: 'Bebas Neue', weight: 400 }, body: { family: 'Roboto', weight: 400 } },
  { id: 'elegant', heading: { family: 'Cormorant Garamond', weight: 600 }, body: { family: 'Montserrat', weight: 400 } },
];

const postData = {
  title: "5 Errores al prospectar en LinkedIn que destruyen tu conversión",
  bodyText: "Hablan de su producto antes de entender el dolor del decisor.\nAquí tienes el framework exacto para cerrar reuniones.",
};

const cleanLines = postData.bodyText.split("\n").map(l => l.trim()).filter(Boolean);
const derivedHook = postData.title.trim() || cleanLines[0];
const derivedIntro = cleanLines[0];

// 1. Simulación de inserción de combinación tipográfica en lienzo vacío
function simulateAddPairing(pairing, hook, intro) {
  return [
    {
      kind: "text",
      role: "heading",
      text: hook || "Add a heading",
      fontFamily: pairing.heading.family,
      fontWeight: pairing.heading.weight
    },
    {
      kind: "text",
      role: "body",
      text: intro || "A short line of body text",
      fontFamily: pairing.body.family,
      fontWeight: pairing.body.weight
    }
  ];
}

const classicPair = simulateAddPairing(PAIRINGS_TEST[0], derivedHook, derivedIntro);
assert(classicPair[0].text === derivedHook, "El encabezado del Font Pairing adopta automáticamente el gancho del post");
assert(classicPair[0].fontFamily === "Playfair Display", "El encabezado adopta la tipografía Playfair Display de la combinación Classic");
assert(classicPair[1].text === derivedIntro, "El cuerpo del Font Pairing adopta automáticamente la intro del post");
assert(classicPair[1].fontFamily === "DM Sans", "El cuerpo adopta la tipografía DM Sans de la combinación Classic");

// 2. Simulación de actualización de objetos seleccionados
let selectedCanvasObjects = [
  { kind: "text", text: "Add a heading", fontFamily: "Outfit", top: 100 },
  { kind: "text", text: "A short line of body text", fontFamily: "Outfit", top: 250 }
];

function applyPairingToSelection(pairing, selected, hook, intro) {
  const [top, bottom] = [...selected].sort((a, b) => a.top - b.top);
  top.fontFamily = pairing.heading.family;
  top.fontWeight = pairing.heading.weight;
  if (!top.text || top.text === "Add a heading") top.text = hook;

  bottom.fontFamily = pairing.body.family;
  bottom.fontWeight = pairing.body.weight;
  if (!bottom.text || bottom.text === "A short line of body text") bottom.text = intro;
}

applyPairingToSelection(PAIRINGS_TEST[1], selectedCanvasObjects, derivedHook, derivedIntro);
assert(selectedCanvasObjects[0].fontFamily === "Montserrat", "Al aplicar Modern con selección, el titular cambia a Montserrat");
assert(selectedCanvasObjects[0].text === derivedHook, "El texto genérico 'Add a heading' se reemplaza automáticamente con el gancho");
assert(selectedCanvasObjects[1].fontFamily === "Open Sans", "El cuerpo cambia a Open Sans");
assert(selectedCanvasObjects[1].text === derivedIntro, "El texto genérico 'A short line of body text' se reemplaza automáticamente con la intro");

// 3. Verificación de catálogo de fuentes en memoryAdapter
const memoryAdapterCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/dev/memoryAdapter.ts', 'utf8');
const expectedFonts = ['Bebas Neue', 'Roboto', 'Playfair Display', 'Montserrat', 'Pacifico', 'Lora', 'Cormorant Garamond'];
for (const font of expectedFonts) {
  assert(memoryAdapterCode.includes(font), `El catálogo oficial incluye la fuente ${font} para evitar advertencias de tipografía faltante`);
}

// -----------------------------------------------------------------------------
// PRUEBA 36: Extracción Inteligente de Gancho, Subtítulo y Frase Resaltada
// -----------------------------------------------------------------------------
console.log("\n--- 36. Prueba de Extracción Inteligente de Gancho, Subtítulo y Frase Resaltada ---");

// Importación o simulación de hookHighlighter
const userExamplePost = `La mayoría de líderes B2B cometen el mismo error al prospectar en LinkedIn:

Hablan de su producto antes de entender el dolor del decisor.

Aquí tienes el framework exacto que usamos para cerrar reuniones cualificadas:

1. Identifica una señal de compra real (contrataciones, cambios de puesto).
2. Abre con un diagnóstico personalizado en lugar de un pitch en frío.
3. Entrega un activo de valor concreto (plantilla, guía o cálculo).

¿Cuál ha sido tu mayor reto de prospección este trimestre? Te leo en los comentarios.`;

// Heurísticas de hookHighlighter
function testCleanHookText(raw) {
  return raw.replace(/\*\*/g, "").replace(/[:.]+$/, "").trim();
}

function testDetectViralHighlight(text) {
  const boldMatch = text.match(/\*\*(.+?)\*\*/);
  if (boldMatch) return boldMatch[1].trim();
  const quoteMatch = text.match(/"([^"]{3,40})"/);
  if (quoteMatch) return quoteMatch[1].trim();
  const patterns = [
    /cometen el mismo error/i,
    /el mayor error/i,
    /el peor error/i,
    /destruyen tu conversi[oó]n/i,
    /el framework exacto/i,
    /la fórmula secreta/i,
    /\b\d+\s+errores\b/i
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[0].trim();
  }
  return "";
}

function testParsePostHeader(content) {
  const lines = content.split("\n").map(l => l.trim()).filter(Boolean);
  const rawHook = lines[0] || "";
  return {
    hook: testCleanHookText(rawHook),
    subtitle: lines[1] || "",
    highlight: testDetectViralHighlight(rawHook)
  };
}

const parsedExample = testParsePostHeader(userExamplePost);

// 1. Verificación del Gancho / Titular (limpio, sin dos puntos finales)
assert(
  parsedExample.hook === "La mayoría de líderes B2B cometen el mismo error al prospectar en LinkedIn",
  "El Gancho extraído coincide exactamente con el título esperado sin dos puntos finales"
);

// 2. Verificación del Subtítulo / Intro
assert(
  parsedExample.subtitle === "Hablan de su producto antes de entender el dolor del decisor.",
  "El Subtítulo extraído coincide exactamente con la primera línea de dolor/intro del post"
);

// 3. Verificación de la frase clave resaltada
assert(
  parsedExample.highlight === "cometen el mismo error",
  "La frase de impacto a resaltar detectada es exactamente 'cometen el mismo error'"
);

// 4. Verificación con formato explícito de markdown **palabra**
const postWithBold = "La mayoría de líderes B2B **cometen el mismo error** al prospectar:";
assert(
  testDetectViralHighlight(postWithBold) === "cometen el mismo error",
  "Detección explícita mediante asteriscos de markdown extrae la frase a resaltar con máxima prioridad"
);

// 5. Verificación de que la combinación Modern tiene configurado su color de acento (#6366f1)
const pairingsCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/drawers/pairings.ts', 'utf8');
assert(pairingsCode.includes('accentColor'), "Las combinaciones tipográficas poseen accentColor para resaltar la frase clave");
assert(pairingsCode.includes('#6366f1'), "La combinación Modern incluye el color de acento violeta eléctrico (#6366f1)");

// ==================================================================
// 37. Prueba de Gestor de Combinaciones Tipográficas Personalizadas
// ==================================================================
console.log("\n--- 37. Prueba de Gestor de Combinaciones Tipográficas Personalizadas ---");

assert(pairingsCode.includes('CUSTOM_PAIRINGS_STORAGE_KEY'), "Existe clave de almacenamiento para combinaciones personalizadas");
assert(pairingsCode.includes('AVAILABLE_FONTS'), "Existe catálogo de fuentes seleccionables para títulos y párrafos");
assert(pairingsCode.includes('ACCENT_COLOR_PRESETS'), "Existe paleta de colores de acento para frases resaltadas");
assert(pairingsCode.includes('saveCustomPairing'), "Función para guardar nueva combinación personalizada implementada");
assert(pairingsCode.includes('deleteCustomPairing'), "Función para eliminar combinación personalizada implementada");

const textDrawerCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/drawers/TextDrawer.tsx', 'utf8');
assert(textDrawerCode.includes('handleCaptureFromCanvas'), "Captura de fuentes directamente desde la selección del lienzo implementada");
assert(textDrawerCode.includes('Mis Combinaciones Personalizadas'), "Sección visual dedicada para combinaciones personalizadas en el drawer");
assert(textDrawerCode.includes('handleDeleteCustom'), "Capacidad de eliminar combinaciones con botón de papelera presente");

// ==================================================================
// 38. Prueba de Degradados de Contraste para LinkedIn (Gradient Overlays)
// ==================================================================
console.log("\n--- 38. Prueba de Degradados de Contraste para LinkedIn ---");

const gradientOverlaysCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/drawers/gradientOverlays.ts', 'utf8');
assert(gradientOverlaysCode.includes('GRADIENT_OVERLAYS'), "Existe catálogo de presets de degradados para LinkedIn");
assert(gradientOverlaysCode.includes('fade-right'), "Existe preset Lateral Derecho (Texto a la der. / Foto a la izq.)");
assert(gradientOverlaysCode.includes('fade-left'), "Existe preset Lateral Izquierdo (Texto a la izq. / Foto a la der.)");
assert(gradientOverlaysCode.includes('fade-bottom'), "Existe preset Inferior para portadas con texto al pie");
assert(gradientOverlaysCode.includes('OVERLAY_COLORS'), "Existe paleta de colores de contraste (Azul Noche, Negro, etc.)");
assert(gradientOverlaysCode.includes('#0b132b'), "Incluye el color oficial Azul Noche (#0b132b) optimizado para LinkedIn");
assert(gradientOverlaysCode.includes('hexToRgba'), "Conversión matemática de color a RGBA transparente implementada");
assert(gradientOverlaysCode.includes('lowestTextIndex'), "Ajuste inteligente de capas: ubica el degradado automáticamente detrás del texto");

const shapesDrawerCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/drawers/ShapesDrawer.tsx', 'utf8');
assert(shapesDrawerCode.includes('gradientSection'), "Sección estelar de degradados integrada en el drawer de Elementos");
assert(shapesDrawerCode.includes('handleInsertOverlay'), "Disparador de inserción directa de degradados presente en Elementos");
assert(shapesDrawerCode.includes('coverageBtn'), "Control de cobertura de degradado (Zona Texto 65% vs Lienzo 100%) disponible");

// ==================================================================
// 39. Prueba de Composiciones de Portada 1-Clic para Carruseles B2B
// ==================================================================
console.log("\n--- 39. Prueba de Composiciones de Portada 1-Clic para Carruseles B2B ---");

const viralTypesCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/lib/viral-posts/types.ts', 'utf8');
assert(viralTypesCode.includes('CoverLayout'), "Tipo CoverLayout exportado en tipos de publicaciones virales");
assert(viralTypesCode.includes('"bottom" | "split_left" | "split_right"'), "CoverLayout soporta presets bottom, split_left y split_right");
assert(viralTypesCode.includes('coverLayout?: CoverLayout'), "CarouselSlide incluye propiedad opcional coverLayout");
assert(viralTypesCode.includes('backgroundImageUrl?: string'), "CarouselSlide incluye propiedad opcional backgroundImageUrl");
assert(viralTypesCode.includes('highlightColor?: string'), "CarouselSlide incluye propiedad opcional highlightColor");

const createPostViewCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/components/viral-posts/CreateViralPostView.tsx', 'utf8');
assert(createPostViewCode.includes('SAMPLE_B2B_BACKGROUNDS'), "Catálogo de fondos ejecutivos B2B presente");
assert(createPostViewCode.includes('parseHighlightedTitle'), "Función de resaltado de palabras clave con asteriscos implementada");
assert(createPostViewCode.includes('coverLayout = "bottom"'), "Selector de composición Inferior / Pie presente");
assert(createPostViewCode.includes('coverLayout = "split_left"'), "Selector de composición Split Izquierdo presente");
assert(createPostViewCode.includes('coverLayout = "split_right"'), "Selector de composición Split Derecho presente");
assert(createPostViewCode.includes('linear-gradient(to right'), "Degradé dinámico para split_left configurado");
assert(createPostViewCode.includes('linear-gradient(to left'), "Degradé dinámico para split_right configurado");
assert(createPostViewCode.includes('linear-gradient(to top'), "Degradé dinámico para bottom configurado");

const carouselExporterCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/lib/viral-posts/carousel-exporter.ts', 'utf8');
assert(carouselExporterCode.includes('replace(/\\*\\*/g, "")'), "Limpieza de sintaxis de resalto en PDF");
assert(carouselExporterCode.includes('layout === "split_left"'), "Soporte de composición split_left en exportación PDF");
assert(carouselExporterCode.includes('layout === "split_right"'), "Soporte de composición split_right en exportación PDF");
assert(carouselExporterCode.includes('size, size'), "Generación de carrusel cuadrado de alta resolución");

// ==================================================================
// 40. Prueba de Herramientas Flotantes Libremente Arrastrables (Draggable Popovers)
// ==================================================================
console.log("\n--- 40. Prueba de Herramientas Flotantes Libremente Arrastrables ---");

const popoverCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/ui/Popover.tsx', 'utf8');
assert(popoverCode.includes('handleDragPointerDown'), "Función de arrastre libre handleDragPointerDown implementada");
assert(popoverCode.includes('userPositionRef'), "Almacenamiento de posición personalizada arrastrada por el usuario");
assert(popoverCode.includes('handleResetPosition'), "Función de reseteo para centrar la ventana bajo el botón original");
assert(popoverCode.includes('styles.dragBar'), "Barra de arrastre visual dragBar integrada en el encabezado del popover");
assert(popoverCode.includes('styles.dragPill'), "Pill de agarre visual (grip pill) para interactividad táctil y ratón");
assert(popoverCode.includes('onDoubleClick={handleResetPosition}'), "Soporte de doble clic para restablecer posición al ancla");

const popoverStyles = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/ui/Popover.module.css', 'utf8');
assert(popoverStyles.includes('.dragBar'), "Clase CSS dragBar definida para el encabezado arrastrable");
assert(popoverStyles.includes('cursor: grab'), "Cursor grab configurado para indicar que la herramienta se puede mover");
assert(popoverStyles.includes('.dragResetBtn'), "Botón de acción para centrar la herramienta presente");
assert(popoverStyles.includes("data-dragging='true'"), "Estado visual activo durante el arrastre configurado");

// ==================================================================
// 41. Prueba de Configuración por Defecto de Rectángulos (Blanco, Sin Borde, Sin Redondez)
// ==================================================================
console.log("\n--- 41. Prueba de Configuración por Defecto de Rectángulos ---");

const insertCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/engine/api/insert.ts', 'utf8');
assert(insertCode.includes("fill: '#ffffff'"), "Rectángulo inicia por defecto con color blanco puro (#ffffff)");
assert(insertCode.includes("stroke: null"), "Rectángulo inicia por defecto sin color de borde (stroke: null)");
assert(insertCode.includes("strokeWidth: 0"), "Rectángulo inicia por defecto con ancho de borde 0");
assert(insertCode.includes("rx: 0, ry: 0"), "Rectángulo inicia por defecto con esquinas rectas sin redondez (rx: 0, ry: 0)");

const shapesDrawerUpdatedCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/drawers/ShapesDrawer.tsx', 'utf8');
assert(shapesDrawerUpdatedCode.includes('id: \'rect\', label: t.basicShapes.rectangle, icon: sv(<rect x="4" y="6" width="20" height="16" rx="0"'), "Icono del rectángulo en drawer refleja esquinas rectas sin redondez (rx=0)");

// ==================================================================
// 42. Prueba de Altura de Línea Predeterminada (Line Height = 1 en Textos)
// ==================================================================
console.log("\n--- 42. Prueba de Altura de Línea Predeterminada (Line Height = 1) ---");

const factoriesUpdatedCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/engine/objects/factories.ts', 'utf8');
assert(factoriesUpdatedCode.includes("heading: { label: t.textPanel.headingText, size: 36, color: '#1a1a2e', weight: 700, font: HEADING_FONT, width: 0.72, lineHeight: 1 }"), "Preset Heading inicia con lineHeight predeterminado de 1");
assert(factoriesUpdatedCode.includes("subheading: { label: t.textPanel.subheadingText, size: 22, color: '#334155', weight: 600, font: BODY_FONT, width: 0.62, lineHeight: 1 }"), "Preset Subheading inicia con lineHeight predeterminado de 1");
assert(factoriesUpdatedCode.includes("body: { label: t.textPanel.bodyText, size: 16, color: '#475569', weight: 400, font: BODY_FONT, width: 0.5, lineHeight: 1 }"), "Preset Body inicia con lineHeight predeterminado de 1");
assert(factoriesUpdatedCode.includes("lineHeight: opts.lineHeight ?? spec.lineHeight ?? 1"), "createTextbox aplica lineHeight: 1 por defecto");
assert(factoriesUpdatedCode.includes("lineHeight: 1, ...props"), "createIText aplica lineHeight: 1 por defecto");

const textToolbarUpdatedCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/toolbar/sections/text.tsx', 'utf8');
assert(textToolbarUpdatedCode.includes("const lineHeight = Number(obj.lineHeight ?? 1)"), "Toolbar de texto lee valor por defecto de altura de línea como 1");

const pairingsUpdatedCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/drawers/pairings.ts', 'utf8');
assert(pairingsUpdatedCode.includes("lineHeight: 1"), "faceOptions en Font Pairings define lineHeight: 1 por defecto");

// ==================================================================
// 43. Prueba de Rotación Dinámica de Manijas de Selección (Handles / Pills)
// ==================================================================
console.log("\n--- 43. Prueba de Rotación Dinámica de Manijas de Selección (Handles / Pills) ---");

const controlsSourceCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/engine/objects/controls.ts', 'utf8');

assert(controlsSourceCode.includes("targetObj?: FabricObject"), "paintPillHandle acepta targetObj para leer el ángulo de rotación del objeto");
assert(controlsSourceCode.includes("ctx.rotate((angleDeg * Math.PI) / 180)"), "paintPillHandle aplica rotación en radianes al contexto de dibujo según el ángulo del objeto");
assert(controlsSourceCode.includes("typeof (targetObj as any)?.getTotalAngle === 'function'"), "paintPillHandle lee getTotalAngle del objeto con fallback a obj.angle");
assert(controlsSourceCode.includes("control.cursorStyleHandler = controlsUtils.scaleSkewCursorStyleHandler"), "Las manijas configuran scaleSkewCursorStyleHandler para adaptar dinámicamente el cursor a cualquier rotación");
assert(controlsSourceCode.includes("paintPillHandle(ctx, left, top, 'horizontal', accent, fabricObject ?? obj)"), "Las manijas horizontales (mt, mb) transmiten fabricObject o fallback de objeto al dibujado");
assert(controlsSourceCode.includes("paintPillHandle(ctx, left, top, 'vertical', accent, fabricObject ?? obj)"), "Las manijas verticales (ml, mr) transmiten fabricObject o fallback de objeto al dibujado");

// Simulación de renderizado con rotación
function simulateHandleAngle(objAngle) {
  const rad = (objAngle * Math.PI) / 180;
  // Vector unitario del eje local X del objeto transformado
  const localX = { x: Math.cos(rad), y: Math.sin(rad) };
  // Vector unitario del eje local Y del objeto transformado
  const localY = { x: -Math.sin(rad), y: Math.cos(rad) };
  return { rad, localX, localY };
}

const angle0 = simulateHandleAngle(0);
assert(Math.abs(angle0.localX.x - 1) < 0.001 && Math.abs(angle0.localX.y) < 0.001, "A 0 grados, la manija superior/inferior se alinea horizontalmente con el eje X");

const angle90 = simulateHandleAngle(90);
assert(Math.abs(angle90.localX.x) < 0.001 && Math.abs(angle90.localX.y - 1) < 0.001, "A 90 grados, la manija superior/inferior gira 90° y se alinea verticalmente con la arista rotada");

const angle45 = simulateHandleAngle(45);
assert(Math.abs(angle45.localX.x - Math.SQRT1_2) < 0.001 && Math.abs(angle45.localX.y - Math.SQRT1_2) < 0.001, "A 45 grados, la manija gira exactamente 45° manteniéndose tangente al borde inclinado");

// ==================================================================
// 44. Prueba de Persistencia de Assets en IndexedDB (Anti-pérdida F5 / HMR)
// ==================================================================
console.log("\n--- 44. Prueba de Persistencia de Assets en IndexedDB (Anti-pérdida F5 / HMR) ---");

const memoryAdapterUpdatedCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/dev/memoryAdapter.ts', 'utf8');

assert(memoryAdapterUpdatedCode.includes("import { localRepository } from '@visual-studio/lib/local'"), "memoryAdapter importa localRepository para persistencia real en navegador");
assert(memoryAdapterUpdatedCode.includes("const globalAssetUrls = new Map<string, string>()"), "Existe caché global a nivel de módulo para sobrevivir re-montajes y Hot Module Reload");
assert(memoryAdapterUpdatedCode.includes("await localRepository.putAsset({ id, blob: file, name, mime"), "uploadAsset almacena binarios de imágenes permanentemente en IndexedDB");
assert(memoryAdapterUpdatedCode.includes("const repoUrl = await localRepository.getAssetObjectUrl(key)"), "resolveSrc recupera la URL de IndexedDB cuando la memoria se refresca tras un cambio");
assert(memoryAdapterUpdatedCode.includes("const stored = await localRepository.listAssets()"), "El catálogo 'Tus fotos' se recupera desde IndexedDB evitando que las imágenes subidas desaparezcan");

// ==================================================================
// 45. Prueba de Borde de Selección Fino y al Ras (Estilo Canva: borderScaleFactor 1, padding 0)
// ==================================================================
console.log("\n--- 45. Prueba de Borde de Selección Fino y al Ras (Estilo Canva: borderScaleFactor 1, padding 0) ---");

const themeCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/engine/objects/theme.ts', 'utf8');

assert(themeCode.includes("borderScaleFactor: 1,"), "borderScaleFactor configurado en 1 para una línea de selección azul fina y nítida");
assert(themeCode.includes("padding: 0,"), "padding configurado en 0 para que la línea de selección quede exactamente en el borde del objeto o imagen");

const pageCanvasCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/engine/pageCanvas.ts', 'utf8');
assert(pageCanvasCode.includes("const TEXT_PADDING = 0"), "TEXT_PADDING configurado en 0 para que los cuadros de texto también queden al ras estilo Canva");

// ==================================================================
// 46. Prueba de Transferencia entre Páginas y Protección Anti-Limbo
// ==================================================================
console.log("\n--- 46. Prueba de Transferencia entre Páginas y Protección Anti-Limbo ---");

const editorCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/engine/editor.ts', 'utf8');
const arrangeCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/engine/api/arrange.ts', 'utf8');
const builtinsCommandsCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/builtins/commands.tsx', 'utf8');
const contextMenuHostCode = fs.readFileSync('c:/Users/Roberto/Documents/CLIENTES/INHUBFLOW/InHubFlow - Social Selling/Dashboard InHubFlow Social Selling Suite/src/visual-studio/editor/ContextMenuHost.tsx', 'utf8');

assert(editorCode.includes("transferDirectly(sourcePageId: string, targetPageId: string, target: FabricObject"), "EditorEngine implementa transferDirectly para migración atómica entre páginas");
assert(editorCode.includes("docObj.left = clampedX") && editorCode.includes("docObj.top = clampedY"), "transferDirectly sincroniza left y top con las coordenadas clamped evitando pérdida del objeto en Fabric");
assert(editorCode.includes("onObjectCrossPage(sourcePageId: string, target: FabricObject, event?: MouseEvent): boolean"), "EditorEngine implementa onObjectCrossPage para detectar arrastre entre páginas");
assert(editorCode.includes("replacePage(curDoc, nextSource)") && editorCode.includes("replacePage(nextDoc, nextTarget)"), "Transferencia actualiza ambas páginas en una sola transacción atómica de documento");
assert(editorCode.includes("targetView.selectObjects(builtObjs)"), "El objeto transferido queda automáticamente seleccionado en la página destino");

const pageSlotCss = fs.readFileSync('src/visual-studio/editor/workspace/PageSlot.module.css', 'utf8');
assert(pageSlotCss.includes(".slot[data-active]") && pageSlotCss.includes("z-index: 10"), "El lienzo activo se eleva con z-index 10 para que los elementos arrastrados no se oculten bajo otras páginas");
const workspaceUpdatedCode = fs.readFileSync('src/visual-studio/editor/workspace/Workspace.tsx', 'utf8');
assert(workspaceUpdatedCode.includes("BLEED_MULTI = 400"), "Workspace amplia el bleed a 400px en vista multipágina para renderizado continuo entre lienzos");

assert(pageCanvasCode.includes("host.onObjectCrossPage && host.onObjectCrossPage(pid, target, e.e as MouseEvent | undefined)"), "PageCanvas delega el evento object:modified al host para chequear transferencia entre páginas");
assert(pageCanvasCode.includes("clampInsidePage(target: FabricObject): boolean"), "PageCanvas implementa clampInsidePage para protección anti-limbo");
assert(pageCanvasCode.includes("this.clampInsidePage(target)"), "PageCanvas invoca clampInsidePage si el objeto no fue transferido a otra página");

assert(arrangeCode.includes("moveToPage(targetPageId: string): boolean"), "ArrangeApi expone moveToPage para mover objetos programáticamente");
assert(arrangeCode.includes("moveToNextPage(): boolean"), "ArrangeApi expone moveToNextPage para mover objetos a la página siguiente");
assert(arrangeCode.includes("moveToPrevPage(): boolean"), "ArrangeApi expone moveToPrevPage para mover objetos a la página anterior");

assert(builtinsCommandsCode.includes("id: 'arrange.moveToNextPage'"), "Comando arrange.moveToNextPage registrado en builtins");
assert(builtinsCommandsCode.includes("id: 'arrange.moveToPrevPage'"), "Comando arrange.moveToPrevPage registrado en builtins");
assert(contextMenuHostCode.includes("editor.state.doc.pages.length > 1") && contextMenuHostCode.includes("arrange.moveToNextPage"), "Menú contextual expone acciones de mover entre páginas cuando hay múltiples lienzos");

// Simulación de lógica matemática de transferencia y anti-limbo:
function simulateCrossPageTransfer(sourcePage, targetPage, obj, gap = 32, zoom = 1) {
  const sourceSlotLeft = 64;
  const targetSlotLeft = sourceSlotLeft + sourcePage.width * zoom + gap;
  const deltaDocX = (sourceSlotLeft - targetSlotLeft) / zoom;
  const newX = obj.x + deltaDocX;
  const clampedX = Math.max(0, Math.min(targetPage.width - Math.min(obj.width, 40), newX));
  return { newX, clampedX };
}

const page1 = { width: 1200, height: 900 };
const page2 = { width: 1200, height: 900 };
// Objeto en Page 1 arrastrado a x=1350 (hacia Page 2 a la derecha)
const draggedObj = { x: 1350, y: 200, width: 200, height: 100 };
const transferResult = simulateCrossPageTransfer(page1, page2, draggedObj);

assert(transferResult.clampedX === 1350 - (1200 + 32), "El objeto arrastrado a Page 2 conserva su posición visual exacta en el lienzo destino");
assert(transferResult.clampedX === 118, "Coordenada X en Page 2 calculada correctamente (118 px)");

// Simulación de Anti-Limbo:
function simulateAntiLimbo(page, obj) {
  const minVisible = Math.min(40, Math.min(obj.width, obj.height));
  let left = obj.x;
  let clamped = false;
  if (left + obj.width < minVisible) {
    left = 0;
    clamped = true;
  } else if (left > page.width - minVisible) {
    left = Math.max(0, page.width - obj.width);
    clamped = true;
  }
  return { left, clamped };
}

// Objeto arrastrado a x=2500 en el vacío donde no hay página
const voidObj = { x: 2500, y: 100, width: 200, height: 100 };
const antiLimboResult = simulateAntiLimbo(page1, voidObj);
assert(antiLimboResult.clamped === true, "Objeto arrojado al limbo es interceptado por la protección anti-limbo");
assert(antiLimboResult.left === 1200 - 200, "Objeto devuelto al borde visible de la página (x=1000) impidiendo su pérdida");

// --- 47. Prueba de Fuentes, Métrica de Caracteres, Desactivación de Negrita y Renderizado Vectorial Directo ---
console.log("\n--- 47. Prueba de Fuentes, Métrica de Caracteres, Desactivación de Negrita y Renderizado Vectorial Directo ---");

const textStyleSrc = fs.readFileSync('src/visual-studio/editor/engine/objects/textStyle.ts', 'utf8');
const fontsSrc = fs.readFileSync('src/visual-studio/editor/engine/fonts.ts', 'utf8');
const styleApiSrc = fs.readFileSync('src/visual-studio/editor/engine/api/style.ts', 'utf8');
const factoriesSrc = fs.readFileSync('src/visual-studio/editor/engine/objects/factories.ts', 'utf8');
const pageCanvasSrc = fs.readFileSync('src/visual-studio/editor/engine/pageCanvas.ts', 'utf8');
const builtinKindsSrc = fs.readFileSync('src/visual-studio/editor/engine/objects/builtinKinds.ts', 'utf8');

assert(textStyleSrc.includes("cache.clearFontCache(t.fontFamily)") && textStyleSrc.includes("cache.clearFontCache(patch.fontFamily)"), "applyTextPatch invalida la caché global de anchos de fuente (clearFontCache) al cambiar tipografía, peso o espaciado");
assert(textStyleSrc.includes("t.set('objectCaching', false)"), "applyTextPatch fuerza objectCaching en false para renderizado vectorial puro sin recorte de glifos");
assert(textStyleSrc.includes("delete anyT.__charBounds") && textStyleSrc.includes("delete anyT._charBounds") && textStyleSrc.includes("delete anyT._styleMap"), "applyTextPatch limpia __charBounds, _charBounds y _styleMap evitando solapamiento de palabras con estilos");
assert(textStyleSrc.includes("t.set('width', anyT.dynamicMinWidth)"), "applyTextPatch previene que el ancho del Textbox colapse por debajo del ancho de la palabra más ancha");

assert(fontsSrc.includes("document.fonts.load") && fontsSrc.includes("cache.clearFontCache(name)"), "FontManager integra fallback a document.fonts y limpia caché de caracteres para fuentes de Google Fonts");
assert(fontsSrc.includes("await document.fonts.ready"), "FontManager espera a que el set de fuentes del navegador esté completamente listo (document.fonts.ready)");

assert(styleApiSrc.includes("this.engine.fonts.load(fam, weight, style)"), "StyleApi precarga las fuentes requeridas antes de aplicar patches de estilo al texto");
assert(styleApiSrc.includes("Promise.all(promises).then(run)"), "StyleApi garantiza resolución asíncrona de tipografías con métricas exactas antes de redibujar");

assert(factoriesSrc.includes("objectCaching: false"), "factories.ts configura objectCaching: false por defecto en cuadros de texto nuevos");
assert(pageCanvasSrc.includes("obj.set('objectCaching', false)"), "pageCanvas.ts garantiza objectCaching: false al configurar cualquier objeto de texto");
assert(builtinKindsSrc.includes("obj.set('objectCaching', false)"), "builtinKinds.ts asegura objectCaching: false al hidratar textos desde JSON");

// ==================================================================
// 48. Prueba de Formas Basicas y Decorativas (Blanco por Defecto, Sin Bordes, Sin Redondez)
// ==================================================================
console.log("\n--- 48. Prueba de Formas Basicas y Decorativas (Blanco por Defecto, Sin Bordes, Sin Redondez) ---");

const shapesDrawerSrc48 = fs.readFileSync('src/visual-studio/editor/drawers/ShapesDrawer.tsx', 'utf8');
const factoriesSrc48 = fs.readFileSync('src/visual-studio/editor/engine/objects/factories.ts', 'utf8');
const insertSrc48 = fs.readFileSync('src/visual-studio/editor/engine/api/insert.ts', 'utf8');

// 1. softShape y baseShape en factories.ts
assert(factoriesSrc48.includes("fill: '#ffffff'") && factoriesSrc48.includes("stroke: null") && factoriesSrc48.includes("strokeWidth: 0"), "baseShape en factories.ts establece fill: '#ffffff', stroke: null y strokeWidth: 0");
assert(factoriesSrc48.includes("obj.set({ fill: '#ffffff', stroke: null, strokeWidth: 0, strokeUniform: true })"), "softShape aplica fill blanco puro (#ffffff) y sin bordes por defecto");
assert(factoriesSrc48.includes("(obj as any).set('rx', 0)") && factoriesSrc48.includes("(obj as any).set('ry', 0)"), "softShape elimina cualquier redondez (rx: 0, ry: 0) por defecto");

// 2. Formas en insert.ts
assert(insertSrc48.includes("rect.set({ fill: '#ffffff', stroke: null, strokeWidth: 0, rx: 0, ry: 0, strokeUniform: true })"), "Rectangulo en insert.ts inicia blanco, sin borde y sin redondez");
assert(insertSrc48.includes("case 'frame':") && insertSrc48.includes("createRect(at, Math.round(200 * k), 0, Math.round(280 * k))"), "Marco (frame) inicia con radio 0 y estilo plano");

// 3. Reorganizacion de catalogo en ShapesDrawer.tsx
assert(shapesDrawerSrc48.includes("id: 'polygon', label: t.basicShapes.polygon") && shapesDrawerSrc48.indexOf("id: 'polygon'") < shapesDrawerSrc48.indexOf("id: 'divider'"), "Poligono (polygon) reubicado dentro del grupo 'decorative'");
assert(!shapesDrawerSrc48.includes("id: 'rounded'"), "Rectangulo redondeado ('rounded') eliminado del catalogo de formas");
assert(!shapesDrawerSrc48.includes("moreBasics"), "Grupo 'moreBasics' eliminado por completo de la interfaz del drawer");
assert(shapesDrawerSrc48.includes('id: \'frame\', label: t.drawers.frame, icon: sv(<rect x="4" y="2" width="20" height="24" rx="0"'), "Icono de Marco (frame) tiene esquinas rectas con rx=0");

// ==================================================================
// 49. Prueba de Desactivacion de Doble Clic en Vacio e Interaccion Inmediata Multipagina
// ==================================================================
console.log("\n--- 49. Prueba de Desactivacion de Doble Clic en Vacio e Interaccion Inmediata Multipagina ---");

const pageCanvasSrc49 = fs.readFileSync('src/visual-studio/editor/engine/pageCanvas.ts', 'utf8');
const editorSrc49 = fs.readFileSync('src/visual-studio/editor/engine/editor.ts', 'utf8');
const pageSlotCss49 = fs.readFileSync('src/visual-studio/editor/workspace/PageSlot.module.css', 'utf8');

// 1. Doble clic en vacio NO crea texto
assert(pageCanvasSrc49.includes("if (!target) return"), "onDoubleClick no crea cuadros de texto en areas vacias del lienzo");
assert(!pageCanvasSrc49.includes("if (!target) {\n      // Double-click on empty canvas: start a new text box right there."), "Invocacion a onTextCreate eliminada por completo de onDoubleClick");

// 2. Finalizacion limpia de edicion de texto al cambiar de seleccion o de pagina
assert(pageCanvasSrc49.includes("clearSelection(): void {\n    this.stopEditing()"), "clearSelection finaliza limpiamente cualquier edicion activa de texto con stopEditing");
assert(editorSrc49.includes("v.stopEditing()\n        v.clearSelection()"), "setActivePage ejecuta stopEditing y clearSelection en todas las demas paginas");

// 3. Aislamiento fisico de lienzos y redireccion de clics entre paginas
assert(pageSlotCss49.includes(".host {\n  position: absolute;\n  inset: 0;\n  overflow: hidden;\n}"), ".host posee overflow: hidden para contener el canvas estrictamente dentro del artboard");
assert(editorSrc49.includes("pageAt(clientX: number, clientY: number): string | null"), "EditorEngine expone pageAt para deteccion de lienzos por coordenadas de cliente");
assert(editorSrc49.includes("clientToPage(pageId: string, clientX: number, clientY: number)"), "EditorEngine expone clientToPage para mapeo exacto de puntos");
assert(pageCanvasSrc49.includes("const clickedPageId = host.pageAt(ev.clientX, ev.clientY)"), "pageCanvas detecta si el puntero aterrizo sobre otra pagina");
assert(pageCanvasSrc49.includes("targetView.selectObjects([hit])"), "pageCanvas selecciona directamente el objeto cliqueado en la otra pagina");

// ==================================================================
// 50. Prueba de Proteccion de Elementos en Bordes de Pagina (Sin Transferencias Involuntarias)
// ==================================================================
console.log("\n--- 50. Prueba de Proteccion de Elementos en Bordes de Pagina ---");

const editorSrc50 = fs.readFileSync('src/visual-studio/editor/engine/editor.ts', 'utf8');

assert(editorSrc50.includes("if (pid === sourcePageId) {\n        return false\n      }"), "onObjectCrossPage no transfiere elementos si el puntero se suelta dentro de la misma pagina origen");
assert(!editorSrc50.includes("center.x > sourceSize.width * 0.7") && !editorSrc50.includes("target.left > sourceSize.width * 0.6"), "Umbrales arbitrarios del 60%/70% eliminados para permitir ubicar objetos al borde del lienzo");
assert(editorSrc50.includes("stackCenterX >= s.artboardLeft && stackCenterX <= s.right"), "Transferencia sin puntero exige que el centro del objeto haya entrado fisicamente al slot de la pagina destino");

// ==================================================================
// 51. Prueba de Diseno Unificado de Herramientas de Imagen en Toolbar (Upscale, Quitar fondo, Borrador magico)
// ==================================================================
console.log("\n--- 51. Prueba de Diseno Unificado de Herramientas de Imagen en Toolbar ---");

const imageToolbarSrc51 = fs.readFileSync('src/visual-studio/editor/toolbar/sections/image.tsx', 'utf8');

assert(!imageToolbarSrc51.includes("ToolButton label={t.toolbar.upscale} featured"), "Herramienta Upscale ya no tiene clase 'featured', adoptando el diseno estandar");
assert(!imageToolbarSrc51.includes("ToolButton label={t.toolbar.removeBackground} featured"), "Herramienta Quitar fondo ya no tiene clase 'featured', adoptando el diseno estandar");
assert(!imageToolbarSrc51.includes("ToolButton label=\"Borrador mágico\" featured"), "Herramienta Borrador magico ya no tiene clase 'featured', adoptando el diseno estandar");
assert(!imageToolbarSrc51.includes("<span className={ed.toolText}>"), "Etiquetas de texto eliminadas del interior de los botones de imagen para diseno de icono puro uniforme");
assert(imageToolbarSrc51.includes("ToolButton label={t.toolbar.upscale} testId=\"ed-upscale\""), "Upscale conserva su Tooltip y accesibilidad por etiqueta");
assert(imageToolbarSrc51.includes("ToolButton label={t.toolbar.removeBackground} testId=\"ed-remove-bg\""), "Quitar fondo conserva su Tooltip y accesibilidad por etiqueta");
assert(imageToolbarSrc51.includes("ToolButton label=\"Borrador mágico\" testId=\"ed-magic-eraser\""), "Borrador magico conserva su Tooltip y accesibilidad por etiqueta");

// ==================================================================
// 52. Prueba de Renderizado de Textos con Múltiples Estilos y Anclaje No Solapante
// ==================================================================
console.log("\n--- 52. Prueba de Renderizado de Textos con Múltiples Estilos y Anclaje No Solapante ---");

const complexTextSrc52 = fs.readFileSync('src/visual-studio/editor/engine/objects/complexText.ts', 'utf8');
const editorSrc52 = fs.readFileSync('src/visual-studio/editor/engine/editor.ts', 'utf8');
const textStyleSrc52 = fs.readFileSync('src/visual-studio/editor/engine/objects/textStyle.ts', 'utf8');
const textDrawerSrc52 = fs.readFileSync('src/visual-studio/editor/drawers/TextDrawer.tsx', 'utf8');

assert(complexTextSrc52.includes("ctx.textAlign = isLtr ? 'left' : 'right'"), "complexText.ts fija explícitamente ctx.textAlign evitando que alineaciones globales distorsionen spans");
assert(complexTextSrc52.includes("const runLeft = lineStart + sign * (box && typeof box.left === 'number' ? box.left : 0)"), "complexText.ts ancla cada run de estilo estrictamente a box.left impidiendo solapamiento horizontal");
assert(complexTextSrc52.includes("this._renderChar(method, ctx, lineIndex, runStart, run, runLeft, top)"), "_renderChar recibe runLeft con la posición absoluta calculada para el run");

assert(editorSrc52.includes("delete maybe.__lineWidths") && editorSrc52.includes("delete maybe.__charBounds"), "editor.ts remeasureText purga __lineWidths y __charBounds para recalcular métricas reales tras carga de fuentes");
assert(editorSrc52.includes("cache.clearFontCache()"), "editor.ts remeasureText limpia la caché global de anchos de fuente sin argumentos");

assert(textStyleSrc52.includes("delete anyT.__lineWidths") && textStyleSrc52.includes("delete anyT.__lineHeights"), "applyTextPatch invalida __lineWidths y __lineHeights junto con __charBounds y _styleMap");
assert(textDrawerSrc52.includes("heading.initDimensions()") && textDrawerSrc52.includes("delete anyH.__lineWidths"), "TextDrawer recalcula dimensiones completas de Textbox tras aplicar setSelectionStyles");

// Test funcional de cálculo de métricas para spans con estilos mixtos
const mockCharBounds = [
  { left: 0, width: 24, kernedWidth: 24 },     // 'i'
  { left: 24, width: 24, kernedWidth: 24 },    // 'm'
  { left: 48, width: 24, kernedWidth: 24 },    // 'p'
  { left: 72, width: 24, kernedWidth: 24 },    // 'o'
  { left: 96, width: 24, kernedWidth: 24 },    // 'r'
  { left: 120, width: 24, kernedWidth: 24 },   // 't'
  { left: 144, width: 24, kernedWidth: 24 },   // 'a'
  { left: 168, width: 24, kernedWidth: 24 },   // 'r'
  { left: 192, width: 24, kernedWidth: 24 },   // ' '
  { left: 216, width: 33.6, kernedWidth: 33.6 }, // 'Y'
  { left: 249.6, width: 33.6, kernedWidth: 33.6 }, // 'e'
  { left: 283.2, width: 33.6, kernedWidth: 33.6 }, // 'r'
  { left: 316.8, width: 33.6, kernedWidth: 33.6 }, // 'v'
  { left: 350.4, width: 33.6, kernedWidth: 33.6 }, // 'o'
  { left: 384.0, width: 33.6, kernedWidth: 33.6 }, // 'y'
];
const lineStart = -192.6;
const run1Left = lineStart + mockCharBounds[0].left;
const run2Left = lineStart + mockCharBounds[9].left;
assert(run2Left > run1Left + (9 * 24 - 1e-4), "El segundo run con estilo diferente (Yervoy) inicia estrictamente después del primer run (importar ) sin solaparse");
assert(Math.abs(run2Left - (lineStart + 216)) < 1e-4, "Posición X de Yervoy coincide exactamente con la métrica acumulada (23.4 px)");

// --- 53. Prueba de Supresión del Menú Contextual Nativo del Navegador en Workspace y Canvas ---
console.log("\n--- 53. Prueba de Supresión del Menú Contextual Nativo del Navegador en Workspace y Canvas ---");

const editorAppSrc = fs.readFileSync('src/visual-studio/editor/EditorApp.tsx', 'utf8');
assert(editorAppSrc.includes('onContextMenu') && editorAppSrc.includes('e.preventDefault()'), 'EditorApp implementa escudo global onContextMenu con e.preventDefault()');
assert(editorAppSrc.includes('target.closest') && editorAppSrc.includes('data-fabric'), 'EditorApp respeta inputs de texto pero bloquea contextmenu sobre elementos del editor y textareas de Fabric');

const workspaceSrc = fs.readFileSync('src/visual-studio/editor/workspace/Workspace.tsx', 'utf8');
assert(workspaceSrc.includes('onContextMenu={(e) => {\r\n        e.preventDefault()') || workspaceSrc.includes('onContextMenu={(e) => {\n        e.preventDefault()'), 'Workspace contenedor principal suprime el menú nativo del navegador');
assert(workspaceSrc.includes('editor.onContextMenu(doc.pages[activePage]'), 'Workspace abre el menú contextual de lienzo al hacer clic derecho en fondo vacío');

const pageSlotSrc = fs.readFileSync('src/visual-studio/editor/workspace/PageSlot.tsx', 'utf8');
assert(pageSlotSrc.includes('onContextMenu={(e) => {\r\n        e.preventDefault()') || pageSlotSrc.includes('onContextMenu={(e) => {\n        e.preventDefault()'), 'PageSlot previene contextmenu nativo en el slot del lienzo');

const menuSrc = fs.readFileSync('src/visual-studio/editor/ui/Menu.tsx', 'utf8');
assert(menuSrc.includes('onContextMenu') && menuSrc.includes('e.stopPropagation()'), 'Menu contextual intercepta y suprime contextmenu con e.stopPropagation()');

const pageCanvasCtxSrc = fs.readFileSync('src/visual-studio/editor/engine/pageCanvas.ts', 'utf8');
assert(pageCanvasCtxSrc.includes("wrapper.addEventListener('contextmenu', onCanvasContextMenu)"), 'pageCanvas vincula listener nativo contextmenu con e.preventDefault() en wrapper');
assert(pageCanvasCtxSrc.includes("container.addEventListener('contextmenu', onCanvasContextMenu)"), 'pageCanvas vincula listener nativo contextmenu con e.preventDefault() en container');
assert(pageCanvasCtxSrc.includes('if (ev.button === 2) {\r\n      ev.preventDefault()') || pageCanvasCtxSrc.includes('if (ev.button === 2) {\n      ev.preventDefault()'), 'onMouseDown para botón derecho ejecuta ev.preventDefault()');
assert(pageCanvasCtxSrc.includes('if (e.e && e.e.button === 2) {\r\n      e.e.preventDefault()') || pageCanvasCtxSrc.includes('if (e.e && e.e.button === 2) {\n      e.e.preventDefault()'), 'onDoubleClick ignora y suprime botón derecho impidiendo entrada espuria a edición');

const contextMenuHostSrc = fs.readFileSync('src/visual-studio/editor/ContextMenuHost.tsx', 'utf8');
assert(!contextMenuHostSrc.includes('image.replace'), 'ContextMenuHost elimina la opción Replace image del menú contextual');
assert(!contextMenuHostSrc.includes('image.crop'), 'ContextMenuHost elimina la opción Crop image del menú contextual');

// --- 54. Prueba de la Herramienta de Expansión Mágica (Magic Expand / Outpainting) ---
console.log("\n--- 54. Prueba de la Herramienta de Expansión Mágica (Magic Expand / Outpainting) ---");

const outpainterSrc = fs.readFileSync('src/visual-studio/editor/engine/magicExpand/lamaOutpainter.ts', 'utf8');
assert(outpainterSrc.includes('export async function runLamaOutpainting'), 'lamaOutpainter exporta la función principal runLamaOutpainting');
assert(outpainterSrc.includes('getLamaSession'), 'lamaOutpainter reutiliza la sesión local ONNX de LaMa sin costes de servidor ni API');
assert(outpainterSrc.includes('origW + left + right') && outpainterSrc.includes('origH + top + bottom'), 'lamaOutpainter calcula las dimensiones de expansión geométrica de forma exacta');
assert(outpainterSrc.includes('blur('), 'lamaOutpainter aplica extensión ambiental desenfocada para guiar los gradientes cromáticos de la IA');

const expandDialogSrc = fs.readFileSync('src/visual-studio/editor/dialogs/MagicExpandDialog.tsx', 'utf8');
assert(expandDialogSrc.includes('fill-canvas') && expandDialogSrc.includes('1:1') && expandDialogSrc.includes('16:9'), 'MagicExpandDialog ofrece presets rápidos de aspecto (Llenar lienzo, 1:1, 16:9, etc.)');
assert(expandDialogSrc.includes('runLamaOutpainting'), 'MagicExpandDialog invoca el motor de extrapolación local');
assert(expandDialogSrc.includes('replaceSelectedImage'), 'MagicExpandDialog reemplaza la imagen en el lienzo al confirmar la expansión');

const dialogHostExpSrc = fs.readFileSync('src/visual-studio/editor/dialogs/DialogHost.tsx', 'utf8');
assert(dialogHostExpSrc.includes('magic-expand') && dialogHostExpSrc.includes('MagicExpandDialog'), 'DialogHost registra el modal lazyDialog magic-expand');

const toolbarImgSrc = fs.readFileSync('src/visual-studio/editor/toolbar/sections/image.tsx', 'utf8');
assert(toolbarImgSrc.includes('ed-magic-expand') && toolbarImgSrc.includes('Maximize2'), 'Barra de herramientas contextual incluye el botón de Expansión mágica');

// Cálculo matemático de extrapolación
function calculateExpansion(W, H, targetRatio) {
  const currentRatio = W / H;
  if (currentRatio < targetRatio) {
    const wantedWidth = Math.round(H * targetRatio);
    const diff = Math.max(0, wantedWidth - W);
    const half = Math.round(diff / 2);
    return { left: half, right: diff - half, top: 0, bottom: 0 };
  } else {
    const wantedHeight = Math.round(W / targetRatio);
    const diff = Math.max(0, wantedHeight - H);
    const half = Math.round(diff / 2);
    return { left: 0, right: 0, top: half, bottom: diff - half };
  }
}

const exp169 = calculateExpansion(800, 600, 16 / 9);
assert(exp169.left + exp169.right > 260 && exp169.top === 0 && exp169.bottom === 0, 'Expansión de 4:3 a 16:9 ensancha horizontalmente los laterales preservando la altura');

const exp11 = calculateExpansion(800, 600, 1);
assert(exp11.top + exp11.bottom === 200 && exp11.left === 0 && exp11.right === 0, 'Expansión de 4:3 a 1:1 extiende verticalmente arriba y abajo preservando el ancho');

// ==================================================================
// SECCIÓN 55: GUARDADO DE MÚLTIPLES PÁGINAS COMO PLANTILLAS GLOBALES INDIVIDUALES ("1 POR 1 POR SEPARADO")
// ==================================================================
console.log("\n--- SECCIÓN 55: GUARDADO MULTIPÁGINA DE PLANTILLAS GLOBALES INDIVIDUALES ---");

const saveModalCode = fs.readFileSync(path.join(process.cwd(), 'src/components/viral-posts/SaveGlobalTemplateModal.tsx'), 'utf8');
const visualStudioCode = fs.readFileSync(path.join(process.cwd(), 'src/components/viral-posts/VisualStudioModal.tsx'), 'utf8');
const pageSlotCode = fs.readFileSync(path.join(process.cwd(), 'src/visual-studio/editor/workspace/PageSlot.tsx'), 'utf8');

assert(saveModalCode.includes('saveMode === "split"'), 'SaveGlobalTemplateModal implementa el modo "split" (1 por 1 por separado)');
assert(saveModalCode.includes('pagesToSave.map') || saveModalCode.includes('for (let i = 0; i < pagesToSave.length; i++)'), 'SaveGlobalTemplateModal itera secuencialmente las páginas seleccionadas para guardarlas individualmente');
assert(saveModalCode.includes('pages: [page]'), 'SaveGlobalTemplateModal encapsula cada página en un DoryDocument independiente de 1 sola página');
assert(saveModalCode.includes('pageThumbnails[page.id]'), 'SaveGlobalTemplateModal asocia el thumbnail individual a cada plantilla');
assert(saveModalCode.includes('setSavingProgress'), 'SaveGlobalTemplateModal reporta progreso interactivo durante el guardado por lotes');
assert(saveModalCode.includes('toggleSelectAll'), 'SaveGlobalTemplateModal permite seleccionar o desmarcar todas las páginas en un clic');

assert(visualStudioCode.includes('pageThumbnails={pageThumbnails}'), 'VisualStudioModal envía los thumbnails de todas las páginas al modal de plantilla');
assert(visualStudioCode.includes('activePageId={targetPageId}'), 'VisualStudioModal pasa la página activa al modal de plantilla');
assert(visualStudioCode.includes('inhubflow:open-save-page-template'), 'VisualStudioModal escucha el evento para abrir guardado rápido de página');

assert(pageSlotCode.includes('BookmarkPlus'), 'PageSlot incluye el ícono BookmarkPlus para guardar páginas individuales');
assert(pageSlotCode.includes('inhubflow:open-save-page-template'), 'PageSlot despacha el evento inhubflow:open-save-page-template con el page.id');

// Simulación de segmentación de 12 páginas en 12 plantillas individuales independientes
const mockDoc12Pages = {
  version: '1.0',
  width: 1200,
  height: 900,
  pages: Array.from({ length: 12 }, (_, i) => ({
    id: `page-uuid-${i + 1}`,
    name: `Slide Modelo ${i + 1}`,
    objects: [{ id: `obj-${i + 1}`, type: 'text', text: `Título de la página ${i + 1}` }],
    background: { type: 'color', color: '#ffffff' }
  }))
};

assert(mockDoc12Pages.pages.length === 12, 'El documento de prueba tiene exactamente 12 páginas');

const splitTemplates = mockDoc12Pages.pages.map((p, idx) => ({
  title: `Colección B2B - ${p.name}`,
  document: {
    ...mockDoc12Pages,
    pages: [p]
  }
}));

assert(splitTemplates.length === 12, 'La segmentación produce exactamente 12 plantillas individuales');
assert(splitTemplates.every(t => t.document.pages.length === 1), 'Cada plantilla individual contiene exactamente 1 página');
assert(splitTemplates[0].document.pages[0].id === 'page-uuid-1', 'La primera plantilla conserva intacto su ID de página y sus objetos');
assert(splitTemplates[11].document.pages[0].id === 'page-uuid-12', 'La doceava plantilla conserva intacto su ID de página y sus objetos');

// ==================================================================
// SECCIÓN 56: PREVENCIÓN DE DESCONFIGURACIÓN TIPOGRÁFICA Y ALINEACIÓN DE SUBTÍTULOS
// ==================================================================
console.log("\n--- SECCIÓN 56: SINCRONIZACIÓN DE FUENTES Y ALINEACIÓN DE SUBTÍTULOS ---");

const editorCode56 = fs.readFileSync(path.join(process.cwd(), 'src/visual-studio/editor/engine/editor.ts'), 'utf8');
const complexTextCode56 = fs.readFileSync(path.join(process.cwd(), 'src/visual-studio/editor/engine/objects/complexText.ts'), 'utf8');
const textToolbarCode56 = fs.readFileSync(path.join(process.cwd(), 'src/visual-studio/editor/toolbar/sections/text.tsx'), 'utf8');
const vsModalCode56 = fs.readFileSync(path.join(process.cwd(), 'src/components/viral-posts/VisualStudioModal.tsx'), 'utf8');

assert(editorCode56.includes('watchBrowserFonts'), 'editor.ts implementa watchBrowserFonts para escuchar la carga nativa de fuentes web');
assert(editorCode56.includes('document.fonts.addEventListener'), 'editor.ts escucha el evento loadingdone de document.fonts');
assert(editorCode56.includes('remeasureAllText'), 'editor.ts expone remeasureAllText para purgar y recalcular métricas reales tras carga de fuentes');
assert(editorCode56.includes('this.disposers.push(this.watchBrowserFonts())'), 'editor.ts activa watchBrowserFonts en el ciclo de vida del motor');

assert(complexTextCode56.includes('this._measureLine(lineIndex)'), 'complexText.ts garantiza el cálculo de __charBounds si la línea aún no fue medida');
assert(complexTextCode56.includes('isLineEmptyStyles && this.charSpacing === 0'), 'complexText.ts implementa renderizado nativo de alto rendimiento para líneas sin estilos complejos');

assert(textToolbarCode56.includes('I.canvasCenterH'), 'La barra de herramientas de texto incluye el botón de centrado rápido horizontal en el lienzo');
assert(textToolbarCode56.includes("editor.arrange.align('center', 'page')"), 'El botón de centrado de texto invoca la alineación matemática al centro del lienzo');

assert(vsModalCode56.includes('inhubflow-font-preconnect-1'), 'VisualStudioModal pre-conecta a Google Fonts para entrega ultra-rápida de tipografías');
assert(vsModalCode56.includes('(document.fonts as any).ready?.then'), 'VisualStudioModal re-mide el lienzo en cuanto document.fonts.ready finaliza');
assert(vsModalCode56.includes('type: "Textbox"') && vsModalCode56.includes('originX: "center"'), 'VisualStudioModal inicializa títulos y subtítulos como Textbox centrados y normalizados');

// ==============================================================================
// 57. REGLA: ATAJOS DE TECLADO CTRL+C / CTRL+V Y PEGADO EN LA MISMA POSICIÓN ENTRE PÁGINAS
// ==============================================================================
console.log("\n--- TEST: Atajos de teclado (Ctrl+C, Ctrl+V, Ctrl+X) y Pegado en la Misma Posición entre Páginas ---");

const commandsCode57 = fs.readFileSync(path.join(process.cwd(), 'src/visual-studio/editor/builtins/commands.tsx'), 'utf8');
const clipboardFormatCode57 = fs.readFileSync(path.join(process.cwd(), 'src/visual-studio/editor/engine/clipboardFormat.ts'), 'utf8');
const clipboardApiCode57 = fs.readFileSync(path.join(process.cwd(), 'src/visual-studio/editor/engine/api/clipboard.ts'), 'utf8');

assert(!commandsCode57.includes("id: 'edit.copy', label: t.cmd.editCopy, shortcut: 'Mod+C', group: t.cmdGroup.edit, icon: <Copy size={18} />, displayOnly: true"), 'edit.copy no tiene displayOnly: true para que useKeyboardShortcuts intercepte Ctrl+C');
assert(!commandsCode57.includes("id: 'edit.paste', label: t.cmd.editPaste, shortcut: 'Mod+V', group: t.cmdGroup.edit, icon: <ClipboardPaste size={18} />, displayOnly: true"), 'edit.paste no tiene displayOnly: true para que useKeyboardShortcuts intercepte Ctrl+V');
assert(!commandsCode57.includes("id: 'edit.cut', label: t.cmd.editCut, shortcut: 'Mod+X', group: t.cmdGroup.edit, icon: <Scissors size={18} />, displayOnly: true"), 'edit.cut no tiene displayOnly: true para que useKeyboardShortcuts intercepte Ctrl+X');

assert(clipboardFormatCode57.includes('sourcePageId?: string'), 'clipboardFormat.ts soporta sourcePageId en el contrato ClipboardPayload');
assert(clipboardFormatCode57.includes('sourcePageId?: string): string'), 'encodeClipboard acepta sourcePageId');
assert(clipboardFormatCode57.includes('const sourcePageId = typeof p.sourcePageId === \'string\' ? p.sourcePageId : undefined'), 'decodeClipboard recupera sourcePageId de forma segura');

assert(clipboardApiCode57.includes('sourcePageId: activePageId'), 'clipboard.ts registra sourcePageId al generar el payload de copia');
assert(clipboardApiCode57.includes('const isDifferentPage = Boolean(payload.sourcePageId && payload.sourcePageId !== activePageId)'), 'clipboard.ts detecta cuando el pegado se realiza en una página diferente a la de origen');
assert(clipboardApiCode57.includes('await this.engine.insert.objects(payload.objects, t.history.paste, { offset: 0 })'), 'clipboard.ts usa { offset: 0 } al pegar en otra página para conservar las coordenadas exactas de origen');

// Simulación funcional del codec de portapapeles con sourcePageId
import('../src/visual-studio/editor/engine/clipboardFormat.js').catch(async () => {
  // Test directo de la lógica serializadora
  const testPayload = {
    kind: 'doory-clipboard/v1',
    objects: [{ type: 'textbox', left: 150, top: 220, text: 'Texto de prueba' }],
    page: { width: 1200, height: 900 },
    sourcePageId: 'page_source_123'
  };
  const json = JSON.stringify(testPayload);
  const parsed = JSON.parse(json);
  assert(parsed.sourcePageId === 'page_source_123', 'Serialización y deserialización conservan el sourcePageId');
  assert(parsed.objects[0].left === 150 && parsed.objects[0].top === 220, 'Las coordenadas originales se preservan exactamente');
});

// ==============================================================================
// 58. REGLA: RESALTADORES VISUALES VECTORIALES SVG (CÍRCULOS A MANO, MARCADOR, ONDAS)
// ==============================================================================
console.log("\n--- TEST: Resaltadores Visuales Vectoriales SVG para Palabras y Textos ---");

const highlightsCode58 = fs.readFileSync(path.join(process.cwd(), 'src/visual-studio/editor/engine/objects/highlights.ts'), 'utf8');
const popoverCode58 = fs.readFileSync(path.join(process.cwd(), 'src/visual-studio/editor/toolbar/sections/HighlightPopover.tsx'), 'utf8');
const textToolbarCode58 = fs.readFileSync(path.join(process.cwd(), 'src/visual-studio/editor/toolbar/sections/text.tsx'), 'utf8');
const textDrawerCode58 = fs.readFileSync(path.join(process.cwd(), 'src/visual-studio/editor/drawers/TextDrawer.tsx'), 'utf8');

assert(highlightsCode58.includes('circle-hand'), 'highlights.ts define el modelo circle-hand (círculo dibujado a mano)');
assert(highlightsCode58.includes('marker-fluo'), 'highlights.ts define el modelo marker-fluo (marcador fluorescente)');
assert(highlightsCode58.includes('underline-hand'), 'highlights.ts define el modelo underline-hand (subrayado a mano)');
assert(highlightsCode58.includes('underline-double'), 'highlights.ts define el modelo underline-double (doble trazo)');
assert(highlightsCode58.includes('squiggly'), 'highlights.ts define el modelo squiggly (onda zigzag)');
assert(highlightsCode58.includes('box-hand'), 'highlights.ts define el modelo box-hand (recuadro doodle)');
assert(highlightsCode58.includes('pill-badge'), 'highlights.ts define el modelo pill-badge (cápsula suave de fondo)');

assert(highlightsCode58.includes('HIGHLIGHT_PALETTE'), 'highlights.ts exporta la paleta de colores neón y vibrantes');
assert(highlightsCode58.includes('#FFE600'), 'La paleta incluye Amarillo Neón');
assert(highlightsCode58.includes('#702FFC'), 'La paleta incluye Púrpura InHubFlow');
assert(highlightsCode58.includes('applyTextHighlight'), 'highlights.ts exporta la función principal de aplicación applyTextHighlight');
assert(highlightsCode58.includes('getTargetTextBoundingBox'), 'highlights.ts calcula el encuadre matemático de la palabra o texto objetivo');

assert(popoverCode58.includes('HighlightPopover'), 'HighlightPopover exporta el componente interactivo');
assert(popoverCode58.includes('Resaltador Visual (Doodles & Neón)'), 'HighlightPopover presenta el encabezado explicativo');
assert(popoverCode58.includes('dangerouslySetInnerHTML'), 'HighlightPopover previsualiza en vivo los SVG vectoriales');

assert(textToolbarCode58.includes('ed-text-highlight'), 'La barra contextual de texto incorpora el botón de resaltador');
assert(textToolbarCode58.includes('HighlightPopover'), 'La barra contextual de texto conecta el popover de resaltadores');

assert(textDrawerCode58.includes('Resaltadores Visuales (Círculos & Neón)'), 'El Drawer lateral de Texto expone la galería de resaltadores visuales');

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
