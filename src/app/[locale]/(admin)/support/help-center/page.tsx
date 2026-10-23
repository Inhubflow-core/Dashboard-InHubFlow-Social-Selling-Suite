"use client";

import React, { useState } from "react";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  LifeBuoy,
  Search,
  BookOpen,
  Zap,
  Radio,
  Bot,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

interface GuideItem {
  category: string;
  title: string;
  desc: string;
  readTime: string;
}

const GUIDES: GuideItem[] = [
  {
    category: "Inicio Rápido",
    title: "Cómo vincular tu primera cuenta de LinkedIn en la Nube",
    desc: "Aprende el proceso paso a paso para autenticar cuentas de forma segura con emulación humana.",
    readTime: "3 min de lectura",
  },
  {
    category: "Signal Radar",
    title: "Configuración de Lead Magnets en posts de LinkedIn (Flow Automatizado)",
    desc: "Cómo captar leads calificados cuando comentan palabras clave en tus publicaciones virales.",
    readTime: "5 min de lectura",
  },
  {
    category: "Campañas (Workflow)",
    title: "Diseño de secuencias visuales de prospección con retardos seguros",
    desc: "Mejores prácticas para configurar el Canvas con pausas aleatorias de 3 a 12 minutos y entregas de PDF.",
    readTime: "4 min de lectura",
  },
  {
    category: "Asistente SDR IA",
    title: "Entrenamiento de la base de conocimiento y modo supervisión",
    desc: "Guía para calibrar las respuestas de la IA, el umbral de confianza y el agendamiento en el calendario.",
    readTime: "6 min de lectura",
  },
  {
    category: "Seguridad",
    title: "Límites diarios de LinkedIn recomendados según antigüedad del perfil",
    desc: "Tabla de recomendaciones para perfiles nuevos vs perfiles consolidados con Sales Navigator.",
    readTime: "4 min de lectura",
  },
  {
    category: "Multislots",
    title: "Cómo asignar cuentas de LinkedIn a los operadores de tu equipo",
    desc: "Tutorial para agencias que gestionan múltiples clientes con la cuota de 5 o 10 slots contratados.",
    readTime: "3 min de lectura",
  },
];

const FAQS = [
  {
    q: "¿Existe riesgo de baneo o restricción de mi cuenta de LinkedIn?",
    a: "InHubFlow utiliza una infraestructura segura en la nube que emula la navegación de un navegador real con User-Agents residenciales fijos y descansos humanos aleatorios (jitter). Además, el sistema impone límites estrictos de máximo 20-25 invitaciones diarias por cuenta.",
  },
  {
    q: "¿Qué ocurre cuando se alcanza el límite de slots de mi plan?",
    a: "El sistema bloquea la conexión de perfiles adicionales para no exceder tu cuota contratada. Puedes liberar un slot desconectando una cuenta anterior o realizar un upgrade inmediato a un plan con mayor número de cuentas (Growth con 5 slots o Business con 10 slots).",
  },
  {
    q: "¿Cómo funciona el Asistente SDR IA con prospectos en idiomas diferentes al español?",
    a: "El modelo Gemini 3.6 Flash detecta automáticamente el idioma del prospecto (español, inglés o portugués) y formula la respuesta recomendada en el mismo idioma del lead, manteniendo el tono profesional configurado.",
  },
  {
    q: "¿Puedo sincronizar las respuestas de LinkedIn con mi CRM externo (HubSpot, Salesforce)?",
    a: "Sí. Desde la sección de Configuración > Ajustes Generales puedes configurar un Webhook saliente en formato JSON para que cada lead calificado se sincronice instantáneamente con Make, Zapier o sistemas externos.",
  },
];

export default function HelpCenterPage() {
  const [search, setSearch] = useState("");
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const filteredGuides = GUIDES.filter(
    (g) =>
      g.title.toLowerCase().includes(search.toLowerCase()) ||
      g.desc.toLowerCase().includes(search.toLowerCase()) ||
      g.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageBreadcrumb pageTitle="Centro de Ayuda & Guías" />

      {/* Hero del Centro de Ayuda */}
      <div className="rounded-2xl border border-gray-200 bg-gradient-to-r from-blue-50 to-white p-8 text-center shadow-theme-xs dark:border-gray-800 dark:from-gray-900 dark:to-gray-900/60">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-[#0099ff]/10 text-[#0099ff]">
          <LifeBuoy className="size-6" />
        </div>
        <h2 className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
          ¿Cómo podemos ayudarte hoy?
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-xs text-gray-500 dark:text-gray-400 sm:text-sm">
          Aprende a dominar el Social Selling en LinkedIn, configurar campañas con IA y escalar tu prospección de manera segura.
        </p>

        {/* Buscador */}
        <div className="mx-auto mt-6 max-w-md">
          <div className="relative">
            <Search className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar guías, tutoriales o preguntas frecuentes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pr-4 pl-10 text-xs text-gray-900 shadow-xs focus:outline-hidden dark:border-gray-800 dark:bg-gray-950 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Categorías Principales de Guías */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Guías Destacadas de la Plataforma
          </h3>
          <span className="text-xs text-gray-400">
            {filteredGuides.length} artículo(s)
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredGuides.map((guide, idx) => (
            <div
              key={idx}
              className="flex flex-col justify-between rounded-2xl border border-gray-200 bg-white p-5 shadow-theme-xs transition hover:border-[#0099ff] dark:border-gray-800 dark:bg-gray-900"
            >
              <div>
                <span className="rounded-md bg-[#0099ff]/10 px-2.5 py-0.5 text-xs font-semibold text-[#0099ff] uppercase">
                  {guide.category}
                </span>
                <h4 className="mt-3 text-sm font-bold text-gray-900 dark:text-white">
                  {guide.title}
                </h4>
                <p className="mt-2 text-xs leading-relaxed text-gray-500 dark:text-gray-400">
                  {guide.desc}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-3 text-xs text-gray-400 dark:border-gray-800">
                <span>{guide.readTime}</span>
                <span className="font-semibold text-[#0099ff]">Leer guía &rarr;</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Preguntas Frecuentes (FAQs) */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xs dark:border-gray-800 dark:bg-gray-900">
        <div className="flex items-center gap-2.5 border-b border-gray-100 pb-4 dark:border-gray-800">
          <HelpCircle className="size-5 text-[#0099ff]" />
          <h3 className="text-base font-bold text-gray-900 dark:text-white">
            Preguntas Frecuentes (FAQs)
          </h3>
        </div>

        <div className="mt-4 divide-y divide-gray-100 dark:divide-gray-800">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className="py-3.5">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between text-left text-xs font-bold text-gray-900 dark:text-white"
                >
                  <span>{faq.q}</span>
                  {isOpen ? (
                    <ChevronUp className="size-4 shrink-0 text-gray-400" />
                  ) : (
                    <ChevronDown className="size-4 shrink-0 text-gray-400" />
                  )}
                </button>
                {isOpen && (
                  <p className="mt-2.5 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                    {faq.a}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
