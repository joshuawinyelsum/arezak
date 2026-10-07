"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FlowButton } from "@/components/finance/FlowControls";

type DetectedCode = { rawValue: string };
type Detector = { detect: (source: HTMLVideoElement) => Promise<DetectedCode[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

export function QrScanner({ onDetected }: { onDetected: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const decoderControlsRef = useRef<{ stop: () => void } | null>(null);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const startingRef = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [active, setActive] = useState(false);
  const [isStarting, setIsStarting] = useState(false);

  const stop = useCallback(() => {
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    decoderControlsRef.current?.stop();
    decoderControlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setActive(false);
  }, []);

  useEffect(() => () => {
    decoderControlsRef.current?.stop();
    decoderControlsRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const stream = streamRef.current;
    const video = videoRef.current;
    if (!stream || !video) return;
    const isArezakPayload = (value: string) => /^arezak:\/\/receive\/[A-Za-z0-9_-]{20,64}$/.test(value.trim());
    const acceptDecodedValue = (rawValue: string) => {
      if (cancelled) return;
      const payload = rawValue.trim();
      if (!isArezakPayload(payload)) {
        setMessage("This isn’t an Arezak QR. Scan an Arezak receiving code or enter an account number or handle.");
        return;
      }
      stop();
      onDetected(payload);
    };

    const scan = async (detector: Detector) => {
      if (cancelled || !streamRef.current) return;
      try {
        const codes = await detector.detect(video);
        if (cancelled) return;
        if (codes[0]?.rawValue) {
          acceptDecodedValue(codes[0].rawValue);
          if (!streamRef.current) return;
        }
      } catch {
        if (!cancelled) setMessage("Could not read that code. Try again in better light.");
      }
      if (!cancelled && streamRef.current) timerRef.current = window.setTimeout(() => void scan(detector), 250);
    };

    const begin = async () => {
      try {
        video.srcObject = stream;
        await video.play();
        const BarcodeDetector = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
        if (BarcodeDetector) {
          try {
            if (!cancelled) void scan(new BarcodeDetector({ formats: ["qr_code"] }));
            return;
          } catch {
            // The native API can exist without supporting QR on a particular device.
          }
        }
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (cancelled) return;
        const reader = new BrowserQRCodeReader();
        const controls = await reader.decodeFromVideoElement(video, (result) => {
          if (result) acceptDecodedValue(result.getText());
        });
        if (cancelled) controls.stop();
        else decoderControlsRef.current = controls;
      } catch (error) {
        if (cancelled) return;
        stop();
        setMessage(error instanceof Error && error.message.includes("camera")
          ? "Camera could not start. Check camera access or enter the account number or handle."
          : "QR scanning could not start in this browser. Enter the account number or handle instead.");
      }
    };

    void begin();
    return () => {
      cancelled = true;
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = null;
      video.srcObject = null;
    };
  }, [active, onDetected, stop]);

  const start = async () => {
    if (startingRef.current || streamRef.current) return;
    setMessage(null);
    if (!window.isSecureContext) {
      setMessage("QR scanning requires a secure connection. Enter the account number or handle instead.");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage("Camera access is unavailable in this browser. Open Arezak over HTTPS or enter the account number or handle.");
      return;
    }
    startingRef.current = true;
    setIsStarting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      setActive(true);
    } catch (error) {
      const name = error instanceof DOMException ? error.name : "";
      const errors: Record<string, string> = {
        NotAllowedError: "Camera access was denied. Allow camera access in your browser settings or enter the account number or handle.",
        NotFoundError: "No camera was found on this device. Enter the account number or handle instead.",
        NotReadableError: "The camera is in use by another app. Close it and try again, or enter the account number or handle.",
        OverconstrainedError: "This device cannot provide a rear camera. Enter the account number or handle instead.",
        SecurityError: "Camera access is blocked here. Open Arezak over HTTPS or enter the account number or handle.",
      };
      setMessage(errors[name] ?? "Camera is unavailable. Check browser access or enter the account number or handle.");
    } finally {
      startingRef.current = false;
      if (mountedRef.current) setIsStarting(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  return (
    <div className="space-y-2">
      {!active ? <FlowButton variant="secondary" onClick={start} disabled={isStarting}>{isStarting ? "Opening camera…" : "Scan Arezak QR"}</FlowButton> : (
        <div className="space-y-2 rounded-xl border border-border p-3">
          <video ref={videoRef} autoPlay playsInline muted className="max-h-56 w-full rounded-lg bg-slate-950 object-cover" aria-label="Camera view for scanning an Arezak QR" />
          <p className="text-xs text-muted-foreground" role="status">Point the camera at an Arezak QR code.</p>
          <FlowButton variant="secondary" onClick={stop}>Stop scanning</FlowButton>
        </div>
      )}
      {message && <p role="status" className="text-sm text-muted-foreground">{message}</p>}
    </div>
  );
}

