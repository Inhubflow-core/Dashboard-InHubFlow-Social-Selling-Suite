"use client";

import React, { useEffect, useState } from "react";

export type InHubEmotion = "idle" | "talking" | "thinking" | "excited" | "celebrate";

interface InHubLiveAvatarProps {
  emotion?: InHubEmotion;
  size?: "sm" | "md" | "lg";
  hasNotification?: boolean;
  hideStatusDot?: boolean;
  onClick?: () => void;
}

export function InHubLiveAvatar({
  emotion = "idle",
  size = "md",
  hasNotification = false,
  hideStatusDot = false,
  onClick,
}: InHubLiveAvatarProps) {
  const [isBlinking, setIsBlinking] = useState(false);
  const [lookOffset, setLookOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  // Natural random blinking of Inhub's glossy black eyes every 2.2s - 4.8s
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;
    let blinkResetId: ReturnType<typeof setTimeout>;

    const scheduleBlink = () => {
      const delay = 2200 + Math.random() * 2600;
      timeoutId = setTimeout(() => {
        setIsBlinking(true);
        blinkResetId = setTimeout(() => {
          setIsBlinking(false);
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

  // Subtle mouse-tracking so Inhub turns slightly toward the user's cursor
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (typeof window === "undefined") return;
      const anchorX = window.innerWidth - 64;
      const anchorY = window.innerHeight - 64;
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

  // Exact 330:446 aspect ratio of inhub-front.png, ~25%+ larger than previous avatar
  const dims =
    size === "lg"
      ? "w-[86px] h-[116px]"
      : size === "sm"
        ? "w-[44px] h-[60px]"
        : "w-[72px] h-[97px]";

  const isHappyPose =
    isHovered || emotion === "excited" || emotion === "celebrate";

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      aria-label="Inhub AI SDR Assistant"
      className={`group relative ${dims} bg-transparent border-0 p-0 flex items-center justify-center cursor-pointer transition-transform duration-300 select-none overflow-visible focus:outline-none`}
    >
      {/* Subtle floating floor shadow under Inhub's feet */}
      <span
        className={`pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 w-3/4 h-2.5 rounded-full bg-[#0099ff]/30 blur-md transition-all duration-300 ${
          isHappyPose ? "scale-110 opacity-100" : "scale-95 opacity-70"
        }`}
      />

      {/* Floating + tilting 3D Inhub body (No dark box behind) */}
      <div
        className="relative w-full h-full flex items-center justify-center transition-transform duration-200 ease-out"
        style={{
          transform: `translate3d(${lookOffset.x}px, ${lookOffset.y}px, 0) ${
            isHappyPose ? "scale(1.07) rotate(-4deg)" : "scale(1)"
          }`,
          animation:
            emotion === "celebrate"
              ? "inhub-bounce 0.7s ease-in-out infinite"
              : "inhub-float 3.2s ease-in-out infinite",
        }}
      >
        <img
          src="/images/inhub-front.png"
          alt="Inhub"
          className="w-full h-full object-contain drop-shadow-[0_10px_18px_rgba(15,23,42,0.22)]"
        />

        {/* Natural Eyelid Blink Overlay aligned to exact 330x446 eye coordinates */}
        <div
          className="pointer-events-none absolute left-[28.8%] right-[30.3%] top-[19.6%] h-[12.6%] flex items-center justify-between"
          aria-hidden="true"
        >
          {/* Left eyelid */}
          <span
            className="w-[31%] h-full rounded-full bg-[#93969b] transition-transform duration-100 origin-top"
            style={{
              transform: isBlinking
                ? "scaleY(1)"
                : isHappyPose
                  ? "scaleY(0.28)"
                  : "scaleY(0.01)",
            }}
          />
          {/* Right eyelid */}
          <span
            className="w-[31%] h-full rounded-full bg-[#93969b] transition-transform duration-100 origin-top"
            style={{
              transform: isBlinking
                ? "scaleY(1)"
                : isHappyPose
                  ? "scaleY(0.28)"
                  : "scaleY(0.01)",
            }}
          />
        </div>

        {/* Subtle #0099ff glow on chest dot only when actively processing */}
        {emotion === "thinking" && (
          <span className="pointer-events-none absolute top-[60.5%] left-[41%] w-1.5 h-1.5 rounded-full bg-[#0099ff] opacity-80 animate-pulse" />
        )}
      </div>

      {/* Subtle status dot (no aggressive bounce/ping) */}
      {!hideStatusDot &&
        (hasNotification ? (
          <span className="absolute top-1 right-1 z-20 h-3 w-3 rounded-full bg-[#0099ff] ring-2 ring-white dark:ring-gray-900 shadow-xs" />
        ) : (
          <span className="absolute bottom-1.5 right-1.5 z-20 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-gray-900" />
        ))}

      <style jsx>{`
        @keyframes inhub-float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-5px);
          }
        }
        @keyframes inhub-bounce {
          0%,
          100% {
            transform: translateY(0px) rotate(0deg);
          }
          50% {
            transform: translateY(-8px) rotate(-5deg);
          }
        }
      `}</style>
    </button>
  );
}
