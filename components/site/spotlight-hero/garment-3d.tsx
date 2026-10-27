"use client";

import { Bounds, ContactShadows, Environment, Html, Lightformer, OrbitControls, useBounds, useGLTF, useProgress } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { RotateCcw } from "lucide-react";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { Box3, Raycaster, Vector3, type Mesh, type Object3D } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type Api = { reset: () => void };

/** A numbered point on the garment. It is placed by firing a ray at the model from `side`, `u` across and `v` up its bounding box. */
export type Point3D = { key: string; label: string; side: "front" | "back" | "left" | "right"; u: number; v: number };
type Hit = { key: string; label: string; pos: Vector3; normal: Vector3 };

/** Finds where each point lands on the real surface of the model, so a point always sits on the cloth. */
function useHits(scene: Object3D, points: Point3D[]): Hit[] {
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
function Marker({ hit, n, active, onPick }: { hit: Hit; n: number; active: boolean; onPick: (key: string) => void }) {
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
        onClick={() => onPick(hit.key)}
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

function Model({ src, points, activeKey, onPick }: { src: string; points: Point3D[]; activeKey: string | null; onPick: (key: string) => void }) {
  const { scene } = useGLTF(src);
  const hits = useHits(scene, points);
  return (
    <>
      <primitive object={scene} />
      {hits.map((h, i) => (
        <Marker key={h.key} hit={h} n={i + 1} active={h.key === activeKey} onPick={onPick} />
      ))}
    </>
  );
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
}: {
  src: string;
  label: string;
  poster: string;
  points?: Point3D[];
  activeKey?: string | null;
  onPick?: (key: string) => void;
}) {
  const [gl, setGl] = useState<boolean | null>(null);
  const [reduced, setReduced] = useState(true);
  const controls = useRef<OrbitControlsImpl>(null);
  const fit = useRef<Api>(null);

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
  const reset = () => {
    const c = controls.current;
    if (c) {
      c.setAzimuthalAngle(0);
      c.setPolarAngle(Math.PI / 2);
      c.update();
    }
    fit.current?.reset();
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
              <Model src={src} points={points} activeKey={activeKey} onPick={onPick} />
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
          <OrbitControls ref={controls} makeDefault enablePan={false} minDistance={2.5} maxDistance={9} autoRotate={!reduced} autoRotateSpeed={1.2} />
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
