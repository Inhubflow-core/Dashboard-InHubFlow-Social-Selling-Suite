"use client";

import dynamic from "next/dynamic";
import React, { useEffect, useRef } from "react";
import { worldMill } from "@react-jvectormap/world";

const VectorMap = dynamic(
  () => import("@react-jvectormap/core").then((mod) => mod.VectorMap),
  { ssr: false }
);

interface DemographicCountryMapProps {
  markers: Array<{
    latLng: [number, number];
    name: string;
    style?: {
      fill: string;
      borderWidth?: number;
      borderColor?: string;
    };
  }>;
}

export default function DemographicCountryMap({ markers }: DemographicCountryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      const container = containerRef.current;
      if (!container) return;

      const markerEls = container.querySelectorAll("circle.jvectormap-marker");
      if (markerEls.length === 0) return;

      markerEls.forEach((marker) => {
        const parent = marker.parentNode;
        if (!parent) return;

        // Si ya tiene el pulso de radar inyectado, no duplicar
        const prevSibling = marker.previousElementSibling;
        if (prevSibling && prevSibling.classList.contains("radar-pulse-circle")) return;

        const cx = marker.getAttribute("cx");
        const cy = marker.getAttribute("cy");
        if (!cx || !cy) return;

        const pulse = document.createElementNS("http://www.w3.org/2000/svg", "circle");
        pulse.setAttribute("cx", cx);
        pulse.setAttribute("cy", cy);
        pulse.setAttribute("r", "5");
        pulse.setAttribute("fill", "rgba(0, 153, 255, 0.25)");
        pulse.setAttribute("stroke", "#0099ff");
        pulse.setAttribute("class", "radar-pulse-circle");

        parent.insertBefore(pulse, marker);
      });
    }, 400);

    return () => clearInterval(timer);
  }, [markers]);

  return (
    <div
      ref={containerRef}
      className="relative h-[210px] w-full overflow-hidden [&_.jvectormap-container]:!h-full [&_.jvectormap-container]:!w-full [&_svg]:!h-full [&_svg]:!w-full"
    >
      <style jsx global>{`
        @keyframes radarPing {
          0% {
            r: 5px;
            opacity: 0.9;
            stroke-width: 2px;
          }
          50% {
            opacity: 0.5;
          }
          100% {
            r: 16px;
            opacity: 0;
            stroke-width: 0.5px;
          }
        }
        @keyframes radarCorePulse {
          0%, 100% {
            transform: scale(1);
            filter: drop-shadow(0 0 2px rgba(0, 153, 255, 0.8));
          }
          50% {
            transform: scale(1.25);
            filter: drop-shadow(0 0 7px rgba(0, 153, 255, 1));
          }
        }
        .jvectormap-marker {
          transform-box: fill-box;
          transform-origin: center;
          animation: radarCorePulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        .radar-pulse-circle {
          pointer-events: none;
          transform-box: fill-box;
          transform-origin: center;
          animation: radarPing 2.2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}</style>
      <VectorMap
        map={worldMill}
        backgroundColor="transparent"
        zoomOnScroll={false}
        zoomMax={12}
        zoomMin={1}
        zoomAnimate={true}
        zoomStep={1.5}
        markersSelectable={true}
        markers={markers}
        markerStyle={{
          initial: {
            fill: "#0099ff",
            r: 5,
          },
        }}
        regionStyle={{
          initial: {
            fill: "#D0D5DD",
            fillOpacity: 0.85,
            fontFamily: "Outfit, sans-serif",
            stroke: "none",
            strokeWidth: 0,
          },
          hover: {
            fillOpacity: 1,
            cursor: "pointer",
            fill: "#0099ff",
          },
          selected: {
            fill: "#0099ff",
          },
        }}
      />
    </div>
  );
}
