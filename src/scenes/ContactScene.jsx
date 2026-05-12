import React, { useRef, useMemo, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Center, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

useGLTF.preload('/models/contact.glb');

/**
 * Robot cuadrúpedo:
 *  - Identifica las 4 piezas más bajas como patas y las anima con un ciclo de caminata.
 *  - El cuerpo rebota vertical suavemente con cada paso.
 *  - Click + arrastre rota el modelo entero (interactividad del usuario).
 */
function ContactLogo3D() {
  const { scene: obj } = useGLTF('/models/contact.glb');
  const rootRef = useRef();
  const legsRef = useRef([]);

  // Drag-to-rotate state
  const isDragging = useRef(false);
  const last = useRef({ x: 0, y: 0 });

  const prepared = useMemo(() => {
    const clone = obj.clone(true);
    clone.updateMatrixWorld(true);

    // Material PBR para todas las piezas
    const meshes = [];
    clone.traverse((child) => {
      if (child.isMesh) {
        child.material = new THREE.MeshStandardMaterial({
          color: '#ece7dd',
          metalness: 0.78,
          roughness: 0.22,
          envMapIntensity: 1.1,
        });
        child.castShadow = true;
        child.receiveShadow = true;
        meshes.push(child);
      }
    });

    // Bbox + centro de cada pieza en world space
    const info = meshes.map((mesh) => {
      const bbox = new THREE.Box3().setFromObject(mesh);
      return { mesh, bbox, center: bbox.getCenter(new THREE.Vector3()) };
    });

    // Las 4 piezas más bajas son las patas (sus pies tocan el suelo)
    info.sort((a, b) => a.bbox.min.y - b.bbox.min.y);
    const legsInfo = info.slice(0, 4);

    // Centro XZ del conjunto de patas para clasificar cuadrantes
    const cx = legsInfo.reduce((s, l) => s + l.center.x, 0) / 4;
    const cz = legsInfo.reduce((s, l) => s + l.center.z, 0) / 4;

    const legGroups = [];
    legsInfo.forEach(({ mesh, bbox, center }) => {
      // Pivote en la "cadera" = top-centro de la pata en world space
      const hipWorld = new THREE.Vector3(center.x, bbox.max.y, center.z);
      const group = new THREE.Group();
      group.position.copy(hipWorld);
      clone.add(group);
      group.attach(mesh); // preserva transform mundial

      const isLeft = center.x < cx;
      const isFront = center.z < cz;
      const diagonalA = (isFront && isLeft) || (!isFront && !isLeft);
      group.userData.phase = diagonalA ? 0 : Math.PI;

      legGroups.push(group);
    });

    legsRef.current = legGroups;
    return clone;
  }, [obj]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const STEP_SPEED = 5;
    const STEP_AMPL = 0.4;
    const BOB = 0.04;

    // Ciclo de patas (siempre activo, incluso mientras se arrastra)
    legsRef.current.forEach((leg) => {
      leg.rotation.x = Math.sin(t * STEP_SPEED + leg.userData.phase) * STEP_AMPL;
    });

    // Rebote vertical del cuerpo (no afecta la rotación que el usuario aplique)
    if (rootRef.current) {
      rootRef.current.position.y = Math.abs(Math.sin(t * STEP_SPEED)) * BOB;
    }
  });

  // ----- Drag handlers -----
  const onPointerDown = (e) => {
    e.stopPropagation();
    isDragging.current = true;
    last.current = { x: e.clientX, y: e.clientY };
    if (e.target.setPointerCapture) e.target.setPointerCapture(e.pointerId);
    document.body.style.cursor = 'grabbing';
  };
  const onPointerMove = (e) => {
    if (!isDragging.current || !rootRef.current) return;
    const dx = e.clientX - last.current.x;
    const dy = e.clientY - last.current.y;
    rootRef.current.rotation.y += dx * 0.01;
    rootRef.current.rotation.x += dy * 0.01;
    last.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
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
    <Center>
      <group
        ref={rootRef}
        scale={0.95}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerOver={onPointerOver}
        onPointerOut={onPointerOut}
      >
        <primitive object={prepared} />
      </group>
    </Center>
  );
}

function ContactPlaceholder() {
  return (
    <mesh>
      <icosahedronGeometry args={[0.9, 1]} />
      <meshStandardMaterial color="#3a3a3c" roughness={0.7} wireframe />
    </mesh>
  );
}

export default function ContactScene() {
  return (
    <group>
      <ambientLight intensity={0.35} />
      <pointLight position={[3, 3, 3]} intensity={30} color="#ffc145" />
      <pointLight position={[-3, -2, 1]} intensity={18} color="#7ec0ff" />
      <spotLight
        position={[0, 6, 4]}
        intensity={50}
        angle={Math.PI / 5}
        penumbra={1}
        decay={2}
        color="#ffffff"
      />

      <Suspense fallback={<ContactPlaceholder />}>
        <ContactLogo3D />
      </Suspense>
    </group>
  );
}
