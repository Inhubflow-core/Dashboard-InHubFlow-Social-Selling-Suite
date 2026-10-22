"use client";

import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  getStoredLinearCampaigns,
  saveStoredLinearCampaigns,
  initialLinearCampaigns,
  defaultListsSequenceSteps,
  defaultLeadMagnetSequenceSteps,
  sanitizeUnipileText,
  sanitizeSequenceStep,
} from "@/lib/campaigns/store";
import type {
  LinearSequenceCampaign,
  SequenceStepItem,
  SocialStepType,
  MessageAttachmentType,
} from "@/lib/campaigns/types";
import type { CampaignExecutionLog } from "@/lib/campaigns/runner";
import { getStoredLeadLists, getStoredLeads } from "@/lib/leads/store";
import type { LeadListGroup, Lead360Item } from "@/lib/leads/types";
import {
  Pencil,
  X,
  Clock,
  Plus,
  Minus,
  Eye,
  ThumbsUp,
  MessageSquare,
  UserPlus,
  UserCheck,
  Send,
  MessageCircle,
  Sparkles,
  Shield,
  Play,
  CheckCircle2,
  Zap,
  FileText,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Info,
  ExternalLink,
  Terminal,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic,
  Paperclip,
  Volume2,
  Upload,
  Trash2,
  Square,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { getActiveAccountForUser } from "@/lib/unipile/store";

export default function CampaignsPage() {
  const { currentUser } = useAuth();
  const [campaigns, setCampaigns] = useState<LinearSequenceCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("seq-lead-lists");
  const [leadLists, setLeadLists] = useState<LeadListGroup[]>([]);
  const [linkedList, setLinkedList] = useState<LeadListGroup | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Modales
  const [editingStep, setEditingStep] = useState<{ step: SequenceStepItem; index: number } | null>(null);
  const [showPacingModal, setShowPacingModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showAddStepModal, setShowAddStepModal] = useState(false);

  // Popover de delay
  const [openDelayPopoverIndex, setOpenDelayPopoverIndex] = useState<number | null>(null);

  // Runner y Avisos
  const [isExecutingRunner, setIsExecutingRunner] = useState(false);
  const [simulatedStepIndex, setSimulatedStepIndex] = useState<number>(0);
  const [runnerLogs, setRunnerLogs] = useState<CampaignExecutionLog[]>([]);
  const [runnerNotice, setRunnerNotice] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Estados para Banco de Pruebas en Lead Individual (Testing)
  const [allLeads, setAllLeads] = useState<Lead360Item[]>([]);
  const [testLeadName, setTestLeadName] = useState<string>("Roberto OrSe");
  const [testLinkedinUrl, setTestLinkedinUrl] = useState<string>("https://www.linkedin.com/in/robertoorse");
  const [testCompany, setTestCompany] = useState<string>("InHubFlow");
  const [testConnectionDegree, setTestConnectionDegree] = useState<"1st" | "2nd">("1st");
  const [testMode, setTestMode] = useState<"dry_run" | "live">("dry_run");
  const [testSourceMode, setTestSourceMode] = useState<"manual" | "list">("manual");
  const [testSelectedListId, setTestSelectedListId] = useState<string>("");
  const [testSelectedLeadId, setTestSelectedLeadId] = useState<string>("");
  const [isTestBenchExpanded, setIsTestBenchExpanded] = useState<boolean>(true);
  const [lastTestResultLog, setLastTestResultLog] = useState<CampaignExecutionLog | null>(null);

  // Cuenta activa de LinkedIn
  const activeAccount = useMemo(() => {
    return getActiveAccountForUser(currentUser);
  }, [currentUser]);

  // Referencias para carga de archivos
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const videoInputRef = useRef<HTMLInputElement | null>(null);
  const audioInputRef = useRef<HTMLInputElement | null>(null);
  const documentInputRef = useRef<HTMLInputElement | null>(null);

  // Grabación de notas de voz con micrófono en vivo
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Limpiar temporizadores de grabación al desmontar
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const handleUploadAttachmentFile = (e: React.ChangeEvent<HTMLInputElement>, type: MessageAttachmentType) => {
    const file = e.target.files?.[0];
    if (!file || !editingStep) return;

    const sizeFormatted =
      file.size > 1024 * 1024
        ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
        : `${Math.round(file.size / 1024)} KB`;

    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const dataUrl = loadEvent.target?.result as string;
      setEditingStep((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          step: {
            ...prev.step,
            attachmentType: type,
            attachmentName: file.name,
            attachmentSize: sizeFormatted,
            attachmentUrl: dataUrl,
            attachedResource: type === "document" ? file.name : prev.step.attachedResource,
          },
        };
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveAttachment = () => {
    if (!editingStep) return;
    setEditingStep({
      ...editingStep,
      step: {
        ...editingStep.step,
        attachmentType: "none",
        attachmentName: undefined,
        attachmentUrl: undefined,
        attachmentSize: undefined,
        attachedResource: undefined,
      },
    });
  };

  const startVoiceRecording = async () => {
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        alert("La grabación de audio no está disponible en este navegador.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        setEditingStep((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            step: {
              ...prev.step,
              attachmentType: "voice_note",
              attachmentName: `nota-voz-${Date.now()}.webm`,
              attachmentUrl: audioUrl,
              voiceNoteDurationSec: Math.max(1, recordingSeconds),
              attachmentSize: `${Math.round(audioBlob.size / 1024)} KB`,
            },
          };
        });
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setIsRecordingVoice(true);
      setRecordingSeconds(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err) {
      console.warn("Error accediendo al micrófono:", err);
      alert("No se pudo acceder al micrófono. Puedes subir un archivo de audio (.mp3, .m4a) directamente.");
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  // Cargar campañas, listas y prospectos
  useEffect(() => {
    const stored = getStoredLinearCampaigns();
    setCampaigns(stored);
    const lists = getStoredLeadLists();
    setLeadLists(lists);
    const leads = getStoredLeads();
    setAllLeads(leads);
    setIsLoaded(true);

    // Revisar si viene listId por URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const listIdParam = params.get("listId");
      if (listIdParam && stored.length > 0) {
        const found = lists.find((l) => l.id === listIdParam);
        if (found) {
          setLinkedList(found);
          setTestSelectedListId(found.id);
          setTestSourceMode("list");
          const matching = leads.filter(
            (ld) =>
              ld.listId === found.id ||
              (found.sourceMonitorId && (ld as any).monitorId === found.sourceMonitorId) ||
              (found.competitorName && ld.company?.toLowerCase().includes(found.competitorName.toLowerCase()))
          );
          if (matching.length > 0) {
            setTestSelectedLeadId(matching[0].id);
            setTestLeadName(matching[0].fullName);
            setTestLinkedinUrl(matching[0].linkedinUrl);
            setTestCompany(matching[0].company || found.competitorName || "");
            setTestConnectionDegree("2nd");
          }
        }
        const isMagnet = listIdParam.includes("n1") || listIdParam.includes("magnet");
        setSelectedCampaignId(isMagnet ? "seq-lead-magnet" : "seq-lead-lists");
      }
    }
  }, []);

  const handleSelectTestList = (listId: string) => {
    setTestSelectedListId(listId);
    if (!listId) {
      setTestSelectedLeadId("");
      return;
    }
    const targetList = leadLists.find((l) => l.id === listId);
    const matchingLeads = allLeads.filter(
      (ld) =>
        ld.listId === listId ||
        (targetList?.sourceMonitorId && (ld as any).monitorId === targetList.sourceMonitorId) ||
        (targetList?.competitorName && ld.company?.toLowerCase().includes(targetList.competitorName.toLowerCase()))
    );
    if (matchingLeads.length > 0) {
      const first = matchingLeads[0];
      setTestSelectedLeadId(first.id);
      setTestLeadName(first.fullName);
      setTestLinkedinUrl(first.linkedinUrl);
      setTestCompany(first.company || targetList?.competitorName || "");
      setTestConnectionDegree("2nd");
    } else {
      setTestSelectedLeadId("");
    }
  };

  const handleSelectTestLead = (leadId: string) => {
    setTestSelectedLeadId(leadId);
    const found = allLeads.find((ld) => ld.id === leadId);
    if (found) {
      setTestLeadName(found.fullName);
      setTestLinkedinUrl(found.linkedinUrl);
      setTestCompany(found.company || "");
      setTestConnectionDegree("2nd");
    }
  };

  const handleApplyPreset = (preset: "connected_roberto" | "unconnected_agency" | "clean_manual") => {
    if (preset === "connected_roberto") {
      setTestSourceMode("manual");
      setTestLeadName("Roberto OrSe");
      setTestLinkedinUrl("https://www.linkedin.com/in/robertoorse");
      setTestCompany("InHubFlow");
      setTestConnectionDegree("1st");
      setFeedbackMessage("Preset cargado: Roberto OrSe (1er Grado - Ya conectados)");
    } else if (preset === "unconnected_agency") {
      setTestSourceMode("manual");
      setTestLeadName("Roberto OrSe Agencia");
      setTestLinkedinUrl("https://www.linkedin.com/in/robertoorse-agencia");
      setTestCompany("Agencia OrSe");
      setTestConnectionDegree("2nd");
      setFeedbackMessage("Preset cargado: Roberto OrSe Agencia (2º Grado - No conectados)");
    } else {
      setTestSourceMode("manual");
      setTestLeadName("");
      setTestLinkedinUrl("https://www.linkedin.com/in/");
      setTestCompany("");
      setTestConnectionDegree("2nd");
      setFeedbackMessage("Campos limpiados para ingreso manual");
    }
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  // Cerrar popover al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-delay-popover]")) {
        setOpenDelayPopoverIndex(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const activeCampaign = useMemo(() => {
    return campaigns.find((c) => c.id === selectedCampaignId) || campaigns[0] || initialLinearCampaigns[0];
  }, [campaigns, selectedCampaignId]);

  const updateActiveCampaign = (updater: (prev: LinearSequenceCampaign) => LinearSequenceCampaign) => {
    setCampaigns((prev) => {
      const updated = prev.map((c) => (c.id === activeCampaign.id ? updater(c) : c));
      saveStoredLinearCampaigns(updated);
      return updated;
    });
  };

  const handleUpdateStepDelay = (stepIndex: number, newDays: number) => {
    updateActiveCampaign((c) => {
      const nextSteps = [...c.steps];
      if (nextSteps[stepIndex]) {
        nextSteps[stepIndex] = {
          ...nextSteps[stepIndex],
          delayDaysBefore: Math.max(0, newDays),
        };
      }
      return {
        ...c,
        steps: nextSteps,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const handleDeleteStep = (stepIndex: number) => {
    if (confirm("¿Deseas eliminar este paso de la secuencia?")) {
      updateActiveCampaign((c) => {
        const nextSteps = c.steps.filter((_, idx) => idx !== stepIndex);
        return {
          ...c,
          steps: nextSteps,
          updatedAt: new Date().toISOString(),
        };
      });
    }
  };

  const handleSaveStepModal = (updatedStep: SequenceStepItem) => {
    if (!editingStep) return;
    const sanitized = sanitizeSequenceStep(updatedStep);
    if (editingStep.index === 0) {
      sanitized.delayDaysBefore = 0;
    }
    updateActiveCampaign((c) => {
      const nextSteps = [...c.steps];
      nextSteps[editingStep.index] = sanitized;
      return {
        ...c,
        steps: nextSteps,
        updatedAt: new Date().toISOString(),
      };
    });
    setEditingStep(null);
    setFeedbackMessage("Paso de la secuencia actualizado exitosamente.");
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const handleAddStep = (type: SocialStepType) => {
    let title = "Nuevo Paso";
    let description = "Paso adicional en la secuencia.";
    let messageTemplate = "";

    if (type === "visit") {
      title = "Visitar Perfil";
      description = "Visita el perfil en LinkedIn para generar visibilidad previa en notificaciones.";
    } else if (type === "like_comment") {
      title = "Like + Comentario";
      description = "Interactúa con la publicación más reciente del prospecto.";
      messageTemplate = "Excelente perspectiva {{first_name}}, totalmente de acuerdo.";
    } else if (type === "connect") {
      title = "Seguir + Conectar";
      description = "Sigue el perfil en LinkedIn y envía solicitud de conexión con nota contextual en una sola acción.";
      messageTemplate = "Hola {{first_name}}, vi tu actividad sobre {{topic}} y me pareció muy interesante. Me encantaría conectar por aquí.";
    } else if (type === "message_icebreaker") {
      title = "Mensaje DM 01 'Icebreakers'";
      description = "Primer mensaje directo en LinkedIn tras conectar.";
      messageTemplate = "Hola {{first_name}}, vi tu aportación sobre {{topic}}. ¿Cómo lo resuelven en {{company}}?";
    } else if (type === "message_followup") {
      title = "Mensaje DM 'Follow-up'";
      description = "Mensaje de seguimiento de valor.";
      messageTemplate = "Hola {{first_name}}, te comparto este caso práctico breve sobre {{topic}}.";
    } else if (type === "message_value_prop") {
      title = "Mensaje DM 'Value Prop'";
      description = "Propuesta de valor y llamada a la acción.";
      messageTemplate = "Hola {{first_name}}, si deseas optimizar el pipeline de {{company}}, podemos conversar 15 min esta semana.";
    }

    const newStepItem: SequenceStepItem = {
      id: `step-${Date.now()}`,
      order: activeCampaign.steps.length + 1,
      type,
      title,
      description,
      delayDaysBefore: 1,
      messageTemplate,
    };

    updateActiveCampaign((c) => ({
      ...c,
      steps: [...c.steps, newStepItem],
      updatedAt: new Date().toISOString(),
    }));

    setShowAddStepModal(false);
  };

  const handleResetSequence = () => {
    if (confirm("¿Restablecer la secuencia actual a su plantilla por defecto?")) {
      updateActiveCampaign((c) => {
        const defaultSteps =
          c.code === "01_lists" ? defaultListsSequenceSteps : defaultLeadMagnetSequenceSteps;
        return {
          ...c,
          steps: defaultSteps,
          updatedAt: new Date().toISOString(),
        };
      });
      setFeedbackMessage("Secuencia restablecida a su estructura estándar.");
      setTimeout(() => setFeedbackMessage(null), 3000);
    }
  };

  const handleExecuteRunnerSim = async () => {
    setIsExecutingRunner(true);
    setRunnerNotice(null);
    try {
      const stepToExecute = simulatedStepIndex < activeCampaign.steps.length ? simulatedStepIndex : 0;
      const targetName = testLeadName.trim() || "Roberto OrSe";
      const targetUrl = testLinkedinUrl.trim() || "https://www.linkedin.com/in/robertoorse-agencia";
      const targetCompany = testCompany.trim() || "InHubFlow";
      const isDry = testMode === "dry_run";

      const res = await fetch("/api/campaigns/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign: activeCampaign,
          stepIndex: stepToExecute,
          leadName: targetName,
          linkedinUrl: targetUrl,
          connectionDegree: testConnectionDegree,
          company: targetCompany,
          dryRun: isDry,
          accountId: activeAccount?.unipileAccountId || activeAccount?.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const currentTitle = activeCampaign.steps[stepToExecute]?.title || "Paso";
        const modeLabel = isDry ? "[Simulación]" : "[En Vivo]";
        if (data.result?.success === false) {
          setRunnerNotice(`${modeLabel} Falló Paso ${stepToExecute + 1} (${currentTitle}): ${data.result?.log?.message || "Error al procesar"}`);
        } else if (data.result?.isSequenceCompleted) {
          setRunnerNotice(`${modeLabel} Secuencia completada: Todos los pasos (${activeCampaign.steps.length}) ejecutados para ${targetName}.`);
          setSimulatedStepIndex(0);
        } else {
          setRunnerNotice(`${modeLabel} Paso ${stepToExecute + 1} (${currentTitle}) ejecutado para ${targetName}.`);
          setSimulatedStepIndex(data.result.nextStepIndex ?? (stepToExecute + 1));
        }
        setTimeout(() => setRunnerNotice(null), 6000);
        setRunnerLogs(data.logs || []);
        if (data.result?.log) {
          setLastTestResultLog(data.result.log);
        }
      } else {
        setRunnerNotice(`[Error] ${data.error || "No se pudo ejecutar el paso"}`);
        setTimeout(() => setRunnerNotice(null), 6000);
      }
    } catch (err: any) {
      console.warn("Error en runner:", err);
      setRunnerNotice(`[Error de red] ${err?.message || "No se pudo contactar al servidor"}`);
      setTimeout(() => setRunnerNotice(null), 6000);
    } finally {
      setIsExecutingRunner(false);
    }
  };

  const handleExecuteAllStepsSim = async () => {
    setIsExecutingRunner(true);
    setRunnerNotice(null);
    try {
      const targetName = testLeadName.trim() || "Roberto OrSe";
      const targetUrl = testLinkedinUrl.trim() || "https://www.linkedin.com/in/robertoorse-agencia";
      const targetCompany = testCompany.trim() || "InHubFlow";
      const isDry = testMode === "dry_run";

      const res = await fetch("/api/campaigns/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign: activeCampaign,
          runAll: true,
          leadName: targetName,
          linkedinUrl: targetUrl,
          connectionDegree: testConnectionDegree,
          company: targetCompany,
          dryRun: isDry,
          accountId: activeAccount?.unipileAccountId || activeAccount?.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const modeLabel = isDry ? "[Simulación]" : "[En Vivo]";
        if (data.result?.success === false) {
          const lastLog = data.result?.logs?.[data.result.logs.length - 1];
          setRunnerNotice(`${modeLabel} Secuencia detenida por error: ${lastLog?.message || "Error al procesar"}`);
        } else {
          setRunnerNotice(`${modeLabel} Secuencia completa ejecutada con éxito para ${targetName} (${activeCampaign.steps.length} pasos).`);
        }
        setTimeout(() => setRunnerNotice(null), 6000);
        setRunnerLogs(data.logs || []);
        setSimulatedStepIndex(0);
        if (data.result?.logs && data.result.logs.length > 0) {
          setLastTestResultLog(data.result.logs[data.result.logs.length - 1]);
        }
      } else {
        setRunnerNotice(`[Error] ${data.error || "No se pudo ejecutar la secuencia"}`);
        setTimeout(() => setRunnerNotice(null), 6000);
      }
    } catch (err: any) {
      console.warn("Error simulando todos los pasos:", err);
      setRunnerNotice(`[Error de red] ${err?.message || "No se pudo contactar al servidor"}`);
      setTimeout(() => setRunnerNotice(null), 6000);
    } finally {
      setIsExecutingRunner(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      await fetch("/api/campaigns/run", { method: "DELETE" });
      setRunnerLogs([]);
      setSimulatedStepIndex(0);
      setFeedbackMessage("Historial de logs limpiado.");
      setTimeout(() => setFeedbackMessage(null), 3000);
    } catch (err) {
      console.warn("Error limpiando logs:", err);
    }
  };

  const handleOpenLogs = () => {
    fetch("/api/campaigns/run")
      .then((r) => r.json())
      .then((d) => {
        setRunnerLogs(d.logs || []);
        setShowLogsModal(true);
      })
      .catch(() => setShowLogsModal(true));
  };

  const getStepIcon = (type: SocialStepType) => {
    switch (type) {
      case "visit":
        return <Eye className="h-4 w-4 text-amber-600 dark:text-amber-400" />;
      case "like_comment":
        return <ThumbsUp className="h-4 w-4 text-purple-600 dark:text-purple-400" />;
      case "connect":
      case "connect_message":
        return <UserPlus className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />;
      case "message_icebreaker":
      case "message_followup":
      case "message_value_prop":
        return <Send className="h-4 w-4 text-brand-600 dark:text-brand-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Campañas de Social Selling (Secuencias Lineales)" />

      {/* Cabecera Principal */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-gray-200 dark:bg-gray-900 dark:border-gray-800 shadow-theme-xs">
        <div>
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Motor de Outreach Relacional en LinkedIn
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-2xl">
            Secuencias lineales con retardo humano entre pasos, inspiradas en la arquitectura de Outreach B2B. Los prospectos captados en Signal Radar se ejecutan respetando los límites de seguridad y la detención automática ante respuesta.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {feedbackMessage && (
            <span className="flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1.5 rounded-lg border border-emerald-200 dark:border-emerald-800">
              <CheckCircle2 className="size-3.5" />
              {feedbackMessage}
            </span>
          )}

          {runnerNotice && (
            <span className="flex items-center gap-1 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/40 px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-800">
              <CheckCircle2 className="size-3.5" />
              {runnerNotice}
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowPacingModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Shield className="size-3.5 text-emerald-600" />
            <span>Límites de Seguridad ({activeCampaign.dailyLimits.maxConnectionsPerDay}/día)</span>
          </button>

          <div className="inline-flex rounded-lg shadow-xs">
            <button
              type="button"
              disabled={isExecutingRunner}
              onClick={handleExecuteRunnerSim}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-l-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition disabled:opacity-50"
              title={`Simular paso ${Math.min(simulatedStepIndex + 1, activeCampaign.steps.length)} de ${activeCampaign.steps.length}`}
            >
              {isExecutingRunner ? (
                <>
                  <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin"></span>
                  <span>Ejecutando...</span>
                </>
              ) : (
                <>
                  <Play className="size-3.5" />
                  <span>
                    Simular Paso {Math.min(simulatedStepIndex + 1, activeCampaign.steps.length)}/{activeCampaign.steps.length}
                  </span>
                </>
              )}
            </button>
            <button
              type="button"
              disabled={isExecutingRunner}
              onClick={handleExecuteAllStepsSim}
              className="px-2.5 py-2 rounded-r-lg bg-brand-600 hover:bg-brand-700 text-white text-xs font-semibold border-l border-brand-400/40 transition disabled:opacity-50"
              title="Simular toda la secuencia completa en serie"
            >
              <Sparkles className="size-3.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleOpenLogs}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          >
            <Terminal className="size-3.5 text-gray-500" />
            <span>Logs</span>
          </button>
        </div>
      </div>

      {/* PANEL TEMPORAL: BANCO DE PRUEBAS EN LEAD INDIVIDUAL */}
      <div className="rounded-2xl border border-brand-200 dark:border-brand-900/60 bg-white dark:bg-gray-900 p-4 sm:p-5 shadow-2xs">
        {/* Cabecera del Panel de Pruebas */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-brand-500/10 text-brand-600 dark:text-brand-400 flex items-center justify-center shrink-0">
              <Sparkles className="size-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                  Banco de Pruebas: Secuencia en Lead Individual
                </h4>
                <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Prueba Controlada
                </span>
              </div>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Inicia y prueba la secuencia paso a paso o completa sobre un perfil específico sin enviar campañas a grupos masivos.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Toggle de Modo: Simulación Segura vs Unipile Live */}
            <div className="inline-flex rounded-lg p-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs">
              <button
                type="button"
                onClick={() => setTestMode("dry_run")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  testMode === "dry_run"
                    ? "bg-white dark:bg-gray-900 text-brand-600 dark:text-brand-400 shadow-2xs"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
                title="Valida copys, variables y lógica sin emitir llamadas reales a LinkedIn"
              >
                Simulación (Dry Run)
              </button>
              <button
                type="button"
                onClick={() => setTestMode("live")}
                className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition ${
                  testMode === "live"
                    ? "bg-red-500 text-white shadow-2xs"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400"
                }`}
                title="Ejecuta la acción real en LinkedIn mediante Unipile sólo para este lead"
              >
                Ejecución Real (Live)
              </button>
            </div>

            {/* Botón Colapsar / Expandir */}
            <button
              type="button"
              onClick={() => setIsTestBenchExpanded(!isTestBenchExpanded)}
              className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              title={isTestBenchExpanded ? "Colapsar panel de pruebas" : "Expandir panel de pruebas"}
            >
              {isTestBenchExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          </div>
        </div>

        {isTestBenchExpanded && (
          <div className="pt-4 space-y-4">
            {/* Selector de Presets Rápidos */}
            <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800">
              <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 flex items-center gap-1.5">
                <Info className="size-3.5 text-brand-500" />
                Cargar Prospecto de Prueba Rápido:
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleApplyPreset("connected_roberto")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                    testLeadName === "Roberto OrSe" && testConnectionDegree === "1st"
                      ? "bg-brand-500 text-white border-brand-500 shadow-2xs"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                  }`}
                  title="Prueba con perfil ya conectado: Omite invitación y ejecuta DMs directos"
                >
                  Roberto OrSe (1er Grado - Ya Conectados)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("unconnected_agency")}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition border ${
                    testLeadName === "Roberto OrSe Agencia" && testConnectionDegree === "2nd"
                      ? "bg-brand-500 text-white border-brand-500 shadow-2xs"
                      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100"
                  }`}
                  title="Prueba con perfil no conectado: Ejecuta visita + conectar con nota"
                >
                  Roberto OrSe Agencia (2º Grado)
                </button>
                <button
                  type="button"
                  onClick={() => handleApplyPreset("clean_manual")}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100"
                  title="Limpiar campos para escribir cualquier perfil"
                >
                  Limpiar / Otro Lead
                </button>
              </div>
            </div>

            {/* Alternador de Modo de Origen: Manual vs Lista de Monitores */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 text-xs">
              <div className="lg:col-span-4">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  value={testLeadName}
                  onChange={(e) => setTestLeadName(e.target.value)}
                  placeholder="Ej. Roberto OrSe"
                  className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-3 text-xs dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="lg:col-span-5">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  URL de Perfil en LinkedIn
                </label>
                <input
                  type="url"
                  value={testLinkedinUrl}
                  onChange={(e) => setTestLinkedinUrl(e.target.value)}
                  placeholder="https://www.linkedin.com/in/perfil"
                  className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-3 text-xs font-mono dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Empresa (para variable company)
                </label>
                <input
                  type="text"
                  value={testCompany}
                  onChange={(e) => setTestCompany(e.target.value)}
                  placeholder="Ej. InHubFlow"
                  className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-800 px-3 text-xs dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            {/* Selector de Grado de Conexión + Selector de Listas / Monitores Guardados */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-1 text-xs">
              {/* Opción A: Grado de Conexión */}
              <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-800/40 space-y-1.5">
                <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 block">
                  Grado de Conexión en LinkedIn:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTestConnectionDegree("1st")}
                    className={`p-2 rounded-lg border text-left transition ${
                      testConnectionDegree === "1st"
                        ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-400 text-emerald-800 dark:text-emerald-300 font-bold"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <UserCheck className="size-3.5 text-emerald-600" />
                      <span>1er Grado (Conectados)</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-normal mt-0.5">
                      Salta invitaciones y prueba directamente DMs
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTestConnectionDegree("2nd")}
                    className={`p-2 rounded-lg border text-left transition ${
                      testConnectionDegree === "2nd"
                        ? "bg-blue-50 dark:bg-blue-950/60 border-blue-400 text-blue-800 dark:text-blue-300 font-bold"
                        : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400"
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      <UserPlus className="size-3.5 text-blue-600" />
                      <span>2º / 3er Grado (No Conectados)</span>
                    </div>
                    <p className="text-[10px] text-gray-400 font-normal mt-0.5">
                      Prueba visita previa, Like+Comentario y Conectar
                    </p>
                  </button>
                </div>
              </div>

              {/* Opción B: O seleccionar desde Monitor / Lista */}
              <div className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/40 dark:bg-gray-800/40 space-y-1.5">
                <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 block">
                  O importar lead desde un Monitor / Lista existente:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={testSelectedListId}
                    onChange={(e) => handleSelectTestList(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 text-xs text-gray-800 dark:text-white"
                  >
                    <option value="">Seleccionar Lista / Monitor...</option>
                    {leadLists.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.name} ({l.leadsCount || 0} leads)
                      </option>
                    ))}
                  </select>

                  <select
                    value={testSelectedLeadId}
                    disabled={!testSelectedListId}
                    onChange={(e) => handleSelectTestLead(e.target.value)}
                    className="h-9 w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 text-xs text-gray-800 dark:text-white disabled:opacity-40"
                  >
                    <option value="">
                      {!testSelectedListId ? "Elige una lista primero" : "Seleccionar Prospecto..."}
                    </option>
                    {allLeads
                      .filter(
                        (ld) =>
                          ld.listId === testSelectedListId ||
                          (leadLists.find((l) => l.id === testSelectedListId)?.sourceMonitorId &&
                            (ld as any).monitorId === leadLists.find((l) => l.id === testSelectedListId)?.sourceMonitorId)
                      )
                      .map((ld) => (
                        <option key={ld.id} value={ld.id}>
                          {ld.fullName} {ld.company ? `(${ld.company})` : ""}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Barra de Lanzamiento de la Prueba */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500 dark:text-gray-400">Paso actual para <span className="font-bold text-gray-800 dark:text-gray-200">{testLeadName || "el prospecto"}</span>:</span>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 text-xs font-bold border border-brand-200 dark:border-brand-800">
                  <span>Paso {Math.min(simulatedStepIndex + 1, activeCampaign.steps.length)} de {activeCampaign.steps.length}:</span>
                  <span>{activeCampaign.steps[simulatedStepIndex]?.title || "Completado"}</span>
                </span>
                {testConnectionDegree === "1st" && (
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-200">
                    1er Grado (Omite Conectar)
                  </span>
                )}
                {testMode === "live" && (
                  <span className="text-[10px] text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-950/40 px-2 py-0.5 rounded-full border border-red-200 animate-pulse">
                    Modo Real en LinkedIn
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSimulatedStepIndex(0);
                    setFeedbackMessage("Paso reiniciado al inicio (Paso 1).");
                    setTimeout(() => setFeedbackMessage(null), 3000);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100"
                  title="Volver al Paso 1"
                >
                  <RotateCcw className="size-3" />
                  <span>Reiniciar al Paso 1</span>
                </button>

                <button
                  type="button"
                  disabled={isExecutingRunner}
                  onClick={handleExecuteRunnerSim}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition"
                >
                  {isExecutingRunner ? (
                    <>
                      <span className="h-3 w-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                      <span>Ejecutando...</span>
                    </>
                  ) : (
                    <>
                      <Play className="size-3.5" />
                      <span>
                        {testMode === "live" ? "Ejecutar Paso Real" : "Simular Paso"}{" "}
                        {Math.min(simulatedStepIndex + 1, activeCampaign.steps.length)}
                      </span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isExecutingRunner}
                  onClick={handleExecuteAllStepsSim}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-xs disabled:opacity-50 transition"
                  title="Ejecutar todos los pasos de la secuencia en serie para este lead"
                >
                  <Sparkles className="size-3.5" />
                  <span>{testMode === "live" ? "Ejecutar Toda la Secuencia (Live)" : "Simular Toda la Secuencia"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenLogs}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-50"
                >
                  <Terminal className="size-3.5 text-gray-500" />
                  <span>Ver Logs ({runnerLogs.length})</span>
                </button>
              </div>
            </div>

            {/* Tarjeta de Último Resultado de Ejecución */}
            {lastTestResultLog && (
              <div className="p-3.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900 dark:text-white text-xs">
                      Último Resultado: {lastTestResultLog.leadName}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded uppercase ${
                        lastTestResultLog.status === "success"
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                          : lastTestResultLog.status === "paused"
                          ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {lastTestResultLog.status}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {lastTestResultLog.timestamp?.slice(11, 19)}
                    </span>
                  </div>

                  {Boolean(lastTestResultLog.details?.dryRun) && (
                    <span className="text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded">
                      Simulación Segura (Dry Run)
                    </span>
                  )}
                </div>

                <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-mono">
                  {lastTestResultLog.message}
                </p>

                {Boolean(lastTestResultLog.details?.message) && (
                  <div className="mt-2 p-2.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">
                      Cuerpo del Mensaje Generado con Variables Reemplazadas:
                    </span>
                    <p className="text-xs text-gray-800 dark:text-gray-200 italic">
                      "{String(lastTestResultLog.details?.message)}"
                    </p>
                  </div>
                )}

                {Boolean(lastTestResultLog.details?.note) && (
                  <div className="mt-2 p-2.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    <span className="text-[10px] font-bold text-gray-400 block mb-1">
                      Nota de Conexión Generada:
                    </span>
                    <p className="text-xs text-gray-800 dark:text-gray-200 italic">
                      "{String(lastTestResultLog.details?.note)}"
                    </p>
                  </div>
                )}

                {Boolean(lastTestResultLog.details?.comment) && (
                  <div className="mt-2 p-2.5 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[10px] font-bold text-gray-400">
                        Comentario Publicado en LinkedIn:
                      </span>
                      {Boolean(lastTestResultLog.details?.isAiGeneratedComment) && (
                        <span className="text-[9px] font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800">
                          ✨ Generado por Gemini AI analizando el post real
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-800 dark:text-gray-200 italic">
                      "{String(lastTestResultLog.details?.comment)}"
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selector de Pestañas de Secuencias Maestras */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 dark:border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          {campaigns.map((camp) => {
            const isSelected = camp.id === selectedCampaignId;
            return (
              <button
                key={camp.id}
                type="button"
                onClick={() => {
                  setSelectedCampaignId(camp.id);
                  setSimulatedStepIndex(0);
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition ${
                  isSelected
                    ? "bg-brand-500 text-white shadow-2xs"
                    : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                }`}
              >
                <span>{camp.name.replace(/\s*\(Palabra Clave SISTEMA\)/gi, "")}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected ? "bg-white/20 text-white" : "bg-gray-100 dark:bg-gray-800 text-gray-500"
                  }`}
                >
                  {camp.steps.length} pasos
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() =>
              updateActiveCampaign((c) => ({
                ...c,
                status: c.status === "active" ? "paused" : "active",
              }))
            }
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeCampaign.status === "active"
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
            }`}
          >
            {activeCampaign.status === "active" ? "Estado: Secuencia Activa" : "Estado: Pausada"}
          </button>

          <button
            type="button"
            onClick={handleResetSequence}
            className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 font-medium px-2 py-1"
          >
            Restablecer Plantilla
          </button>
        </div>
      </div>

      {/* Contenedor Vertical de la Secuencia Lineal */}
      <div className="max-w-3xl mx-auto space-y-0 py-2">
        {/* Banner de Lista Inteligente Vinculada (si proviene de Signal Radar / Leads) */}
        {linkedList && (
          <div className="mb-3 rounded-2xl border border-brand-200 dark:border-brand-900/60 bg-white dark:bg-gray-900 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    Lista Vinculada: {linkedList.name}
                  </span>
                  <span className="text-[10px] bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-semibold px-2 py-0.5 rounded-full">
                    {linkedList.leadsCount} prospectos
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 truncate">
                  {linkedList.description || "Prospectos captados en Signal Radar"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/leads/lists/${linkedList.id}`}
                className="px-2.5 py-1 text-xs font-semibold text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-950/40 rounded-lg transition"
              >
                Ver Prospectos
              </Link>
              <button
                type="button"
                onClick={() => setLinkedList(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs px-1"
                title="Desvincular vista"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Card del Disparador / Activador con Contraste #E9F0F7 */}
        <div className="rounded-2xl border-2 border-dashed border-brand-300 dark:border-brand-900/60 bg-[#E9F0F7] dark:bg-brand-950/20 p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Zap className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                {sanitizeUnipileText(activeCampaign.triggerTitle)}
              </h4>
              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
                {sanitizeUnipileText(activeCampaign.triggerDescription).replace(/\s*\(Competencia,\s*Grupos\s*o\s*Globales\)/gi, "")}
              </p>
            </div>
          </div>
        </div>

        {/* Pasos y Conectores de Delay */}
        {activeCampaign.steps.map((step, idx) => {
          const isFirst = idx === 0;

          return (
            <div key={step.id}>
              {/* Conector de Delay (NO es una card, pastilla simple como en #b2b) */}
              {isFirst ? (
                <div className="flex items-center gap-2 py-1.5 pl-6 select-none">
                  {/* Línea vertical con punto */}
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-700" />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-700" />
                  </div>

                  {/* Píldora fija por defecto: Inmediato (0 días) no editable */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xs">
                    <Clock className="h-3 w-3 text-brand-500 shrink-0" />
                    <span className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 px-1 py-0.5">
                      Inmediato (0 días)
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 py-1.5 pl-6 select-none"
                  data-delay-popover
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Línea vertical con punto */}
                  <div className="flex flex-col items-center gap-0.5 shrink-0">
                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-700" />
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                    <div className="w-px h-3 bg-gray-300 dark:bg-gray-700" />
                  </div>

                  {/* Píldora compacta de retardo */}
                  <div className="relative">
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xs hover:border-brand-500/50 transition">
                      <Clock className="h-3 w-3 text-brand-500 shrink-0" />

                      {/* Botón '-' para restar día */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStepDelay(idx, Math.max(0, step.delayDaysBefore - 1));
                        }}
                        disabled={step.delayDaysBefore <= 0}
                        className="w-4 h-4 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-20 transition"
                        title="Restar 1 día"
                      >
                        <Minus className="h-2.5 w-2.5" />
                      </button>

                      {/* Texto editable con indicador desplegable */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenDelayPopoverIndex(openDelayPopoverIndex === idx ? null : idx);
                        }}
                        className="text-[11px] font-semibold text-gray-700 dark:text-gray-200 hover:text-brand-500 transition flex items-center gap-1 px-1 py-0.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                        title="Seleccionar tiempo de espera"
                      >
                        <span>
                          {step.delayDaysBefore > 0
                            ? `Esperar ${step.delayDaysBefore} ${step.delayDaysBefore === 1 ? "día" : "días"}`
                            : "Inmediato (0 días)"}
                        </span>
                        <ChevronDown className="h-2.5 w-2.5 text-gray-400" />
                      </button>

                      {/* Botón '+' para sumar día */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUpdateStepDelay(idx, step.delayDaysBefore + 1);
                        }}
                        className="w-4 h-4 rounded-full flex items-center justify-center bg-brand-50 text-brand-600 hover:bg-brand-500 hover:text-white dark:bg-brand-950 dark:text-brand-300 dark:hover:bg-brand-600 transition font-bold"
                        title="Sumar 1 día"
                      >
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    </div>

                    {/* Popover desplegable con presets */}
                    {openDelayPopoverIndex === idx && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        className="absolute left-0 top-full mt-1.5 z-40 w-64 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-1.5">
                          <span className="text-xs font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5 text-brand-500" />
                            Tiempo de Espera
                          </span>
                          <button
                            type="button"
                            onClick={() => setOpenDelayPopoverIndex(null)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
                          >
                            ✕
                          </button>
                        </div>

                        {/* Presets rápidos */}
                        <div className="grid grid-cols-3 gap-1.5">
                          {[
                            { label: "0d Inmed.", days: 0 },
                            { label: "1 día", days: 1 },
                            { label: "2 días", days: 2 },
                            { label: "3 días", days: 3 },
                            { label: "5 días", days: 5 },
                            { label: "7 días", days: 7 },
                          ].map(({ label, days }) => {
                            const active = step.delayDaysBefore === days;
                            return (
                              <button
                                key={days}
                                type="button"
                                onClick={() => {
                                  handleUpdateStepDelay(idx, days);
                                  setOpenDelayPopoverIndex(null);
                                }}
                                className={`text-xs py-1 px-1.5 rounded-lg border font-semibold transition text-center ${
                                  active
                                    ? "bg-brand-500 text-white border-brand-500"
                                    : "bg-gray-50 dark:bg-gray-700/50 text-gray-700 dark:text-gray-200 border-gray-200 dark:border-gray-700 hover:bg-gray-100"
                                }`}
                              >
                                {label}
                              </button>
                            );
                          })}
                        </div>

                        {/* Input numérico */}
                        <div className="pt-1.5 border-t border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
                          <span className="text-[11px] text-gray-400">Personalizado:</span>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              min={0}
                              max={60}
                              value={step.delayDaysBefore}
                              onChange={(e) => {
                                const val = Math.max(0, parseInt(e.target.value) || 0);
                                handleUpdateStepDelay(idx, val);
                              }}
                              className="w-14 px-2 py-0.5 text-xs text-center border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
                            />
                            <span className="text-xs text-gray-500">días</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Card del Paso (Limpia y Compacta: Solo Título, Badge, Descripción y Botones Cuadraditos) */}
              <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-2xs hover:border-gray-300 dark:hover:border-gray-700 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Caja de Icono */}
                    <div className="h-9 w-9 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                      {getStepIcon(step.type)}
                    </div>

                    {/* Contenido del Paso: Título y Descripción (Limpio, sin badges ni vista previa de mensajes) */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                          {String(idx + 1).padStart(2, "0")}.
                        </span>
                        <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                          {sanitizeUnipileText(step.title)}
                        </h4>
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {sanitizeUnipileText(step.description)}
                      </p>
                    </div>
                  </div>

                  {/* Los 2 botones cuadraditos exactos de la imagen */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-0.5">
                    {/* Botón Editar (Pencil) */}
                    <button
                      type="button"
                      onClick={() => setEditingStep({ step: sanitizeSequenceStep(step), index: idx })}
                      className="h-[26px] w-[26px] rounded-md border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400 inline-flex items-center justify-center transition"
                      title="Editar paso de la secuencia"
                    >
                      <Pencil className="size-3.5" />
                    </button>

                    {/* Botón Eliminar (X) */}
                    <button
                      type="button"
                      onClick={() => handleDeleteStep(idx)}
                      className="h-[26px] w-[26px] rounded-md border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 inline-flex items-center justify-center transition"
                      title="Eliminar paso"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {/* Botón para Añadir Nuevo Paso */}
        <div className="pt-4 flex justify-center">
          <button
            type="button"
            onClick={() => setShowAddStepModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:border-brand-500 text-xs font-semibold text-gray-600 dark:text-gray-300 hover:text-brand-600 hover:bg-brand-50/40 transition"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Agregar Paso a la Secuencia</span>
          </button>
        </div>
      </div>

      {/* Modal de Edición Completo: Mensajes, Imagen, Video, Notas de Voz y Archivos Adjuntos */}
      {editingStep && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 overflow-hidden">
            {/* Cabecera del Modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                  {getStepIcon(editingStep.step.type)}
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                    Configurar Paso: {sanitizeUnipileText(editingStep.step.title)}
                  </h3>
                  <p className="text-[11px] text-gray-400">
                    Edita el contenido del mensaje, notas, archivos y parámetros de ejecución.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingStep(null)}
                className="h-7 w-7 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-sm font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Contenido Scrolleable del Modal */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Bloque: Información General */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Título del Paso
                  </label>
                  <input
                    type="text"
                    value={editingStep.step.title}
                    onChange={(e) =>
                      setEditingStep({
                        ...editingStep,
                        step: { ...editingStep.step, title: e.target.value },
                      })
                    }
                    className="h-9 w-full rounded-lg border border-gray-300 px-3 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                    Retardo Previo (Días de Espera)
                  </label>
                  {editingStep.index === 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="h-9 px-3 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/60 text-gray-500 flex items-center justify-center text-xs font-semibold select-none cursor-not-allowed">
                        Inmediato (0 días)
                      </div>
                      <span className="text-[11px] text-gray-400">
                        Disparo automático tras el activador
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={editingStep.step.delayDaysBefore}
                        onChange={(e) =>
                          setEditingStep({
                            ...editingStep,
                            step: {
                              ...editingStep.step,
                              delayDaysBefore: Math.max(0, parseInt(e.target.value) || 0),
                            },
                          })
                        }
                        className="h-9 w-24 rounded-lg border border-gray-300 px-3 text-xs text-center dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-brand-500"
                      />
                      <span className="text-xs text-gray-500">
                        {editingStep.step.delayDaysBefore === 1 ? "día tras el paso anterior" : "días tras el paso anterior"}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wider mb-1">
                  Descripción Operativa
                </label>
                <input
                  type="text"
                  value={editingStep.step.description}
                  onChange={(e) =>
                    setEditingStep({
                      ...editingStep,
                      step: { ...editingStep.step, description: e.target.value },
                    })
                  }
                  className="h-9 w-full rounded-lg border border-gray-300 px-3 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Bloque: Nota de Conexión de LinkedIn (si aplica) */}
              {(editingStep.step.type === "connect" ||
                editingStep.step.type === "connect_message" ||
                editingStep.step.connectNote !== undefined) && (
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10 p-3 space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-[11px] flex items-start gap-2">
                    <span className="font-bold shrink-0">Acción 2-en-1:</span>
                    <span>Al enviar la invitación de conexión, LinkedIn activa automáticamente el seguimiento del perfil para maximizar la visibilidad mutua en el feed.</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                      <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
                      Nota de Conexión en LinkedIn (Opcional)
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {(editingStep.step.connectNote || "").length}/300 caracteres
                    </span>
                  </div>
                  <textarea
                    rows={3}
                    maxLength={300}
                    value={editingStep.step.connectNote || ""}
                    onChange={(e) =>
                      setEditingStep({
                        ...editingStep,
                        step: { ...editingStep.step, connectNote: e.target.value },
                      })
                    }
                    placeholder="Hola {{first_name}}, vi tu actividad sobre {{topic}} y me pareció muy interesante..."
                    className="w-full rounded-lg border border-emerald-200 dark:border-emerald-800/80 bg-white dark:bg-gray-800 p-2.5 text-xs font-mono dark:text-white focus:outline-none focus:border-emerald-500"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-gray-400">Variables rápidas:</span>
                    {["{{first_name}}", "{{company}}", "{{topic}}", "{{keyword}}"].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setEditingStep({
                            ...editingStep,
                            step: {
                              ...editingStep.step,
                              connectNote: `${editingStep.step.connectNote || ""} ${tag}`.trim(),
                            },
                          })
                        }
                        className="text-[10px] bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded font-mono hover:bg-emerald-50 transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bloque: Comentario en Publicación (si aplica) */}
              {editingStep.step.type === "like_comment" && (
                <div className="rounded-xl border border-purple-200 dark:border-purple-900/50 bg-purple-50/20 dark:bg-purple-950/10 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-purple-800 dark:text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                      <ThumbsUp className="h-3.5 w-3.5 text-purple-600" />
                      Plantilla de Comentario en Post
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-semibold text-purple-700 dark:text-purple-300">
                      <input
                        type="checkbox"
                        checked={editingStep.step.useAiComment ?? true}
                        onChange={(e) =>
                          setEditingStep({
                            ...editingStep,
                            step: { ...editingStep.step, useAiComment: e.target.checked },
                          })
                        }
                        className="rounded text-purple-600 focus:ring-0"
                      />
                      <span>Generar comentario contextualizado con IA</span>
                    </label>
                  </div>
                  <textarea
                    rows={2}
                    value={editingStep.step.commentTemplate || ""}
                    onChange={(e) =>
                      setEditingStep({
                        ...editingStep,
                        step: { ...editingStep.step, commentTemplate: e.target.value },
                      })
                    }
                    placeholder="Gran perspectiva {{first_name}}, totalmente de acuerdo con tu punto..."
                    className="w-full rounded-lg border border-purple-200 dark:border-purple-800/80 bg-white dark:bg-gray-800 p-2.5 text-xs font-mono dark:text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              )}

              {/* Bloque: Mensaje Directo DM (si aplica) */}
              {(editingStep.step.type.startsWith("message") ||
                editingStep.step.messageTemplate !== undefined) && (
                <div className="rounded-xl border border-brand-200 dark:border-brand-900/50 bg-brand-50/20 dark:bg-brand-950/10 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-brand-800 dark:text-brand-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-brand-600" />
                      Plantilla de Mensaje Directo (DM)
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {(editingStep.step.messageTemplate || "").length} caracteres
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={editingStep.step.messageTemplate || ""}
                    onChange={(e) =>
                      setEditingStep({
                        ...editingStep,
                        step: { ...editingStep.step, messageTemplate: e.target.value },
                      })
                    }
                    placeholder="Hola {{first_name}}, vi tu aportación..."
                    className="w-full rounded-lg border border-brand-200 dark:border-brand-800/80 bg-white dark:bg-gray-800 p-2.5 text-xs font-mono dark:text-white focus:outline-none focus:border-brand-500"
                  />
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] text-gray-400">Variables dinámicas:</span>
                    {[
                      "{{first_name}}",
                      "{{company}}",
                      "{{topic}}",
                      "{{author_name}}",
                      "{{keyword}}",
                      "{{attached_resource}}",
                    ].map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() =>
                          setEditingStep({
                            ...editingStep,
                            step: {
                              ...editingStep.step,
                              messageTemplate: `${editingStep.step.messageTemplate || ""} ${tag}`.trim(),
                            },
                          })
                        }
                        className="text-[10px] bg-white dark:bg-gray-800 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 px-1.5 py-0.5 rounded font-mono hover:bg-brand-50 transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bloque: Selector de Contenido Adjunto y Multimedia (Imagen, Video, Notas de Voz, Archivos) */}
              <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-3.5 space-y-3">
                {/* Inputs de archivo ocultos nativos */}
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => handleUploadAttachmentFile(e, "image")}
                />
                <input
                  ref={videoInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => handleUploadAttachmentFile(e, "video")}
                />
                <input
                  ref={audioInputRef}
                  type="file"
                  accept="audio/mp3,audio/mpeg,audio/m4a,audio/wav,audio/webm,audio/ogg"
                  className="hidden"
                  onChange={(e) => handleUploadAttachmentFile(e, "voice_note")}
                />
                <input
                  ref={documentInputRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                  className="hidden"
                  onChange={(e) => handleUploadAttachmentFile(e, "document")}
                />

                <div className="flex items-center justify-between">
                  <div>
                    <label className="text-[11px] font-bold text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-brand-500" />
                      Adjuntos y Multimedia para LinkedIn
                    </label>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      Selecciona si deseas enviar una imagen, video, nota de voz humana o archivo PDF junto al paso.
                    </p>
                  </div>
                  {editingStep.step.attachmentType && editingStep.step.attachmentType !== "none" && (
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      className="text-[11px] text-red-500 hover:text-red-700 dark:text-red-400 font-semibold flex items-center gap-1 transition"
                      title="Quitar archivo adjunto del paso"
                    >
                      <Trash2 className="h-3 w-3" />
                      Quitar adjunto
                    </button>
                  )}
                </div>

                {/* Tabs de tipo de adjunto (4 opciones, sin "Solo Texto") */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { type: "image" as MessageAttachmentType, label: "Imagen", icon: ImageIcon },
                    { type: "video" as MessageAttachmentType, label: "Video", icon: VideoIcon },
                    { type: "voice_note" as MessageAttachmentType, label: "Nota de Voz", icon: Mic },
                    { type: "document" as MessageAttachmentType, label: "Archivo / PDF", icon: FileText },
                  ].map(({ type, label, icon: Icon }) => {
                    const currentType = editingStep.step.attachmentType || (editingStep.step.attachedResource ? "document" : "none");
                    const active = currentType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => {
                          if (active) {
                            handleRemoveAttachment();
                          } else {
                            setEditingStep({
                              ...editingStep,
                              step: {
                                ...editingStep.step,
                                attachmentType: type,
                                attachmentName:
                                  editingStep.step.attachmentName ||
                                  (type === "image"
                                    ? "infografia-prospeccion.png"
                                    : type === "video"
                                    ? "demo-sistema-b2b.mp4"
                                    : type === "voice_note"
                                    ? "nota-de-voz-personalizada.m4a"
                                    : "Framework-Prospeccion-B2B-InHubFlow.pdf"),
                                attachedResource:
                                  type === "document"
                                    ? editingStep.step.attachedResource || "Framework-Prospeccion-B2B-InHubFlow.pdf"
                                    : undefined,
                              },
                            });
                          }
                        }}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-center transition gap-1.5 ${
                          active
                            ? "bg-brand-500 text-white border-brand-500 shadow-2xs font-semibold ring-2 ring-brand-500/20"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:border-brand-300 hover:bg-gray-50 dark:hover:bg-gray-700/60"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="text-xs font-medium">{label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Subpanel interactivo según la opción seleccionada */}
                {/* 1. Imagen */}
                {editingStep.step.attachmentType === "image" && (
                  <div className="space-y-2.5 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                        Cargar Imagen o Enlace
                      </label>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Upload className="h-3 w-3" />
                        Explorar archivo
                      </button>
                    </div>

                    {/* Botón de carga principal estilo dropzone */}
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-brand-200 dark:border-brand-900/60 hover:border-brand-500 rounded-xl bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-brand-50/20 transition cursor-pointer"
                    >
                      <Upload className="h-4 w-4 text-brand-500" />
                      Haz clic para subir una imagen (PNG, JPG, WEBP)
                    </button>

                    <input
                      type="text"
                      value={editingStep.step.attachmentUrl || editingStep.step.attachmentName || ""}
                      onChange={(e) =>
                        setEditingStep({
                          ...editingStep,
                          step: {
                            ...editingStep.step,
                            attachmentName: e.target.value,
                            attachmentUrl: e.target.value,
                          },
                        })
                      }
                      placeholder="O pega una URL: https://ejemplo.com/infografia.png"
                      className="h-8 w-full rounded-lg border border-gray-300 px-3 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-gray-400">Presets sugeridos:</span>
                      {["infografia-prospeccion.png", "grafico-resultados-3x.jpg", "framework-visual.png"].map((img) => (
                        <button
                          key={img}
                          type="button"
                          onClick={() =>
                            setEditingStep({
                              ...editingStep,
                              step: {
                                ...editingStep.step,
                                attachmentName: img,
                                attachmentUrl: undefined,
                                attachmentSize: "1.2 MB",
                              },
                            })
                          }
                          className="text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded hover:bg-gray-100"
                        >
                          {img}
                        </button>
                      ))}
                    </div>

                    {/* Previsualización visual de imagen */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {editingStep.step.attachmentUrl &&
                        (editingStep.step.attachmentUrl.startsWith("data:image") ||
                          editingStep.step.attachmentUrl.startsWith("http")) ? (
                          <img
                            src={editingStep.step.attachmentUrl}
                            alt="Previsualización"
                            className="h-12 w-12 rounded-lg object-cover border border-gray-200 dark:border-gray-700 shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 rounded-lg bg-brand-50 dark:bg-brand-950/60 flex items-center justify-center text-brand-600 shrink-0">
                            <ImageIcon className="h-6 w-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {editingStep.step.attachmentName || "infografia-prospeccion.png"}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {editingStep.step.attachmentSize || "Imagen PNG / JPG"} para entrega en LinkedIn DM.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="px-2 py-1 text-[11px] rounded font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveAttachment}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                          title="Eliminar imagen"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Video */}
                {editingStep.step.attachmentType === "video" && (
                  <div className="space-y-2.5 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                        Cargar Video o Enlace (Loom / MP4)
                      </label>
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Upload className="h-3 w-3" />
                        Explorar archivo
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-brand-200 dark:border-brand-900/60 hover:border-brand-500 rounded-xl bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-brand-50/20 transition cursor-pointer"
                    >
                      <Upload className="h-4 w-4 text-brand-500" />
                      Haz clic para subir un video MP4, WebM o MOV
                    </button>

                    <input
                      type="text"
                      value={editingStep.step.attachmentUrl || editingStep.step.attachmentName || ""}
                      onChange={(e) =>
                        setEditingStep({
                          ...editingStep,
                          step: {
                            ...editingStep.step,
                            attachmentUrl: e.target.value,
                            attachmentName: e.target.value,
                          },
                        })
                      }
                      placeholder="O pega un enlace: https://loom.com/share/... o https://youtube.com/..."
                      className="h-8 w-full rounded-lg border border-gray-300 px-3 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />

                    {/* Previsualización visual de Video */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-12 w-16 rounded-lg bg-gray-900 text-white flex items-center justify-center shrink-0 relative shadow-xs">
                          <Play className="h-5 w-5 text-brand-400 fill-brand-400" />
                          <span className="absolute bottom-1 right-1 text-[8px] bg-black/80 px-1 rounded text-white font-mono">
                            01:30
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {editingStep.step.attachmentName || "demo-sistema-b2b.mp4"}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {editingStep.step.attachmentSize || "Video MP4"} interactivo para LinkedIn.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          className="px-2 py-1 text-[11px] rounded font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveAttachment}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                          title="Eliminar video"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. Nota de Voz */}
                {editingStep.step.attachmentType === "voice_note" && (
                  <div className="space-y-2.5 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                        Grabación o Archivo de Audio
                      </label>
                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Upload className="h-3 w-3" />
                        Subir archivo .mp3/.m4a
                      </button>
                    </div>

                    {/* Barra de Grabación en Vivo con Micrófono */}
                    <div className="flex items-center gap-2">
                      {isRecordingVoice ? (
                        <button
                          type="button"
                          onClick={stopVoiceRecording}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition animate-pulse"
                        >
                          <Square className="h-3.5 w-3.5 fill-white" />
                          Detener Grabación (00:{String(recordingSeconds).padStart(2, "0")})
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startVoiceRecording}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-xs transition"
                        >
                          <Mic className="h-4 w-4" />
                          Grabar Nota de Voz con Micrófono
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        className="flex items-center gap-1.5 py-2.5 px-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        <Upload className="h-3.5 w-3.5 text-brand-500" />
                        Subir Audio
                      </button>
                    </div>

                    {/* Presets de duración estimada */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-gray-400">Duración estimada:</span>
                      <div className="flex items-center gap-1">
                        {[15, 30, 45, 60].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() =>
                              setEditingStep({
                                ...editingStep,
                                step: {
                                  ...editingStep.step,
                                  voiceNoteDurationSec: sec,
                                  attachmentName: `nota-voz-${sec}s.m4a`,
                                },
                              })
                            }
                            className={`text-[10px] px-2 py-0.5 rounded font-semibold transition ${
                              (editingStep.step.voiceNoteDurationSec || 45) === sec
                                ? "bg-brand-500 text-white"
                                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300"
                            }`}
                          >
                            {sec}s
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reproductor de Nota de Voz Simulado estilo LinkedIn DM */}
                    <div className="rounded-xl border border-brand-200 dark:border-brand-900/60 bg-gradient-to-r from-brand-50/50 via-white to-brand-50/30 dark:from-brand-950/30 dark:via-gray-800 dark:to-brand-950/20 p-3 flex items-center gap-3 shadow-2xs">
                      <button
                        type="button"
                        className="h-10 w-10 rounded-full bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-xs hover:bg-brand-600 transition"
                      >
                        <Play className="h-4 w-4 fill-white translate-x-0.5" />
                      </button>

                      <div className="flex-1 min-w-0">
                        {/* Simulación de Ondas de Sonido de LinkedIn */}
                        <div className="flex items-center gap-1 h-6">
                          {[3, 7, 12, 18, 22, 15, 20, 24, 18, 10, 14, 22, 16, 8, 12, 18, 15, 6, 12, 19, 23, 14, 8, 4].map(
                            (height, i) => (
                              <div
                                key={i}
                                style={{ height: `${height}px` }}
                                className="w-1 rounded-full bg-brand-500/70 dark:bg-brand-400"
                              />
                            )
                          )}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                          <span>0:00 / 0:{editingStep.step.voiceNoteDurationSec || 45}</span>
                          <span className="font-semibold text-brand-600 dark:text-brand-400 truncate max-w-[150px]">
                            {editingStep.step.attachmentName || "Nota de Voz Humana"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        className="p-1 text-gray-400 hover:text-red-500 rounded"
                        title="Eliminar nota de voz"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Archivo / PDF */}
                {editingStep.step.attachmentType === "document" && (
                  <div className="space-y-2.5 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300">
                        Cargar Documento o PDF (Lead Magnet)
                      </label>
                      <button
                        type="button"
                        onClick={() => documentInputRef.current?.click()}
                        className="text-[11px] text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Upload className="h-3 w-3" />
                        Explorar archivo
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => documentInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-brand-200 dark:border-brand-900/60 hover:border-brand-500 rounded-xl bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-brand-50/20 transition cursor-pointer"
                    >
                      <Upload className="h-4 w-4 text-brand-500" />
                      Haz clic para subir un PDF o recurso descargable
                    </button>

                    <input
                      type="text"
                      value={editingStep.step.attachedResource || editingStep.step.attachmentName || ""}
                      onChange={(e) =>
                        setEditingStep({
                          ...editingStep,
                          step: {
                            ...editingStep.step,
                            attachedResource: e.target.value,
                            attachmentName: e.target.value,
                          },
                        })
                      }
                      placeholder="O escribe el nombre: Framework-Prospeccion-B2B-InHubFlow.pdf"
                      className="h-8 w-full rounded-lg border border-gray-300 px-3 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                    />

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[10px] text-gray-400">Presets de Lead Magnet:</span>
                      {[
                        "Framework-Prospeccion-B2B-InHubFlow.pdf",
                        "Playbook-Secuencias-LinkedIn-2026.pdf",
                        "Plantilla-Social-Selling-SISTEMA.pdf",
                      ].map((doc) => (
                        <button
                          key={doc}
                          type="button"
                          onClick={() =>
                            setEditingStep({
                              ...editingStep,
                              step: {
                                ...editingStep.step,
                                attachedResource: doc,
                                attachmentName: doc,
                                attachmentSize: "2.8 MB",
                              },
                            })
                          }
                          className="text-[10px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded hover:bg-gray-100"
                        >
                          {doc}
                        </button>
                      ))}
                    </div>

                    {/* Previsualización visual de documento */}
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {editingStep.step.attachedResource || editingStep.step.attachmentName || "Framework-Prospeccion-B2B-InHubFlow.pdf"}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            {editingStep.step.attachmentSize || "Documento PDF"} listo para entrega automática al prospecto.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => documentInputRef.current?.click()}
                          className="px-2 py-1 text-[11px] rounded font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveAttachment}
                          className="p-1 text-gray-400 hover:text-red-500 rounded"
                          title="Eliminar archivo"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Pie del Modal */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/20 shrink-0">
              <button
                type="button"
                onClick={() => setEditingStep(null)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleSaveStepModal(editingStep.step)}
                className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition shadow-xs"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Selección para Añadir Paso */}
      {showAddStepModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                Seleccionar Tipo de Paso
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStepModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              {[
                { type: "visit" as const, title: "Visitar Perfil", desc: "Visita previa para figurar en notificaciones" },
                { type: "like_comment" as const, title: "Like + Comentario", desc: "Interacción combinada en el post del prospecto" },
                { type: "connect" as const, title: "Seguir + Conectar", desc: "Acción 2-en-1: sigue el perfil y envía invitación de conexión" },
                { type: "message_icebreaker" as const, title: "Mensaje DM Icebreaker", desc: "Mensaje contextualizado según la señal" },
                { type: "message_followup" as const, title: "Mensaje DM Follow-up", desc: "Seguimiento de valor" },
                { type: "message_value_prop" as const, title: "Mensaje DM Value Prop", desc: "Propuesta de valor y agenda de llamada" },
              ].map((opt) => (
                <button
                  key={opt.type}
                  type="button"
                  onClick={() => handleAddStep(opt.type)}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-brand-500 hover:bg-brand-50/30 transition text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-8 w-8 rounded-lg bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0">
                      {getStepIcon(opt.type)}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900 dark:text-white">
                        {opt.title}
                      </p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">
                        {opt.desc}
                      </p>
                    </div>
                  </div>
                  <Plus className="h-4 w-4 text-brand-500" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Límites de Seguridad (Pacing Limits) */}
      {showPacingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-600" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                  Límites de Seguridad (Pacing LinkedIn)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowPacingModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                    Visitas de Perfil / Día
                  </span>
                  <span className="text-[10px] text-gray-400">Recomendado: 20 perfiles</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={activeCampaign.dailyLimits.maxVisitsPerDay}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 20;
                    updateActiveCampaign((c) => ({
                      ...c,
                      dailyLimits: { ...c.dailyLimits, maxVisitsPerDay: val },
                    }));
                  }}
                  className="w-16 h-8 text-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                    Invitaciones de Conexión / Día
                  </span>
                  <span className="text-[10px] text-gray-400">Tope seguro: 20 a 25 máximo</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={activeCampaign.dailyLimits.maxConnectionsPerDay}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 20;
                    updateActiveCampaign((c) => ({
                      ...c,
                      dailyLimits: { ...c.dailyLimits, maxConnectionsPerDay: val },
                    }));
                  }}
                  className="w-16 h-8 text-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold"
                />
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                    Mensajes Directos (DM) / Día
                  </span>
                  <span className="text-[10px] text-gray-400">Tope seguro: 20 a 30 máximo</span>
                </div>
                <input
                  type="number"
                  min={1}
                  max={40}
                  value={activeCampaign.dailyLimits.maxMessagesPerDay}
                  onChange={(e) => {
                    const val = Number(e.target.value) || 20;
                    updateActiveCampaign((c) => ({
                      ...c,
                      dailyLimits: { ...c.dailyLimits, maxMessagesPerDay: val },
                    }));
                  }}
                  className="w-16 h-8 text-center rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-bold"
                />
              </div>

              {/* Stop on Reply */}
              <div className="p-3 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                      Regla Stop on Reply
                    </span>
                    <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block mt-0.5">
                      Detiene la secuencia de inmediato en cuanto el prospecto responde a cualquier mensaje o comentario.
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={activeCampaign.stopOnReply}
                    onChange={(e) =>
                      updateActiveCampaign((c) => ({
                        ...c,
                        stopOnReply: e.target.checked,
                      }))
                    }
                    className="h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                onClick={() => setShowPacingModal(false)}
                className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition"
              >
                Entendido y Guardar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Logs de Ejecución */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl dark:bg-gray-900 border border-gray-200 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <Terminal className="h-4 w-4 text-gray-500" />
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">
                  Historial de Ejecución en Vivo de Secuencias
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {runnerLogs.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearLogs}
                    className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition px-2 py-1 rounded"
                    title="Limpiar todos los registros"
                  >
                    <Trash2 className="h-3 w-3" />
                    Limpiar
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowLogsModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {runnerLogs.length === 0 ? (
                <p className="text-xs text-gray-400 py-6 text-center">
                  Sin registros recientes. Ejecuta una simulación o activa la campaña para ver los logs.
                </p>
              ) : (
                runnerLogs.map((log, idx) => (
                  <div
                    key={`${log.id}-${idx}`}
                    className="p-2.5 rounded-xl border border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-xs flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {log.leadName}
                        </span>
                        <span className="text-[10px] text-gray-400">{log.timestamp?.slice(11, 19)}</span>
                        <span
                          className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                            log.status === "success"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                              : log.status === "paused"
                              ? "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {log.status.toUpperCase()}
                        </span>
                        {Boolean(log.details?.attachmentName) && (
                          <span className="inline-flex items-center gap-1 rounded bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 px-1.5 py-0.2 text-[9px] font-semibold border border-brand-200 dark:border-brand-900">
                            <Paperclip className="h-2.5 w-2.5" />
                            {String(log.details?.attachmentName ?? "")}
                            {log.details?.attachmentSize ? ` (${String(log.details.attachmentSize)})` : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-[11px] leading-relaxed">{log.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-800">
              <button
                type="button"
                disabled={isExecutingRunner}
                onClick={handleExecuteAllStepsSim}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100 dark:bg-brand-950/40 dark:text-brand-300 text-xs font-semibold border border-brand-200 dark:border-brand-800 transition disabled:opacity-50"
              >
                <Sparkles className="size-3.5 text-brand-500" />
                <span>Simular Secuencia Completa</span>
              </button>

              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="rounded-lg bg-gray-100 dark:bg-gray-800 px-4 py-2 text-xs font-semibold text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
