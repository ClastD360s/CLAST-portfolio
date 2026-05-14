import React, { useRef, useMemo, Suspense } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Float, Center, Sparkles, useGLTF, useScroll } from '@react-three/drei';
import * as THREE from 'three';

// Precarga: arranca la descarga apenas se monta el módulo
useGLTF.preload('/models/base.glb');

/**
 * Placeholder mientras carga el OBJ (icosaedro distorsionable simple).
 */
function LogoPlaceholder() {
  return (
    <mesh>
      <icosahedronGeometry args={[0.9, 1]} />
      <meshStandardMaterial color="#3a3a3c" roughness={0.7} metalness={0.2} wireframe />
    </mesh>
  );
}

/**
 * Carga el logo OBJ de CLAST y le aplica material blanco metálico.
 * El OBJ viene de Blender sin MTL, así que asignamos material desde acá.
 */
function ClastLogo3D({ groupRef }) {
  const { scene } = useGLTF('/models/base.glb');

  const prepared = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: '#ece7dd',
          metalness: 0.85,
          roughness: 0.18,
          envMapIntensity: 1.1,
        });
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }, [scene]);

  return (
    <Center>
      <group ref={groupRef} scale={1.6}>
        <primitive object={prepared} />
      </group>
    </Center>
  );
}

/**
 * Hero 3D — logo CLAST cargado desde base.obj, con un SpotLight
 * que orbita en automático Y reacciona al mouse (seguimiento del cursor).
 */
export default function HeroScene() {
  const scroll = useScroll();
  const logoRef = useRef();
  const spotRef = useRef();
  const targetRef = useRef();
  const mouse = useThree((s) => s.mouse);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    // Lee el scroll directamente sin causar re-render de React
    const scrollOffset = Math.max(0, Math.min(1, (scroll?.offset ?? 0) * 6));

    // Spot orbita lentamente + reacciona al mouse
    if (spotRef.current && targetRef.current) {
      const baseX = Math.cos(t * 0.4) * 2.5;
      const baseZ = Math.sin(t * 0.4) * 2.5;
      spotRef.current.position.x = baseX + mouse.x * 2;
      spotRef.current.position.z = baseZ + mouse.y * 2;
      spotRef.current.position.y = 5 + mouse.y * 0.8;
      targetRef.current.position.set(mouse.x * 0.4, 0, mouse.y * 0.4);
      targetRef.current.updateMatrixWorld();
    }

    // Rotación suave del logo + parallax con scroll
    if (logoRef.current) {
      logoRef.current.rotation.y = t * 0.25 - scrollOffset * 2;
      logoRef.current.rotation.x = Math.sin(t * 0.3) * 0.12 + mouse.y * 0.15;
      logoRef.current.position.y = -scrollOffset * 2.5;
    }
  });

  return (
    <group>
      {/* Ambiente sutil para que no quede a oscuras */}
      <hemisphereLight args={['#ffffff', '#202020', 0.3]} />

      {/* Spot principal — animado + mouse-tracking */}
      <spotLight
        ref={spotRef}
        color="#ffe7b8"
        intensity={140}
        angle={Math.PI / 6}
        penumbra={1}
        decay={2}
        distance={0}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        target={targetRef.current ?? undefined}
      />
      <object3D ref={targetRef} />

      {/* Spot de relleno frío para profundidad */}
      <spotLight
        position={[-4, 3, -3]}
        color="#7ec0ff"
        intensity={40}
        angle={Math.PI / 5}
        penumbra={1}
        decay={2}
      />

      {/* Logo CLAST en 3D — placeholder mientras descarga el OBJ */}
      <Float speed={1.4} rotationIntensity={0.25} floatIntensity={0.55}>
        <Suspense fallback={<LogoPlaceholder />}>
          <ClastLogo3D groupRef={logoRef} />
        </Suspense>
      </Float>

      {/* Sparkles ambientales */}
      <Sparkles count={80} scale={[8, 4, 8]} size={2} speed={0.3} color="#ffc145" />
    </group>
  );
}
