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
  CheckCircle2,
  ChevronDown,
  Circle,
  Send,
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
    subtitlePrefix: string;
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
    assistantTitle: "InHub",
    subtitlePrefix: "Asistente IA",
    stepLinkedIn: "Conectar LinkedIn",
    stepTrain: "Entrenar empresa",
    stepPosts: "Crear posts",
    stepSignals: "Signal Radar",
    stepCampaigns: "Campañas",
    yesExplainBtn: "Explícame esta sección →",
    startNowBtn: "Conectar LinkedIn →",
    trainNowBtn: "Entrenar ahora →",
    inputPlaceholder: "Escribe tu pregunta...",
    trainingPlaceholder: "Escribe tu respuesta...",
    typingText: "Escribiendo...",
    onboardingMissingLinkedIn:
      "Hola, soy InHub. Primero conecta tu cuenta de LinkedIn para empezar.",
    onboardingMissingKnowledge:
      "LinkedIn listo. ¿Me entrenas en 1 minuto con los datos de tu empresa?",
    welcomeIntro:
      "Hola, soy **InHub**. Puedo ayudarte a configurar tu cuenta o explicarte cómo usar cualquier sección.",
  },
  en: {
    assistantTitle: "InHub",
    subtitlePrefix: "AI Assistant",
    stepLinkedIn: "Connect LinkedIn",
    stepTrain: "Train company",
    stepPosts: "Create posts",
    stepSignals: "Signal Radar",
    stepCampaigns: "Campaigns",
    yesExplainBtn: "Explain this section →",
    startNowBtn: "Connect LinkedIn →",
    trainNowBtn: "Train now →",
    inputPlaceholder: "Ask anything...",
    trainingPlaceholder: "Type your answer...",
    typingText: "Typing...",
    onboardingMissingLinkedIn:
      "Hi, I'm InHub. Connect your LinkedIn account first to get started.",
    onboardingMissingKnowledge:
      "LinkedIn is ready. Want to train me on your company in 1 minute?",
    welcomeIntro:
      "Hi, I'm **InHub**. I can help you set up your account or walk you through any section.",
  },
  "pt-BR": {
    assistantTitle: "InHub",
    subtitlePrefix: "Assistente IA",
    stepLinkedIn: "Conectar LinkedIn",
    stepTrain: "Treinar empresa",
    stepPosts: "Criar posts",
    stepSignals: "Signal Radar",
    stepCampaigns: "Campanhas",
    yesExplainBtn: "Explicar esta seção →",
    startNowBtn: "Conectar LinkedIn →",
    trainNowBtn: "Treinar agora →",
    inputPlaceholder: "Digite sua pergunta...",
    trainingPlaceholder: "Digite sua resposta...",
    typingText: "Digitando...",
    onboardingMissingLinkedIn:
      "Olá, sou o InHub. Primeiro conecte sua conta do LinkedIn para começar.",
    onboardingMissingKnowledge:
      "LinkedIn pronto. Quer me treinar em 1 minuto com os dados da sua empresa?",
    welcomeIntro:
      "Olá, sou o **InHub**. Posso ajudar a configurar sua conta ou explicar qualquer seção da plataforma.",
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
              <strong key={partIdx} className="font-semibold text-slate-900 dark:text-white">
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
  const [showProgressMenu, setShowProgressMenu] = useState(false);
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

  // Clean welcome message once on mount
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: "welcome-0",
          sender: "inhub",
          text: labels.welcomeIntro,
        },
      ];
    });
  }, [labels.welcomeIntro]);

  // Show subtle proactive bubble when entering a new section (unless dismissed)
  useEffect(() => {
    if (isOpen || dismissedRoutes[routeCtx.routeKey]) {
      setShowProactiveBubble(false);
      return;
    }

    const timer = setTimeout(() => {
      setShowProactiveBubble(true);
    }, 1400);

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
      }
    ) => {
      const trimmed = text.trim();
      if (!trimmed && !options?.triggerAction) return;

      setIsOpen(true);
      setShowProactiveBubble(false);
      setShowProgressMenu(false);

      if (trimmed) {
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
              actions: Array.isArray(data.actions) ? data.actions.slice(0, 2) : [],
            },
          ]);

          if (data.knowledgeSaved) {
            fetchAccountStatus();
          }

          setTimeout(() => setEmotion("idle"), 1800);
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
      sendMessage(labels.trainNowBtn.replace(" →", ""), {
        triggerAction: "start_training",
      });
      return;
    }
    router.push(act.href);
  };

  const handleDismissBubble = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowProactiveBubble(false);
    setDismissedRoutes((prev) => ({ ...prev, [routeCtx.routeKey]: true }));
  };

  const proactiveConfig = useMemo(() => {
    if (accountStatus && !accountStatus.hasLinkedInAccount && routeCtx.routeKey === "dashboard") {
      return {
        text: labels.onboardingMissingLinkedIn,
        ctaLabel: labels.startNowBtn,
        onCta: () => {
          setShowProactiveBubble(false);
          router.push("/linkedin-accounts");
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
          sendMessage(labels.trainNowBtn.replace(" →", ""), {
            triggerAction: "start_training",
          });
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
  }, [accountStatus, routeCtx, labels, router, sendMessage]);

  const hasPendingOnboarding =
    accountStatus !== null &&
    (!accountStatus.hasLinkedInAccount || !accountStatus.hasCustomKnowledge);

  const checklistItems = accountStatus
    ? [
        {
          label: labels.stepLinkedIn,
          done: accountStatus.hasLinkedInAccount,
          onClick: () => {
            setShowProgressMenu(false);
            router.push("/linkedin-accounts");
          },
        },
        {
          label: labels.stepTrain,
          done: accountStatus.hasCustomKnowledge,
          onClick: () =>
            sendMessage(labels.trainNowBtn.replace(" →", ""), {
              triggerAction: "start_training",
            }),
        },
        {
          label: labels.stepPosts,
          done: accountStatus.viralPostsCount > 0,
          onClick: () => {
            setShowProgressMenu(false);
            router.push("/viral-posts");
          },
        },
        {
          label: labels.stepSignals,
          done: accountStatus.signalMonitorsCount > 0,
          onClick: () => {
            setShowProgressMenu(false);
            router.push("/signals");
          },
        },
        {
          label: labels.stepCampaigns,
          done: accountStatus.campaignsCount > 0,
          onClick: () => {
            setShowProgressMenu(false);
            router.push("/campaigns");
          },
        },
      ]
    : [];

  return (
    <div className="fixed bottom-4 right-4 z-[999999] flex flex-col items-end">
      {/* ===================================================================== */}
      {/* 1. CLEAN MINIMAL CHAT PANEL                                           */}
      {/* ===================================================================== */}
      {isOpen && (
        <div className="mb-2.5 w-[340px] sm:w-[375px] max-h-[min(510px,calc(100dvh-135px))] rounded-2xl border border-slate-200/90 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-2xl shadow-slate-900/15 overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-3 duration-200">
          {/* Clean Light Header */}
          <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-slate-100 dark:border-gray-800 shrink-0">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="shrink-0">
                  <InHubLiveAvatar emotion={emotion} size="sm" hideStatusDot />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-none">
                      {labels.assistantTitle}
                    </h4>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate mt-0.5">
                    {labels.subtitlePrefix} · {routeCtx.sectionTitle}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {accountStatus && (
                  <button
                    type="button"
                    onClick={() => setShowProgressMenu((prev) => !prev)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-gray-800 hover:bg-slate-200/70 dark:hover:bg-gray-700 text-[11px] font-semibold text-slate-700 dark:text-gray-200 transition cursor-pointer"
                  >
                    <span className="text-[#0099ff]">
                      {accountStatus.completedStepsCount}/{accountStatus.totalStepsCount}
                    </span>
                    <ChevronDown
                      className={`w-3 h-3 text-slate-400 transition-transform ${
                        showProgressMenu ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  aria-label="Cerrar"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Collapsible Progress Checklist (hidden by default for clean look) */}
            {showProgressMenu && checklistItems.length > 0 && (
              <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-gray-800 space-y-1">
                {checklistItems.map((item, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={item.onClick}
                    className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-gray-800/80 text-xs transition cursor-pointer text-left"
                  >
                    <span className="flex items-center gap-2 text-slate-700 dark:text-gray-200">
                      {item.done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-300 dark:text-gray-600 shrink-0" />
                      )}
                      <span className={item.done ? "line-through text-slate-400" : "font-medium"}>
                        {item.label}
                      </span>
                    </span>
                    {!item.done && (
                      <span className="text-[11px] font-semibold text-[#0099ff]">→</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Messages Area */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-slate-50/70 dark:bg-gray-950">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div
                  className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-[12.5px] leading-relaxed ${
                    msg.sender === "user"
                      ? "bg-[#0099ff] text-white rounded-br-sm"
                      : "bg-white dark:bg-gray-900 text-slate-700 dark:text-gray-200 border border-slate-200/70 dark:border-gray-800 rounded-bl-sm"
                  }`}
                >
                  {msg.sender === "inhub" ? renderFormattedText(msg.text) : msg.text}
                </div>

                {msg.sender === "inhub" && msg.actions && msg.actions.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap gap-1.5 max-w-[90%]">
                    {msg.actions.map((act, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleActionClick(act)}
                        className="px-2.5 py-1 rounded-full bg-white dark:bg-gray-800 text-[#0099ff] border border-[#0099ff]/25 hover:bg-[#e6f4fe]/70 text-[11px] font-semibold transition cursor-pointer"
                      >
                        {act.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Clean inline starter suggestions only before conversation grows */}
            {messages.length <= 1 && trainingStep === "idle" && !isSending && (
              <div className="pt-1 flex flex-wrap gap-1.5">
                {routeCtx.quickChips.slice(0, 3).map((chip, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendMessage(chip)}
                    className="px-3 py-1.5 rounded-full bg-white dark:bg-gray-900 hover:bg-[#e6f4fe]/70 dark:hover:bg-[#0099ff]/15 text-slate-600 dark:text-gray-300 hover:text-[#0099ff] text-[11px] font-medium border border-slate-200/80 dark:border-gray-800 transition cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            )}

            {isSending && (
              <div className="text-[11px] text-slate-400 px-1">{labels.typingText}</div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Minimal Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              sendMessage(inputValue);
            }}
            className="p-3 bg-white dark:bg-gray-900 border-t border-slate-100 dark:border-gray-800 flex items-center gap-2 shrink-0"
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
              className="flex-1 bg-slate-100/80 dark:bg-gray-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#0099ff]/25"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isSending}
              aria-label="Enviar"
              className="w-9 h-9 rounded-full bg-[#0099ff] hover:bg-[#0082db] disabled:opacity-35 text-white flex items-center justify-center transition cursor-pointer shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      )}

      {/* ===================================================================== */}
      {/* 2. MINIMAL SPEECH BUBBLE + FLOATING INHUB AVATAR                      */}
      {/* ===================================================================== */}
      <div className="flex items-end gap-2.5">
        {showProactiveBubble && !isOpen && (
          <div
            onClick={proactiveConfig.onCta}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") proactiveConfig.onCta();
            }}
            className="relative max-w-[260px] rounded-2xl rounded-br-sm bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 px-3.5 py-3 shadow-lg shadow-slate-900/10 cursor-pointer hover:border-[#0099ff]/40 transition animate-in fade-in slide-in-from-bottom-2 duration-200"
          >
            <button
              type="button"
              onClick={handleDismissBubble}
              aria-label="Cerrar"
              className="absolute top-2 right-2 p-0.5 rounded-md text-slate-300 hover:text-slate-600 dark:hover:text-white transition cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>

            <p className="text-xs text-slate-600 dark:text-gray-300 leading-snug pr-4">
              {proactiveConfig.text}
            </p>
            <span className="mt-1.5 inline-block text-[11px] font-semibold text-[#0099ff]">
              {proactiveConfig.ctaLabel}
            </span>
          </div>
        )}

        <InHubLiveAvatar
          emotion={emotion}
          hasNotification={hasPendingOnboarding}
          onClick={() => setIsOpen((prev) => !prev)}
        />
      </div>
    </div>
  );
}
