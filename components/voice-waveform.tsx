'use client';

import { useEffect, useRef } from 'react';

interface VoiceWaveformProps {
  /**
   * Current voice amplitude, 0..1. Typically wired to Vapi's `volume-level`
   * event. The waveform exposes a calm baseline when 0 and ripples up to
   * full height at 1. Updates can be high-frequency (every animation frame
   * if desired) — the component throttles via requestAnimationFrame and
   * smooths the value internally.
   */
  volume: number;

  /**
   * Whether the call is active. When false the waveform decays back to a
   * flat line. Drawing keeps running so the transition is smooth.
   */
  active?: boolean;

  /** CSS height of the canvas wrapper. Default 120px. */
  height?: number;

  /** Hex string for the wave color. Default = current orange accent. */
  color?: string;
}

/**
 * Vapi-inspired voice waveform. Three layered sine waves with decreasing
 * opacity and slightly offset phase/frequency create a sense of depth.
 * Amplitude is driven by `volume`, smoothed over time so the visual feels
 * organic instead of jittery.
 */
export function VoiceWaveform({
  volume,
  active = true,
  height = 120,
  color = '#dc5f00',
}: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const volumeRef = useRef(volume);
  const smoothedRef = useRef(0);

  // Keep volumeRef in sync with the latest prop without re-running the
  // animation effect (which would re-bind requestAnimationFrame).
  useEffect(() => {
    volumeRef.current = volume;
  }, [volume]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let phase = 0;
    let cancelled = false;

    // High-DPI canvas: render at devicePixelRatio for crispness.
    const setupCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = container.getBoundingClientRect();
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setupCanvasSize();

    const resizeObserver = new ResizeObserver(setupCanvasSize);
    resizeObserver.observe(container);

    // Parse the hex color once for use in rgba layered strokes.
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    const draw = () => {
      if (cancelled) return;
      const rect = container.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      // Smooth the target volume. When inactive, target zero so the wave
      // decays even if `volume` happens to be non-zero.
      const target = active ? volumeRef.current : 0;
      smoothedRef.current += (target - smoothedRef.current) * 0.18;

      // Baseline amplitude so a silent active call still shows a gentle
      // shimmer instead of a flat dead line.
      const baseline = active ? 0.05 : 0;
      const energy = Math.max(baseline, smoothedRef.current);

      const cy = h / 2;

      // Three layered sine waves. Each one has its own frequency,
      // amplitude scaling, and phase drift so they look like related but
      // independent oscillations.
      const layers = [
        { ampScale: 0.45, freq: 0.022, phaseRate: 0.06, opacity: 0.95, width: 2 },
        { ampScale: 0.32, freq: 0.014, phaseRate: 0.045, opacity: 0.5, width: 1.5 },
        { ampScale: 0.22, freq: 0.034, phaseRate: 0.085, opacity: 0.3, width: 1 },
      ];

      for (const layer of layers) {
        ctx.beginPath();
        const amp = energy * h * layer.ampScale;
        for (let x = 0; x <= w; x += 2) {
          // Envelope: dampens at the edges so the curve fades out
          // rather than clipping. Cosine bell across the width.
          const envelope = Math.sin((x / w) * Math.PI);
          const y =
            cy +
            Math.sin(x * layer.freq + phase * layer.phaseRate) *
              amp *
              envelope;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${layer.opacity})`;
        ctx.lineWidth = layer.width;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      // Central baseline glow when energy is low — gives a soft anchor
      // line at rest.
      if (energy < 0.15) {
        ctx.beginPath();
        ctx.moveTo(0, cy);
        ctx.lineTo(w, cy);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.15)`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      phase += 1;
      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
    };
  }, [active, color]);

  return (
    <div
      ref={containerRef}
      className="w-full relative"
      style={{ height: `${height}px` }}
      aria-hidden
    >
      <canvas ref={canvasRef} className="w-full h-full" />
    </div>
  );
}
