"use client";

import { Bounds, ContactShadows, Environment, Html, Lightformer, OrbitControls, useBounds, useGLTF, useProgress } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { RotateCcw } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Box3, Group, MathUtils, Raycaster, Vector3, type Mesh, type Object3D } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type Api = { reset: () => void };

/** One garment of an outfit: scaled to `height` and hung so its top edge sits at `top`. */
export type Part = { src: string; height: number; top: number };

/** A numbered point on the garment. It is placed by firing a ray at the model from `side`, `u` across and `v` up its bounding box. */
export type Point3D = { key: string; label: string; side: "front" | "back" | "left" | "right"; u: number; v: number };
export type Hit = { key: string; label: string; pos: Vector3; normal: Vector3 };

/** Finds where each point lands on the real surface of the model, so a point always sits on the cloth. */
export function useHits(scene: Object3D, points: Point3D[]): Hit[] {
  return useMemo(() => {
    scene.updateMatrixWorld(true);
    const box = new Box3().setFromObject(scene);
    const meshes: Object3D[] = [];
    scene.traverse((o) => {
      if ((o as Mesh).isMesh) meshes.push(o);
    });
    const rc = new Raycaster();
    return points.flatMap((p) => {
      const x = box.min.x + p.u * (box.max.x - box.min.x);
      const y = box.min.y + p.v * (box.max.y - box.min.y);
      const z = box.min.z + p.u * (box.max.z - box.min.z);
      const pad = 1;
      let origin: Vector3;
      let dir: Vector3;
      if (p.side === "front") {
        origin = new Vector3(x, y, box.max.z + pad);
        dir = new Vector3(0, 0, -1);
      } else if (p.side === "back") {
        origin = new Vector3(x, y, box.min.z - pad);
        dir = new Vector3(0, 0, 1);
      } else if (p.side === "right") {
        origin = new Vector3(box.max.x + pad, y, z);
        dir = new Vector3(-1, 0, 0);
      } else {
        origin = new Vector3(box.min.x - pad, y, z);
        dir = new Vector3(1, 0, 0);
      }
      rc.set(origin, dir);
      const hit = rc.intersectObjects(meshes, false)[0];
      if (!hit || !hit.face) return [];
      return [{ key: p.key, label: p.label, pos: hit.point.clone(), normal: hit.face.normal.clone().transformDirection(hit.object.matrixWorld) }];
    });
  }, [scene, points]);
}

/** One numbered pin. It fades out when the garment turns its back on the camera, and can be pressed while it faces it. */
export function Marker({ hit, n, active, onPick, onZoom }: { hit: Hit; n: number; active: boolean; onPick: (key: string) => void; onZoom: (hit: Hit) => void }) {
  const btn = useRef<HTMLButtonElement>(null);
  const dir = useRef(new Vector3());
  useFrame(({ camera }) => {
    const b = btn.current;
    if (!b) return;
    dir.current.copy(camera.position).sub(hit.pos).normalize();
    const facing = hit.normal.dot(dir.current) > 0.25;
    b.style.opacity = facing ? "1" : "0";
    b.style.pointerEvents = facing ? "auto" : "none";
  });
  return (
    <Html position={hit.pos} center zIndexRange={[20, 0]}>
      <button
        ref={btn}
        type="button"
        aria-label={`${n}. ${hit.label}`}
        aria-pressed={active}
        onClick={() => {
          onPick(hit.key);
          onZoom(hit);
        }}
        onFocus={() => onPick(hit.key)}
        onPointerDown={(e) => e.stopPropagation()}
        className="group grid size-11 cursor-pointer place-items-center rounded-full transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#ffc82c]"
      >
        <span aria-hidden className={`grid size-8 place-items-center rounded-full border-2 transition-[transform,background-color,border-color] duration-200 group-hover:scale-110 ${active ? "border-[#ffc82c] bg-[#0e1b4f]/55" : "border-white bg-[#0e1b4f]/35 group-hover:bg-[#0e1b4f]/60"}`}>
          <span className={`size-2.5 rounded-full transition-colors duration-200 ${active ? "bg-[#ffc82c]" : "bg-white"}`} />
        </span>
      </button>
    </Html>
  );
}

/** Size of the garment, so a guided view knows where the middle and the top edge are. */
type Meta = { centerX: number; centerY: number; centerZ: number; height: number; baseDist: number };

/**
 * The garment and its points. It floats a hair up and down and leans a few degrees toward the pointer, so it feels
 * suspended in the light rather than pinned to the page.
 */
function Model({ src, points, activeKey, onPick, onZoom, metaRef, motion }: { src: string | Part[]; points: Point3D[]; activeKey: string | null; onPick: (key: string) => void; onZoom: (hit: Hit) => void; metaRef: React.RefObject<Meta | null>; motion: boolean }) {
  const loaded = useGLTF(typeof src === "string" ? [src] : src.map((p) => p.src));
  const scene = useMemo(() => {
    if (typeof src === "string") return loaded[0].scene;
    // An outfit: each garment is scaled to its own height and hung from its own top edge.
    const outfit = new Group();
    src.forEach((part, i) => {
      const piece = loaded[i].scene.clone(true);
      const box = new Box3().setFromObject(piece);
      const k = part.height / (box.max.y - box.min.y);
      piece.scale.multiplyScalar(k);
      piece.updateMatrixWorld(true);
      const fitted = new Box3().setFromObject(piece);
      piece.position.set(-(fitted.min.x + fitted.max.x) / 2, part.top - fitted.max.y, -(fitted.min.z + fitted.max.z) / 2);
      outfit.add(piece);
    });
    return outfit;
  }, [loaded, src]);
  const hits = useHits(scene, points);
  const group = useRef<Group>(null);
  const size = useMemo(() => new Box3().setFromObject(scene), [scene]);
  useEffect(() => {
    metaRef.current = { centerX: (size.min.x + size.max.x) / 2, centerY: (size.min.y + size.max.y) / 2, centerZ: (size.min.z + size.max.z) / 2, height: size.max.y - size.min.y, baseDist: 0 };
  }, [metaRef, size]);
  useFrame(({ clock, pointer }) => {
    const g = group.current;
    if (!g || !motion) return;
    const h = size.max.y - size.min.y;
    g.position.y = MathUtils.damp(g.position.y, Math.sin(clock.elapsedTime * 0.9) * h * 0.012, 6, 1 / 60);
    g.rotation.y = MathUtils.damp(g.rotation.y, pointer.x * 0.09, 3, 1 / 60);
    g.rotation.x = MathUtils.damp(g.rotation.x, -pointer.y * 0.035, 3, 1 / 60);
  });
  return (
    <group ref={group}>
      <primitive object={scene} />
      {hits.map((h, i) => (
        <Marker key={h.key} hit={h} n={i + 1} active={h.key === activeKey} onPick={onPick} onZoom={onZoom} />
      ))}
    </group>
  );
}

/** A view to glide to. `at` is a point on the garment to look straight at (it replaces `aimY`). */
export type View3D = { id: string; az: number; zoom: number; aimY: number; n: number; at?: [number, number, number] };

/**
 * Glides the camera to a chosen view: round to the angle, in or out to the distance, and up or down to where to look,
 * all eased together. Taking hold of the model cancels it, so it never fights the visitor's hand.
 */
function Director({ goalRef, metaRef, onGrab }: { goalRef: React.RefObject<View3D | null>; metaRef: React.RefObject<Meta | null>; onGrab: () => void }) {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null;
  const born = useRef(0);
  useEffect(() => {
    if (!controls) return;
    const grab = () => {
      goalRef.current = null;
      onGrab();
    };
    controls.addEventListener("start", grab);
    return () => controls.removeEventListener("start", grab);
  }, [controls, goalRef, onGrab]);
  useFrame(({ clock }, dt) => {
    const c = controls;
    const m = metaRef.current;
    if (!c || !m) return;
    const dist = c.object.position.distanceTo(c.target);
    // The framing settles in the first moments; whatever distance it ends at is "the whole garment".
    if (!m.baseDist) {
      born.current ||= clock.elapsedTime;
      if (clock.elapsedTime - born.current > 1.6) m.baseDist = dist;
      return;
    }
    const g = goalRef.current;
    if (!g) return;
    const k = Math.min(dt, 0.05);
    const cur = c.getAzimuthalAngle();
    const d = Math.atan2(Math.sin(g.az - cur), Math.cos(g.az - cur));
    c.setAzimuthalAngle(cur + d * (1 - Math.exp(-4 * k)));
    c.setPolarAngle(MathUtils.damp(c.getPolarAngle(), Math.PI / 2, 4, k));
    const wantX = g.at ? g.at[0] : m.centerX;
    const wantY = g.at ? g.at[1] : m.centerY + g.aimY * m.height;
    const wantZ = g.at ? g.at[2] : m.centerZ;
    c.target.set(MathUtils.damp(c.target.x, wantX, 4, k), MathUtils.damp(c.target.y, wantY, 4, k), MathUtils.damp(c.target.z, wantZ, 4, k));
    c.update();
    const want = m.baseDist * g.zoom;
    const nd = MathUtils.damp(dist, want, 4, k);
    c.object.position.sub(c.target).setLength(nd).add(c.target);
    c.update();
    if (Math.abs(d) < 0.004 && Math.abs(dist - want) < 0.01 && Math.abs(c.target.y - wantY) < 0.002 && Math.abs(c.target.x - wantX) < 0.002 && Math.abs(c.target.z - wantZ) < 0.002) goalRef.current = null;
  });
  return null;
}

/** Hands the "fit the garment to the view" call up to the reset button. */
function FitApi({ apiRef }: { apiRef: React.RefObject<Api | null> }) {
  const bounds = useBounds();
  useEffect(() => {
    apiRef.current = { reset: () => bounds.refresh().clip().fit() };
  }, [apiRef, bounds]);
  return null;
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
 * A real 3D garment: drag to turn it any way, scroll or pinch to move closer. The arrow keys turn it and plus and
 * minus zoom. Numbered points sit on the cloth itself and follow it as it turns. It idles in a slow turn that stops
 * while it is being touched, and stays still for reduced motion. The light is built in code (no HDR download), so
 * the only file fetched is the .glb. Without WebGL the poster photo is shown instead.
 */
export default function Garment3D({
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
  const [reduced, setReduced] = useState(true);
  // Once the visitor has chosen a view or taken hold of the model, the idle turn stops for good.
  const [engaged, setEngaged] = useState(false);
  const controls = useRef<OrbitControlsImpl>(null);
  const fit = useRef<Api>(null);
  const goal = useRef<View3D | null>(null);
  const meta = useRef<Meta | null>(null);

  useEffect(() => {
    // Clearing the view (the visitor took hold, or pressed a point) must not cancel a glide that is already under way.
    if (!view) return;
    goal.current = view;
    // A chosen view is a visitor action: the idle turn must not fight the glide.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setEngaged(true);
  }, [view]);

  useEffect(() => {
    // Feature detection can only run in the browser, after hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGl(webglAvailable());
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  const turn = (by: number) => {
    const c = controls.current;
    if (!c) return;
    c.setAzimuthalAngle(c.getAzimuthalAngle() + by);
    c.update();
  };
  const zoom = (k: number) => {
    const c = controls.current;
    if (!c) return;
    c.object.position.sub(c.target).multiplyScalar(k).add(c.target);
    c.update();
  };
  // Pressing a point glides in on it: round to face that part of the cloth, close up, looking straight at the point.
  const zoomTo = (hit: Hit) => {
    setEngaged(true);
    onGrab();
    goal.current = { id: hit.key, az: Math.atan2(hit.normal.x, hit.normal.z), zoom: 0.4, aimY: 0, n: 0, at: [hit.pos.x, hit.pos.y, hit.pos.z] };
  };
  const reset = () => {
    setEngaged(true);
    onGrab();
    // Glide home: round to the front, the whole garment, looking at its middle.
    goal.current = { id: "home", az: 0, zoom: 1, aimY: 0, n: 0 };
  };

  if (gl === false) {
    // eslint-disable-next-line @next/next/no-img-element -- fallback when WebGL is unavailable
    return <img src={poster} alt={`${label}`} className="absolute inset-0 size-full object-contain" />;
  }

  return (
    <div
      role="group"
      aria-label={`${label}, a 3D model. Drag to turn it. Arrow keys turn it, plus and minus zoom.`}
      tabIndex={0}
      className="sp-model-in absolute inset-0 cursor-grab [&_div]:![touch-action:pan-y] outline-offset-[4px] focus-visible:outline-2 focus-visible:outline-[#ffc82c] active:cursor-grabbing"
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") turn(-0.35);
        else if (e.key === "ArrowRight") turn(0.35);
        else if (e.key === "+" || e.key === "=") zoom(0.85);
        else if (e.key === "-") zoom(1.18);
        else if (e.key === "0" || e.key === "Home") reset();
        else return;
        e.preventDefault();
      }}
    >
      {gl && (
        <Canvas dpr={[1, 2]} camera={{ fov: 32, position: [0, 0.2, 5] }} gl={{ alpha: true, antialias: true }}>
          <Suspense fallback={null}>
            <Bounds fit clip observe margin={0.78}>
              <Model src={src} points={points} activeKey={activeKey} onPick={onPick} onZoom={zoomTo} metaRef={meta} motion={!reduced} />
              <FitApi apiRef={fit} />
            </Bounds>
            <ContactShadows position={[0, -1.2, 0]} opacity={0.5} scale={8} blur={2.6} far={3} />
            <ambientLight intensity={1.5} />
            <directionalLight position={[2.5, 4, 4]} intensity={3.2} />
            <Environment resolution={256} environmentIntensity={2.4}>
              <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[8, 3, 1]} />
              <Lightformer form="rect" intensity={1.6} position={[-5, 1, 2]} scale={[3, 6, 1]} color="#9fb4ff" />
              <Lightformer form="rect" intensity={1.2} position={[5, 1, -2]} scale={[3, 6, 1]} />
            </Environment>
          </Suspense>
          <OrbitControls ref={controls} makeDefault enablePan={false} minDistance={1} maxDistance={9} autoRotate={!reduced && !engaged} autoRotateSpeed={1.2} />
          <Director goalRef={goal} metaRef={meta} onGrab={() => { setEngaged(true); onGrab(); }} />
        </Canvas>
      )}
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
