# InHubFlow | Social Selling Suite
## Documento de Especificación Técnica & Arquitectura de Producto (PRD)
**Versión:** 2.1 (Revisión de Normas, Colorimetría y Arquitectura)  
**Fecha:** Octubre 2026  
**Estado:** Documento Maestro Aprobado  

---

## 1. Reglas Mandatorias del Proyecto

Las siguientes directrices son de cumplimiento estricto para todo el ciclo de diseño, arquitectura y desarrollo:

1. **Referencia Visual y Template Oficial**:
   * Toda la interfaz, navegación, componentes, maquetación y estilos provienen del template ubicado en:  
     `InHubFlow - Social Selling/nextjs-admin-dashboard-main`.
   * No se deben inventar estructuras visuales ajenas a este template.

2. **Referencia Técnica Exclusiva (Hermano Mayor)**:
   * Para cualquier solución técnica, cliente de Unipile, lógica de escáneres de señales, algoritmos de extracción y modelos de datos, se debe consultar **únicamente** la carpeta `inhubflow-b2b`.
   * Ninguna otra carpeta externa debe usarse como referencia técnica.

3. **Color Dominante Principal**:
   * El color primario y dominante de la identidad de marca es: **`#0099ff`** (Azul InHubFlow).
   * Este código de color rige botones principales, bordes activos, acentos de navegación, badges de estado destacados y gráficos.

4. **Política de Cero Emoticonos (Sin Emojis)**:
   * Queda terminantemente prohibido el uso de emoticonos o emojis en la documentación, en el código fuente, en los textos de la interfaz de usuario y en cualquier comunicación del sistema.
   * La interfaz y la documentación deben mantener un estándar corporativo, sobrio y profesional.

5. **Arquitectura SaaS Nativa y Principio Multi-Tenant Obligatorio**:
   * Esta plataforma es por definición un Software como Servicio (SaaS) multi-tenant B2B. NO es una aplicación mono-usuario ni una herramienta de escritorio.
   * Este principio rige de forma transversal todas las configuraciones, bases de datos, APIs y componentes visuales:
     * **Aislamiento Estricto por Tenant**: Cada registro (cuentas de LinkedIn, secuencias de campañas, prospectos del CRM, conversaciones del Inbox, monitores de señales, publicaciones del Viral Engine y bases de conocimiento del SDR) está estrictamente indexado por `workspace_id` / `owner_id`. Ningún suscriptor puede ver datos de otro suscriptor.
     * **Monetización basada en Multislots**: La capacidad operativa de cada cliente está regulada por su suscripción activa: Plan Starter (1 slot / $49/mes), Plan Growth (5 slots / $149/mes) o Plan Business (10 slots / $279/mes).
     * **Aislamiento Intragrupo por Roles**: 
       * **Super Admin**: Roberto OrSe (`inhubflow@gmail.com`) con 999 slots y panel de control global de suscriptores (`/admin/subscribers`).
       * **Admin de Cuenta (Workspace Owner / Cliente SaaS)**: Supervisa todas las cuentas de LinkedIn de su organización, gestiona a su equipo (`/team`), asigna slots y contrata upgrades de plan (`/plans`).
       * **Miembro de Equipo (Operador SDR)**: Acceso restringido exclusivamente a su propia cuenta asignada de LinkedIn y a sus propios prospectos. No ve las cuentas del Admin ni de sus compañeros, no puede conectar perfiles nuevos y no tiene acceso a las áreas de equipo o facturación.

---

## 2. Visión y Propuesta de Valor

"Construye tu Marca Personal y Escala tu Facturación B2B usando el Asistente IA para LinkedIn"

InHubFlow - Social Selling es la plataforma hermana de InHubFlow B2B, diseñada para transformar el perfil de LinkedIn de fundadores, agencias y equipos comerciales en una máquina inbound de atracción, captura y conversión de clientes potenciales.

A diferencia del outreach en frío tradicional, esta suite combina:
1. **Viral Post Engine**: Creación y programación de contenido viral (posts de texto, posts con imagen y carruseles PDF visuales) para un mes completo en 5 minutos.
2. **Signal Radar de 3 Niveles**: Detección en tiempo real de prospectos con intención de compra que interactúan con tus posts (Lead Magnets ManyChat), con los de tu competencia o con posts clave de la red.
3. **Constructor Visual de Campañas (Estilo n8n)**: Un lienzo (canvas drag-and-drop) con nodos interactivos para diseñar flujos de prospección multietapa, con retardos humanos, bifurcaciones lógicas y envío de materiales (PDFs, audios y DMs).
4. **CRM Pipeline & Unified Inbox**: Gestión sin fricción desde el comentario inicial hasta la reunión comercial agendada en el calendario.

### 2.1 Principios Rectores Multi-Tenant Módulo por Módulo

Para garantizar que toda nueva funcionalidad se diseñe y ejecute bajo la óptica de un SaaS B2B, cada módulo debe cumplir con los siguientes estándares de multi-tenancy:

| Módulo | Comportamiento Multi-Tenant | Regla de Acceso por Rol |
| :--- | :--- | :--- |
| **Viral Post Engine** | Las publicaciones, borradores y plantillas pertenecen al `workspace_id`. Al programar un post, se selecciona la cuenta de LinkedIn (`account_id`) de los slots autorizados. | El Admin puede publicar en cualquier perfil del workspace. El Miembro solo puede programar para su cuenta asignada. |
| **Signal Radar** | Los monitores de señales (Nivel 1, 2 y 3) consumen la cuota de monitores del plan (5 en Starter, 20 en Growth, ilimitados en Business). | Compartidos a nivel de workspace para que todo el equipo comercial aproveche los leads captados. |
| **Campañas (Canvas n8n)** | Las secuencias se configuran a nivel de tenant y pueden orquestar envíos distribuidos entre múltiples cuentas de LinkedIn (`multi-account rotation`). | El Admin diseña y activa las campañas; los operadores ejecutan los pasos que requieran intervención en sus cuentas. |
| **Leads & CRM** | Directorio centralizado por tenant. Los prospectos pueden ser asignados a operadores específicos (`assigned_user_id`). | El Admin tiene visión panorámica del CRM; los operadores pueden filtrar por "Mis Leads Asignados". |
| **Inbox Unificado** | Bandejas segregadas por hilo y por cuenta de LinkedIn (`account_id`). | El Admin puede alternar y auditar los chats de todos sus operadores. El operador SDR solo ve sus propias conversaciones. |
| **Pipeline & Calendario** | Métricas de conversión y etapas del Kanban calculadas para el workspace. | Visión consolidada para el Admin y visión filtrada por asignación para el operador. |
| **Asistente SDR IA** | Cada tenant tiene su propio SDR Virtual con base de conocimiento propia (precios, servicios y objeciones de la empresa cliente), prompt de voz y correo de handoff. | El Admin define las políticas de IA. La cola de aprobaciones de un operador solo muestra los mensajes de su cuenta asignada. |
| **Cuentas de LinkedIn** | Gestión centralizada de cupos (slots) contratados. El sistema valida `active_slots <= max_slots` antes de permitir nuevas conexiones Unipile. | El Admin gestiona y asigna las cuentas. El Miembro solo ve y opera su cuenta asignada sin permisos de desvinculación. |

---

## 3. Mapa de Módulos del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 INHUBFLOW SOCIAL SELLING SUITE                                  │
├───────────────────┬───────────────────┬───────────────────┬───────────────────┬─────────────────┤
│ 1. VIRAL POST     │ 2. SIGNAL RADAR   │ 3. CAMPAÑAS (n8n) │ 4. LEADS & INBOX  │ 5. PIPELINE CRM │
│ - Radar Viral     │ - Nivel 1: Mis    │ - Canvas de Nodos │ - Listas por      │ - Kanban Sales  │
│   (Top 12 posts)  │   Posts (ManyChat)│   (React Flow)    │   Señal           │   Pipeline      │
│ - Modelador IA    │ - Nivel 2: Posts  │ - Triggers &      │ - Perfiles 360    │ - Calendario de │
│   (Texto/Img/PDF) │   Competencia     │   Acciones        │ - Inbox sin ruido │   Reuniones     │
│ - Calendario Drag │ - Nivel 3: Posts  │ - Delays y Pacing │ - Detección de    │ - Métricas de   │
│   and Drop        │   Globales        │   Humano          │   Respuestas      │   Conversión    │
└───────────────────┴───────────────────┴───────────────────┴───────────────────┴─────────────────┘
```

---

## 4. Especificación Detallada de Módulos

### MÓDULO 1: VIRAL POST (Generación & Programación de Contenido)

El objetivo de este módulo es posicionar la autoridad del perfil y generar el tráfico orgánico que alimenta los monitores de señales.

#### 1.1 Radar Viral
* **Búsqueda Inteligente**: El usuario ingresa un tema o palabra clave (ej. "Prospección con IA", "Social Selling B2B", "Outreach en LinkedIn").
* **Extracción de Top 12 Posts Virales**: Mediante búsquedas curadas e indexadas en LinkedIn, el sistema extrae las 12 publicaciones con mayor tracción reciente (ordenadas por volumen de Likes, Comentarios y Ratio de Interacción).
* **Vista en Cuadrícula de Tarjetas**:
  * Muestra autor, foto, titular, fecha y métricas de impacto (Likes, Comentarios, Compartidos).
  * Resumen del gancho (Hook) y primeras 3 líneas.
  * Modal de Lectura Completa: Permite visualizar el post íntegro, el formato original y la imagen/carrusel adjunto.
  * Botón de Acción Principal: "Modelar con IA" (acento en `#0099ff`).

#### 1.2 Modelador de Contenido con IA (Modal de Creación)
Al hacer clic en "Modelar con IA", se abre un configurador interactivo donde el usuario elige entre 3 Formatos:

1. **Formato "Solo Texto"**:
   * La IA analiza la estructura ganadora del post original (hook, storytelling, desarrollo, llamada a la acción) y reescribe un post original adaptado al tono de voz y oferta del usuario.
   * Editor de texto enriquecido con contador de caracteres y previsualización exacta de LinkedIn.
   * Botones: "Publicar Ahora" o "Programar".

2. **Formato "Texto + Imagen"**:
   * Genera el copy del post optimizado para acompañar un recurso visual.
   * Generador de Prompt Visual: La IA crea un prompt detallado optimizado para generadores de imágenes (Midjourney, Flux, DALL-E) que representa conceptualmente el mensaje del post.
   * Controles:
     * Botón "Copiar Prompt para IA".
     * Botón "Subir Imagen" (drag & drop con recorte y compresión).
     * Botones: "Publicar Ahora" o "Programar".

3. **Formato "Carrusel de Diapositivas (PDF para LinkedIn)"**:
   * **Generador de Diapositivas**: La IA desglosa el contenido en 5 a 10 diapositivas estructuradas:
     * Slide 1 (Portada): Titular magnético, gancho visual y autor.
     * Slides 2 a N-1 (Cuerpo): Puntos clave, diagramas explicativos, listas accionables o frameworks.
     * Slide Final (CTA): Llamada a la acción clara (ej. "Comenta SISTEMA para recibir la plantilla completa").
   * **Personalizador de Estilo Visual**:
     * Selección de paleta de colores corporativos con énfasis en `#0099ff`.
     * Tipografías de alto impacto (Nordique Pro, Inter, Montserrat).
     * Inclusión automática de logo, foto del autor y handle de LinkedIn (@tuperfil).
   * **Renderizador PDF Automático**: El sistema genera el archivo .pdf optimizado en vector/canvas listo para descargarse o para adjuntarse directamente a la publicación mediante la API de Unipile.

#### 1.3 Lista de Posts Creados (Vista de Gestión)
* Lista horizontal moderna con tarjetas a lo ancho:
  * Estado visual: Borrador | Programado | Publicado | Error.
  * Vista previa del formato (badge de Texto, Imagen o Carrusel).
  * Métricas post-publicación si ya fue emitido (Likes, Comentarios, Impresiones).
  * Acciones: Editar, Reprogramar, Publicar Inmediato, Eliminar.

#### 1.4 Calendario Editorial Drag & Drop
* Vista interactiva mensual, semanal y diaria (basada en el componente de calendario de `nextjs-admin-dashboard-main`).
* Indicadores de Horarios Óptimos de LinkedIn (franjas con mayor pico de actividad en la audiencia B2B).
* Capacidad de arrastrar (drag & drop) cualquier post entre días y horas para reprogramarlo al instante.

---

### MÓDULO 2: SIGNAL RADAR (Monitoreo de Intención de Compra)

El Radar de Señales convierte las interacciones pasivas de LinkedIn en prospectos listos para entrar al embudo de ventas.

```
┌────────────────────────────────────────────────────────────────────────────────┐
│                           ARQUITECTURA SIGNAL RADAR                            │
├─────────────────────┬───────────────────────────┬──────────────────────────────┤
│ NIVEL 1: MIS POSTS  │ NIVEL 2: COMPETENCIA      │ NIVEL 3: LINKEDIN GLOBAL     │
│ (Lead Magnet /      │ (Auditoría de Cuentas     │ (Monitoreo de Tendencias y   │
│ Flujo ManyChat)     │ Rivales)                  │ Palabras Clave)              │
├─────────────────────┼───────────────────────────┼──────────────────────────────┤
│ - Disparador:       │ - Disparador:             │ - Disparador:                │
│   Palabra Clave en  │   Likes / Comentarios en  │   Likes / Comentarios en     │
│   comentarios (ej.  │   posts de perfiles de    │   publicaciones virales de   │
│   "SISTEMA")        │   competidores            │   LinkedIn con keywords      │
│ - Intención:        │ - Intención:              │ - Intención:                 │
│   Muy Alta (Pide el │   Media-Alta (Interesados │   Media (Audiencia activa    │
│   recurso directo)  │   en soluciones rivales)  │   en la temática)            │
│ - Flujo:            │ - Flujo:                  │ - Flujo:                     │
│   Conectar + DM     │   Visitar -> Conectar con │   Visita -> Validación ICP ->│
│   con PDF adjunto   │   contexto de la temática │   Conectar con enfoque suave │
└─────────────────────┴───────────────────────────┴──────────────────────────────┘
```

#### Nivel 01: Mis Posts (Lead Magnet / Automatización ManyChat)
* **Objetivo**: Captura instantánea de leads a partir de posts propios con incentivos (Lead Magnets).
* **Mecánica**:
  1. El usuario publica un post o carrusel con un llamado a la acción: *"Comenta la palabra SISTEMA y te envío por privado la Guía en PDF"*.
  2. El monitor escucha periódicamente los comentarios de esa publicación.
  3. Al detectar la palabra clave configurada (SISTEMA, GUIA, PLANTILLA, etc.):
     * Paso A (Impulso Algorítmico): Da Like al comentario del usuario y responde un mensaje público: *"Te lo acabo de enviar por privado, revisa tus mensajes"*.
     * Paso B (Validación de Conexión):
       * Si ya es contacto de 1er grado: Envía de inmediato el DM con el archivo PDF adjunto.
       * Si no están conectados: Envía solicitud de conexión con nota personalizada contextual:
         > "Hola {{first_name}}, vi que comentaste 'SISTEMA' en mi post. Te envío la invitación para poder entregarte la guía por mensaje privado. Saludos."
       * Una vez que acepta la conexión: El sistema detecta el cambio de estado y dispara el mensaje directo con el PDF.

#### Nivel 02: Posts de la Competencia
* **Objetivo**: Prospectar a las personas que interactúan activamente con competidores directos.
* **Mecánica**:
  1. Configuración de cuentas objetivo (ej. perfiles de fundadores, agencias o empresas rivales como Adapta IA).
  2. Filtrado por palabra clave en el contenido del post (ej. "Prospección B2B", "Agentes IA").
  3. Extracción de los perfiles que dejaron Like o Comentario.
  4. Disparo de secuencia relacional:
     > "Hola {{first_name}}, vi tu interacción en el post de [Competidor] sobre {{tema}}. Me pareció muy interesante tu punto de vista sobre... ¿cómo lo están abordando en {{company}}?"

#### Nivel 03: Posts Globales de LinkedIn
* **Objetivo**: Captar interacciones sobre tópicos específicos en cualquier publicación de la red.
* **Mecánica**:
  1. Búsqueda de posts populares con base en términos de búsqueda clave.
  2. Escaneo de interacciones (Likes/Comentarios) filtrando perfiles según criterios de ICP (Cargo y Ubicación).
  3. Entrada automática al embudo de prospección.

---

### MÓDULO 3: CAMPAÑAS (Constructor Visual de Secuencias Estilo n8n)

Este es el núcleo operativo de la plataforma. La construcción de secuencias se realiza a través de un **Lienzo Basado en Nodos (Node Graph Canvas)** utilizando **React Flow (`@xyflow/react`)**.

```
  [ TRIGGER: Monitor Nivel 1 ("SISTEMA") ]
                      │
                      ▼
            [ ACCION: Visitar Perfil ]
                      │
                      ▼
         [ ACCION: Dar Like y Comentar Último Post ]
                      │
                      ▼
         [ CONDICION: ¿Es Contacto de 1er Grado? ]
             ├── SI ──────────────────────────────────────┐
             │                                            │
             └── NO ──► [ ACCION: Seguir y Conectar ]     │
                                    │                     │
                                    ▼                     │
                     [ DELAY: Esperar Aceptación ]        │
                            (Máximo 5 días)               │
                                    │                     │
                                    ▼                     │
                     [ CONDICION: ¿Aceptó? ]              │
                         ├── SI ◄─────────────────────────┘
                         │       │
                         │       ▼
                         │  [ ACCION: Enviar DM + Adjuntar PDF Lead Magnet ]
                         │       │
                         │       ▼
                         │  [ DELAY: Esperar 48 Horas ]
                         │       │
                         │       ▼
                         │  [ CONDICION: ¿Respondió al Mensaje? ]
                         │       ├── SI ──► [ DETENER SECUENCIA & MOVER A KANBAN "Interesado" ]
                         │       └── NO ──► [ ACCION: Enviar Follow-up o Audio ]
                         │
                         └── NO ──► [ ACCION ALTERNATIVA: Enviar Sales Nav InMail (Opcional) ]
```

#### 3.1 Catálogo de Nodos Disponibles

| Categoría | Código | Nombre del Nodo | Configuración Técnica |
| :--- | :---: | :--- | :--- |
| **TRIGGER** | TR-01 | **Signal Monitor Trigger** | Selecciona el Monitor fuente (Nivel 1, Nivel 2 o Nivel 3) y la regla de activación. |
| **TRIGGER** | TR-02 | **Lead List Trigger** | Dispara el flujo para una lista importada de contactos (CSV o búsqueda). |
| **ACTION** | AC-01 | **Visitar Perfil** | Ejecuta visita mediante Unipile para figurar en las notificaciones del prospecto. |
| **ACTION** | AC-02 | **Dar Like y Comentar** | Paso unificado: Reacciona con Like y publica comentario contextual/IA en el último post del lead. |
| **ACTION** | AC-03 | **Seguir y Conectar** | Paso unificado: Sigue automáticamente el perfil del lead y envía solicitud de conexión con o sin nota personalizada. |
| **ACTION** | AC-04 | **Enviar Mensaje (DM)** | Envía DM en LinkedIn. Soporta texto, notas de voz (audio) y adjuntos (PDFs o imágenes). |
| **ACTION** | AC-05 | **InMail Sales Navigator** | Para cuentas con Sales Nav; envía InMail a prospectos fuera de red sin consumir conexión. |
| **LOGIC** | LG-01 | **Delay / Retardo** | Configura tiempo de espera (ej. 24h, 3 días) y ventana de horario laboral (L-V de 09:00 a 18:00). |
| **LOGIC** | LG-02 | **Condición Lógica** | Evalúa ramas: ¿Es contacto?, ¿Aceptó en X tiempo?, ¿Respondió al mensaje? |
| **CRM** | CR-01 | **Actualizar Etapa CRM** | Mueve automáticamente la tarjeta del prospecto en el Kanban del Pipeline. |
| **CONTROL** | CT-01 | **Finalizar Flujo** | Concluye la secuencia para el prospecto. |

#### 3.2 Motor de Seguridad y Pacing Humano
* **Límites Diarios Configurables**:
  * Máximo 20–25 invitaciones de conexión al día.
  * Máximo 30–40 mensajes directos al día.
* **Intervalos Aleatorios (Jitter)**:
  * Entre cada acción consecutiva, el sistema introduce pausas variables de 3 a 12 minutos simulando el comportamiento de un usuario real.
* **Detección Automática de Respuesta**:
  * En cuanto el prospecto responde a cualquier mensaje, la automatización para ese contacto se detiene de inmediato y se genera notificación en el Inbox.

---

### MÓDULO 4: LEADS & CRM DE PROSPECTOS

Centro de administración de contactos captados por el ecosistema.

* **Segmentación por Listas**: Cada monitor de señales alimenta su propia lista dinámica (ej. "Leads Nivel 1 - Post SISTEMA", "Leads Competencia - Adapta IA").
* **Ficha 360 del Contacto**:
  * Datos personales: Nombre, Cargo, Empresa, Ubicación, Foto de perfil, URL de LinkedIn.
  * Datos de contacto: Email y teléfono (si están públicos o fueron compartidos).
  * Historial de Flujo: Registro cronológico de cada paso de la campaña.
  * Estado de la Secuencia: En Progreso, Respondido, Completado, Pausado.
* **Exportación**: Exportación a CSV y opciones de sincronización.

---

### MÓDULO 5: INBOX UNIFICADO (Enfocado en Conversión)

Un buzón de mensajería diseñado exclusivamente para ventas, eliminando el ruido de LinkedIn.

* **Bandeja Filtrada por Campañas**: Solo se muestran las conversaciones generadas a través de secuencias y monitores activos.
* **Soporte Multimedia**: Visualización y envío de texto, notas de voz y documentos PDF adjuntos.
* **Sugerencias de Respuesta con IA (SDR Co-Pilot)**:
  * La IA analiza la respuesta del prospecto y sugiere 3 respuestas inteligentes con un clic para avanzar hacia el agendamiento.
* **Acciones Rápidas en el Chat**:
  * Botón para mover de etapa en el Kanban (marcar como "Interesado" o "Reunión Agendada").
  * Envío con un clic del enlace de agendamiento de reuniones.

---

### MÓDULO 6: PIPELINE & CALENDARIO COMERCIAL

El puente entre las conversaciones en LinkedIn y las reuniones cerradas.

#### 6.1 Tablero Kanban Comercial
Flujo de estados visual con tarjetas arrastrables:
1. **Lead Captado**: Interacción registrada en el monitor.
2. **En Secuencia**: Flujo de automatización activo (visita/conexión).
3. **Conectado / Material Entregado**: Contacto de 1er grado con el recurso entregado.
4. **Conversación Activa / Interesado**: El lead respondió positivamente al mensaje.
5. **Reunión Agendada**: Cita pactada en el calendario.
6. **Propuesta Presentada**: En fase de negociación u oferta comercial.
7. **Ganado (Closed Won)** / **Perdido (Closed Lost)**.

#### 6.2 Calendario Integrado
* Vista de disponibilidad y reuniones agendadas (basada en el layout de `nextjs-admin-dashboard-main`).
* Integración con proveedores de calendario (Google Calendar, Outlook) y enlaces de agendamiento.
* Detección y ajuste automático de zona horaria.

---

## 5. Arquitectura Técnica y Fuente de Componentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      FRONTEND & INTERFAZ DE USUARIO                         │
│  - Template Base: nextjs-admin-dashboard-main (Next.js + Tailwind CSS)     │
│  - Color Dominante: #0099ff en acentos, botones primarios y gráficos        │
│  - Canvas de Secuencias: @xyflow/react (React Flow)                         │
│  - Iconografía: Lucide React (Sin emoticonos)                               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    SERVICIOS TÉCNICOS & HERMANO MAYOR                       │
│  - Consultar Unicamente: inhubflow-b2b                                       │
│  - Cliente Unipile: Métodos validados de lib/unipile/client.ts              │
│  - Escáneres de Señales: lib/signals/scanners/index.ts (Nivel 1, 2 y 3)      │
│  - Persistencia: Modelos de datos PostgreSQL / Supabase                      │
│  - Generación de Carruseles: Conversión de esquemas a PDF vectorial         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Arquitectura SaaS, Sistema Multislots y Modelo de Roles

Siguiendo el modelo validado en `inhubflow-b2b`, la plataforma opera bajo una arquitectura SaaS multi-tenant con control estricto de cupos (slots) de cuentas de LinkedIn conectables.

### 7.1 Jerarquía de Roles
1. **Super Admin (Roberto OrSe / inhubflow@gmail.com)**:
   * Control maestro de toda la infraestructura y del SaaS.
   * Capacidad ilimitada (999 slots asignados).
   * Acceso exclusivo al **Panel de Administracion SaaS** (`/admin/subscribers`), donde puede auditar a todos los clientes, crear suscriptores manualmente, modificar planes/slots, suspender cuentas y alternar la vista a cualquier organizacion para soporte y auditoria.
2. **Admin de Cuenta / Cliente (Tenant Admin / Workspace Owner)**:
   * Cada suscriptor es el Administrador de su empresa/organizacion.
   * Administra sus slots contratados (1, 5 o 10 perfiles).
   * Puede invitar a operadores/colaboradores en el modulo de Equipo (`/team`) y asignarles cuentas especificas de su cuota.
   * Al alcanzar el tope de slots contratados, el sistema bloquea nuevas vinculaciones y ofrece la opcion de upgrade de plan.

### 7.2 Los 3 Planes Oficiales de Multislots

| Parametro | Plan Starter | Plan Growth (Recomendado) | Plan Business |
| :--- | :---: | :---: | :---: |
| **Slots de LinkedIn** | **1 Cuenta Conectada** | **5 Cuentas Conectadas** | **10 Cuentas Conectadas** |
| **Audiencia Objetivo** | Fundadores, consultores y creadores | Agencias en expansion y equipos SDR | Agencias consolidadas y grandes ventas |
| **Operadores de Equipo** | 1 Usuario (Solo el Admin) | 1 Admin + hasta 5 miembros | 1 Admin + hasta 10 miembros |
| **Viral Post Engine** | Completo (Texto, Imagen y PDF) | Ilimitado | Ilimitado con soporte prioritario |
| **Signal Radar** | Nivel 1, 2 y 3 (Hasta 5 monitores) | Nivel 1, 2 y 3 (Hasta 20 monitores) | Monitores ilimitados en tiempo real |
| **Campañas Activas** | Hasta 3 campanas simultaneas | Campanas ilimitadas | Campanas ilimitadas multi-cuenta |
| **Pacing Humano** | Si (20-25 inv/dia, 30 DMs/dia) | Si (por cada cuenta conectada) | Si (con rotacion balanceada) |
| **Precio Mensual** | $49 / mes | $149 / mes | $279 / mes |
| **Precio Anual (-20%)** | $39 / mes | $119 / mes | $229 / mes |

### 7.3 Asistente SDR IA (Réplica de la Arquitectura de `inhubflow-b2b`)

El módulo del Asistente SDR IA (`/sdr`) replica fielmente el motor conversacional y de seguridad de `inhubflow-b2b`:

1. **4 Modos Operativos Configurables**:
   * **Desactivado (Off)**: Agente pausado sin procesar mensajes entrantes.
   * **Modo Sombra (Shadow)**: Analiza y clasifica respuestas en segundo plano para medir efectividad sin enviar nada al lead.
   * **Supervisión con Aprobación (Approval - Human-in-the-Loop)**: Modo por defecto. Genera borradores contextuales que se encolan para revisión humana de un solo clic.
   * **Autónomo Seguro (Auto)**: Responde directamente en LinkedIn únicamente si la confianza supera el umbral configurado (ej. 85%) y el nivel de riesgo es bajo.

2. **Clasificación Estructurada de Intenciones (Gemini 3.6 Flash)**:
   * Detecta 14 intenciones comerciales: `interested`, `meeting_request`, `pricing_question`, `product_question`, `objection`, `integration_question`, `proposal_request`, `not_interested`, `unsubscribe`, `human_requested`, `referral`, `ooo`, `ambiguous` y `hostile_or_legal`.

3. **Base de Conocimiento Aprobada (RAG Ligero)**:
   * Evita alucinaciones comerciales limitando las respuestas a documentos aprobados en 5 categorías: Propuesta de Valor, Precios y Planes, Manejo de Objeciones, Protocolos de Reunión y Reglas de Handoff.

4. **Cola de Aprobaciones Human-in-the-Loop**:
   * Interfaz interactiva donde los operadores pueden aprobar y despachar a LinkedIn, editar el borrador, escalar a un humano o descartar la acción.

5. **Puertas de Seguridad (Promotion Gates)**:
   * 5 comprobaciones técnicas que certifican la salud del modelo, base de conocimiento y políticas de seguridad antes de habilitar el modo autónomo.

6. **Simulador Interactivo (Playground)**:
   * Consola de pruebas en tiempo real con latencia medida en milisegundos, citas de conocimiento aplicadas y resumen de razonamiento de la IA.

---

### 7.4 Arquitectura de Integración de Unipile (Cliente de Producción & Sandbox de Alta Fidelidad)

Para garantizar que el usuario pueda probar, ajustar y certificar la totalidad de la plataforma antes de consumir sus 7 días de prueba gratuitos de Unipile, se ha implementado una arquitectura de dos capas idéntica técnicamente a `inhubflow-b2b`:

1. **Librería de Producción de Alta Fidelidad (`src/lib/unipile/`)**:
   * Portado íntegro de tipos TypeScript (`types.ts`) y cliente (`client.ts`) con 549 líneas de lógica validada en producción.
   * Métodos implementados:
     * **Autenticación**: `getHostedAuthLink()`, `startCredentialsAuth()`, `solveCheckpoint()`.
     * **Gestión de Cuentas**: `listAccounts()`, `getAccount()`, `deleteAccount()`, `getOwnProfile()`, `resolveProfile()`.
     * **Signal Radar**: `getUserPosts()`, `getPost()`, `getPostComments()`, `getPostReactions()`, `reactToPost()`, `commentOnPost()`, `createPost()`.
     * **Mensajería**: `listChats()`, `listMessages()`, `listChatAttendees()`, `listAccountMessages()`, `startChat()`, `sendMessage()`.
     * **Prospección**: `sendInvitation()`, `followUser()`, `searchLinkedIn()`, `listLinkedInSearchParameters()`.

2. **Modo Sandbox / Emulación Cero-Costo**:
   * Si no se configuran credenciales en el archivo `.env` (`UNIPILE_DSN` o `UNIPILE_API_KEY`), el cliente entra en modo Sandbox transparente.
   * Emula las respuestas HTTP 200/201 reales con contratos JSON idénticos a los de Unipile.
   * Permite probar la interfaz completa, enviar mensajes y capturar leads sin gastar un solo segundo ni cuota de los 7 días de prueba.
   * En cuanto se ingresan las credenciales reales en producción, la plataforma pasa a comunicarse en vivo con LinkedIn sin requerir modificaciones en el código.

### 7.5 Receptor de Webhooks, Validación Criptográfica HMAC e Inyector de Pruebas

1. **Endpoint Oficial de Webhook (`/api/unipile/webhook`)**:
   * Recibe eventos en tiempo real enviados por Unipile:
     * `message_received`: Mensajes entrantes de LinkedIn inyectados en tiempo real al Inbox y clasificados por el Asistente SDR IA.
     * `invitation_accepted` / `new_relation`: Actualiza el grado de relación a 1er grado y despierta las secuencias de Social Selling.
     * `comment_received`: Si coincide con palabras clave del Signal Radar (ej. "SISTEMA"), captura al lead automáticamente.
     * `account_status_changed`: Actualiza la salud de las cuentas en el store multi-tenant.
   * Validación criptográfica HMAC-SHA256 (`verifyUnipileSignature`) con tolerancia temporal de 300 segundos.

2. **Simulador y Testeador en Vivo (`/support/docs` y `/api/unipile/simulate-event`)**:
   * Panel visual e interactivo donde el usuario puede disparar con un clic 4 escenarios reales: mensaje entrante, invitación aceptada, comentario en post y cambio de estado de cuenta.
   * Permite certificar el funcionamiento de extremo a extremo sin dependencia de conexiones externas.

### 7.6 Motor de Ejecución de Campañas (`Campaign Runner` & Límites de Pacing)

1. **Lógica de Ejecución Automática (`src/lib/campaigns/runner.ts`)**:
   * Recorre los nodos y aristas diseñados en el lienzo de `@xyflow/react` para cada lead activo.
   * Modela y ejecuta 5 familias de nodos:
     * **Disparadores**: Inicio por palabra clave en post o lista de prospectos.
     * **Acciones**: Visita de perfil, envío de invitación de conexión y despacho de mensaje directo (DM) con recurso PDF.
     * **Lógica & Bifurcación**: Evaluación condicional (`is_1st_degree`, `accepted_invite`, `replied_to_dm`) con ramificación en dos caminos (`true` / `false`).
     * **Retardo Humano (Delays)**: Pausas configurables en horas o días que operan dentro del horario laboral (09:00 - 18:00).
     * **Control de Seguridad**: Detención automática de la secuencia en cuanto el prospecto responde (*Stop on Reply*).
   * **Pacing Diario Estricto**: Control de límites por cuenta (máximo 25 invitaciones y 40 DMs diarios) con jitter aleatorio para proteger los perfiles de LinkedIn contra bloqueos.
   * **API & Consola de Auditoría**: Endpoint `/api/campaigns/run` y visor en vivo de logs accesible directamente desde el header de `/campaigns`.

### 7.7 Pasarela de Facturación Recurrente (Lemon Squeezy Billing Webhook)

1. **Provisión Automática de Multislots (`/api/webhooks/lemonsqueezy`)**:
   * Valida firmas criptográficas HMAC-SHA256 en la cabecera `x-signature`.
   * Procesa eventos de suscripción (`subscription_created`, `order_created`, `subscription_cancelled`).
   * Asigna automáticamente los slots según el plan contratado:
     * Plan Starter: 1 slot ($49/mes)
     * Plan Growth: 5 slots ($149/mes)
     * Plan Business: 10 slots ($279/mes)
   * Soporta atribución automática para partners y códigos promocionales.

---

## 8. Próximos Pasos para Ejecución

1. **Revisión del Template**: Cumplido con estructura de Next.js App Router y Tailwind.
2. **Integración de Identidad**: Color primario `#0099ff` activo en toda la plataforma.
3. **Canvas n8n & Campaign Runner**: Lienzo `@xyflow/react` con motor de ejecución y control de pacing 100% implementado.
4. **Integración Unipile & Sandbox Cero-Costo**: Cliente de 549 líneas, Webhooks HMAC y emulador interactivo operativos.
5. **Generador de Carruseles y Viral Engine**: Editor con exportación a PDF y programación en calendario activo.
6. **Pasarela de Facturación**: Webhook de aprovisionamiento de Lemon Squeezy listo para producción.



