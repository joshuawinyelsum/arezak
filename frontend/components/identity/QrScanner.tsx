"use client";

import { useEffect, useRef, useState } from "react";
import { FlowButton } from "@/components/finance/FlowControls";

type DetectedCode = { rawValue: string };
type Detector = { detect: (source: HTMLVideoElement) => Promise<DetectedCode[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

export function QrScanner({ onDetected }: { onDetected: (value: string) => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  const stop = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setActive(false);
  };

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  const start = async () => {
    setMessage(null);
    const BarcodeDetector = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    if (!BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
      setMessage("QR scanning is not supported by this browser. Paste the QR value into the recipient field instead.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      streamRef.current = stream;
      setActive(true);
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      const detector = new BarcodeDetector({ formats: ["qr_code"] });
      const scan = async () => {
        const video = videoRef.current;
        if (!video || !streamRef.current) return;
        try {
          const codes = await detector.detect(video);
          if (codes[0]?.rawValue) {
            stop();
            onDetected(codes[0].rawValue);
            return;
          }
        } catch {
          setMessage("Could not read that code. Try again in better light.");
        }
        window.setTimeout(() => void scan(), 250);
      };
      void scan();
    } catch {
      stop();
      setMessage("Camera access was unavailable. You can paste the QR value into the recipient field.");
    }
  };

  return (
    <div className="space-y-2">
      {!active ? <FlowButton variant="secondary" onClick={start}>Scan Arezak QR</FlowButton> : (
        <div className="space-y-2 rounded-xl border border-slate-200 p-3">
          <video ref={videoRef} playsInline muted className="max-h-56 w-full rounded-lg bg-slate-950 object-cover" aria-label="Camera view for scanning an Arezak QR" />
          <FlowButton variant="secondary" onClick={stop}>Stop scanning</FlowButton>
        </div>
      )}
      {message && <p role="status" className="text-sm text-slate-600">{message}</p>}
    </div>
  );
}
