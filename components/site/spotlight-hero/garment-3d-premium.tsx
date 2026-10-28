"use client";

import { ContactShadows, Environment, Lightformer, useGLTF, useProgress } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { RotateCcw } from "lucide-react";
import { Component, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Box3, BufferAttribute, Group, MathUtils, Vector3, type BufferGeometry, type Mesh, type MeshStandardMaterial, type Object3D, type PerspectiveCamera } from "three";
import { useHits, type Hit, type Part, type Point3D, type View3D } from "./garment-3d";

/**
 * The premium viewer. It shows the same TRELLIS models as ./garment-3d, with three differences:
 *  1. The models are repaired on load. TRELLIS exports no normals (so three.js shades every triangle flat) and no
 *     metallic factor (which glTF defaults to fully metallic), so cloth looked faceted and like dull metal.
 *  2. One motion controller owns the camera. Drag, inertia, pointer parallax, idle sway, scroll and the guided
 *     views all feed damped targets, so nothing fights over the same transform and React never re-renders per frame.
 *  3. The page keeps its scroll: the wheel is not captured, and touch only turns the model for horizontal drags.
 */

const TAU = Math.PI * 2;
const SCRATCH_V = new Vector3();
const SCRATCH_DIR = new Vector3();
const wrapPi = (a: number) => a - TAU * Math.round(a / TAU);

/** Size and centre of the garment in world units. */
type Fit = { cx: number; cy: number; cz: number; w: number; h: number; d: number; minY: number };

/** What the wrapper can ask of the motion controller. */
type Rig = {
  grab: () => void;
  drag: (dyaw: number, dpitch: number, dt: number) => void;
  release: (idleMs: number) => void;
  nudge: (by: number) => void;
  zoomBy: (k: number) => void;
  goTo: (v: Pick<View3D, "az" | "zoom" | "aimY" | "at">) => void;
  reset: () => void;
  pointer: (x: number, y: number) => void;
  scroll: (p: number) => void;
};

/** Smooth vertex normals, welded by position so UV seams do not show as creases. */
function smoothNormals(geo: BufferGeometry) {
  if (geo.getAttribute("normal")) return;
  const pos = geo.getAttribute("position");
  const index = geo.index;
  const count = index ? index.count : pos.count;
  const key = (i: number) => `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
  const sum = new Map<string, [number, number, number]>();
  const at = (t: number) => (index ? index.getX(t) : t);
  for (let t = 0; t < count; t += 3) {
    const a = at(t);
    const b = at(t + 1);
    const c = at(t + 2);
    const ux = pos.getX(b) - pos.getX(a);
    const uy = pos.getY(b) - pos.getY(a);
    const uz = pos.getZ(b) - pos.getZ(a);
    const vx = pos.getX(c) - pos.getX(a);
    const vy = pos.getY(c) - pos.getY(a);
    const vz = pos.getZ(c) - pos.getZ(a);
    // Not normalised, so larger triangles count for more.
    const nx = uy * vz - uz * vy;
    const ny = uz * vx - ux * vz;
    const nz = ux * vy - uy * vx;
    for (const i of [a, b, c]) {
      const k = key(i);
      const s = sum.get(k);
      if (s) {
        s[0] += nx;
        s[1] += ny;
        s[2] += nz;
      } else sum.set(k, [nx, ny, nz]);
    }
  }
  const out = new Float32Array(pos.count * 3);
  for (let i = 0; i < pos.count; i++) {
    const s = sum.get(key(i)) ?? [0, 1, 0];
    const len = Math.hypot(s[0], s[1], s[2]) || 1;
    out[i * 3] = s[0] / len;
    out[i * 3 + 1] = s[1] / len;
    out[i * 3 + 2] = s[2] / len;
  }
  geo.setAttribute("normal", new BufferAttribute(out, 3));
}

const repaired = new WeakSet<Object3D>();
/** Smooth shading and a matte cloth material in place of the loader's flat, fully metallic defaults. */
function repair(scene: Object3D) {
  if (repaired.has(scene)) return;
  repaired.add(scene);
  scene.traverse((o) => {
    const m = o as Mesh;
    if (!m.isMesh) return;
    smoothNormals(m.geometry);
    const mat = m.material as MeshStandardMaterial;
    mat.flatShading = false;
    mat.metalness = 0;
    mat.roughness = 0.9;
    mat.envMapIntensity = 0.55;
    if (mat.map) mat.map.anisotropy = 8;
    mat.needsUpdate = true;
  });
}

/** The garment (or an outfit of several), its numbered points and a hair of float. */
function Garment({ src, points, onFit, onHits, floatRef, motion }: { src: string | Part[]; points: Point3D[]; onFit: (f: Fit) => void; onHits: (h: Hit[]) => void; floatRef: React.MutableRefObject<number>; motion: boolean }) {
  const loaded = useGLTF(typeof src === "string" ? [src] : src.map((p) => p.src));
  const scene = useMemo(() => {
    if (typeof src === "string") {
      repair(loaded[0].scene);
      return loaded[0].scene;
    }
    // An outfit: each garment is scaled to its own height and hung from its own top edge.
    const outfit = new Group();
    src.forEach((part, i) => {
      repair(loaded[i].scene);
      const piece = loaded[i].scene.clone(true);
      const box = new Box3().setFromObject(piece);
      piece.scale.multiplyScalar(part.height / (box.max.y - box.min.y));
      piece.updateMatrixWorld(true);
      const fitted = new Box3().setFromObject(piece);
      piece.position.set(-(fitted.min.x + fitted.max.x) / 2, part.top - fitted.max.y, -(fitted.min.z + fitted.max.z) / 2);
      outfit.add(piece);
    });
    return outfit;
  }, [loaded, src]);
  const hits = useHits(scene, points);
  useEffect(() => {
    onHits(hits);
  }, [hits, onHits]);
  const group = useRef<Group>(null);
  const box = useMemo(() => new Box3().setFromObject(scene), [scene]);
  useEffect(() => {
    const c = box.getCenter(new Vector3());
    const s = box.getSize(new Vector3());
    onFit({ cx: c.x, cy: c.y, cz: c.z, w: s.x, h: s.y, d: s.z, minY: box.min.y });
  }, [box, onFit]);
  useFrame(({ clock }, dt) => {
    const g = group.current;
    if (!g || !motion) return;
    g.position.y = MathUtils.damp(g.position.y, Math.sin(clock.elapsedTime * 0.8) * (box.max.y - box.min.y) * 0.008, 6, Math.min(dt, 0.05));
    floatRef.current = g.position.y;
  });
  return (
    <group ref={group}>
      <primitive object={scene} />
    </group>
  );
}

/**
 * The only thing that moves the camera. Every input sets a target and the camera chases it with exponential
 * damping, so a drag, a flick, a guided view and the scroll all blend instead of fighting. It runs in the render
 * loop on refs, with no React state.
 */
function MotionRig({ fit, apiRef, reduced, hitsRef, markersRef, floatRef }: { fit: React.RefObject<Fit | null>; apiRef: React.RefObject<Rig | null>; reduced: boolean; hitsRef: React.RefObject<Hit[]>; markersRef: React.RefObject<(HTMLButtonElement | null)[]>; floatRef: React.RefObject<number> }) {
  const s = useRef({
    init: false,
    yaw: 0, yawT: 0, pitch: 0, pitchT: 0, zoom: 1, zoomT: 1,
    ax: 0, ay: 0, az: 0,
    at: null as [number, number, number] | null, aimY: 0,
    rest: 0, vel: 0, dragging: false, last: -99, now: 0,
    px: 0, py: 0, pxs: 0, pys: 0, sc: 0, scT: 0, idle: 0,
  });
  const target = useMemo(() => new Vector3(), []);

  useEffect(() => {
    const c = s.current;
    apiRef.current = {
      grab: () => {
        c.dragging = true;
        c.vel = 0;
        c.last = c.now;
      },
      drag: (dyaw, dpitch, dt) => {
        c.yawT += dyaw;
        c.pitchT = MathUtils.clamp(c.pitchT + dpitch, -0.25, 0.35);
        c.vel = MathUtils.clamp(MathUtils.lerp(c.vel, dyaw / Math.max(dt, 1 / 120), 0.35), -7, 7);
        c.last = c.now;
      },
      release: (idleMs) => {
        c.dragging = false;
        // A pointer held still before release carries no momentum.
        if (idleMs > 80) c.vel = 0;
        c.last = c.now;
      },
      nudge: (by) => {
        c.yawT += by;
        c.vel = 0;
        c.last = c.now;
      },
      zoomBy: (k) => {
        c.zoomT = MathUtils.clamp(c.zoomT * k, 0.35, 1.5);
        c.last = c.now;
      },
      goTo: (v) => {
        c.yawT += wrapPi(v.az - c.yawT);
        c.pitchT = 0;
        c.zoomT = v.zoom;
        c.at = v.at ?? null;
        c.aimY = v.aimY;
        c.rest = v.az;
        c.vel = 0;
        c.last = c.now;
      },
      reset: () => {
        c.yawT += wrapPi(0 - c.yawT);
        c.pitchT = 0;
        c.zoomT = 1;
        c.at = null;
        c.aimY = 0;
        c.rest = 0;
        c.vel = 0;
        c.last = c.now;
      },
      pointer: (x, y) => {
        c.px = x;
        c.py = y;
      },
      scroll: (p) => {
        c.scT = p;
      },
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef]);

  useFrame((state, raw) => {
    const f = fit.current;
    if (!f) return;
    const dt = Math.min(raw, 0.05);
    const c = s.current;
    c.now = state.clock.elapsedTime;
    if (!c.init) {
      c.init = true;
      // The entrance: the garment starts a little turned and far, and settles into the hero composition.
      if (!reduced) {
        c.yaw = -0.5;
        c.zoom = 1.15;
      }
    }
    const idleFor = c.now - c.last;
    if (!c.dragging) {
      if (!reduced) {
        // Flick momentum, dying away within a second or so.
        c.yawT += c.vel * dt;
        c.vel *= Math.exp(-3.4 * dt);
      } else c.vel = 0;
      // After a few quiet seconds the garment eases back to its resting view (the front, or the chosen view).
      if (idleFor > 5 && Math.abs(c.vel) < 0.05) {
        const k = 1 - Math.exp(-0.7 * dt);
        c.yawT += wrapPi(c.rest - c.yawT) * k;
        c.pitchT -= c.pitchT * k;
      }
    }
    c.idle = MathUtils.damp(c.idle, !c.dragging && idleFor > 1.5 ? 1 : 0, 1.5, dt);
    c.pxs = MathUtils.damp(c.pxs, c.px, 3, dt);
    c.pys = MathUtils.damp(c.pys, c.py, 3, dt);
    c.sc = MathUtils.damp(c.sc, c.scT, 3.5, dt);
    c.yaw = MathUtils.damp(c.yaw, c.yawT, c.dragging ? 14 : 5, dt);
    c.pitch = MathUtils.damp(c.pitch, c.pitchT, 5, dt);
    c.zoom = MathUtils.damp(c.zoom, c.zoomT, 4.5, dt);
    const wantX = c.at ? c.at[0] : f.cx;
    const wantY = c.at ? c.at[1] : f.cy + c.aimY * f.h;
    const wantZ = c.at ? c.at[2] : f.cz;
    if (c.ax === 0 && c.ay === 0 && c.az === 0) {
      c.ax = wantX;
      c.ay = wantY;
      c.az = wantZ;
    }
    c.ax = MathUtils.damp(c.ax, wantX, 4.5, dt);
    c.ay = MathUtils.damp(c.ay, wantY, 4.5, dt);
    c.az = MathUtils.damp(c.az, wantZ, 4.5, dt);

    const sway = reduced ? 0 : Math.sin(c.now * 0.4) * 0.045 * c.idle;
    const yaw = c.yaw + c.pxs * 0.075 + c.sc * 0.55 + sway;
    const pitch = MathUtils.clamp(c.pitch - c.pys * 0.03 + c.sc * 0.07, -0.4, 0.45);
    const cam = state.camera as PerspectiveCamera;
    const half = Math.tan(MathUtils.degToRad(cam.fov) / 2);
    const fitDist = Math.max(f.h / 2 / half, f.w / 2 / (half * cam.aspect)) / 0.8 + f.d / 2;
    const dist = fitDist * c.zoom * (1 + 0.16 * c.sc);
    target.set(c.ax, c.ay - c.sc * 0.04 * f.h, c.az);
    cam.position.set(target.x + dist * Math.sin(yaw) * Math.cos(pitch), target.y + dist * Math.sin(pitch), target.z + dist * Math.cos(yaw) * Math.cos(pitch));
    cam.lookAt(target);

    // Pin each numbered point's button to its spot on the cloth. They are ordinary page buttons, moved here with no React state.
    const hits = hitsRef.current;
    const els = markersRef.current;
    if (!hits.length) return;
    cam.updateMatrixWorld();
    const v = SCRATCH_V;
    const dir = SCRATCH_DIR;
    for (let i = 0; i < hits.length; i++) {
      const el = els[i];
      if (!el) continue;
      v.copy(hits[i].pos);
      v.y += floatRef.current;
      v.project(cam);
      dir.copy(cam.position).sub(hits[i].pos).normalize();
      // A point fades out as the cloth it sits on turns away from the camera.
      const facing = v.z < 1 && hits[i].normal.dot(dir) > 0.25;
      el.style.transform = `translate3d(${(v.x * 0.5 + 0.5) * state.size.width}px, ${(-v.y * 0.5 + 0.5) * state.size.height}px, 0) translate(-50%, -50%)`;
      el.style.opacity = facing ? "1" : "0";
      el.style.pointerEvents = facing ? "auto" : "none";
    }
  });
  return null;
}

class Boundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("3D viewer failed to load", error);
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

function webglAvailable() {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function Loading() {
  const { active, progress } = useProgress();
  if (!active) return null;
  return (
    <p aria-live="polite" className="pointer-events-none absolute inset-0 z-10 grid place-items-center text-[0.72rem] font-bold uppercase tracking-[0.18em] text-white/85">
      Loading 3D model {Math.round(progress)}%
    </p>
  );
}

/**
 * Everything in the scene except the camera. The garment's size is kept in state here, inside the 3D tree, so
 * reporting it never schedules an update on the page's own React tree while the canvas is being torn down.
 */
function Stage({ src, points, onHits, floatRef, fitRef, motion }: { src: string | Part[]; points: Point3D[]; onHits: (h: Hit[]) => void; floatRef: React.MutableRefObject<number>; fitRef: React.MutableRefObject<Fit | null>; motion: boolean }) {
  const [size, setSize] = useState<Fit | null>(null);
  const onFit = useCallback(
    (f: Fit) => {
      fitRef.current = f;
      setSize(f);
    },
    [fitRef],
  );
  return (
    <>
      <Garment src={src} points={points} onFit={onFit} onHits={onHits} floatRef={floatRef} motion={motion} />
      {/* Restrained studio light: a soft key from the upper left, a cool fill, and a rim from behind to lift the edge off the navy. */}
      <ambientLight intensity={1.1} />
      <directionalLight position={[-2.2, 3.5, 3.5]} intensity={1.5} color="#fff3e4" />
      <directionalLight position={[3.2, 1.2, 2]} intensity={0.5} color="#b9c8ff" />
      <directionalLight position={[0.6, 2.5, -4]} intensity={1.3} color="#dbe6ff" />
      {/* A soft key for the back too, so the garment reads as well from behind as from the front. */}
      <directionalLight position={[-2.2, 3, -3.5]} intensity={1.1} color="#fff3e4" />
      <Environment resolution={128} environmentIntensity={0.5}>
        <Lightformer form="rect" intensity={1.6} position={[0, 4, 3]} scale={[8, 3, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[-5, 1, 2]} scale={[3, 6, 1]} color="#9fb4ff" />
        <Lightformer form="rect" intensity={0.6} position={[5, 1, -2]} scale={[3, 6, 1]} />
      </Environment>
      {size && <ContactShadows position={[size.cx, size.minY - 0.015 * size.h, size.cz]} opacity={0.45} scale={Math.max(size.w, size.d) * 3.2} blur={2.4} far={size.h * 0.4} frames={1} />}
    </>
  );
}

/**
 * A real 3D garment: drag to turn it, flick for a little momentum. It breathes gently when left alone and eases
 * back to its resting view. The arrow keys turn it, plus and minus zoom, 0 resets. Scrolling the page past the hero
 * turns and eases the camera a little. The page scrolls normally over the model, and Ctrl + wheel (or a trackpad
 * pinch) zooms. Without WebGL, or if the model fails to load, the poster photo is shown instead.
 */
export default function Garment3DPremium({
  src,
  label,
  poster,
  points = [],
  activeKey = null,
  onPick = () => {},
  view = null,
  onGrab = () => {},
}: {
  src: string | Part[];
  label: string;
  poster: string;
  points?: Point3D[];
  activeKey?: string | null;
  onPick?: (key: string) => void;
  view?: View3D | null;
  onGrab?: () => void;
}) {
  const [gl, setGl] = useState<boolean | null>(null);
  const [failed, setFailed] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [coarse, setCoarse] = useState(false);
  const [visible, setVisible] = useState(true);
  const [dragging, setDragging] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const hitsRef = useRef<Hit[]>([]);
  const markersRef = useRef<(HTMLButtonElement | null)[]>([]);
  const floatRef = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const rig = useRef<Rig | null>(null);
  const fit = useRef<Fit | null>(null);
  const press = useRef<{ id: number; x: number; y: number; lx: number; ly: number; lt: number; started: boolean; touch: boolean } | null>(null);

  useEffect(() => {
    // Feature detection can only run in the browser, after hydration.
    /* eslint-disable react-hooks/set-state-in-effect */
    setGl(webglAvailable());
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    setCoarse(window.matchMedia("(pointer: coarse)").matches);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    hitsRef.current = hits;
  }, [hits]);

  // A chosen view glides the camera there. Clearing the view (the visitor took hold) never cancels a glide in progress.
  useEffect(() => {
    if (view) rig.current?.goTo(view);
  }, [view]);

  // Stop rendering while the hero is off screen.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, [gl]);

  // Scrolling the page away from the hero turns and eases the camera a little. The wheel is never captured, except
  // Ctrl + wheel (a trackpad pinch), which zooms.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const hero = el.closest("section");
    const onScroll = () => {
      if (!hero || reduced) return;
      const r = hero.getBoundingClientRect();
      const p = MathUtils.clamp(-r.top / Math.max(r.height, 1), 0, 1);
      rig.current?.scroll(p * p * (3 - 2 * p));
    };
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      rig.current?.zoomBy(Math.exp(e.deltaY * 0.01));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.removeEventListener("scroll", onScroll);
      el.removeEventListener("wheel", onWheel);
    };
  }, [gl, reduced]);

  const grabbed = () => onGrab();
  const zoomTo = (hit: Hit) => {
    grabbed();
    rig.current?.goTo({ az: Math.atan2(hit.normal.x, hit.normal.z), zoom: 0.4, aimY: 0, at: [hit.pos.x, hit.pos.y, hit.pos.z] });
  };
  const reset = () => {
    grabbed();
    rig.current?.reset();
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    press.current = { id: e.pointerId, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, lt: performance.now(), started: false, touch: e.pointerType !== "mouse" };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const b = el.getBoundingClientRect();
    // A restrained lean toward the pointer, for a mouse only.
    if (e.pointerType === "mouse" && !reduced) rig.current?.pointer(MathUtils.clamp(((e.clientX - b.left) / b.width - 0.5) * 2, -1, 1), MathUtils.clamp(((e.clientY - b.top) / b.height - 0.5) * 2, -1, 1));
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    if (!p.started) {
      const tx = e.clientX - p.x;
      const ty = e.clientY - p.y;
      if (Math.hypot(tx, ty) < 5) return;
      // On touch, a mostly vertical swipe is the page scrolling, not the garment turning.
      if (p.touch && Math.abs(ty) > Math.abs(tx)) {
        press.current = null;
        return;
      }
      p.started = true;
      el.setPointerCapture(e.pointerId);
      setDragging(true);
      grabbed();
      rig.current?.grab();
    }
    const now = performance.now();
    const k = TAU / (1.4 * Math.max(b.width, 280));
    // Drag right and the front of the garment travels right.
    rig.current?.drag(-(e.clientX - p.lx) * k, p.touch ? 0 : (e.clientY - p.ly) * 0.004, (now - p.lt) / 1000);
    p.lx = e.clientX;
    p.ly = e.clientY;
    p.lt = now;
  };
  const endPress = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = press.current;
    if (!p || p.id !== e.pointerId) return;
    press.current = null;
    if (!p.started) return;
    rig.current?.release(performance.now() - p.lt);
    setDragging(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const poster_ = (
    // eslint-disable-next-line @next/next/no-img-element -- fallback when WebGL or the model is unavailable
    <img src={poster} alt={label} className="absolute inset-0 size-full object-contain" />
  );
  if (gl === false || failed) return poster_;

  return (
    <div
      ref={root}
      role="group"
      aria-label={`${label}, a 3D model. Drag to turn it. Arrow keys turn it, plus and minus zoom.`}
      tabIndex={0}
      className={`sp-model-in absolute inset-0 select-none outline-offset-[4px] focus-visible:outline-2 focus-visible:outline-[#ffc82c] ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      // Vertical swipes scroll the page; only horizontal drags reach the model.
      style={{ touchAction: "pan-y" }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPress}
      onPointerCancel={endPress}
      onPointerLeave={(e) => e.pointerType === "mouse" && rig.current?.pointer(0, 0)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") rig.current?.nudge(-0.35);
        else if (e.key === "ArrowRight") rig.current?.nudge(0.35);
        else if (e.key === "+" || e.key === "=") rig.current?.zoomBy(0.85);
        else if (e.key === "-") rig.current?.zoomBy(1.18);
        else if (e.key === "0" || e.key === "Home") reset();
        else return;
        e.preventDefault();
      }}
    >
      {gl && (
        <Boundary fallback={poster_}>
          <Canvas
            frameloop={visible ? "always" : "never"}
            dpr={[1, coarse ? 1.5 : 2]}
            camera={{ fov: 32, position: [0, 0.2, 5], near: 0.1, far: 40 }}
            gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
            style={{ touchAction: "pan-y" }}
            onCreated={({ gl: renderer }) => {
              renderer.domElement.addEventListener("webglcontextlost", (e) => {
                e.preventDefault();
                setFailed(true);
              });
            }}
          >
            <Suspense fallback={null}>
              <Stage src={src} points={points} onHits={setHits} floatRef={floatRef} fitRef={fit} motion={!reduced} />
            </Suspense>
            <MotionRig fit={fit} apiRef={rig} reduced={reduced} hitsRef={hitsRef} markersRef={markersRef} floatRef={floatRef} />
          </Canvas>
        </Boundary>
      )}
      {/* The numbered points: plain buttons, kept on the cloth by the motion controller. */}
      {hits.map((h, i) => (
        <button
          key={h.key}
          ref={(el) => {
            markersRef.current[i] = el;
          }}
          type="button"
          aria-label={`${i + 1}. ${h.label}`}
          aria-pressed={h.key === activeKey}
          onClick={() => {
            onPick(h.key);
            zoomTo(h);
          }}
          onFocus={() => onPick(h.key)}
          onPointerDown={(e) => e.stopPropagation()}
          style={{ opacity: 0, pointerEvents: "none" }}
          className="group absolute left-0 top-0 z-20 grid size-11 cursor-pointer place-items-center rounded-full transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#ffc82c]"
        >
          <span aria-hidden className={`grid size-8 place-items-center rounded-full border-2 transition-[transform,background-color,border-color] duration-200 group-hover:scale-110 ${h.key === activeKey ? "border-[#ffc82c] bg-[#0e1b4f]/55" : "border-white bg-[#0e1b4f]/35 group-hover:bg-[#0e1b4f]/60"}`}>
            <span className={`size-2.5 rounded-full transition-colors duration-200 ${h.key === activeKey ? "bg-[#ffc82c]" : "bg-white"}`} />
          </span>
        </button>
      ))}
      <Loading />
      <button
        type="button"
        aria-label="Reset the view"
        onClick={reset}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute bottom-3 right-3 z-20 grid size-11 place-items-center border border-white/40 bg-[#0e1b4f]/80 text-white backdrop-blur hover:bg-white/15 focus-visible:outline-2 focus-visible:outline-[#ffc82c]"
      >
        <RotateCcw className="size-4" aria-hidden />
      </button>
    </div>
  );
}
