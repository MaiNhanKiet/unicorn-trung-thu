"use client";

import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import Image from "next/image";
import { useMemo, useRef } from "react";
import { LANTERN_ASSETS } from "@/lib/catalog";
import { formatVnd } from "@/lib/format";
import type { Donation } from "@/lib/types";

gsap.registerPlugin(useGSAP);

const IDLE = 0.45;

function seededRandom(seed: string) {
  let hash = 2166136261;
  for (const char of seed) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return () => {
    hash = Math.imul(hash ^ (hash >>> 15), 2246822507);
    return ((hash >>> 0) % 10_000) / 10_000;
  };
}

function sizeFromAmount(amount: number) {
  const units = Math.max(amount, 15_000) / 15_000;
  return Math.round(54 + Math.min(Math.max(units - 1, 0), 3) * 22);
}

function nameWidth(name: string) {
  return Math.ceil([...name].length * 8.2) + 10;
}

function scatterLanterns(lanterns: Donation[], seed: string) {
  const rand = seededRandom(seed);
  const shuffled = [...lanterns];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rand() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const count = shuffled.length;
  if (count === 0) return { items: [], width: 720 };

  const boxes = shuffled.map((donation) => {
    const size = sizeFromAmount(donation.amount);
    const labelW = nameWidth(donation.name);
    return {
      donation,
      size,
      boxW: Math.max(size, labelW),
      boxH: size + 22,
    };
  });

  const cellW = Math.max(...boxes.map((box) => box.boxW)) + 28;
  const rows = Math.min(3, Math.max(1, count));
  const cols = Math.max(4, Math.ceil(count / rows));
  const loopWidth = cols * cellW;
  const yMin = 0.14;
  const ySpan = 0.74;
  const cellH = ySpan / rows;
  const totalCells = rows * cols;
  const used = new Set<number>();
  const cells: { col: number; row: number }[] = [];

  for (let index = 0; index < count; index += 1) {
    let cell = Math.floor((index * totalCells) / count);
    while (used.has(cell)) cell = (cell + 1) % totalCells;
    used.add(cell);
    cells.push({ col: cell % cols, row: Math.floor(cell / cols) });
  }

  const placed = boxes.map((box, index) => {
    const cell = cells[index] ?? { col: 0, row: 0 };
    const slackX = Math.max(0, cellW - box.boxW);
    const slackY = Math.max(0, cellH * 0.12);
    const stagger = cell.row % 2 === 1 ? cellW / 2 : 0;
    const x =
      ((cell.col + 0.5) * cellW +
        stagger +
        (rand() - 0.5) * slackX * 0.35 +
        loopWidth) %
      loopWidth;
    const y = yMin + (cell.row + 0.5) * cellH + (rand() - 0.5) * slackY;
    return { donation: box.donation, x, y, size: box.size, boxW: box.boxW };
  });

  return { items: placed, width: loopWidth };
}

export function LanternCarousel3D({
  lanterns,
  featured,
  mineIds,
  onSelect,
}: {
  lanterns: Donation[];
  featured: Donation | null;
  mineIds?: Set<string>;
  onSelect: (donation: Donation) => void;
}) {
  const rigRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const dragged = useRef(false);
  const hangingKey = lanterns.map((item) => item.id).join("|");
  const featuredId = featured?.id ?? null;
  const strip = useMemo(
    () => scatterLanterns(lanterns, hangingKey),
    [hangingKey, lanterns],
  );

  useGSAP(
    () => {
      const rig = rigRef.current;
      const stage = stageRef.current;
      if (!rig || !stage || strip.items.length === 0) return;

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const loop = strip.width;
      const setX = gsap.quickSetter(rig, "x", "px");
      let offset = 0;
      let velocity = -IDLE;
      let dragging = false;
      let axis: "none" | "x" | "y" = "none";
      let pointerX = 0;
      let pointerY = 0;
      let lastMoveAt = 0;
      let travel = 0;

      const wrappedX = (value: number) => {
        const next = ((value % loop) + loop) % loop;
        return next === 0 ? 0 : next - loop;
      };
      const apply = () => {
        setX(wrappedX(offset));
      };

      if (featuredId) {
        const focus = strip.items.find((item) => item.donation.id === featuredId);
        if (focus) {
          offset = -(focus.x - stage.clientWidth / 2);
          velocity = 0;
        }
      }

      gsap.set(rig, { x: wrappedX(offset), force3D: true });

      if (!reduce) {
        gsap.to(".js-cloud", {
          x: 16,
          y: 6,
          duration: 12,
          yoyo: true,
          repeat: -1,
          ease: "sine.inOut",
          stagger: 1.8,
        });
      }

      const onPointerDown = (event: PointerEvent) => {
        if (event.pointerType === "mouse" && event.button !== 0) return;
        dragging = true;
        axis = "none";
        travel = 0;
        dragged.current = false;
        pointerX = event.clientX;
        pointerY = event.clientY;
        lastMoveAt = event.timeStamp;
        velocity = 0;
      };
      const onPointerMove = (event: PointerEvent) => {
        if (!dragging) return;
        const samples =
          typeof event.getCoalescedEvents === "function" && event.getCoalescedEvents().length > 0
            ? event.getCoalescedEvents()
            : [event];
        let dx = 0;
        let cursor = pointerX;
        for (const sample of samples) {
          dx += sample.clientX - cursor;
          cursor = sample.clientX;
        }
        const dy = event.clientY - pointerY;
        if (axis === "none") {
          if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
          axis = Math.abs(dx) >= Math.abs(dy) ? "x" : "y";
          if (axis === "x") stage.setPointerCapture(event.pointerId);
        }
        pointerX = cursor;
        pointerY = event.clientY;
        if (axis !== "x") return;
        const now = event.timeStamp;
        const dt = Math.max(8, now - lastMoveAt || 16);
        lastMoveAt = now;
        offset += dx;
        velocity = velocity * 0.55 + (dx / dt) * 16.67 * 0.45;
        travel += Math.abs(dx);
        if (travel > 6) dragged.current = true;
        apply();
      };
      const onPointerUp = (event: PointerEvent) => {
        if (stage.hasPointerCapture(event.pointerId)) {
          stage.releasePointerCapture(event.pointerId);
        }
        dragging = false;
        axis = "none";
        velocity = Math.max(-42, Math.min(42, velocity));
      };

      stage.addEventListener("pointerdown", onPointerDown);
      stage.addEventListener("pointermove", onPointerMove);
      stage.addEventListener("pointerup", onPointerUp);
      stage.addEventListener("pointercancel", onPointerUp);

      const tick = () => {
        if (document.hidden || dragging || reduce) return;
        if (featuredId) return;
        const dt = gsap.ticker.deltaRatio(60);
        velocity += (-IDLE - velocity) * (1 - Math.pow(0.9, dt));
        offset += velocity * dt;
        apply();
      };
      gsap.ticker.add(tick);

      return () => {
        gsap.ticker.remove(tick);
        stage.removeEventListener("pointerdown", onPointerDown);
        stage.removeEventListener("pointermove", onPointerMove);
        stage.removeEventListener("pointerup", onPointerUp);
        stage.removeEventListener("pointercancel", onPointerUp);
      };
    },
    {
      scope: rootRef,
      dependencies: [hangingKey, strip.width, featuredId],
      revertOnUpdate: true,
    },
  );

  return (
    <div ref={rootRef} id="lantern-sky" className="sky-window">
      <div className="sky-moon-slot">
        <Image
          src="/image/moon.png"
          alt=""
          fill
          sizes="140px"
          className="js-moon sky-sprite"
          loading="eager"
          unoptimized
        />
      </div>
      <div className="sky-cloud-slot">
        <Image
          src="/image/clouds.png"
          alt=""
          fill
          sizes="200px"
          className="js-cloud sky-sprite"
          unoptimized
        />
      </div>
      <div className="sky-cloud-slot sky-cloud-slot-sm">
        <Image
          src="/image/clouds.png"
          alt=""
          fill
          sizes="140px"
          className="js-cloud sky-sprite"
          unoptimized
        />
      </div>

      {featured ? (
        <p className="sky-toast" role="status" aria-live="polite">
          Cảm ơn bạn đã quyên góp
        </p>
      ) : null}

      <div
        ref={stageRef}
        className="lantern-stage"
        role="group"
        aria-label="Lồng đèn bay ngang trên bầu trời. Vuốt trái phải để xem."
      >
        <div
          ref={rigRef}
          className="lantern-rig"
          style={{ width: strip.width * 2 }}
        >
          {[0, 1].map((copy) =>
            strip.items.map((item) => {
              const lantern = LANTERN_ASSETS[item.donation.lantern];
              const lit =
                featuredId === item.donation.id ||
                Boolean(mineIds?.has(item.donation.id));
              return (
                <button
                  key={`${copy}-${item.donation.id}`}
                  type="button"
                  className={
                    lit
                      ? featuredId === item.donation.id
                        ? "lantern-fly is-mine is-featured"
                        : "lantern-fly is-mine"
                      : "lantern-fly"
                  }
                  style={{
                    left: item.x + copy * strip.width,
                    top: `${item.y * 100}%`,
                    width: item.boxW,
                    zIndex: lit
                      ? featuredId === item.donation.id
                        ? 12
                        : 10
                      : 2 + Math.round(item.size / 10),
                  }}
                  onClick={() => {
                    if (dragged.current) return;
                    onSelect(item.donation);
                  }}
                  aria-label={`${item.donation.name}, ${formatVnd(item.donation.amount)}`}
                >
                  <img
                    src={lantern.src}
                    alt=""
                    width={item.size}
                    height={item.size}
                    className="lantern-fly-art"
                    draggable={false}
                  />
                  <span className="lantern-name">{item.donation.name}</span>
                </button>
              );
            }),
          )}
        </div>
      </div>

      <div className="sky-fade sky-fade-left" aria-hidden="true" />
      <div className="sky-fade sky-fade-right" aria-hidden="true" />
    </div>
  );
}
