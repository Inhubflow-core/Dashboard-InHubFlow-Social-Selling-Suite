"use client";

import { Handle, Position, type NodeProps } from "@xyflow/react";
import type { NodeConfigData } from "./types";

export function TriggerCustomNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as NodeConfigData;
  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-lg bg-brand-500 text-white p-3.5 shadow-theme-md transition ${
        selected ? "ring-4 ring-brand-300 ring-offset-2" : ""
      }`}
    >
      <div className="flex items-center justify-between pb-1.5 border-b border-white/20">
        <span className="text-xs font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-full">
          TRIGGER
        </span>
        <span className="text-xs text-white/80">Disparador</span>
      </div>
      <div className="pt-2">
        <h4 className="text-xs font-bold leading-snug">{nodeData.label}</h4>
        <p className="text-xs text-white/90 mt-1 line-clamp-2">
          {nodeData.description}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-3 w-3 rounded-full !bg-white !border-2 !border-brand-500"
      />
    </div>
  );
}

export function ActionCustomNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as NodeConfigData;
  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-lg bg-white border border-gray-200 p-3.5 shadow-theme-xs transition dark:bg-gray-900 dark:border-gray-700 ${
        selected ? "border-brand-500 ring-2 ring-brand-200" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-3 w-3 rounded-full !bg-brand-500"
      />
      <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-gray-800">
        <span className="text-xs font-bold uppercase tracking-wider bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full dark:bg-blue-950 dark:text-blue-300">
          ACCION
        </span>
        <span className="text-xs text-gray-400">LinkedIn API</span>
      </div>
      <div className="pt-2">
        <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug">
          {nodeData.label}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
          {nodeData.description}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-3 w-3 rounded-full !bg-brand-500"
      />
    </div>
  );
}

export function ConditionCustomNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as NodeConfigData;
  return (
    <div
      className={`min-w-[250px] max-w-[290px] rounded-lg bg-white border-2 border-brand-500/80 p-3.5 shadow-theme-xs transition dark:bg-gray-900 ${
        selected ? "ring-2 ring-brand-300" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-3 w-3 rounded-full !bg-brand-500"
      />
      <div className="flex items-center justify-between pb-1.5 border-b border-gray-100 dark:border-gray-800">
        <span className="text-xs font-bold uppercase tracking-wider bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full dark:bg-purple-950 dark:text-purple-300">
          CONDICION
        </span>
        <span className="text-xs text-brand-600 font-semibold dark:text-brand-400">
          Bifurcacion Logica
        </span>
      </div>
      <div className="pt-2">
        <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug">
          {nodeData.label}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
          {nodeData.description}
        </p>
      </div>

      <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs font-bold">
        <span className="text-green-600 dark:text-green-400">Rama: SI (Derecha)</span>
        <span className="text-red-500 dark:text-red-400">Rama: NO (Izquierda)</span>
      </div>

      {/* Handles para ramas SI / NO */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="no"
        style={{ left: "25%" }}
        className="h-3 w-3 rounded-full !bg-red-500"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="yes"
        style={{ left: "75%" }}
        className="h-3 w-3 rounded-full !bg-green-500"
      />
    </div>
  );
}

export function DelayCustomNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as NodeConfigData;
  return (
    <div
      className={`min-w-[220px] max-w-[260px] rounded-lg bg-amber-50/70 border border-amber-200 p-3 shadow-theme-xs transition dark:bg-amber-950/20 dark:border-amber-900 ${
        selected ? "border-amber-500 ring-2 ring-amber-200" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-3 w-3 rounded-full !bg-amber-500"
      />
      <div className="flex items-center justify-between pb-1 border-b border-amber-200/50 dark:border-amber-900">
        <span className="text-xs font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full dark:bg-amber-900 dark:text-amber-200">
          DELAY HUMANO
        </span>
        <span className="text-xs text-amber-700 dark:text-amber-300 font-medium">
          Pacing Seguro
        </span>
      </div>
      <div className="pt-1.5">
        <h4 className="text-xs font-bold text-gray-900 dark:text-white">
          {nodeData.label}
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">
          {nodeData.description}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-3 w-3 rounded-full !bg-amber-500"
      />
    </div>
  );
}

export function CrmCustomNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as NodeConfigData;
  return (
    <div
      className={`min-w-[240px] max-w-[280px] rounded-lg bg-emerald-50/70 border border-emerald-300 p-3.5 shadow-theme-xs transition dark:bg-emerald-950/20 dark:border-emerald-900 ${
        selected ? "border-emerald-500 ring-2 ring-emerald-200" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-3 w-3 rounded-full !bg-emerald-500"
      />
      <div className="flex items-center justify-between pb-1.5 border-b border-emerald-200 dark:border-emerald-900">
        <span className="text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full dark:bg-emerald-900 dark:text-emerald-200">
          CRM PIPELINE
        </span>
        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
          Actualizar Etapa
        </span>
      </div>
      <div className="pt-2">
        <h4 className="text-xs font-bold text-gray-900 dark:text-white leading-snug">
          {nodeData.label}
        </h4>
        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1">
          {nodeData.description}
        </p>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="h-3 w-3 rounded-full !bg-emerald-500"
      />
    </div>
  );
}

export function ControlCustomNode({ data, selected }: NodeProps) {
  const nodeData = data as unknown as NodeConfigData;
  return (
    <div
      className={`min-w-[200px] rounded-lg bg-gray-100 border border-gray-300 p-3 shadow-theme-xs transition dark:bg-gray-800 dark:border-gray-700 ${
        selected ? "border-gray-500 ring-2 ring-gray-300" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="h-3 w-3 rounded-full !bg-gray-500"
      />
      <div className="text-center">
        <span className="text-xs font-bold uppercase tracking-wider bg-gray-200 text-gray-700 px-2.5 py-0.5 rounded-full dark:bg-gray-700 dark:text-gray-300">
          CONTROL
        </span>
        <h4 className="text-xs font-bold text-gray-800 dark:text-white mt-1.5">
          {nodeData.label}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
          {nodeData.description}
        </p>
      </div>
    </div>
  );
}

export const customNodeTypes = {
  triggerNode: TriggerCustomNode,
  actionNode: ActionCustomNode,
  conditionNode: ConditionCustomNode,
  delayNode: DelayCustomNode,
  crmNode: CrmCustomNode,
  controlNode: ControlCustomNode,
};
