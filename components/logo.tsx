import React from "react";

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  showText?: boolean;
  textColor?: string;
  text?: string;
}

export function Logo({
  size = "md",
  className = "",
  showText = true,
  textColor,
  text = "PZ Orbit",
}: LogoProps) {
  let dimension = 36;
  let textClass = "text-lg";

  if (typeof size === "number") {
    dimension = size;
  } else if (size === "sm") {
    dimension = 32;
    textClass = "text-base";
  } else if (size === "md") {
    dimension = 36;
    textClass = "text-lg";
  } else if (size === "lg") {
    dimension = 40;
    textClass = "text-xl";
  } else if (size === "xl") {
    dimension = 48;
    textClass = "text-2xl";
  }

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <div
        className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white shadow-sm ring-1 ring-black/10 transition-transform hover:scale-105"
        style={{ width: dimension, height: dimension }}
      >
        <img
          src="/logo.png"
          alt="PZ Logo"
          className="h-full w-full object-contain p-0.5"
          width={dimension}
          height={dimension}
        />
      </div>
      {showText && (
        <span className={`font-bold tracking-tight ${textClass} ${textColor || ""}`}>
          {text}
        </span>
      )}
    </div>
  );
}
