"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

export function Dialog({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#102018]/55 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="dialog-title" onMouseDown={onClose}>
      <section className="max-h-[88vh] w-full max-w-2xl overflow-auto rounded-[28px] bg-[#fffdf7] p-5 shadow-2xl md:p-7" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-5 flex items-center justify-between">
          <h2 id="dialog-title" className="text-xl font-bold tracking-tight">{title}</h2>
          <ButtonLikeClose onClick={onClose} />
        </div>
        {children}
      </section>
    </div>
  );
}

function ButtonLikeClose({ onClick }: { onClick: () => void }) {
  return <button aria-label="Close dialog" onClick={onClick} className="grid h-10 w-10 place-items-center rounded-full bg-black/5 hover:bg-black/10"><X size={18} /></button>;
}
