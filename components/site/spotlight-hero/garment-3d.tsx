"use client";

import { Bounds, ContactShadows, Environment, Lightformer, OrbitControls, useGLTF } from "@react-three/drei";
import { Canvas } from "@react-three/fiber";
import { Suspense } from "react";

function Model({ src }: { src: string }) {
  const { scene } = useGLTF(src);
  return <primitive object={scene} />;
}

/**
 * A real 3D garment: drag to turn it any way, scroll or pinch to move closer. The light is built in code (no HDR
 * download), so the only file fetched is the .glb. It idles in a slow turn until it is touched.
 */
export default function Garment3D({ src, label }: { src: string; label: string }) {
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  return (
    <div role="img" aria-label={`${label}, a 3D model. Drag to turn it.`} className="absolute inset-0 cursor-grab touch-pan-y active:cursor-grabbing">
      <Canvas dpr={[1, 2]} camera={{ fov: 32, position: [0, 0.2, 5] }} gl={{ alpha: true, antialias: true }}>
        <Suspense fallback={null}>
          <Bounds fit clip observe margin={1.25}>
            <Model src={src} />
          </Bounds>
          <ContactShadows position={[0, -1.2, 0]} opacity={0.5} scale={8} blur={2.6} far={3} />
          <Environment resolution={256}>
            <Lightformer form="rect" intensity={3} position={[0, 4, 3]} scale={[8, 3, 1]} />
            <Lightformer form="rect" intensity={1.6} position={[-5, 1, 2]} scale={[3, 6, 1]} color="#9fb4ff" />
            <Lightformer form="rect" intensity={1.2} position={[5, 1, -2]} scale={[3, 6, 1]} />
          </Environment>
        </Suspense>
        <OrbitControls makeDefault enablePan={false} minDistance={2.5} maxDistance={9} autoRotate={!reduced} autoRotateSpeed={1.2} />
      </Canvas>
    </div>
  );
}
