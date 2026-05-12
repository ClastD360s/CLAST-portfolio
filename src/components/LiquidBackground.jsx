import React, { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useVideoTexture } from '@react-three/drei';
import * as THREE from 'three';

/**
 * TouchTexture: heatmap 2D del paso del mouse. Cada frame se atenúa,
 * cada movimiento agrega una "huella" que el shader usa para deformar
 * y rebotar el gradiente. Adaptado de madebybeings.com/liquid-gradient.
 */
class TouchTexture {
  constructor() {
    this.size = 64;
    this.maxAge = 64;
    this.radius = 0.25 * this.size;
    this.speed = 1 / this.maxAge;
    this.trail = [];
    this.last = null;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.ctx = this.canvas.getContext('2d');
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.size, this.size);

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;
    this.texture.magFilter = THREE.LinearFilter;
    this.texture.generateMipmaps = false;
  }

  update() {
    this.ctx.fillStyle = 'black';
    this.ctx.fillRect(0, 0, this.size, this.size);

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      const f = p.force * this.speed * (1 - p.age / this.maxAge);
      p.x += p.vx * f;
      p.y += p.vy * f;
      p.age++;
      if (p.age > this.maxAge) this.trail.splice(i, 1);
      else this.drawPoint(p);
    }
    this.texture.needsUpdate = true;
  }

  addTouch(point) {
    let force = 0, vx = 0, vy = 0;
    if (this.last) {
      const dx = point.x - this.last.x;
      const dy = point.y - this.last.y;
      if (dx === 0 && dy === 0) return;
      const dd = dx * dx + dy * dy;
      const d = Math.sqrt(dd);
      vx = dx / d; vy = dy / d;
      force = Math.min(dd * 20000, 2.0);
    }
    this.last = { x: point.x, y: point.y };
    this.trail.push({ x: point.x, y: point.y, age: 0, force, vx, vy });
  }

  drawPoint(p) {
    const pos = { x: p.x * this.size, y: (1 - p.y) * this.size };
    let intensity = 1;
    if (p.age < this.maxAge * 0.3) {
      intensity = Math.sin((p.age / (this.maxAge * 0.3)) * (Math.PI / 2));
    } else {
      const t = 1 - (p.age - this.maxAge * 0.3) / (this.maxAge * 0.7);
      intensity = -t * (t - 2);
    }
    intensity *= p.force;
    const r = this.radius;
    const col = `${((p.vx + 1) / 2) * 255}, ${((p.vy + 1) / 2) * 255}, ${intensity * 255}`;
    const off = this.size * 5;
    this.ctx.shadowOffsetX = off;
    this.ctx.shadowOffsetY = off;
    this.ctx.shadowBlur = r;
    this.ctx.shadowColor = `rgba(${col},${0.2 * intensity})`;
    this.ctx.beginPath();
    this.ctx.fillStyle = 'rgba(255,0,0,1)';
    this.ctx.arc(pos.x - off, pos.y - off, r, 0, Math.PI * 2);
    this.ctx.fill();
  }
}

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    // Fullscreen quad: bypass camera, render in NDC directly
    vUv = uv;
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform vec2 uResolution;
  uniform vec3 uColor1, uColor2, uColor3, uColor4, uColor5, uColor6;
  uniform float uSpeed, uIntensity, uGrainIntensity, uGradientSize;
  uniform vec3 uBaseColor;
  uniform sampler2D uTouchTexture;
  uniform sampler2D uVideoTexture;
  uniform float uVideoMix;
  uniform vec2 uVideoAspect; // (videoW/videoH, screenW/screenH)

  float grain(vec2 uv, float t) {
    vec2 g = uv * uResolution * 0.5;
    return fract(sin(dot(g + t, vec2(12.9898, 78.233))) * 43758.5453) * 2.0 - 1.0;
  }

  vec3 getGradient(vec2 uv, float t) {
    float r = uGradientSize;
    vec2 c1 = vec2(0.5 + sin(t * uSpeed * 0.4) * 0.4,  0.5 + cos(t * uSpeed * 0.5)  * 0.4);
    vec2 c2 = vec2(0.5 + cos(t * uSpeed * 0.6) * 0.5,  0.5 + sin(t * uSpeed * 0.45) * 0.5);
    vec2 c3 = vec2(0.5 + sin(t * uSpeed * 0.35) * 0.45, 0.5 + cos(t * uSpeed * 0.55) * 0.45);
    vec2 c4 = vec2(0.5 + cos(t * uSpeed * 0.5)  * 0.4,  0.5 + sin(t * uSpeed * 0.4)  * 0.4);
    vec2 c5 = vec2(0.5 + sin(t * uSpeed * 0.7)  * 0.35, 0.5 + cos(t * uSpeed * 0.6)  * 0.35);
    vec2 c6 = vec2(0.5 + cos(t * uSpeed * 0.45) * 0.5,  0.5 + sin(t * uSpeed * 0.65) * 0.5);

    float i1 = 1.0 - smoothstep(0.0, r, length(uv - c1));
    float i2 = 1.0 - smoothstep(0.0, r, length(uv - c2));
    float i3 = 1.0 - smoothstep(0.0, r, length(uv - c3));
    float i4 = 1.0 - smoothstep(0.0, r, length(uv - c4));
    float i5 = 1.0 - smoothstep(0.0, r, length(uv - c5));
    float i6 = 1.0 - smoothstep(0.0, r, length(uv - c6));

    // Capa radial rotada para profundidad
    vec2 rot = uv - 0.5;
    float a = t * uSpeed * 0.15;
    rot = vec2(rot.x * cos(a) - rot.y * sin(a), rot.x * sin(a) + rot.y * cos(a));
    rot += 0.5;
    float radialInf = 1.0 - smoothstep(0.0, 0.8, length(rot - 0.5));

    vec3 color = vec3(0.0);
    color += uColor1 * i1 * (0.55 + 0.45 * sin(t * uSpeed));
    color += uColor2 * i2 * (0.55 + 0.45 * cos(t * uSpeed * 1.2));
    color += uColor3 * i3 * (0.55 + 0.45 * sin(t * uSpeed * 0.8));
    color += uColor4 * i4 * (0.55 + 0.45 * cos(t * uSpeed * 1.3));
    color += uColor5 * i5 * (0.55 + 0.45 * sin(t * uSpeed * 1.1));
    color += uColor6 * i6 * (0.55 + 0.45 * cos(t * uSpeed * 0.9));
    color += mix(uColor1, uColor4, radialInf) * 0.35;

    color = clamp(color, vec3(0.0), vec3(1.0)) * uIntensity;
    // Saturación suave
    float lum = dot(color, vec3(0.299, 0.587, 0.114));
    color = mix(vec3(lum), color, 1.15);

    // Mezcla con color base oscuro en zonas de baja intensidad
    float b = length(color);
    color = mix(uBaseColor, color, max(b * 1.2, 0.12));
    return color;
  }

  void main() {
    vec2 uv = vUv;

    // Distorsión por mouse (heatmap)
    vec4 tt = texture2D(uTouchTexture, uv);
    float vx = -(tt.r * 2.0 - 1.0);
    float vy = -(tt.g * 2.0 - 1.0);
    float intensity = tt.b;
    uv.x += vx * 0.6 * intensity;
    uv.y += vy * 0.6 * intensity;

    // Ondas que se propagan desde el centro al mover
    vec2 center = vec2(0.5);
    float dist = length(uv - center);
    uv += vec2(sin(dist * 18.0 - uTime * 2.5) * 0.03 * intensity);

    vec3 color = getGradient(uv, uTime);

    // ---- VIDEO AMBIENTAL (monocromático, mezclado dentro del shader) ----
    // Cover-fit: ajusta UV del video para que cubra la pantalla sin estirarse
    vec2 vidUv = vUv;
    float scrAR = uVideoAspect.y;
    float vidAR = uVideoAspect.x;
    if (vidAR > scrAR) {
      // video más ancho que pantalla → recortar horizontal
      float s = scrAR / vidAR;
      vidUv.x = (vidUv.x - 0.5) * s + 0.5;
    } else {
      float s = vidAR / scrAR;
      vidUv.y = (vidUv.y - 0.5) * s + 0.5;
    }
    vec3 vidRGB = texture2D(uVideoTexture, vidUv).rgb;
    float vidGray = dot(vidRGB, vec3(0.299, 0.587, 0.114));
    // Lo aplicamos como un overlay luminoso suave (brighten en zonas claras)
    color = mix(color, color + vec3(vidGray - 0.5) * 0.55, uVideoMix);

    // Film grain sutil
    color += grain(uv, uTime) * uGrainIntensity;

    color = clamp(color, vec3(0.0), vec3(1.0));
    gl_FragColor = vec4(color, 1.0);
  }
`;

/**
 * Fondo animado tipo "liquid gradient" en paleta oscura monocromática
 * (con leve calidez ámbar). Reacciona al paso del mouse.
 */
export default function LiquidBackground() {
  const { size } = useThree();
  const touchRef = useRef(null);
  if (!touchRef.current) touchRef.current = new TouchTexture();

  // Video ambiental como textura (loop, muted, autoplay)
  const videoTex = useVideoTexture('/assets/video/ambient.mp4', {
    muted: true,
    loop: true,
    start: true,
    playsInline: true,
    crossOrigin: 'Anonymous',
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uResolution: { value: new THREE.Vector2(size.width, size.height) },
      uColor1: { value: new THREE.Vector3(0.08, 0.08, 0.09) },
      uColor2: { value: new THREE.Vector3(0.16, 0.13, 0.10) },
      uColor3: { value: new THREE.Vector3(0.10, 0.10, 0.11) },
      uColor4: { value: new THREE.Vector3(0.22, 0.18, 0.13) },
      uColor5: { value: new THREE.Vector3(0.06, 0.06, 0.07) },
      uColor6: { value: new THREE.Vector3(0.18, 0.16, 0.13) },
      uSpeed: { value: 0.4 },
      uIntensity: { value: 1.35 },
      uGrainIntensity: { value: 0.045 },
      uGradientSize: { value: 0.75 },
      uBaseColor: { value: new THREE.Vector3(0.051, 0.051, 0.055) },
      uTouchTexture: { value: touchRef.current.texture },
      uVideoTexture: { value: videoTex },
      uVideoMix: { value: 0.55 },
      uVideoAspect: { value: new THREE.Vector2(16 / 9, size.width / size.height) },
    }),
    [] // eslint-disable-line react-hooks/exhaustive-deps
  );

  // Mantener el aspect ratio del video y de la pantalla actualizado
  useEffect(() => {
    uniforms.uResolution.value.set(size.width, size.height);
    uniforms.uVideoAspect.value.y = size.width / size.height;
    if (videoTex && videoTex.image && videoTex.image.videoWidth) {
      uniforms.uVideoAspect.value.x =
        videoTex.image.videoWidth / videoTex.image.videoHeight;
    }
  }, [size.width, size.height, uniforms, videoTex]);

  // Mouse listener global
  useEffect(() => {
    const onMove = (e) => {
      touchRef.current.addTouch({
        x: e.clientX / window.innerWidth,
        y: 1 - e.clientY / window.innerHeight,
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => window.removeEventListener('pointermove', onMove);
  }, []);

  useFrame((_, delta) => {
    touchRef.current.update();
    uniforms.uTime.value += delta;
  });

  return (
    <mesh renderOrder={-1} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  );
}
