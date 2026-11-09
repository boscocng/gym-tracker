"use client";

import { type PointerEvent, type ReactNode, useRef, useState } from "react";

const REVEAL = 88;

type Drag = { x: number; y: number; base: number; moved: boolean };

type Props = { label: string; disabled: boolean; onTap: () => void; onDelete: () => void; children: ReactNode };

export function SwipeRow({ label, disabled, onTap, onDelete, children }: Props) {
  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const drag = useRef<Drag | null>(null);
  const swallowClick = useRef(false);

  function down(event: PointerEvent<HTMLButtonElement>) {
    swallowClick.current = false;
    drag.current = { x: event.clientX, y: event.clientY, base: offset, moved: false };
  }

  function move(event: PointerEvent<HTMLButtonElement>) {
    const current = drag.current;
    if (!current) {
      return;
    }
    const dx = event.clientX - current.x;
    if (!current.moved) {
      if (Math.abs(dx) < 8 || Math.abs(dx) < Math.abs(event.clientY - current.y)) {
        return;
      }
      current.moved = true;
      setDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    setOffset(Math.min(0, Math.max(-REVEAL, current.base + dx)));
  }

  function up() {
    const current = drag.current;
    drag.current = null;
    if (!current?.moved) {
      return;
    }
    swallowClick.current = true;
    setDragging(false);
    setOffset((value) => (value < -REVEAL / 2 ? -REVEAL : 0));
  }

  function cancel() {
    const current = drag.current;
    drag.current = null;
    if (current) {
      setDragging(false);
      setOffset(current.base);
    }
  }

  function click() {
    if (swallowClick.current) {
      swallowClick.current = false;
    } else if (offset !== 0) {
      setOffset(0);
    } else {
      onTap();
    }
  }

  const revealed = offset === -REVEAL;
  return (
    <div className="relative overflow-hidden border-t border-divider">
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        tabIndex={revealed ? 0 : -1}
        aria-hidden={!revealed}
        className="absolute inset-y-0 right-0 w-[88px] bg-error-text font-semibold text-on-accent"
      >
        Delete
      </button>
      <button
        type="button"
        aria-label={label}
        disabled={disabled}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={cancel}
        onClick={click}
        style={{ transform: `translateX(${offset}px)` }}
        className={`relative flex min-h-[46px] w-full touch-pan-y items-center justify-between gap-3 bg-surface text-left ${dragging ? "" : "transition-transform duration-200"}`}
      >
        {children}
      </button>
    </div>
  );
}
