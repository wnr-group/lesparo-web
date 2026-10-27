"use client";

import { Bounds, ContactShadows, Environment, Lightformer, OrbitControls, useBounds, useGLTF, useProgress } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { RotateCcw } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { Box3, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";

type Api = { reset: () => void };

/** Some generators export Z-up. If the model is clearly longer in Z than in Y, stand it upright. */
function Model({ src }: { src: string }) {
  const { scene } = useGLTF(src);
  const zUp = (() => {
    const size = new Box3().setFromObject(scene).getSize(new Vector3());
    return size.z > size.y * 1.5;
  })();
  return <primitive object={scene} rotation={zUp ? [-Math.PI / 2, 0, 0] : [0, 0, 0]} />;
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
 * minus zoom. It idles in a slow turn that stops while it is being touched, and stays still for reduced motion.
 * The light is built in code (no HDR download), so the only file fetched is the .glb. Without WebGL the poster
 * photo is shown instead.
 */
export default function Garment3D({ src, label, poster }: { src: string; label: string; poster: string }) {
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
        <Canvas dpr={[1, 2]} camera={{ fov: 32, position: [0, 0.1, 5] }} gl={{ alpha: true, antialias: true }}>
          <Suspense fallback={null}>
            <Bounds fit clip observe margin={1.02}>
              <Model src={src} />
              <FitApi apiRef={fit} />
            </Bounds>
            <ContactShadows position={[0, -1.2, 0]} opacity={0.5} scale={8} blur={2.6} far={3} />
            <ambientLight intensity={0.9} />
            <directionalLight position={[2, 4, 4]} intensity={2.2} />
            <Environment resolution={256} environmentIntensity={1.6}>
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
