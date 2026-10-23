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
  Send,
  Sparkles,
  Shield,
  Play,
  CheckCircle2,
  Zap,
  FileText,
  ChevronDown,
  Terminal,
  Image as ImageIcon,
  Video as VideoIcon,
  Mic,
  Paperclip,
  Upload,
  Trash2,
  Square,
  GripVertical,
  Layers,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useTranslations } from "next-intl";
import { getActiveAccountForUser } from "@/lib/unipile/store";
import { CampaignLeadsTracker } from "@/components/campaigns/CampaignLeadsTracker";

const AVAILABLE_PALETTE_STEPS: Array<{
  type: SocialStepType;
  idKey: string;
  orderNumber: string;
  title: string;
  subtitle: string;
  iconBg: string;
  icon: React.ReactNode;
}> = [
  {
    type: "visit",
    idKey: "visit",
    orderNumber: "01",
    title: "Visitar Perfil",
    subtitle: "Visita el perfil en LinkedIn para figurar en notificaciones del prospecto.",
    iconBg: "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
    icon: <Eye className="size-4" />,
  },
  {
    type: "like_comment",
    idKey: "like_comment",
    orderNumber: "02",
    title: "Like + Comentario",
    subtitle: "Interactúa con la publicación más reciente con un Like y Comentario de valor.",
    iconBg: "bg-purple-50 text-purple-600 dark:bg-purple-950/60 dark:text-purple-400 border border-purple-200 dark:border-purple-800",
    icon: <ThumbsUp className="size-4" />,
  },
  {
    type: "connect",
    idKey: "connect",
    orderNumber: "03",
    title: "Seguir + Conectar",
    subtitle: "Acción 2-en-1: sigue el perfil y envía solicitud de conexión con nota previa.",
    iconBg: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
    icon: <UserPlus className="size-4" />,
  },
  {
    type: "message_icebreaker",
    idKey: "message_icebreaker",
    orderNumber: "04",
    title: "Mensaje DM 'Icebreakers'",
    subtitle: "Mensaje inicial contextualizado desde el monitor inteligente de Signal Radar.",
    iconBg: "bg-brand-50 text-brand-600 dark:bg-brand-950/60 dark:text-brand-400 border border-brand-200 dark:border-brand-800",
    icon: <Send className="size-4" />,
  },
  {
    type: "message_followup",
    idKey: "message_followup",
    orderNumber: "05",
    title: "Mensaje DM 'Follow-up'",
    subtitle: "Seguimiento consultivo y profundización en el reto comercial o dolor inicial.",
    iconBg: "bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 border border-blue-200 dark:border-blue-800",
    icon: <MessageSquare className="size-4" />,
  },
  {
    type: "message_value_prop",
    idKey: "message_value_prop",
    orderNumber: "06",
    title: "Mensaje DM 'Value Prop'",
    subtitle: "Mensaje final con la Propuesta de valor y llamada a la acción.",
    iconBg: "bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-800",
    icon: <Zap className="size-4" />,
  },
];

export default function CampaignsPage() {
  const t = useTranslations("campaigns");
  const { currentUser } = useAuth();
  const [campaigns, setCampaigns] = useState<LinearSequenceCampaign[]>([]);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string>("seq-lead-lists");
  const [leadLists, setLeadLists] = useState<LeadListGroup[]>([]);
  const [linkedList, setLinkedList] = useState<LeadListGroup | null>(null);
  const [allLeads, setAllLeads] = useState<Lead360Item[]>([]);

  // Modales
  const [editingStep, setEditingStep] = useState<{ step: SequenceStepItem; index: number } | null>(null);
  const [isDrawerClosing, setIsDrawerClosing] = useState(false);
  const [showPacingModal, setShowPacingModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showAddStepModal, setShowAddStepModal] = useState(false);
  const [isAddDrawerClosing, setIsAddDrawerClosing] = useState(false);

  const handleCloseDrawer = () => {
    setIsDrawerClosing(true);
    setTimeout(() => {
      setEditingStep(null);
      setIsDrawerClosing(false);
    }, 240);
  };

  const handleOpenAddDrawer = () => {
    setIsAddDrawerClosing(false);
    setShowAddStepModal(true);
  };

  const handleCloseAddDrawer = () => {
    setIsAddDrawerClosing(true);
    setTimeout(() => {
      setShowAddStepModal(false);
      setIsAddDrawerClosing(false);
    }, 240);
  };

  // Popover de delay
  const [openDelayPopoverIndex, setOpenDelayPopoverIndex] = useState<number | null>(null);

  // Runner y Avisos
  const [isExecutingRunner, setIsExecutingRunner] = useState(false);
  const [simulatedStepIndex, setSimulatedStepIndex] = useState<number>(0);
  const [runnerLogs, setRunnerLogs] = useState<CampaignExecutionLog[]>([]);
  const [runnerNotice, setRunnerNotice] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Estados para Drag & Drop de la paleta izquierda
  const [draggedStepType, setDraggedStepType] = useState<SocialStepType | null>(null);
  const [isDragOverWorkflow, setIsDragOverWorkflow] = useState(false);

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

    // Revisar si viene listId por URL
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const listIdParam = params.get("listId");
      if (listIdParam && stored.length > 0) {
        const found = lists.find((l) => l.id === listIdParam);
        if (found) {
          setLinkedList(found);
        }
        const isMagnet = listIdParam.includes("n1") || listIdParam.includes("magnet");
        setSelectedCampaignId(isMagnet ? "seq-lead-magnet" : "seq-lead-lists");
      }
    }
  }, []);

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
    handleCloseDrawer();
    setFeedbackMessage("Paso de la secuencia actualizado exitosamente.");
    setTimeout(() => setFeedbackMessage(null), 3000);
  };

  const isStepInSequence = (idKey: string, type: SocialStepType) => {
    return activeCampaign.steps.some((s) => {
      if (idKey === "visit") return s.type === "visit";
      if (idKey === "like_comment") return s.type === "like_comment";
      if (idKey === "connect") return s.type === "connect" || s.type === "connect_message";
      if (idKey === "message_icebreaker") {
        return s.type === "message_icebreaker" || s.title.toLowerCase().includes("icebreaker");
      }
      if (idKey === "message_followup") {
        return (
          s.type === "message_followup" ||
          s.title.toLowerCase().includes("follow-up") ||
          s.title.toLowerCase().includes("followup")
        );
      }
      if (idKey === "message_value_prop") {
        return s.type === "message_value_prop" || s.title.toLowerCase().includes("value prop");
      }
      return s.type === type;
    });
  };

  const handleAddStep = (type: SocialStepType) => {
    let title = "Nuevo Paso";
    let description = "Paso adicional en la secuencia.";
    let messageTemplate = "";

    if (type === "visit") {
      title = "Visitar Perfil";
      description = "Visita el perfil en LinkedIn para figurar en notificaciones del prospecto.";
    } else if (type === "like_comment") {
      title = "Like + Comentario";
      description = "Interactúa con la publicación más reciente con un Like y Comentario de valor.";
      messageTemplate = "Excelente perspectiva {{first_name}}, totalmente de acuerdo.";
    } else if (type === "connect") {
      title = "Seguir + Conectar";
      description = "Acción 2-en-1: sigue el perfil y envía solicitud de conexión con nota previa.";
      messageTemplate = "Hola {{first_name}}, vi tu actividad sobre {{topic}} y me pareció muy interesante. Me encantaría conectar por aquí.";
    } else if (type === "message_icebreaker") {
      title = "Mensaje DM 01 'Icebreakers'";
      description = "Mensaje inicial contextualizado desde el monitor inteligente de Signal Radar.";
      messageTemplate = "Hola {{first_name}}, vi tu aportación sobre {{topic}}. ¿Cómo lo resuelven en {{company}}?";
    } else if (type === "message_followup") {
      title = "Mensaje DM 02 'Follow-up'";
      description = "Seguimiento consultivo y profundización en el reto comercial o dolor inicial.";
      messageTemplate = "Hola {{first_name}}, te comparto este caso práctico breve sobre {{topic}}.";
    } else if (type === "message_value_prop") {
      title = "Mensaje DM 03 'Value Prop'";
      description = "Mensaje final con la Propuesta de valor y llamada a la acción.";
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

    setFeedbackMessage(`Paso "${title}" añadido a la secuencia.`);
    setTimeout(() => setFeedbackMessage(null), 3000);
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
      const targetName = "Roberto OrSe";
      const targetUrl = "https://www.linkedin.com/in/robertoorse";
      const targetCompany = "InHubFlow";

      const res = await fetch("/api/campaigns/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign: activeCampaign,
          stepIndex: stepToExecute,
          leadName: targetName,
          linkedinUrl: targetUrl,
          company: targetCompany,
          dryRun: true,
          accountId: activeAccount?.unipileAccountId || activeAccount?.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        const currentTitle = activeCampaign.steps[stepToExecute]?.title || "Paso";
        if (data.result?.success === false) {
          setRunnerNotice(`[Simulación] Falló Paso ${stepToExecute + 1} (${currentTitle}): ${data.result?.log?.message || "Error al procesar"}`);
        } else if (data.result?.isSequenceCompleted) {
          setRunnerNotice(`[Simulación] Secuencia completada: Todos los pasos (${activeCampaign.steps.length}) ejecutados para ${targetName}.`);
          setSimulatedStepIndex(0);
        } else {
          setRunnerNotice(`[Simulación] Paso ${stepToExecute + 1} (${currentTitle}) ejecutado para ${targetName}.`);
          setSimulatedStepIndex(data.result.nextStepIndex ?? (stepToExecute + 1));
        }
        setTimeout(() => setRunnerNotice(null), 6000);
        setRunnerLogs(data.logs || []);
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
      const targetName = "Roberto OrSe";
      const targetUrl = "https://www.linkedin.com/in/robertoorse";
      const targetCompany = "InHubFlow";

      const res = await fetch("/api/campaigns/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign: activeCampaign,
          runAll: true,
          leadName: targetName,
          linkedinUrl: targetUrl,
          company: targetCompany,
          dryRun: true,
          accountId: activeAccount?.unipileAccountId || activeAccount?.id,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        if (data.result?.success === false) {
          const lastLog = data.result?.logs?.[data.result.logs.length - 1];
          setRunnerNotice(`[Simulación] Secuencia detenida por error: ${lastLog?.message || "Error al procesar"}`);
        } else {
          setRunnerNotice(`[Simulación] Secuencia completa ejecutada con éxito para ${targetName} (${activeCampaign.steps.length} pasos).`);
        }
        setTimeout(() => setRunnerNotice(null), 6000);
        setRunnerLogs(data.logs || []);
        setSimulatedStepIndex(0);
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
    <div className="w-full space-y-6">
      <PageBreadcrumb pageTitle="Campañas de Social Selling (Secuencias Lineales)" />

      {/* Cabecera Principal */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-lg bg-white border border-gray-300 dark:bg-gray-900 dark:border-gray-800 shadow-theme-xs">
        <div>
          <h3 className="text-base font-medium text-gray-800 dark:text-white/90">
            Motor de Outreach Relacional en LinkedIn
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 max-w-2xl">
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


      {/* Selector de Pestañas de Secuencias Maestras */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-300 dark:border-gray-800 pb-3">
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
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition ${
                  isSelected
                    ? "bg-brand-500 text-white shadow-2xs"
                    : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300"
                }`}
              >
                <span>{camp.name.replace(/\s*\(Palabra Clave SISTEMA\)/gi, "")}</span>
                <span
                  className={`text-xs px-1.5 py-0.2 rounded-full font-bold ${
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

      {/* Secuencia Lineal Centrada con Zona de Drop */}
      <div className="py-2">
        <div
          onDragOver={(e) => {
            e.preventDefault();
            if (!isDragOverWorkflow) setIsDragOverWorkflow(true);
          }}
          onDragLeave={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < rect.left ||
              e.clientX >= rect.right ||
              e.clientY < rect.top ||
              e.clientY >= rect.bottom
            ) {
              setIsDragOverWorkflow(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOverWorkflow(false);
            const stepType = (e.dataTransfer.getData("text/plain") || draggedStepType) as SocialStepType;
            if (stepType) {
              handleAddStep(stepType);
            }
            setDraggedStepType(null);
          }}
          className={`w-full max-w-lg xl:max-w-xl mx-auto space-y-0 transition-all duration-200 p-2 rounded-lg ${
            isDragOverWorkflow
              ? "bg-brand-50/20 dark:bg-brand-950/10 ring-2 ring-dashed ring-brand-500/50"
              : ""
          }`}
        >
          {/* Banner indicador cuando se está arrastrando sobre la zona de drop */}
          {isDragOverWorkflow && (
            <div className="w-full mb-4 p-3 rounded-lg border-2 border-dashed border-brand-500 bg-brand-500/10 text-brand-700 dark:text-brand-300 flex items-center justify-center gap-2 text-xs font-bold animate-pulse">
              <Plus className="size-4" />
              <span>Suelta aquí para añadir este paso al flujo de la secuencia</span>
            </div>
          )}
            {/* Banner de Lista Inteligente Vinculada (si proviene de Signal Radar / Leads) */}
        {linkedList && (
          <div className="mb-3 rounded-lg border border-brand-200 dark:border-brand-900/60 bg-white dark:bg-gray-900 p-3.5 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 flex items-center justify-center shrink-0">
                <Zap className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-900 dark:text-white truncate">
                    Lista Vinculada: {linkedList.name}
                  </span>
                  <span className="text-xs bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300 font-semibold px-2 py-0.5 rounded-full">
                    {linkedList.leadsCount} prospectos
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
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
        <div className="rounded-lg border-2 border-dashed border-brand-300 dark:border-brand-900/60 bg-[#E9F0F7] dark:bg-brand-950/20 p-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-brand-500 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Zap className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
                {sanitizeUnipileText(activeCampaign.triggerTitle)}
              </h4>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xs">
                    <Clock className="h-3 w-3 text-brand-500 shrink-0" />
                    <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 px-1 py-0.5">
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
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-2xs hover:border-brand-500/50 transition">
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
                        className="text-xs font-semibold text-gray-700 dark:text-gray-200 hover:text-brand-500 transition flex items-center gap-1 px-1 py-0.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
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
                        className="absolute left-0 top-full mt-1.5 z-40 w-64 p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-gray-300 dark:border-gray-700/60 pb-1.5">
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
                        <div className="pt-1.5 border-t border-gray-300 dark:border-gray-700/60 flex items-center justify-between">
                          <span className="text-xs text-gray-400">Personalizado:</span>
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
                              className="w-14 px-2 py-0.5 text-xs text-center border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 focus:outline-none focus:border-brand-500"
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
              <div className="rounded-lg border border-gray-300 dark:border-gray-800 bg-white dark:bg-gray-900 p-4 shadow-2xs hover:border-gray-300 dark:hover:border-gray-700 transition">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Caja de Icono */}
                    <div className="h-9 w-9 rounded-lg border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex items-center justify-center shrink-0 mt-0.5">
                      {getStepIcon(step.type)}
                    </div>

                    {/* Contenido del Paso: Título y Descripción (Limpio, sin badges ni vista previa de mensajes) */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                          {String(idx + 1).padStart(2, "0")}.
                        </span>
                        <h4 className="text-base font-medium text-gray-800 dark:text-white/90">
                          {sanitizeUnipileText(step.title)}
                        </h4>
                      </div>

                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
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
                      className="h-[26px] w-[26px] rounded-lg border border-gray-200 text-gray-600 hover:border-brand-500 hover:text-brand-600 hover:bg-brand-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-500 dark:hover:text-brand-400 inline-flex items-center justify-center transition"
                      title="Editar paso de la secuencia"
                    >
                      <Pencil className="size-3.5" />
                    </button>

                    {/* Botón Eliminar (X) */}
                    <button
                      type="button"
                      onClick={() => handleDeleteStep(idx)}
                      className="h-[26px] w-[26px] rounded-lg border border-red-200 text-red-500 hover:bg-red-50 dark:border-red-900/40 dark:text-red-400 inline-flex items-center justify-center transition"
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

        {/* Estado si la secuencia no tiene pasos activos */}
        {activeCampaign.steps.length === 0 && (
          <div className="py-6 flex flex-col items-center justify-center text-center">
            <div className="w-px h-6 border-l-2 border-dashed border-gray-300 dark:border-gray-700 mb-2" />
            <div className="p-4 rounded-lg border border-dashed border-gray-300 dark:border-gray-700 bg-gray-50/60 dark:bg-gray-800/40 text-xs text-gray-500 dark:text-gray-400 max-w-sm">
              <p className="font-semibold text-gray-700 dark:text-gray-200 mb-1">
                La secuencia no tiene pasos activos
              </p>
              <p className="text-xs text-gray-400">
                Haz clic en el botón inferior o arrastra pasos para comenzar a interactuar tras el activador.
              </p>
            </div>
          </div>
        )}

        {/* Botón para Añadir Nuevo Paso */}
        <div className="pt-4 flex justify-center">
          <button
            type="button"
            onClick={handleOpenAddDrawer}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg border border-dashed border-brand-300 dark:border-brand-700 hover:border-brand-500 bg-white dark:bg-gray-800 text-xs font-bold text-brand-600 dark:text-brand-400 hover:bg-brand-50/50 dark:hover:bg-brand-950/40 transition shadow-2xs cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Agregar Paso a la Secuencia</span>
          </button>
        </div>
      </div>
    </div>

      {/* Sección General de Seguimiento de Prospectos por Estaciones de Secuencia */}
      <div className="pt-6">
        <CampaignLeadsTracker
          activeCampaign={activeCampaign}
          leadLists={leadLists}
          allLeads={allLeads}
          activeAccount={activeAccount}
          onLogGenerated={(log) => {
            setRunnerLogs((prev) => [log, ...prev]);
          }}
        />
      </div>

      {/* Ventana Lateral Desplegable (Slide-over Drawer) para Configurar y Editar el Paso */}
      {editingStep && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop tenue para cerrar al hacer clic fuera manteniendo la secuencia visible y nítida a la izquierda */}
          <div
            className={`fixed inset-0 bg-black/15 backdrop-blur-[1px] ${
              isDrawerClosing ? "animate-fade-out" : "animate-fade-in"
            }`}
            onClick={handleCloseDrawer}
          />

          {/* Panel Lateral Desplegable en el lado derecho con Slide Suavizado */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-6 pointer-events-none">
            <div
              className={`w-screen max-w-md sm:max-w-[520px] bg-white dark:bg-gray-900 border-l border-gray-300 dark:border-gray-800 shadow-2xl flex flex-col h-full pointer-events-auto ${
                isDrawerClosing ? "animate-slide-out-right" : "animate-slide-in-right"
              }`}
            >
              {/* Cabecera del Panel Lateral */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-300 dark:border-gray-800 shrink-0 bg-gray-50/60 dark:bg-gray-800/40">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-2xs">
                    {getStepIcon(editingStep.step.type)}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded-full">
                        Paso {editingStep.index + 1} de {activeCampaign.steps.length}
                      </span>
                    </div>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base mt-0.5">
                      Configurar Paso: {sanitizeUnipileText(editingStep.step.title)}
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="h-8 w-8 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-sm font-bold transition"
                  title="Cerrar panel de edición"
                >
                  ✕
                </button>
              </div>

              {/* Contenido Scrolleable del Drawer */}
              <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
              {/* Bloque: Información General */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase mb-1">
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
                  <label className="block text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase mb-1">
                    Retardo Previo (Días de Espera)
                  </label>
                  {editingStep.index === 0 ? (
                    <div className="flex items-center gap-2">
                      <div className="h-9 px-3 rounded-lg border border-gray-300 dark:border-gray-800 bg-gray-100 dark:bg-gray-800/60 text-gray-500 flex items-center justify-center text-xs font-semibold select-none cursor-not-allowed">
                        Inmediato (0 días)
                      </div>
                      <span className="text-xs text-gray-400">
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
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase">
                    Descripción Operativa
                  </label>
                  <span className="text-xs text-gray-400 font-mono">
                    {editingStep.step.description.length}/77 caracteres
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={77}
                  value={editingStep.step.description}
                  onChange={(e) =>
                    setEditingStep({
                      ...editingStep,
                      step: { ...editingStep.step, description: e.target.value.slice(0, 77) },
                    })
                  }
                  className="h-9 w-full rounded-lg border border-gray-300 px-3 text-xs dark:border-gray-700 dark:bg-gray-800 dark:text-white focus:outline-none focus:border-brand-500"
                />
              </div>

              {/* Bloque: Nota de Conexión de LinkedIn (si aplica) */}
              {(editingStep.step.type === "connect" ||
                editingStep.step.type === "connect_message" ||
                editingStep.step.connectNote !== undefined) && (
                <div className="rounded-lg border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/20 dark:bg-emerald-950/10 p-3 space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2">
                    <span className="font-bold shrink-0">Acción 2-en-1:</span>
                    <span>Al enviar la invitación de conexión, LinkedIn activa automáticamente el seguimiento del perfil para maximizar la visibilidad mutua en el feed.</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase flex items-center gap-1.5">
                      <UserPlus className="h-3.5 w-3.5 text-emerald-600" />
                      Nota de Conexión en LinkedIn (Opcional)
                    </label>
                    <span className="text-xs text-gray-400">
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
                    <span className="text-xs text-gray-400">Variables rápidas:</span>
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
                        className="text-xs bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded-lg font-mono hover:bg-emerald-50 transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bloque: Comentario en Publicación (si aplica) */}
              {editingStep.step.type === "like_comment" && (
                <div className="rounded-lg border border-purple-200 dark:border-purple-900/50 bg-purple-50/20 dark:bg-purple-950/10 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase flex items-center gap-1.5">
                      <ThumbsUp className="h-3.5 w-3.5 text-purple-600" />
                      Plantilla de Comentario en Post
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-purple-700 dark:text-purple-300">
                      <input
                        type="checkbox"
                        checked={editingStep.step.useAiComment ?? true}
                        onChange={(e) =>
                          setEditingStep({
                            ...editingStep,
                            step: { ...editingStep.step, useAiComment: e.target.checked },
                          })
                        }
                        className="rounded-lg text-purple-600 focus:ring-0"
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
                <div className="rounded-lg border border-brand-200 dark:border-brand-900/50 bg-brand-50/20 dark:bg-brand-950/10 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase flex items-center gap-1.5">
                      <Send className="h-3.5 w-3.5 text-brand-600" />
                      Plantilla de Mensaje Directo (DM)
                    </label>
                    <span className="text-xs text-gray-400">
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
                    <span className="text-xs text-gray-400">Variables dinámicas:</span>
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
                        className="text-xs bg-white dark:bg-gray-800 border border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-300 px-1.5 py-0.5 rounded-lg font-mono hover:bg-brand-50 transition"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Bloque: Selector de Contenido Adjunto y Multimedia (Imagen, Video, Notas de Voz, Archivos) */}
              <div className="rounded-lg border border-gray-300 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 p-3.5 space-y-3">
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
                    <label className="text-xs leading-5 font-normal tracking-normal text-gray-400 uppercase flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-brand-500" />
                      Adjuntos y Multimedia para LinkedIn
                    </label>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Selecciona si deseas enviar una imagen, video, nota de voz humana o archivo PDF junto al paso.
                    </p>
                  </div>
                  {editingStep.step.attachmentType && editingStep.step.attachmentType !== "none" && (
                    <button
                      type="button"
                      onClick={handleRemoveAttachment}
                      className="text-xs text-red-500 hover:text-red-700 dark:text-red-400 font-semibold flex items-center gap-1 transition"
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
                        className={`flex flex-col items-center justify-center p-2.5 rounded-lg border text-center transition gap-1.5 ${
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
                  <div className="space-y-2.5 pt-2 border-t border-gray-300 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Cargar Imagen o Enlace
                      </label>
                      <button
                        type="button"
                        onClick={() => imageInputRef.current?.click()}
                        className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Upload className="h-3 w-3" />
                        Explorar archivo
                      </button>
                    </div>

                    {/* Botón de carga principal estilo dropzone */}
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-brand-200 dark:border-brand-900/60 hover:border-brand-500 rounded-lg bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-brand-50/20 transition cursor-pointer"
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
                      <span className="text-xs text-gray-400">Presets sugeridos:</span>
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
                          className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-lg hover:bg-gray-100"
                        >
                          {img}
                        </button>
                      ))}
                    </div>

                    {/* Previsualización visual de imagen */}
                    <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        {editingStep.step.attachmentUrl &&
                        (editingStep.step.attachmentUrl.startsWith("data:image") ||
                          editingStep.step.attachmentUrl.startsWith("http")) ? (
                          <img
                            src={editingStep.step.attachmentUrl}
                            alt="Previsualización"
                            className="h-12 w-12 rounded-lg object-cover border border-gray-300 dark:border-gray-700 shrink-0"
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
                          <div className="text-xs text-gray-400">
                            {editingStep.step.attachmentSize || "Imagen PNG / JPG"} para entrega en LinkedIn DM.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => imageInputRef.current?.click()}
                          className="px-2 py-1 text-xs rounded-lg font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveAttachment}
                          className="p-1 text-gray-400 hover:text-red-500 rounded-lg"
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
                  <div className="space-y-2.5 pt-2 border-t border-gray-300 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Cargar Video o Enlace (Loom / MP4)
                      </label>
                      <button
                        type="button"
                        onClick={() => videoInputRef.current?.click()}
                        className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Upload className="h-3 w-3" />
                        Explorar archivo
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => videoInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-brand-200 dark:border-brand-900/60 hover:border-brand-500 rounded-lg bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-brand-50/20 transition cursor-pointer"
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
                    <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-12 w-16 rounded-lg bg-gray-900 text-white flex items-center justify-center shrink-0 relative shadow-xs">
                          <Play className="h-5 w-5 text-brand-400 fill-brand-400" />
                          <span className="absolute bottom-1 right-1 text-xs bg-black/80 px-1 rounded-lg text-white font-mono">
                            01:30
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {editingStep.step.attachmentName || "demo-sistema-b2b.mp4"}
                          </div>
                          <div className="text-xs text-gray-400">
                            {editingStep.step.attachmentSize || "Video MP4"} interactivo para LinkedIn.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => videoInputRef.current?.click()}
                          className="px-2 py-1 text-xs rounded-lg font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveAttachment}
                          className="p-1 text-gray-400 hover:text-red-500 rounded-lg"
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
                  <div className="space-y-2.5 pt-2 border-t border-gray-300 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Grabación o Archivo de Audio
                      </label>
                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
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
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition animate-pulse"
                        >
                          <Square className="h-3.5 w-3.5 fill-white" />
                          Detener Grabación (00:{String(recordingSeconds).padStart(2, "0")})
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={startVoiceRecording}
                          className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-brand-500 hover:bg-brand-600 text-white font-bold text-xs shadow-xs transition"
                        >
                          <Mic className="h-4 w-4" />
                          Grabar Nota de Voz con Micrófono
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        className="flex items-center gap-1.5 py-2.5 px-3 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                      >
                        <Upload className="h-3.5 w-3.5 text-brand-500" />
                        Subir Audio
                      </button>
                    </div>

                    {/* Presets de duración estimada */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-gray-400">Duración estimada:</span>
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
                            className={`text-xs px-2 py-0.5 rounded-lg font-semibold transition ${
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
                    <div className="rounded-lg border border-brand-200 dark:border-brand-900/60 bg-gradient-to-r from-brand-50/50 via-white to-brand-50/30 dark:from-brand-950/30 dark:via-gray-800 dark:to-brand-950/20 p-3 flex items-center gap-3 shadow-2xs">
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
                        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                          <span>0:00 / 0:{editingStep.step.voiceNoteDurationSec || 45}</span>
                          <span className="font-semibold text-brand-600 dark:text-brand-400 truncate max-w-[150px]">
                            {editingStep.step.attachmentName || "Nota de Voz Humana"}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={handleRemoveAttachment}
                        className="p-1 text-gray-400 hover:text-red-500 rounded-lg"
                        title="Eliminar nota de voz"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 4. Archivo / PDF */}
                {editingStep.step.attachmentType === "document" && (
                  <div className="space-y-2.5 pt-2 border-t border-gray-300 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300">
                        Cargar Documento o PDF (Lead Magnet)
                      </label>
                      <button
                        type="button"
                        onClick={() => documentInputRef.current?.click()}
                        className="text-xs text-brand-600 dark:text-brand-400 font-semibold hover:underline flex items-center gap-1"
                      >
                        <Upload className="h-3 w-3" />
                        Explorar archivo
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => documentInputRef.current?.click()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-4 border-2 border-dashed border-brand-200 dark:border-brand-900/60 hover:border-brand-500 rounded-lg bg-white dark:bg-gray-800 text-xs font-semibold text-gray-700 dark:text-gray-200 hover:bg-brand-50/20 transition cursor-pointer"
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
                      <span className="text-xs text-gray-400">Presets de Lead Magnet:</span>
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
                          className="text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 px-1.5 py-0.5 rounded-lg hover:bg-gray-100"
                        >
                          {doc}
                        </button>
                      ))}
                    </div>

                    {/* Previsualización visual de documento */}
                    <div className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 flex items-center justify-between gap-3 shadow-2xs">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="h-10 w-10 rounded-lg bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-gray-900 dark:text-white truncate">
                            {editingStep.step.attachedResource || editingStep.step.attachmentName || "Framework-Prospeccion-B2B-InHubFlow.pdf"}
                          </div>
                          <div className="text-xs text-gray-400">
                            {editingStep.step.attachmentSize || "Documento PDF"} listo para entrega automática al prospecto.
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => documentInputRef.current?.click()}
                          className="px-2 py-1 text-xs rounded-lg font-semibold text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-950/40"
                        >
                          Cambiar
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveAttachment}
                          className="p-1 text-gray-400 hover:text-red-500 rounded-lg"
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

              {/* Pie del Panel Lateral */}
              <div className="flex items-center justify-end gap-2.5 px-5 py-3.5 border-t border-gray-300 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 shrink-0">
                <button
                  type="button"
                  onClick={handleCloseDrawer}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 transition"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveStepModal(editingStep.step)}
                  className="rounded-lg bg-brand-500 px-5 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition shadow-xs flex items-center gap-1.5"
                >
                  <Check className="size-3.5" />
                  <span>Guardar Cambios</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ventana Lateral Desplegable (Slide-over Drawer) para Añadir y Arrastrar Pasos */}
      {showAddStepModal && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop tenue - pointer-events-none mientras se arrastra para permitir soltar en la secuencia central */}
          <div
            className={`fixed inset-0 bg-black/15 backdrop-blur-[1px] ${
              isAddDrawerClosing ? "animate-fade-out" : "animate-fade-in"
            } ${draggedStepType ? "pointer-events-none" : ""}`}
            onClick={handleCloseAddDrawer}
          />

          {/* Panel Lateral Desplegable en el lado derecho con Slide Suavizado (mismo tamaño y proporciones exactas de editar) */}
          <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-6 pointer-events-none">
            <div
              className={`w-screen max-w-md sm:max-w-[520px] bg-white dark:bg-gray-900 border-l border-gray-300 dark:border-gray-800 shadow-2xl flex flex-col h-full pointer-events-auto ${
                isAddDrawerClosing ? "animate-slide-out-right" : "animate-slide-in-right"
              }`}
            >
              {/* Cabecera del Panel Lateral */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-300 dark:border-gray-800 shrink-0 bg-gray-50/60 dark:bg-gray-800/40">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-lg bg-brand-50 dark:bg-brand-950/60 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-2xs">
                    <Layers className="size-4.5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded-full">
                      Paleta de Pasos
                    </span>
                    <h3 className="font-bold text-gray-900 dark:text-white text-base mt-0.5">
                      Agregar Paso a la Secuencia
                    </h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCloseAddDrawer}
                  className="h-8 w-8 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center text-sm font-bold transition cursor-pointer"
                  title="Cerrar panel"
                >
                  ✕
                </button>
              </div>

              {/* Contenido Scrolleable del Drawer */}
              <div className="p-5 overflow-y-auto space-y-2.5 flex-1 text-xs">
                {/* Lista de Tarjetas de Pasos Disponibles */}
                <div className="space-y-2.5">
                  {AVAILABLE_PALETTE_STEPS.map((paletteStep) => {
                    const inSequence = isStepInSequence(paletteStep.idKey, paletteStep.type);

                    return (
                      <div
                        key={paletteStep.idKey}
                        draggable={!inSequence}
                        onDragStart={(e) => {
                          if (inSequence) return;
                          e.dataTransfer.setData("text/plain", paletteStep.type);
                          setDraggedStepType(paletteStep.type);
                        }}
                        onDragEnd={() => setDraggedStepType(null)}
                        onClick={() => {
                          if (!inSequence) {
                            handleAddStep(paletteStep.type);
                          }
                        }}
                        className={`group relative rounded-lg border p-3 transition-all duration-200 select-none ${
                          inSequence
                            ? "opacity-50 bg-gray-50/70 dark:bg-gray-800/30 border-dashed border-gray-300 dark:border-gray-800 cursor-not-allowed"
                            : "bg-white dark:bg-gray-800/80 border-gray-300 dark:border-gray-700 shadow-2xs hover:shadow-md hover:border-brand-400 dark:hover:border-brand-500 cursor-grab active:cursor-grabbing hover:-translate-y-0.5"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {/* Grip para arrastrar */}
                          <div
                            className={`pt-1 shrink-0 ${
                              inSequence
                                ? "text-gray-300 dark:text-gray-700"
                                : "text-gray-400 group-hover:text-brand-500"
                            }`}
                            title={inSequence ? "Ya agregado a la secuencia" : "Arrastrar hacia la secuencia central"}
                          >
                            <GripVertical className="size-4" />
                          </div>

                          {/* Icono del tipo de paso */}
                          <div
                            className={`size-8 rounded-lg flex items-center justify-center shrink-0 ${paletteStep.iconBg}`}
                          >
                            {paletteStep.icon}
                          </div>

                          {/* Información del paso */}
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="text-xs font-mono font-bold text-gray-400">
                                {paletteStep.orderNumber}
                              </span>
                              {inSequence ? (
                                <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200/60 dark:border-emerald-900/60">
                                  <Check className="size-3" /> En secuencia
                                </span>
                              ) : (
                                <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 opacity-0 group-hover:opacity-100 transition flex items-center gap-0.5">
                                  <Plus className="size-3" /> Clic o Arrastrar
                                </span>
                              )}
                            </div>

                            <h4
                              className={`text-base font-medium leading-tight ${
                                inSequence
                                  ? "text-gray-400 dark:text-gray-500"
                                  : "text-gray-800 dark:text-white/90"
                              }`}
                            >
                              {paletteStep.title}
                            </h4>

                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400 line-clamp-2">
                              {paletteStep.subtitle}
                            </p>
                          </div>

                          {/* Botón rápido '+' */}
                          {!inSequence && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleAddStep(paletteStep.type);
                              }}
                              className="size-7 rounded-lg bg-brand-50 hover:bg-brand-500 text-brand-600 hover:text-white dark:bg-brand-950/60 dark:hover:bg-brand-500 dark:text-brand-400 flex items-center justify-center shrink-0 self-center transition shadow-2xs cursor-pointer"
                              title={`Añadir ${paletteStep.title}`}
                            >
                              <Plus className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pie del Panel Lateral */}
              <div className="flex items-center justify-between px-5 py-3.5 border-t border-gray-300 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-900/60 shrink-0">
                <span className="text-xs font-medium text-gray-500 dark:text-gray-400">
                  {activeCampaign.steps.length} de {AVAILABLE_PALETTE_STEPS.length} pasos en secuencia
                </span>
                <button
                  type="button"
                  onClick={handleCloseAddDrawer}
                  className="rounded-lg bg-brand-500 hover:bg-brand-600 text-white px-4 py-2 text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  Listo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Límites de Seguridad (Pacing Limits) */}
      {showPacingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl dark:bg-gray-900 border border-gray-300 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-300 dark:border-gray-800">
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
              <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-300 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                    Visitas de Perfil / Día
                  </span>
                  <span className="text-xs text-gray-400">Recomendado: 20 perfiles</span>
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

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-300 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                    Invitaciones de Conexión / Día
                  </span>
                  <span className="text-xs text-gray-400">Tope seguro: 20 a 25 máximo</span>
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

              <div className="flex items-center justify-between p-2.5 rounded-lg border border-gray-300 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                <div>
                  <span className="font-semibold text-gray-800 dark:text-gray-200 block">
                    Mensajes Directos (DM) / Día
                  </span>
                  <span className="text-xs text-gray-400">Tope seguro: 20 a 30 máximo</span>
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
              <div className="p-3 rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50/40 dark:bg-emerald-950/20">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-emerald-800 dark:text-emerald-300 block">
                      Regla Stop on Reply
                    </span>
                    <span className="text-xs text-emerald-700 dark:text-emerald-400 block mt-0.5">
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
                    className="h-4 w-4 rounded-lg border-emerald-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-gray-300 dark:border-gray-800">
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
          <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-2xl dark:bg-gray-900 border border-gray-300 dark:border-gray-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-gray-300 dark:border-gray-800">
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
                    className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition px-2 py-1 rounded-lg"
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
                    className="p-2.5 rounded-lg border border-gray-300 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/40 text-xs flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <span className="font-bold text-gray-900 dark:text-white">
                          {log.leadName}
                        </span>
                        <span className="text-xs text-gray-400">{log.timestamp?.slice(11, 19)}</span>
                        <span
                          className={`rounded-lg px-1.5 py-0.2 text-xs font-bold ${
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
                          <span className="inline-flex items-center gap-1 rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300 px-1.5 py-0.2 text-xs font-semibold border border-brand-200 dark:border-brand-900">
                            <Paperclip className="h-2.5 w-2.5" />
                            {String(log.details?.attachmentName ?? "")}
                            {log.details?.attachmentSize ? ` (${String(log.details.attachmentSize)})` : ""}
                          </span>
                        )}
                      </div>
                      <p className="text-gray-600 dark:text-gray-300 text-xs leading-relaxed">{log.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-gray-300 dark:border-gray-800">
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
