"use client";

import { useEffect, useState } from "react";
import { Mic, Volume2, Video, Settings2, Check, RefreshCw } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface MediaDeviceOption {
  deviceId: string;
  label: string;
}

export function MediaDeviceSettingsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [microphones, setMicrophones] = useState<MediaDeviceOption[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceOption[]>([]);
  const [cameras, setCameras] = useState<MediaDeviceOption[]>([]);

  const [selectedMic, setSelectedMic] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [selectedCamera, setSelectedCamera] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);

  const loadDevices = async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices) return;
    setLoading(true);
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const mics: MediaDeviceOption[] = [];
      const spks: MediaDeviceOption[] = [];
      const cams: MediaDeviceOption[] = [];

      devices.forEach((device) => {
        const option = {
          deviceId: device.deviceId,
          label: device.label || `${device.kind} (${device.deviceId.slice(0, 5)})`,
        };
        if (device.kind === "audioinput") mics.push(option);
        else if (device.kind === "audiooutput") spks.push(option);
        else if (device.kind === "videoinput") cams.push(option);
      });

      setMicrophones(mics);
      setSpeakers(spks);
      setCameras(cams);

      if (!selectedMic && mics.length > 0) setSelectedMic(mics[0].deviceId);
      if (!selectedSpeaker && spks.length > 0) setSelectedSpeaker(spks[0].deviceId);
      if (!selectedCamera && cams.length > 0) setSelectedCamera(cams[0].deviceId);
    } catch (err) {
      console.warn("Could not enumerate media devices:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      void loadDevices();
    }
  }, [open]);

  if (!open) return null;

  const handleSave = () => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("crewvilla-selected-mic", selectedMic);
        window.localStorage.setItem("crewvilla-selected-speaker", selectedSpeaker);
        window.localStorage.setItem("crewvilla-selected-camera", selectedCamera);
      }
    } catch {
      // Ignore storage errors in restricted contexts
    }
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <Dialog open title="Audio & Video Settings" onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-center justify-between rounded-2xl bg-[#f7f5ee] p-4 text-[#17211b] border border-black/10">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#173f2b] text-[#c8f560]">
              <Settings2 size={18} />
            </div>
            <div>
              <h4 className="font-bold text-sm">Media Hardware</h4>
              <p className="text-xs text-[#68736b]">Select your active microphone, speakers, and camera.</p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={() => void loadDevices()} disabled={loading} title="Refresh devices">
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} />
          </Button>
        </div>

        {/* Microphone */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#17211b] uppercase tracking-wider flex items-center gap-1.5">
            <Mic size={14} className="text-[#173f2b]" /> Microphone Input
          </label>
          <select
            value={selectedMic}
            onChange={(e) => setSelectedMic(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-xs text-[#17211b] focus:border-[#173f2b] focus:outline-none shadow-xs"
          >
            {microphones.map((m) => (
              <option key={m.deviceId} value={m.deviceId}>
                {m.label}
              </option>
            ))}
            {microphones.length === 0 && <option value="">Default System Microphone</option>}
          </select>
        </div>

        {/* Speakers */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#17211b] uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 size={14} className="text-[#173f2b]" /> Speaker & Audio Output
          </label>
          <select
            value={selectedSpeaker}
            onChange={(e) => setSelectedSpeaker(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-xs text-[#17211b] focus:border-[#173f2b] focus:outline-none shadow-xs"
          >
            {speakers.map((s) => (
              <option key={s.deviceId} value={s.deviceId}>
                {s.label}
              </option>
            ))}
            {speakers.length === 0 && <option value="">Default System Speakers</option>}
          </select>
        </div>

        {/* Camera */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-[#17211b] uppercase tracking-wider flex items-center gap-1.5">
            <Video size={14} className="text-[#173f2b]" /> Camera Video Input
          </label>
          <select
            value={selectedCamera}
            onChange={(e) => setSelectedCamera(e.target.value)}
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2.5 text-xs text-[#17211b] focus:border-[#173f2b] focus:outline-none shadow-xs"
          >
            {cameras.map((c) => (
              <option key={c.deviceId} value={c.deviceId}>
                {c.label}
              </option>
            ))}
            {cameras.length === 0 && <option value="">Default System Camera</option>}
          </select>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-[#173f2b] text-[#c8f560] hover:bg-[#102f21]">
            {saved ? <Check size={16} /> : "Save Settings"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
