"use client";

import { ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { RotateCcw } from "lucide-react";
import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Box3, MathUtils, Vector3, type Group } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

const HEIGHT = 2.3; // the garment is scaled to this height in scene units
const HOME = { x: 0, y: 0.25, z: 6.2 };

/** Scroll progress through the hero, 0 to 1, shared with the scene without re-rendering React. */
type Live = { scroll: number; px: number; py: number };

/**
 * Scales the model to a fixed height, stands it upright (some generators export Z-up) with its feet on the floor and
 * centres it, then lets the pointer and the page scroll turn it a little on top of the user's own orbit.
 */
function Garment({ src, live, motion }: { src: string; live: React.RefObject<Live>; motion: boolean }) {
  const { scene } = useGLTF(src);
  const group = useRef<Group>(null);
  const fit = useMemo(() => {
    const box = new Box3().setFromObject(scene);
    const size = box.getSize(new Vector3());
    const c = box.getCenter(new Vector3());
    const zUp = size.z > size.y * 1.5;
    const h = zUp ? size.z : size.y;
    const k = HEIGHT / h;
    return {
      zUp,
      k,
      pos: (zUp ? [-c.x * k, -box.min.z * k - HEIGHT / 2, c.y * k] : [-c.x * k, -box.min.y * k - HEIGHT / 2, -c.z * k]) as [number, number, number],
    };
  }, [scene]);

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const l = live.current;
    // Mouse: a few degrees of depth only. Scroll: the garment is shown from a new angle as the page moves.
    const ty = motion ? l.px * 0.1 + l.scroll * 1.1 : 0;
    const tx = motion ? l.py * 0.04 : 0;
    g.rotation.y = MathUtils.damp(g.rotation.y, ty, 3, 1 / 60);
    g.rotation.x = MathUtils.damp(g.rotation.x, tx, 3, 1 / 60);
  });

  return (
    <group ref={group}>
      <primitive object={scene} scale={fit.k} position={fit.pos} rotation={fit.zUp ? [-Math.PI / 2, 0, 0] : [0, 0, 0]} />
    </group>
  );
}

/** Calls back once everything inside the Suspense boundary has loaded. */
function Ready({ onReady }: { onReady: () => void }) {
  useEffect(() => onReady(), [onReady]);
  return null;
}

class Boundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
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

/**
 * The interactive 3D garment. Drag to turn it, scroll or pinch to move closer, arrow keys and plus and minus work
 * too. It idles in a slow turn that stops while you hold it, leans a few degrees toward the pointer and shows a new
 * angle as the page scrolls. The light is built in code, so the only file fetched is the .glb. The poster photo
 * covers the box until the model is ready, and stays if WebGL is unavailable or the file fails to load.
 */
export default function Hero3DScene({ src, poster, label }: { src: string; poster: string; label: string }) {
  const [gl, setGl] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [motion, setMotion] = useState(false);
  const [touched, setTouched] = useState(false);
  const [visible, setVisible] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  const live = useRef<Live>({ scroll: 0, px: 0, py: 0 });

  useEffect(() => {
    // Feature detection can only run in the browser, after hydration.
    /* eslint-disable react-hooks/set-state-in-effect */
    setGl(webglAvailable());
    setMotion(!window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting));
    io.observe(el);
    const onScroll = () => {
      const r = el.getBoundingClientRect();
      live.current.scroll = MathUtils.clamp(-r.top / Math.max(1, r.height), 0, 1);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      live.current.px = MathUtils.clamp(((e.clientX - r.left) / r.width - 0.5) * 2, -1, 1);
      live.current.py = MathUtils.clamp(((e.clientY - r.top) / r.height - 0.5) * 2, -1, 1);
    };
    const onLeave = () => {
      live.current.px = 0;
      live.current.py = 0;
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
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
    if (!c) return;
    c.target.set(0, 0, 0);
    c.object.position.set(HOME.x, HOME.y, HOME.z);
    c.update();
  };

  const show3d = gl && !failed;

  return (
    <div
      ref={root}
      role="group"
      aria-label={`${label}, a 3D model. Drag to turn it. Arrow keys turn it, plus and minus zoom, zero resets.`}
      tabIndex={0}
      className="h3-viewer absolute inset-0 cursor-grab outline-offset-[-4px] focus-visible:outline-2 focus-visible:outline-[#262e86] active:cursor-grabbing [&_div]:![touch-action:pan-y]"
      onPointerDown={() => setTouched(true)}
      onKeyDown={(e) => {
        setTouched(true);
        if (e.key === "ArrowLeft") turn(-0.35);
        else if (e.key === "ArrowRight") turn(0.35);
        else if (e.key === "+" || e.key === "=") zoom(0.85);
        else if (e.key === "-") zoom(1.18);
        else if (e.key === "0" || e.key === "Home") reset();
        else return;
        e.preventDefault();
      }}
    >
      {/* The poster: a real photograph, shown until the 3D model is ready and as the fallback if it never is. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- poster for a client-only canvas */}
      <img src={poster} alt="" aria-hidden className={`pointer-events-none absolute inset-0 size-full object-contain transition-opacity duration-700 ${ready && show3d ? "opacity-0" : "opacity-100"}`} />

      {show3d && (
        <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}>
          <Boundary onError={() => setFailed(true)}>
            <Canvas frameloop={visible ? "always" : "never"} dpr={[1, 1.75]} camera={{ fov: 30, position: [HOME.x, HOME.y, HOME.z] }} gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}>
              <Suspense fallback={null}>
                <Garment src={src} live={live} motion={motion} />
                <ContactShadows position={[0, -HEIGHT / 2, 0]} opacity={0.38} scale={7} blur={2.8} far={2.6} />
                <ambientLight intensity={0.8} />
                <directionalLight position={[2.5, 4, 4]} intensity={2} />
                <Environment resolution={256} environmentIntensity={1.4}>
                  <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[8, 3, 1]} />
                  <Lightformer form="rect" intensity={1.6} position={[-5, 1, 2]} scale={[3, 6, 1]} color="#dfe6ff" />
                  <Lightformer form="rect" intensity={1.2} position={[5, 1, -2]} scale={[3, 6, 1]} />
                </Environment>
                <Ready onReady={() => setReady(true)} />
              </Suspense>
              <OrbitControls ref={controls} makeDefault enablePan={false} minDistance={3.6} maxDistance={8.5} minPolarAngle={Math.PI / 2.7} maxPolarAngle={Math.PI / 1.85} autoRotate={motion && !touched} autoRotateSpeed={0.9} enableDamping />
            </Canvas>
          </Boundary>
        </div>
      )}

      {show3d && !ready && (
        <p aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-6 text-center text-[0.72rem] font-bold uppercase tracking-[0.18em] text-indigo/70">
          Loading 3D model
        </p>
      )}
      {failed && <p className="sr-only">The 3D model could not be loaded. A photograph is shown instead.</p>}

      {show3d && ready && (
        <button
          type="button"
          aria-label="Reset the view"
          onClick={reset}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute bottom-5 right-5 z-20 grid size-11 place-items-center rounded-full border border-ink/15 bg-white/80 text-ink backdrop-blur-sm transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-indigo"
        >
          <RotateCcw className="size-4" aria-hidden />
        </button>
      )}
      {show3d && ready && (
        <p aria-hidden className={`pointer-events-none absolute inset-x-0 bottom-6 text-center text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-ink/55 transition-opacity duration-700 ${touched ? "opacity-0" : "opacity-100"}`}>
          Drag to turn
        </p>
      )}
    </div>
  );
}
