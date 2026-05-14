import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import {
  MeshTransmissionMaterial,
  RoundedBox,
  Torus,
  Sphere,
  Billboard,
  useTexture,
} from '@react-three/drei';
import * as THREE from 'three';

/**
 * Burbuja de Liquid Glass:
 *  - Refracción + dispersión cromática real vía MeshTransmissionMaterial.
 *  - 6 burbujas internas que orbitan dentro.
 *  - CLICK cambia la forma (sphere → roundedBox → torus) con bounce.
 *  - CLICK + DRAG rota la burbuja entera.
 *  - Inspirado en el demo VFX-JS Liquid Glass Pro Max Plus.
 */

const SHAPES = ['sphere', 'box', 'ring'];

/**
 * Foto del usuario dentro de la burbuja, en un disco circular que siempre
 * mira a la cámara (Billboard). Se ve refractada a través del cristal.
 */
function ProfilePhoto({ radius = 0.55 }) {
  const tex = useTexture('/assets/profile.jpg');
  // sRGB para que se vea con colores correctos a través del MTM
  useEffect(() => {
    if (tex) tex.colorSpace = THREE.SRGBColorSpace;
  }, [tex]);

  return (
    <Billboard follow lockX={false} lockY={false} lockZ={false}>
      {/* Aro/borde sutil */}
      <mesh>
        <ringGeometry args={[radius, radius + 0.018, 64]} />
        <meshBasicMaterial color="#ece7dd" transparent opacity={0.85} side={THREE.DoubleSide} />
      </mesh>
      {/* Foto recortada en círculo */}
      <mesh position={[0, 0, 0.001]}>
        <circleGeometry args={[radius, 96]} />
        <meshBasicMaterial map={tex} toneMapped={false} side={THREE.DoubleSide} />
      </mesh>
    </Billboard>
  );
}

function InnerBubble({ phase, radius, color, orbitR }) {
  const ref = useRef();
  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const speed = 0.85;
    const angle = t * speed + phase;
    const x = Math.cos(angle) * orbitR;
    const z = Math.sin(angle) * orbitR;
    const y = Math.sin(t * speed * 1.3 + phase) * orbitR * 0.55;
    if (ref.current) {
      ref.current.position.set(x, y, z);
    }
  });
  return (
    <mesh ref={ref}>
      <sphereGeometry args={[radius, 24, 24]} />
      <meshStandardMaterial
        color={color}
        metalness={0.25}
        roughness={0.08}
        emissive={color}
        emissiveIntensity={0.55}
      />
    </mesh>
  );
}

/**
 * Geometría de la cáscara que muta según `shape`. Para que MTM funcione
 * y se vea como vidrio sólido, renderizamos UNA geometría a la vez.
 */
function GlassShell({ shape }) {
  const transmissionProps = {
    backside: true,
    samples: 10,
    resolution: 512,
    transmission: 1,
    roughness: 0.04,
    thickness: 0.6,
    ior: 1.45,
    chromaticAberration: 0.28, // más dramático (estilo VFX-JS DISP)
    anisotropy: 0.4,
    distortion: 0.22,
    distortionScale: 0.4,
    temporalDistortion: 0.15,
    clearcoat: 1,
    attenuationDistance: 1.1,
    attenuationColor: '#f0eadf',
    color: '#ffffff',
  };

  if (shape === 'box') {
    return (
      <RoundedBox args={[1.4, 1.4, 1.4]} radius={0.22} smoothness={6}>
        <MeshTransmissionMaterial {...transmissionProps} />
      </RoundedBox>
    );
  }
  if (shape === 'ring') {
    return (
      <Torus args={[0.85, 0.35, 32, 64]}>
        <MeshTransmissionMaterial {...transmissionProps} />
      </Torus>
    );
  }
  // default: sphere
  return (
    <Sphere args={[1.0, 96, 96]}>
      <MeshTransmissionMaterial {...transmissionProps} />
    </Sphere>
  );
}

export default function AboutScene() {
  const groupRef = useRef();      // rotación (auto + drag)
  const breatheRef = useRef();    // respiración
  const morphRef = useRef();      // squash de click (bounce)
  const isDragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });
  const downAt = useRef({ x: 0, y: 0 });
  const clickStart = useRef(0);

  const [shapeIndex, setShapeIndex] = useState(0);
  const shape = SHAPES[shapeIndex];

  // Burbujas internas
  const bubbles = useMemo(
    () => [
      { phase: 0,             radius: 0.13, color: '#ffc145', orbitR: 0.55 },
      { phase: Math.PI * 0.5, radius: 0.09, color: '#7ec0ff', orbitR: 0.6 },
      { phase: Math.PI * 0.9, radius: 0.14, color: '#ece7dd', orbitR: 0.5 },
      { phase: Math.PI * 1.3, radius: 0.07, color: '#ffc145', orbitR: 0.65 },
      { phase: Math.PI * 1.7, radius: 0.1,  color: '#7ec0ff', orbitR: 0.45 },
      { phase: Math.PI * 0.3, radius: 0.06, color: '#ece7dd', orbitR: 0.7 },
    ],
    []
  );

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;

    // Auto-rotación cuando no se está arrastrando
    if (!isDragging.current && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.18;
      groupRef.current.rotation.x += delta * 0.09;
    }
    // Respiración suave (siempre) — multiplica sobre el scale base de 1.25
    if (breatheRef.current) {
      const s = 1.25 * (1 + Math.sin(t * 1.2) * 0.04);
      breatheRef.current.scale.set(s, s, s);
    }
    // Bounce del click (squash + stretch que decae) — fórmula tomada del shader
    // VFX-JS: bounce = exp(-tt) * sin(tt) * 5 + (1 - exp(-tt))
    if (morphRef.current) {
      const tt = (performance.now() / 1000 - clickStart.current) * 5;
      const bounce = clickStart.current > 0 && tt < 6
        ? Math.exp(-tt) * Math.sin(tt) * 0.45 + 1
        : 1;
      morphRef.current.scale.set(bounce, 1 / Math.sqrt(bounce), bounce);
      // Spin kick decreciente
      const spinKick = Math.exp(-tt * 0.6) * 1.4;
      morphRef.current.rotation.z = (clickStart.current > 0 && tt < 8) ? spinKick : 0;
    }
  });

  const DRAG_THRESHOLD = 5; // px — abajo de esto se considera click, no drag

  const onPointerDown = (e) => {
    e.stopPropagation();
    isDragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    downAt.current = { x: e.clientX, y: e.clientY };
    if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'grabbing';
  };
  const onPointerMove = (e) => {
    if (!isDragging.current || !groupRef.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    groupRef.current.rotation.y += dx * 0.01;
    groupRef.current.rotation.x += dy * 0.01;
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    const dx = e.clientX - downAt.current.x;
    const dy = e.clientY - downAt.current.y;
    const moved = Math.sqrt(dx * dx + dy * dy);

    // Si apenas se movió, lo tratamos como CLICK → cambia forma + bounce
    if (moved < DRAG_THRESHOLD) {
      setShapeIndex((i) => (i + 1) % SHAPES.length);
      clickStart.current = performance.now() / 1000;
    }
    isDragging.current = false;
    if (e.target.releasePointerCapture) e.target.releasePointerCapture(e.pointerId);
    document.body.style.cursor = 'auto';
  };
  const onPointerOver = () => {
    if (!isDragging.current) document.body.style.cursor = 'grab';
  };
  const onPointerOut = () => {
    if (!isDragging.current) document.body.style.cursor = 'auto';
  };

  return (
    <group position={[2.2, 0, 2.2]}>
      {/* Iluminación contrastante para que la dispersión cromática se vea */}
      <pointLight position={[3, 3, 3]} intensity={28} color="#ffc145" />
      <pointLight position={[-3, -2, 2]} intensity={16} color="#7ec0ff" />
      <pointLight position={[0, 4, -3]} intensity={20} color="#ffffff" />
      <pointLight position={[1, -3, 2]} intensity={10} color="#ff8aa6" />

      <group
        ref={breatheRef}
        scale={1.25}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <group ref={groupRef}>
          <group ref={morphRef}>
            {/* Foto dentro de la burbuja (siempre mira a la cámara).
                Envuelta en Suspense para aislarla: si el archivo falta o
                cambia de nombre, el resto de la escena no se cae. */}
            <Suspense fallback={null}>
              <ProfilePhoto radius={0.55} />
            </Suspense>

            {/* Burbujas internas que orbitan alrededor de la foto */}
            {bubbles.map((b, i) => (
              <InnerBubble key={i} {...b} />
            ))}

            {/* Cáscara de vidrio — muta según shape */}
            <GlassShell shape={shape} />
          </group>
        </group>
      </group>
    </group>
  );
}
