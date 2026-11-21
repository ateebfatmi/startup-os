"use client";

import { useState } from "react";
import { Check, Sparkles, User, Palette, Shield } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useOfficeStore } from "@/features/virtual-office/store";

export const SKIN_TONES = [
  { id: "fair", color: "#f8d9bd", label: "Fair" },
  { id: "medium-light", color: "#e0b696", label: "Peach" },
  { id: "medium", color: "#c89b7b", label: "Tan" },
  { id: "warm", color: "#b08560", label: "Warm Bronze" },
  { id: "deep", color: "#6b4423", label: "Deep" },
];

export const HAIR_COLORS = [
  { id: "black", color: "#1a1817", label: "Jet Black" },
  { id: "dark-brown", color: "#36271e", label: "Dark Brown" },
  { id: "auburn", color: "#6b331f", label: "Auburn" },
  { id: "blonde", color: "#d1a862", label: "Blonde" },
  { id: "platinum", color: "#e8e5dc", label: "Platinum" },
  { id: "emerald", color: "#235c42", label: "Forest Green" },
];

export const HOODIE_COLORS = [
  { id: "signature", color: "#ff8a4c", label: "Signature Peach" },
  { id: "lime", color: "#c8f560", label: "Electric Lime" },
  { id: "emerald", color: "#173f2b", label: "Deep Forest" },
  { id: "slate", color: "#3b4d61", label: "Midnight Slate" },
  { id: "lavender", color: "#9b72cf", label: "Lavender" },
  { id: "cream", color: "#f5f0e4", label: "Off White" },
];

export function AvatarCustomizationDialog({
  open,
  onClose,
  displayName,
}: {
  open: boolean;
  onClose: () => void;
  displayName: string;
}) {
  const player = useOfficeStore((state) => state.player);
  const setPlayerIdentity = useOfficeStore((state) => state.setPlayerIdentity);
  const avatarOutfit = useOfficeStore((state) => state.avatarOutfit);
  const setAvatarOutfit = useOfficeStore((state) => state.setAvatarOutfit);
  const avatarStatus = useOfficeStore((state) => state.avatarStatus);
  const setAvatarStatus = useOfficeStore((state) => state.setAvatarStatus);

  const [selectedColor, setSelectedColor] = useState(player.color || "#ff8a4c");
  const [selectedHair, setSelectedHair] = useState(avatarOutfit.jacketColor ? "#1a1817" : "#36271e");
  const [selectedSkin, setSelectedSkin] = useState("#c89b7b");
  const [saved, setSaved] = useState(false);

  if (!open) return null;

  const handleSave = () => {
    setPlayerIdentity({ id: player.id, name: player.name, color: selectedColor });
    setAvatarOutfit({ jacketColor: selectedColor });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 600);
  };

  return (
    <Dialog open title="Customize Your 3D Avatar" onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-center gap-4 rounded-2xl bg-[#173f2b] p-4 text-[#f5f0e4]">
          <div
            className="grid h-14 w-14 place-items-center rounded-2xl text-xl font-bold shadow-md transition-colors"
            style={{ backgroundColor: selectedColor, color: "#173f2b" }}
          >
            {displayName.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base">{displayName}</span>
              <span className="rounded-full bg-[#c8f560] px-2 py-0.5 text-[10px] font-bold text-[#173f2b]">
                {avatarStatus.toUpperCase()}
              </span>
            </div>
            <p className="mt-1 text-xs text-white/70">
              Customize how colleagues see your 3D humanoid avatar in the virtual office.
            </p>
          </div>
        </div>

        {/* Hoodie / Outfit Color */}
        <div>
          <label className="text-xs font-bold text-[#17211b] uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
            <Palette size={14} /> Hoodie & Outfit Color
          </label>
          <div className="grid grid-cols-6 gap-2">
            {HOODIE_COLORS.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedColor(item.color)}
                className={`group flex flex-col items-center gap-1.5 rounded-xl p-2 transition cursor-pointer border ${
                  selectedColor === item.color
                    ? "border-[#173f2b] bg-black/[.04] ring-2 ring-[#c8f560]"
                    : "border-transparent hover:bg-black/[.02]"
                }`}
              >
                <div
                  className="h-7 w-7 rounded-full shadow-sm flex items-center justify-center"
                  style={{ backgroundColor: item.color }}
                >
                  {selectedColor === item.color && (
                    <Check size={14} className={item.id === "cream" || item.id === "lime" ? "text-black" : "text-white"} />
                  )}
                </div>
                <span className="text-[10px] text-[#68736b] truncate w-full text-center">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Skin Tone */}
        <div>
          <label className="text-xs font-bold text-[#17211b] uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
            <User size={14} /> Skin Tone
          </label>
          <div className="grid grid-cols-5 gap-2">
            {SKIN_TONES.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedSkin(item.color)}
                className={`group flex flex-col items-center gap-1.5 rounded-xl p-2 transition cursor-pointer border ${
                  selectedSkin === item.color
                    ? "border-[#173f2b] bg-black/[.04] ring-2 ring-[#c8f560]"
                    : "border-transparent hover:bg-black/[.02]"
                }`}
              >
                <div
                  className="h-7 w-7 rounded-full shadow-sm flex items-center justify-center"
                  style={{ backgroundColor: item.color }}
                >
                  {selectedSkin === item.color && <Check size={14} className="text-black/80" />}
                </div>
                <span className="text-[10px] text-[#68736b] truncate w-full text-center">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Hair Color */}
        <div>
          <label className="text-xs font-bold text-[#17211b] uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
            <Sparkles size={14} /> Hair Style & Tint
          </label>
          <div className="grid grid-cols-6 gap-2">
            {HAIR_COLORS.map((item) => (
              <button
                key={item.id}
                onClick={() => setSelectedHair(item.color)}
                className={`group flex flex-col items-center gap-1.5 rounded-xl p-2 transition cursor-pointer border ${
                  selectedHair === item.color
                    ? "border-[#173f2b] bg-black/[.04] ring-2 ring-[#c8f560]"
                    : "border-transparent hover:bg-black/[.02]"
                }`}
              >
                <div
                  className="h-7 w-7 rounded-full shadow-sm flex items-center justify-center"
                  style={{ backgroundColor: item.color }}
                >
                  {selectedHair === item.color && <Check size={14} className="text-white" />}
                </div>
                <span className="text-[10px] text-[#68736b] truncate w-full text-center">
                  {item.label}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Availability Status */}
        <div>
          <label className="text-xs font-bold text-[#17211b] uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
            <Shield size={14} /> Availability Status
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(["available", "focus", "do_not_disturb", "away"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setAvatarStatus(status)}
                className={`rounded-xl border p-2 text-xs font-bold capitalize transition cursor-pointer ${
                  avatarStatus === status
                    ? "border-[#173f2b] bg-[#173f2b] text-[#c8f560]"
                    : "border-black/10 bg-white/70 text-[#17211b] hover:bg-black/5"
                }`}
              >
                {status.replace(/_/g, " ")}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-black/10">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave} className="bg-[#173f2b] text-[#c8f560] hover:bg-[#102f21]">
            {saved ? "Saved!" : "Save Changes"}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}
