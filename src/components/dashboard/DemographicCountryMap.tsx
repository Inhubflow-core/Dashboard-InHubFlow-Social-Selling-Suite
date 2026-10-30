"use client";

import dynamic from "next/dynamic";
import React from "react";
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
  return (
    <div className="h-[140px] w-full overflow-hidden">
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
            r: 4,
          },
        }}
        regionStyle={{
          initial: {
            fill: "#D0D5DD",
            fillOpacity: 0.8,
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
