"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";

const subscribe = () => () => {};
/** The 3D scene only where it is worth it: motion allowed, a real screen, WebGL available, no data-saver. */
function canRender() {
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !window.matchMedia("(min-width: 768px)").matches || conn?.saveData) return false;
  try {
    return !!document.createElement("canvas").getContext("webgl2");
  } catch {
    return false;
  }
}

/*
 * One length of cloth, hung in front of the camera. The geometry is a dense plane displaced in the
 * vertex shader (slow drape, pleats near the top rail, a soft dent where the pointer presses); the
 * material is a procedural madras-style check woven thread by thread in the fragment shader, lit by a
 * light that follows the pointer. Scrolling pulls the cloth taut: the folds relax and the check flattens
 * toward the page, which is how the hero hands over to the flat colour of the sections below.
 * No textures, no models: the whole scene is two small shaders.
 */
const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uTaut;
  uniform vec2 uPointer;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPos;

  float disp(vec2 p) {
    float slack = 1.0 - uTaut * 0.88;
    float drape = sin(p.x * 2.4 + uTime * 0.35) * 0.11 + sin(p.y * 2.0 - uTime * 0.28 + p.x * 0.8) * 0.07;
    float pleats = sin(p.x * 9.0 + sin(p.y * 1.4 + uTime * 0.2) * 1.6) * 0.045 * smoothstep(-0.9, 0.9, p.y);
    float d = distance(p, uPointer);
    float press = -exp(-d * d * 3.2) * 0.2;
    return (drape + pleats) * slack + press * (0.4 + 0.6 * slack);
  }

  void main() {
    vUv = uv;
    vec3 pos = position;
    pos.z += disp(pos.xy);
    float e = 0.012;
    float dx = disp(pos.xy + vec2(e, 0.0)) - disp(pos.xy - vec2(e, 0.0));
    float dy = disp(pos.xy + vec2(0.0, e)) - disp(pos.xy - vec2(0.0, e));
    vNormalW = normalize(vec3(-dx / (2.0 * e), -dy / (2.0 * e), 1.0));
    vPos = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAG = /* glsl */ `
  precision highp float;
  uniform float uTaut;
  uniform vec2 uPointer;
  varying vec2 vUv;
  varying vec3 vNormalW;
  varying vec3 vPos;

  // Brand colours: ivory ground, indigo bands, a single fine sun thread.
  const vec3 IVORY = vec3(0.953, 0.933, 0.890);
  const vec3 INDIGO = vec3(0.149, 0.180, 0.525);
  const vec3 SUN = vec3(1.0, 0.784, 0.173);

  void main() {
    vec2 g = vUv * vec2(150.0, 94.0);
    vec2 cell = floor(g);
    vec2 f = fract(g);

    // Plain weave: warp over weft on alternate cells; each thread has a rounded profile.
    float over = mod(cell.x + cell.y, 2.0);
    float warpShape = 1.0 - smoothstep(0.18, 0.5, abs(f.x - 0.5));
    float weftShape = 1.0 - smoothstep(0.18, 0.5, abs(f.y - 0.5));
    float thread = mix(weftShape, warpShape, over);

    // Madras check across both directions.
    float bandX = step(mod(cell.x, 30.0), 7.0);
    float bandY = step(mod(cell.y, 30.0), 7.0);
    float fineX = step(mod(cell.x + 15.0, 30.0), 0.5);
    float fineY = step(mod(cell.y + 15.0, 30.0), 0.5);
    float indigo = clamp(bandX + bandY, 0.0, 1.0);
    float cross = bandX * bandY;
    vec3 col = IVORY;
    col = mix(col, INDIGO, indigo * 0.55);
    col = mix(col, INDIGO * 0.7, cross * 0.45);
    col = mix(col, SUN, clamp(fineX + fineY, 0.0, 1.0) * 0.5);

    // Thread relief lights and darkens the weave.
    vec3 n = normalize(vNormalW + vec3((f.x - 0.5) * 0.18 * (1.0 - over), (f.y - 0.5) * 0.18 * over, 0.0));
    vec3 lightPos = vec3(uPointer * 1.2, 1.6);
    vec3 L = normalize(lightPos - vPos);
    float diff = clamp(dot(n, L), 0.0, 1.0);
    float rim = pow(1.0 - clamp(n.z, 0.0, 1.0), 2.0);
    float shade = mix(0.62, 1.12, diff) * mix(0.82, 1.0, thread);

    vec3 lit = col * shade + vec3(0.06) * rim;
    // Taut cloth flattens: less relief, a little brighter.
    lit = mix(lit, col * 1.03, uTaut * 0.35);
    gl_FragColor = vec4(lit, 1.0);
  }
`;

export function ClothCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const enabled = useSyncExternalStore(subscribe, canRender, () => false);

  useEffect(() => {
    const canvas = ref.current;
    if (!enabled || !canvas) return;
    let disposed = false;
    let cleanup = () => {};

    // three is loaded on demand so it never weighs on the first paint or on phones.
    import("three").then((THREE) => {
      if (disposed) return;
      const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "low-power" });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 20);
      camera.position.set(0, 0, 3.4);

      const uniforms = { uTime: { value: 0 }, uTaut: { value: 0 }, uPointer: { value: new THREE.Vector2(0.3, 0.2) } };
      const material = new THREE.ShaderMaterial({ uniforms, vertexShader: VERT, fragmentShader: FRAG });
      const geometry = new THREE.PlaneGeometry(4.4, 2.7, 220, 140);
      scene.add(new THREE.Mesh(geometry, material));

      const target = new THREE.Vector2(0.3, 0.2);
      const resize = () => {
        const { clientWidth: w, clientHeight: h } = canvas;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      const ro = new ResizeObserver(resize);
      ro.observe(canvas);
      resize();

      const onMove = (e: PointerEvent) => {
        const r = canvas.getBoundingClientRect();
        target.set(((e.clientX - r.left) / r.width - 0.5) * 2.4, -((e.clientY - r.top) / r.height - 0.5) * 1.5);
      };
      window.addEventListener("pointermove", onMove, { passive: true });

      let visible = true;
      const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { threshold: 0 });
      io.observe(canvas);

      let raf = 0;
      let taut = 0;
      const t0 = performance.now();
      const frame = (now: number) => {
        raf = requestAnimationFrame(frame);
        if (!visible || document.hidden) return;
        uniforms.uTime.value = (now - t0) / 1000;
        const goal = Math.min(1, Math.max(0, window.scrollY / (window.innerHeight * 0.85)));
        taut += (goal - taut) * 0.08;
        uniforms.uTaut.value = taut;
        uniforms.uPointer.value.lerp(target, 0.06);
        renderer.render(scene, camera);
      };
      raf = requestAnimationFrame(frame);

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener("pointermove", onMove);
        ro.disconnect();
        io.disconnect();
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    });

    return () => {
      disposed = true;
      cleanup();
    };
  }, [enabled]);

  if (!enabled) return null;
  return <canvas ref={ref} aria-hidden className="absolute inset-0 size-full" />;
}
