"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

export type CameraStatus = "idle" | "starting" | "active" | "denied" | "unavailable";

const RING_SIZE = 3;
const MAX_EDGE = 768;
const CAPTURE_INTERVAL_MS = 500;

export function useFoodCamera(): {
  videoRef: RefObject<HTMLVideoElement | null>;
  status: CameraStatus;
  start: () => Promise<void>;
  stop: () => void;
  grabFrame: () => string | null;
} {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasesRef = useRef<HTMLCanvasElement[]>([]);
  const newestRef = useRef<number>(-1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [status, setStatus] = useState<CameraStatus>("idle");

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || document.hidden) {
      return;
    }
    if (canvasesRef.current.length === 0) {
      canvasesRef.current = Array.from({ length: RING_SIZE }, () => document.createElement("canvas"));
    }
    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const width = Math.round(video.videoWidth * scale);
    const height = Math.round(video.videoHeight * scale);
    const next = (newestRef.current + 1) % RING_SIZE;
    const canvas = canvasesRef.current[next];
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    ctx.drawImage(video, 0, 0, width, height);
    newestRef.current = next;
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    newestRef.current = -1;
    setStatus("idle");
  }, []);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unavailable");
      return;
    }
    setStatus("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 } },
        audio: false
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      intervalRef.current = setInterval(captureFrame, CAPTURE_INTERVAL_MS);
      setStatus("active");
    } catch {
      setStatus("denied");
    }
  }, [captureFrame]);

  const grabFrame = useCallback((): string | null => {
    if (newestRef.current < 0) {
      return null;
    }
    const canvas = canvasesRef.current[newestRef.current];
    if (!canvas) {
      return null;
    }
    try {
      return canvas.toDataURL("image/jpeg", 0.7);
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return { videoRef, status, start, stop, grabFrame };
}
