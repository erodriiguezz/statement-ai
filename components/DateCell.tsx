"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface DateCellProps {
  value: string;
  onChange: (value: string) => void;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const POPOVER_WIDTH = 280;
const POPOVER_HEIGHT = 320;
const VIEWPORT_GAP = 8;

function parseIso(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) {
    return new Date();
  }
  return new Date(year, month - 1, day);
}

function toIso(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDisplay(value: string): string {
  const date = parseIso(value);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function monthMatrix(view: Date): (Date | null)[][] {
  const year = view.getFullYear();
  const month = view.getMonth();
  const first = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = first.getDay();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  const rows: (Date | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }
  return rows;
}

function getPopoverPosition(trigger: DOMRect) {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const spaceBelow = viewportHeight - trigger.bottom - VIEWPORT_GAP;
  const spaceAbove = trigger.top - VIEWPORT_GAP;
  const openUpward =
    spaceBelow < POPOVER_HEIGHT && spaceAbove > spaceBelow;

  let top = openUpward
    ? trigger.top - POPOVER_HEIGHT - VIEWPORT_GAP
    : trigger.bottom + VIEWPORT_GAP;

  top = Math.max(
    VIEWPORT_GAP,
    Math.min(top, viewportHeight - POPOVER_HEIGHT - VIEWPORT_GAP),
  );

  let left = trigger.left;
  left = Math.max(
    VIEWPORT_GAP,
    Math.min(left, viewportWidth - POPOVER_WIDTH - VIEWPORT_GAP),
  );

  return { top, left };
}

export default function DateCell({ value, onChange }: DateCellProps) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState(() => parseIso(value));
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const labelId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      setView(parseIso(value));
    }
  }, [open, value]);

  useLayoutEffect(() => {
    if (!open || !rootRef.current) {
      return;
    }

    const updatePosition = () => {
      const trigger = rootRef.current?.getBoundingClientRect();
      if (!trigger) {
        return;
      }

      const next = getPopoverPosition(trigger);

      if (popoverRef.current) {
        const height = popoverRef.current.offsetHeight || POPOVER_HEIGHT;
        const width = popoverRef.current.offsetWidth || POPOVER_WIDTH;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const spaceBelow = viewportHeight - trigger.bottom - VIEWPORT_GAP;
        const spaceAbove = trigger.top - VIEWPORT_GAP;
        const openUpward = spaceBelow < height && spaceAbove > spaceBelow;

        let top = openUpward
          ? trigger.top - height - VIEWPORT_GAP
          : trigger.bottom + VIEWPORT_GAP;
        top = Math.max(
          VIEWPORT_GAP,
          Math.min(top, viewportHeight - height - VIEWPORT_GAP),
        );

        let left = trigger.left;
        left = Math.max(
          VIEWPORT_GAP,
          Math.min(left, viewportWidth - width - VIEWPORT_GAP),
        );

        setPosition({ top, left });
        return;
      }

      setPosition(next);
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        rootRef.current?.contains(target) ||
        popoverRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const monthLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(view);

  const popover =
    open && mounted
      ? createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-labelledby={labelId}
            style={{ top: position.top, left: position.left }}
            className="fixed z-50 w-[17.5rem] rounded-2xl border border-edge bg-white p-3 shadow-[0_18px_50px_rgba(26,35,50,0.16)]"
          >
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() =>
                  setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))
                }
                className="rounded-xl p-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-semibold text-ink">{monthLabel}</p>
              <button
                type="button"
                onClick={() =>
                  setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))
                }
                className="rounded-xl p-1.5 text-muted transition-colors hover:bg-accent-soft hover:text-accent"
                aria-label="Next month"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-1 grid grid-cols-7 gap-1">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="py-1 text-center text-[11px] font-semibold uppercase tracking-[0.06em] text-muted"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {monthMatrix(view).flatMap((row, rowIndex) =>
                row.map((date, colIndex) => {
                  if (!date) {
                    return (
                      <div
                        key={`empty-${rowIndex}-${colIndex}`}
                        className="h-9"
                      />
                    );
                  }

                  const iso = toIso(date);
                  const selected = iso === value;
                  const isToday = iso === toIso(new Date());

                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => {
                        onChange(iso);
                        setOpen(false);
                      }}
                      className={`h-9 rounded-xl text-sm transition-colors ${
                        selected
                          ? "bg-accent font-semibold text-white"
                          : isToday
                            ? "bg-accent-soft font-medium text-accent"
                            : "text-ink hover:bg-wash"
                      }`}
                    >
                      {date.getDate()}
                    </button>
                  );
                }),
              )}
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        id={labelId}
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex w-full items-center rounded-xl px-0 py-2 text-left text-sm text-ink outline-none transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-accent/30"
      >
        {formatDisplay(value)}
      </button>
      {popover}
    </div>
  );
}
