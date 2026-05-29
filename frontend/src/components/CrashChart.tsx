"use client";

import { useEffect, useRef } from "react";
import { useGameStore } from "@/stores/gameStore";
import { multiplierColor } from "@/lib/multiplierColor";

function formatMultiplier(scaled: bigint): string {
  const whole = scaled / 100n;
  const frac = scaled % 100n;
  return `${whole}.${frac.toString().padStart(2, "0")}x`;
}

export function CrashChart() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { round } = useGameStore();
  const { status, multiplierScaled, elapsedMs, serverSeedHash } = round;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const isCrashed = status === "CRASHED";
    const isRunning = status === "RUNNING";
    const isBetting = status === "BETTING_OPEN";

    ctx.fillStyle = "#131313";
    ctx.fillRect(0, 0, W, H);

    if (isBetting) {
      ctx.fillStyle = "#949494";
      ctx.font = "600 12px 'Space Mono', monospace";
      ctx.textAlign = "center";
      ctx.letterSpacing = "1.8px";
      ctx.fillText("PLACE YOUR BETS", W / 2, H / 2 - 14);
      if (serverSeedHash) {
        ctx.font = "400 10px 'Space Mono', monospace";
        ctx.fillStyle = "#3cffd0";
        ctx.letterSpacing = "1px";
        ctx.fillText(`HASH · ${serverSeedHash.slice(0, 22)}...`, W / 2, H / 2 + 14);
      }
      ctx.letterSpacing = "0px";
      return;
    }

    if (!isRunning && !isCrashed) return;

    // Draw curve — dynamic Y-scale prevents ceiling clipping (no info leakage)
    const points: [number, number][] = [];
    const steps = Math.min(elapsedMs / 100, 200);

    const currentM = Math.exp(0.06 * elapsedMs / 1000);
    const maxVal = Math.max(currentM - 1, 0.2);
    const scaleY = (H * 0.82) / maxVal;

    for (let i = 0; i <= steps; i++) {
      const t = (i / steps) * elapsedMs;
      const m = Math.exp(0.06 * t / 1000);
      const x = (i / steps) * W * 0.9 + W * 0.05;
      const y = H - (m - 1) * scaleY - H * 0.05;
      points.push([x, y]);
    }

    if (points.length > 1) {
      const color = isCrashed ? "#ef4444" : multiplierColor(multiplierScaled);

      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      for (const [x, y] of points.slice(1)) ctx.lineTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.shadowBlur = 18;
      ctx.shadowColor = color;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Endpoint dot
      const [lx, ly] = points[points.length - 1];
      ctx.beginPath();
      ctx.arc(lx, ly, 4.5, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.shadowBlur = 24;
      ctx.shadowColor = color;
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Multiplier
    const display = formatMultiplier(multiplierScaled);
    ctx.font = `400 ${isCrashed ? "56" : "68"}px 'Bebas Neue', Impact, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillStyle = isCrashed ? "#ef4444" : multiplierColor(multiplierScaled);
    ctx.letterSpacing = "2px";
    ctx.fillText(display, W / 2, H / 2 + 10);
    ctx.letterSpacing = "0px";

    if (isCrashed) {
      ctx.font = "700 11px 'Space Mono', monospace";
      ctx.fillStyle = "#ef4444";
      ctx.letterSpacing = "1.8px";
      ctx.fillText("CRASHED", W / 2, H / 2 + 36);
      ctx.letterSpacing = "0px";
    }
  }, [status, multiplierScaled, elapsedMs, serverSeedHash]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={300}
      className="w-full rounded-[20px] border border-white/[0.08]"
      style={{ background: "#131313", display: "block" }}
    />
  );
}
