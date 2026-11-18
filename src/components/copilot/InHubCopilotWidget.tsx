"use client";

import type { CopilotAccountStatus } from "@/app/api/copilot/status/route";
import type { TrainingDraft, TrainingStep } from "@/app/api/copilot/chat/route";
import { usePathname, useRouter } from "@/i18n/navigation";
import {
  getRouteCopilotContext,
  normalizeCopilotLocale,
  type CopilotActionLink,
  type CopilotLocale,
} from "@/lib/copilot/platform-manual";
import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  MessageSquareText,
  Send,
  Sparkles,
  X,
} from "lucide-react";
import { useLocale } from "next-intl";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { InHubLiveAvatar, type InHubEmotion } from "./InHubLiveAvatar";

interface ChatMessage {
  id: string;
  sender: "inhub" | "user";
  text: string;
  actions?: CopilotActionLink[];
}

const UI_LABELS: Record<
  CopilotLocale,
  {
    assistantTitle: string;
    activeBadge: string;
    progressLabel: string;
    stepLinkedIn: string;
    stepTrain: string;
    stepPosts: string;
    stepSignals: string;
    stepCampaigns: string;
    yesExplainBtn: string;
    startNowBtn: string;
    trainNowBtn: string;
    inputPlaceholder: string;
    trainingPlaceholder: string;
    typingText: string;
    onboardingMissingLinkedIn: string;
    onboardingMissingKnowledge: string;
    welcomeIntro: string;
  }
> = {
  es: {
    assistantTitle: "InHub · Asistente SDR IA",
    activeBadge: "Activo 24/7",
    progressLabel: "Estado de tu cuenta",
    stepLinkedIn: "1. LinkedIn",
    stepTrain: "2. Entrenarme",
    stepPosts: "3. Posts",
    stepSignals: "4. Radar",
    stepCampaigns: "5. Campañas",
    yesExplainBtn: "Sí, explícame esta sección →",
    startNowBtn: "Conectar mi LinkedIn →",
    trainNowBtn: "Entrenar a InHub ahora ✦",
    inputPlaceholder: "Pregúntale a InHub cómo usar la plataforma...",
    trainingPlaceholder: "Escribe tu respuesta para entrenar a InHub...",
    typingText: "InHub está escribiendo...",
    onboardingMissingLinkedIn:
      "¡Hola! Soy InHub 👋 Vi que primero debes conectar tu cuenta de LinkedIn para empezar, y después entrenarme con los datos de tu empresa.",
    onboardingMissingKnowledge:
      "¡Ya conectaste tu LinkedIn! ✅ Ahora debes entrenarme dándome la información de tu empresa (nombre, productos o servicios y link de agenda).",
    welcomeIntro:
      "¡Hola! Soy **InHub**, tu Asistente SDR IA y copiloto dentro de la plataforma. Conozco el estado de tu cuenta y cada herramienta del Dashboard. ¿En qué te ayudo hoy?",
  },
  en: {
    assistantTitle: "InHub · AI SDR Assistant",
    activeBadge: "Active 24/7",
    progressLabel: "Your account progress",
    stepLinkedIn: "1. LinkedIn",
    stepTrain: "2. Train Me",
    stepPosts: "3. Posts",
    stepSignals: "4. Radar",
    stepCampaigns: "5. Campaigns",
    yesExplainBtn: "Yes, explain this section →",
    startNowBtn: "Connect my LinkedIn →",
    trainNowBtn: "Train InHub now ✦",
    inputPlaceholder: "Ask InHub how to use the platform...",
    trainingPlaceholder: "Type your answer to train InHub...",
    typingText: "InHub is typing...",
    onboardingMissingLinkedIn:
      "Hi! I'm InHub 👋 First you need to connect your LinkedIn account to get started, and then train me on your company info.",
    onboardingMissingKnowledge:
      "Your LinkedIn is connected! ✅ Now let's train me with your company details (name, products/services, and booking link).",
    welcomeIntro:
      "Hi! I'm **InHub**, your AI SDR Assistant and in-app copilot. I can check your live account status and guide you through every tool. How can I help today?",
  },
  "pt-BR": {
    assistantTitle: "InHub · Assistente SDR IA",
    activeBadge: "Ativo 24/7",
    progressLabel: "Progresso da sua conta",
    stepLinkedIn: "1. LinkedIn",
    stepTrain: "2. Me Treinar",
    stepPosts: "3. Posts",
    stepSignals: "4. Radar",
    stepCampaigns: "5. Campanhas",
    yesExplainBtn: "Sim, me explique esta seção →",
    startNowBtn: "Conectar meu LinkedIn →",
    trainNowBtn: "Treinar o InHub agora ✦",
    inputPlaceholder: "Pergunte ao InHub como usar a plataforma...",
    trainingPlaceholder: "Digite sua resposta para treinar o InHub...",
    typingText: "InHub está digitando...",
    onboardingMissingLinkedIn:
      "Olá! Sou o InHub 👋 Vi que primeiro você deve conectar sua conta do LinkedIn e depois me treinar com os dados da sua empresa.",
    onboardingMissingKnowledge:
      "LinkedIn conectado! ✅ Agora você deve me treinar com as informações da sua empresa (nome, produtos ou serviços e link de agenda).",
    welcomeIntro:
      "Olá! Sou o **InHub**, seu Assistente SDR IA e copiloto da plataforma. Conheço o status da sua conta e cada ferramenta do Dashboard. Como posso ajudar hoje?",
  },
};

function renderFormattedText(text: string) {
  const lines = text.split("\n");
  return lines.map((line, lineIdx) => {
    const parts = line.split(/(\*\*[^*]+\*\*)/g);
    return (
      <React.Fragment key={lineIdx}>
        {lineIdx > 0 && <br />}
        {parts.map((part, partIdx) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={partIdx} className="font-bold text-slate-900 dark:text-white">
                {part.slice(2, -2)}
              </strong>
            );
          }
          return <span key={partIdx}>{part}</span>;
        })}
      </React.Fragment>
    );
  });
}

export default function InHubCopilotWidget() {
  const rawLocale = useLocale();
  const locale = normalizeCopilotLocale(rawLocale);
  const pathname = usePathname() || "/";
  const router = useRouter();
  const labels = UI_LABELS[locale];

  const routeCtx = useMemo(
    () => getRouteCopilotContext(pathname, locale),
    [pathname, locale]
  );

  const [isOpen, setIsOpen] = useState(false);
  const [showProactiveBubble, setShowProactiveBubble] = useState(false);
  const [dismissedRoutes, setDismissedRoutes] = useState<Record<string, boolean>>({});
  const [accountStatus, setAccountStatus] = useState<CopilotAccountStatus | null>(null);
  const [emotion, setEmotion] = useState<InHubEmotion>("idle");
  const [isSending, setIsSending] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [trainingStep, setTrainingStep] = useState<TrainingStep>("idle");
  const [trainingDraft, setTrainingDraft] = useState<TrainingDraft>({});
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  const fetchAccountStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/copilot/status", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as CopilotAccountStatus;
      if (data?.ok) {
        setAccountStatus(data);
      }
    } catch {}
  }, []);

  useEffect(() => {
    fetchAccountStatus();
  }, [fetchAccountStatus, pathname]);

  // Initialize welcome message when locale or status first loads
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: "welcome-0",
          sender: "inhub",
          text: labels.welcomeIntro,
          actions: routeCtx.defaultActions,
        },
      ];
    });
  }, [labels.welcomeIntro, routeCtx.defaultActions]);

  // Show contextual proactive bubble when entering a route (unless dismissed in this session)
  useEffect(() => {
    if (isOpen) {
      setShowProactiveBubble(false);
      return;
    }
    if (dismissedRoutes[routeCtx.routeKey]) {
      setShowProactiveBubble(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowProactiveBubble(true);
      setEmotion("excited");
      setTimeout(() => setEmotion("idle"), 1600);
    }, 1100);

    return () => clearTimeout(timer);
  }, [routeCtx.routeKey, isOpen, dismissedRoutes]);

  useEffect(() => {
    if (isOpen) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen, isSending]);

  const sendMessage = useCallback(
    async (
      text: string,
      options?: {
        triggerAction?: "start_training" | "check_account";
        silentUserMessage?: boolean;
      }
    ) => {
      const trimmed = text.trim();
      if (!trimmed && !options?.triggerAction) return;

      setIsOpen(true);
      setShowProactiveBubble(false);

      if (trimmed && !options?.silentUserMessage) {
        setMessages((prev) => [
          ...prev,
          {
            id: `u-${Date.now()}`,
            sender: "user",
            text: trimmed,
          },
        ]);
      }

      setInputValue("");
      setIsSending(true);
      setEmotion("thinking");

      try {
        const res = await fetch("/api/copilot/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: trimmed,
            pathname,
            locale,
            trainingStep,
            trainingDraft,
            triggerAction: options?.triggerAction,
          }),
        });

        const data = await res.json();
        if (data?.ok) {
          setTrainingStep(data.trainingStep || "idle");
          setTrainingDraft(data.trainingDraft || {});
          setEmotion((data.emotion as InHubEmotion) || "talking");

          setMessages((prev) => [
            ...prev,
            {
              id: `b-${Date.now()}`,
              sender: "inhub",
              text: data.reply,
              actions: data.actions || [],
            },
          ]);

          if (data.knowledgeSaved) {
            fetchAccountStatus();
          }

          setTimeout(() => setEmotion("idle"), 2400);
        }
      } catch {
        setEmotion("idle");
      } finally {
        setIsSending(false);
      }
    },
    [pathname, locale, trainingStep, trainingDraft, fetchAccountStatus]
  );

  const handleActionClick = (act: CopilotActionLink) => {
    if (act.actionType === "start_training" || act.href === "#train") {
      sendMessage(labels.trainNowBtn, { triggerAction: "start_training" });
      return;
    }
    router.push(act.href);
  };

  const handleDismissBubble = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowProactiveBubble(false);
    setDismissedRoutes((prev) => ({ ...prev, [routeCtx.routeKey]: true }));
  };

  // Decide what proactive message to show in the bottom-right corner bubble
  const proactiveConfig = useMemo(() => {
    if (accountStatus && !accountStatus.hasLinkedInAccount && routeCtx.routeKey === "dashboard") {
      return {
        text: labels.onboardingMissingLinkedIn,
        ctaLabel: labels.startNowBtn,
        onCta: () => {
          setShowProactiveBubble(false);
          router.push("/linkedin-accounts");
        },
        secondaryLabel: labels.trainNowBtn,
        onSecondary: () => {
          sendMessage(labels.trainNowBtn, { triggerAction: "start_training" });
        },
      };
    }

    if (
      accountStatus &&
      accountStatus.hasLinkedInAccount &&
      !accountStatus.hasCustomKnowledge &&
      (routeCtx.routeKey === "dashboard" || routeCtx.routeKey === "linkedin-accounts")
    ) {
      return {
        text: labels.onboardingMissingKnowledge,
        ctaLabel: labels.trainNowBtn,
        onCta: () => {
          sendMessage(labels.trainNowBtn, { triggerAction: "start_training" });
        },
      };
    }

    return {
      text: routeCtx.proactiveBubble,
      ctaLabel: labels.yesExplainBtn,
      onCta: () => {
        sendMessage(routeCtx.quickChips[0] || "¿Cómo funciona esta sección?");
      },
    };
  }, [
    accountStatus,
    routeCtx,
    labels,
    router,
    sendMessage,
  ]);

  const hasPendingOnboarding =
    accountStatus !== null &&
    (!accountStatus.hasLinkedInAccount || !accountStatus.hasCustomKnowledge);

  return (
    <div className="fixed bottom-4 right-4 z-[999999] flex flex-col items-end">
      {/* ===================================================================== */}
      {/* 1. EXPANDED INTERACTIVE COPILOT DRAWER                                */}
      {/* ===================================================================== */}
      {isOpen && (
        <div className="mb-2.5 w-[350px] sm:w-[400px] max-h-[min(540px,calc(100dvh-140px))] rounded-3xl border border-[#222222] bg-white dark:bg-gray-900 shadow-2xl shadow-slate-950/35 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
          {/* Top Dark Header with the Same Living InHub Bot (No video) */}
          <div className="bg-[#000000] text-white p-3.5 border-b border-[#222222] shrink-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 flex items-center justify-center">
                  <InHubLiveAvatar emotion={emotion} size="sm" hideStatusDot />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-white truncate">
                      {labels.assistantTitle}
                    </h4>
                  </div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      {labels.activeBadge}
                    </span>
                    <span className="text-[11px] text-gray-400 truncate">
                      · {routeCtx.sectionTitle}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Cerrar asistente"
                className="p-1.5 rounded-xl bg-[#111111] border border-[#222222] text-gray-400 hover:text-white hover:border-[#0099ff] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Live Account Onboarding Stepper Bar */}
            {accountStatus && (
              <div className="mt-3.5 pt-3 border-t border-[#222222]">
                <div className="flex items-center justify-between text-[11px] mb-2">
                  <span className="text-gray-400 font-medium">{labels.progressLabel}:</span>
                  <span className="text-[#0099ff] font-bold">
                    {accountStatus.completedStepsCount} / {accountStatus.totalStepsCount}
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => router.push("/linkedin-accounts")}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                      accountStatus.hasLinkedInAccount
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-[#111111] border-[#0099ff] text-white"
                    }`}
                  >
                    {accountStatus.hasLinkedInAccount ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Circle className="w-3 h-3 text-[#0099ff]" />
                    )}
                    {labels.stepLinkedIn}
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      sendMessage(labels.trainNowBtn, { triggerAction: "start_training" })
                    }
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                      accountStatus.hasCustomKnowledge
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-[#111111] border-[#0099ff] text-white"
                    }`}
                  >
                    {accountStatus.hasCustomKnowledge ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-[#0099ff]" />
                    )}
                    {labels.stepTrain}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/viral-posts")}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                      accountStatus.viralPostsCount > 0
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-[#111111] border-[#222222] text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    {accountStatus.viralPostsCount > 0 ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Circle className="w-3 h-3 text-gray-500" />
                    )}
                    {labels.stepPosts}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/signals")}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                      accountStatus.signalMonitorsCount > 0
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-[#111111] border-[#222222] text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    {accountStatus.signalMonitorsCount > 0 ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Circle className="w-3 h-3 text-gray-500" />
                    )}
                    {labels.stepSignals}
                  </button>

                  <button
                    type="button"
                    onClick={() => router.push("/campaigns")}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition cursor-pointer ${
                      accountStatus.campaignsCount > 0
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                        : "bg-[#111111] border-[#222222] text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    {accountStatus.campaignsCount > 0 ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Circle className="w-3 h-3 text-gray-500" />
                    )}
                    {labels.stepCampaigns}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Messages Scroll Area */}
          <div className="min-h-0 flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#E9F0F7]/60 dark:bg-gray-950">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#0099ff] text-white font-medium rounded-br-xs shadow-xs"
                      : "bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-200 border border-slate-200/90 dark:border-gray-800 rounded-bl-xs shadow-xs"
                  }`}
                >
                  {msg.sender === "inhub" ? renderFormattedText(msg.text) : msg.text}
                </div>

                {/* Direct Action Buttons inside InHub's Reply */}
                {msg.sender === "inhub" && msg.actions && msg.actions.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5 max-w-[92%]">
                    {msg.actions.map((act, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleActionClick(act)}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-[11px] font-semibold transition cursor-pointer shadow-2xs ${
                          act.actionType === "start_training"
                            ? "bg-[#0099ff] text-white hover:bg-[#0082db]"
                            : "bg-white dark:bg-gray-800 text-[#0099ff] border border-[#0099ff]/30 hover:bg-[#e6f4fe]/60"
                        }`}
                      >
                        <span>{act.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {isSending && (
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-gray-400 px-2">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0099ff] animate-bounce" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0099ff] animate-bounce [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0099ff] animate-bounce [animation-delay:300ms]" />
                </span>
                <span>{labels.typingText}</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Contextual Quick Chips for the Active Page */}
          {trainingStep === "idle" && (
            <div className="px-3.5 py-2.5 bg-white dark:bg-gray-900 border-t border-slate-200/80 dark:border-gray-800">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                {routeCtx.quickChips.map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessage(chip)}
                    className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-gray-800 hover:bg-[#e6f4fe] dark:hover:bg-[#0099ff]/20 text-slate-700 dark:text-gray-200 hover:text-[#0099ff] text-[11px] font-medium border border-slate-200/80 dark:border-gray-700 transition cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(inputValue);
            }}
            className="p-3 bg-white dark:bg-gray-900 border-t border-slate-200/80 dark:border-gray-800 flex items-center gap-2"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={
                trainingStep !== "idle"
                  ? labels.trainingPlaceholder
                  : labels.inputPlaceholder
              }
              className="flex-1 bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs rounded-xl px-3.5 py-2.5 border border-slate-200/80 dark:border-gray-700 focus:outline-none focus:border-[#0099ff]"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isSending}
              aria-label="Enviar"
              className="w-9 h-9 rounded-xl bg-[#0099ff] hover:bg-[#0082db] disabled:opacity-40 text-white flex items-center justify-center transition cursor-pointer shrink-0 shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. PROACTIVE CONTEXTUAL SPEECH BUBBLE + LIVE MOVING INHUB AVATAR       */}
      {/* ===================================================================== */}
      <div className="flex items-end gap-3">
        {showProactiveBubble && !isOpen && (
          <div className="relative max-w-[295px] sm:max-w-[330px] rounded-2xl rounded-br-xs bg-white dark:bg-gray-900 border-2 border-[#0099ff]/40 p-3.5 shadow-xl shadow-slate-900/15 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <button
              type="button"
              onClick={handleDismissBubble}
              aria-label="Minimizar sugerencia"
              className="absolute top-2 right-2 p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>

            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#0099ff] mb-1 pr-5">
              <MessageSquareText className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{routeCtx.sectionTitle}</span>
            </div>

            <p className="text-xs text-slate-700 dark:text-gray-200 leading-snug mb-2.5">
              {proactiveConfig.text}
            </p>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={proactiveConfig.onCta}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0099ff] hover:bg-[#0082db] text-white text-[11px] font-bold transition cursor-pointer shadow-xs"
              >
                <span>{proactiveConfig.ctaLabel}</span>
              </button>

              {proactiveConfig.secondaryLabel && proactiveConfig.onSecondary && (
                <button
                  type="button"
                  onClick={proactiveConfig.onSecondary}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#e6f4fe] text-[#0099ff] hover:bg-[#cce9fd] text-[11px] font-bold transition cursor-pointer"
                >
                  <span>{proactiveConfig.secondaryLabel}</span>
                  <ArrowUpRight className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Living 3D InHub Avatar Button */}
        <InHubLiveAvatar
          emotion={emotion}
          hasNotification={hasPendingOnboarding}
          onClick={() => setIsOpen((prev) => !prev)}
        />
      </div>
    </div>
  );
}
