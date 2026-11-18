"use client";

import React, { useEffect, useState } from "react";

export type InHubEmotion = "idle" | "talking" | "thinking" | "excited" | "celebrate";

interface InHubLiveAvatarProps {
  emotion?: InHubEmotion;
  size?: "sm" | "md" | "lg";
  hasNotification?: boolean;
  onClick?: () => void;
}

export function InHubLiveAvatar({
  emotion = "idle",
  size = "md",
  hasNotification = false,
  onClick,
}: InHubLiveAvatarProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [lookOffset, setLookOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Natural random blinking of InHub's glossy black eyes every 2.4s - 4.8s
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let blinkResetId: ReturnType<typeof setTimeout>;

    const scheduleBlink = () => {
      const delay = 2200 + Math.random() * 2600;
      timeoutId = setTimeout(() => {
        setIsBlinking(true);
        blinkResetId = setTimeout(() => {
          setIsBlinking(false);
          // Occasional double-blink for lifelike feel
          if (Math.random() < 0.28) {
            setTimeout(() => {
              setIsBlinking(true);
              setTimeout(() => setIsBlinking(false), 120);
            }, 140);
          }
          scheduleBlink();
        }, 135);
      }, delay);
    };

    scheduleBlink();
    return () => {
      clearTimeout(timeoutId);
      clearTimeout(blinkResetId);
    };
  }, []);

  // Subtle mouse-tracking so InHub turns slightly toward the user's cursor
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (typeof window === "undefined") return;
      const anchorX = window.innerWidth - 56;
      const anchorY = window.innerHeight - 56;
      const dx = (e.clientX - anchorX) / window.innerWidth;
      const dy = (e.clientY - anchorY) / window.innerHeight;
      setLookOffset({
        x: Math.max(-3.5, Math.min(3.5, dx * 7)),
        y: Math.max(-2.5, Math.min(2.5, dy * 5)),
      });
    };

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const dims =
    size === "lg"
      ? "w-18 h-18"
      : size === "sm"
        ? "w-11 h-11"
        : "w-16 h-16";

  const isHappyPose =
    isHovered || emotion === "excited" || emotion === "celebrate";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="InHub AI SDR Assistant"
      className={`group relative ${dims} rounded-2xl bg-[#000000] border-2 ${
        isHappyPose
          ? "border-[#0099ff] shadow-[0_0_28px_rgba(0,153,255,0.45)]"
          : "border-[#222222] hover:border-[#0099ff] shadow-xl shadow-slate-900/35"
      } flex items-center justify-center cursor-pointer transition-all duration-300 select-none overflow-visible`}
    >
      {/* Animated pulsing aura ring */}
      <span
        className={`pointer-events-none absolute -inset-1 rounded-2xl bg-[#0099ff]/20 blur-md transition-opacity duration-300 ${
          isHappyPose || emotion === "talking" ? "opacity-100 animate-pulse" : "opacity-40"
        }`}
      />

      {/* Inner circular stage */}
      <div className="relative w-full h-full rounded-[14px] overflow-hidden bg-gradient-to-b from-[#141c2b] via-[#070b14] to-[#000000] flex items-center justify-center">
        {/* Radial blue hologram glow behind InHub */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,rgba(0,153,255,0.28)_0%,transparent_70%)]" />

        {/* Floating + tilting 3D InHub body */}
        <div
          className="relative w-[86%] h-[86%] flex items-center justify-center transition-transform duration-200 ease-out"
          style={{
            transform: `translate3d(${lookOffset.x}px, ${lookOffset.y}px, 0) ${
              isHappyPose ? "scale(1.08) rotate(-4deg)" : "scale(1)"
            }`,
            animation:
              emotion === "celebrate"
                ? "inhub-bounce 0.7s ease-in-out infinite"
                : "inhub-float 3.2s ease-in-out infinite",
          }}
        >
          <img
            src="/images/inhub-front.png"
            alt="InHub"
            className="w-full h-full object-contain drop-shadow-[0_6px_12px_rgba(0,153,255,0.3)]"
          />

          {/* Natural Eyelid Blink Overlay synchronized over InHub's grey visor */}
          <div
            className="pointer-events-none absolute left-[28%] right-[28%] top-[19%] h-[19%] flex items-center justify-between px-[9%]"
            aria-hidden="true"
          >
            {/* Left eyelid */}
            <span
              className="w-[24%] h-full rounded-full bg-[#92959a] transition-transform duration-100 origin-top"
              style={{
                transform: isBlinking
                  ? "scaleY(1)"
                  : isHappyPose
                    ? "scaleY(0.32)"
                    : "scaleY(0.02)",
              }}
            />
            {/* Right eyelid */}
            <span
              className="w-[24%] h-full rounded-full bg-[#92959a] transition-transform duration-100 origin-top"
              style={{
                transform: isBlinking
                  ? "scaleY(1)"
                  : isHappyPose
                    ? "scaleY(0.32)"
                    : "scaleY(0.02)",
              }}
            />
          </div>

          {/* Glowing #0099ff chest badge pulse when talking or thinking */}
          {(emotion === "talking" || emotion === "thinking" || isHappyPose) && (
            <span className="pointer-events-none absolute top-[57%] left-[42%] w-2 h-2 rounded-full bg-[#0099ff] shadow-[0_0_10px_#0099ff] animate-ping" />
          )}
        </div>
      </div>

      {/* Live 24/7 Green Dot or Pending Step Notification Badge */}
      {hasNotification ? (
        <span className="absolute -top-1.5 -right-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-[#0099ff] text-[10px] font-extrabold text-white ring-2 ring-white dark:ring-gray-900 shadow-sm animate-bounce">
          1
        </span>
      ) : (
        <span className="absolute -bottom-0.5 -right-0.5 z-20 flex h-3.5 w-3.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />
        </span>
      )}

      <style jsx>{`
        @keyframes inhub-float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-4px);
          }
        }
        @keyframes inhub-bounce {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-7px) rotate(-5deg);
          }
        }
      `}</style>
    </button>
  );
}
