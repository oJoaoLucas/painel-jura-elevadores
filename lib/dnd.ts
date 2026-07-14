// Arrastar-e-soltar (nativo) dos cards da recepção. Sem biblioteca.
import type { DragEvent } from "react";

export type DragPayload =
  | { tipo: "aguardando"; id: string }
  | { tipo: "elevador"; id: number };

const MIME = "application/jura-card";

export function setDrag(e: DragEvent, p: DragPayload) {
  e.dataTransfer.setData(MIME, JSON.stringify(p));
  e.dataTransfer.effectAllowed = "move";
}

export function getDrag(e: DragEvent): DragPayload | null {
  try {
    return JSON.parse(e.dataTransfer.getData(MIME)) as DragPayload;
  } catch {
    return null;
  }
}
