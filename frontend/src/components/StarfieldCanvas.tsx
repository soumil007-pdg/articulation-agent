import { useEffect, useRef } from "react";

/**
 * WebGL night sky: drifting star layers over slow ink/nebula flow.
 * Purely decorative, fixed behind the whole app, pauses off-screen and
 * disables itself entirely under prefers-reduced-motion.
 */

const VERT = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform vec2 u_pointer;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p;
    a *= 0.5;
  }
  return v;
}

// one layer of stars on a jittered grid
vec3 stars(vec2 uv, float scale, float drift, float bright) {
  vec2 p = uv * scale + vec2(drift * u_time * 0.02, drift * u_time * 0.008);
  vec2 i = floor(p), f = fract(p);
  vec3 acc = vec3(0.0);
  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 o = vec2(float(x), float(y));
      vec2 g = i + o;
      float h = hash(g);
      if (h < 0.86) continue;
      vec2 c = o + vec2(hash(g + 3.1), hash(g + 7.7));
      float d = length(f - c);
      float tw = 0.55 + 0.45 * sin(u_time * (0.6 + h * 2.2) + h * 30.0);
      float s = smoothstep(0.06, 0.0, d) * tw * bright;
      // warm ember + cool violet star tints
      vec3 tint = mix(vec3(1.0, 0.82, 0.58), vec3(0.78, 0.8, 1.0), hash(g + 1.7));
      acc += s * tint;
    }
  }
  return acc;
}

void main() {
  vec2 uv = gl_FragCoord.xy / u_res.xy;
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res.xy) / u_res.y;
  float t = u_time * 0.035;

  // slow ink flow — domain-warped fbm, like pigment settling in water
  vec2 q = vec2(fbm(p * 1.6 + vec2(0.0, t)), fbm(p * 1.6 + vec2(5.2, -t)));
  vec2 r = vec2(fbm(p * 2.1 + 3.0 * q + vec2(1.7, 9.2) + t * 0.7),
                fbm(p * 2.1 + 3.0 * q + vec2(8.3, 2.8) - t * 0.5));
  float ink = fbm(p * 1.8 + 3.4 * r);

  vec3 deep = vec3(0.055, 0.043, 0.113);
  vec3 violet = vec3(0.243, 0.145, 0.392);
  vec3 indigo = vec3(0.118, 0.153, 0.376);
  vec3 ember = vec3(0.541, 0.267, 0.114);

  vec3 col = deep;
  col = mix(col, indigo, smoothstep(0.25, 0.85, ink) * 0.85);
  col = mix(col, violet, smoothstep(0.45, 1.0, ink) * 0.6);

  // ember warmth low and to one side, breathing
  float glow = smoothstep(1.0, 0.0, length(p - vec2(0.35, -0.55)) * 1.25);
  col += ember * glow * (0.22 + 0.06 * sin(u_time * 0.3));

  // pointer halo — the sky notices you
  float ph = smoothstep(0.55, 0.0, length(p - u_pointer));
  col += vec3(0.32, 0.2, 0.1) * ph * 0.35;

  // star layers with parallax
  col += stars(uv, 26.0, 1.0, 0.9);
  col += stars(uv, 15.0, 0.5, 0.6) * 0.8;
  col += stars(uv, 8.0, 0.22, 0.45) * 0.7;

  // vignette + fine dither to kill banding
  col *= 1.0 - 0.45 * pow(length(p * vec2(0.7, 1.0)), 2.0);
  col += (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.012;

  gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const sh = gl.createShader(type)!;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.warn("starfield shader:", gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

export function StarfieldCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const gl =
      (canvas.getContext("webgl", { antialias: false, alpha: false, depth: false }) as
        | WebGLRenderingContext
        | null) ?? null;
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;
    const prog = gl.createProgram()!;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(prog, "u_res");
    const uTime = gl.getUniformLocation(prog, "u_time");
    const uPointer = gl.getUniformLocation(prog, "u_pointer");

    // half-res render keeps this cheap; CSS scales it back up
    const scale = Math.min(window.devicePixelRatio || 1, 1.25) * 0.6;
    const resize = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth * scale));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * scale));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };
    resize();
    window.addEventListener("resize", resize);

    const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
    const onMove = (e: PointerEvent) => {
      pointer.tx = (e.clientX - window.innerWidth / 2) / window.innerHeight;
      pointer.ty = -(e.clientY - window.innerHeight / 2) / window.innerHeight;
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let raf = 0;
    let running = true;
    const start = performance.now();
    const frame = () => {
      if (!running) return;
      const t = (performance.now() - start) / 1000;
      pointer.x += (pointer.tx - pointer.x) * 0.04;
      pointer.y += (pointer.ty - pointer.y) * 0.04;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, t);
      gl.uniform2f(uPointer, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(frame);
    };
    frame();

    const onVis = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(raf);
      } else if (!running) {
        running = true;
        frame();
      }
    };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full opacity-90"
    />
  );
}
