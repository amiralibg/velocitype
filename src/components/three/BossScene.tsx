import { useEffect, useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Clone, useAnimations, useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Night forest clearing. The boss is a towering yeti (rigged CC0 model by
 * Quaternius) whose rage builds with the attack timer — when fx.charge hits 1
 * it punches, and the player loses a heart.
 */

export interface BossFx {
  hitAt: number; // last time the boss took damage
  attackAt: number; // last time the boss attacked
  dead: boolean;
  deadAt: number;
  /** 0..1 — attack wind-up (rage). */
  charge: number;
}

interface BossSceneProps {
  fx: RefObject<BossFx>;
  hpFraction: number;
  /** 0 = full hearts, 1 = last heart. */
  danger: number;
}

const YETI_URL = '/models/yeti.glb';
const PINE_URLS = ['/models/pine1.glb', '/models/pine2.glb'];

useGLTF.preload(YETI_URL);
PINE_URLS.forEach((u) => useGLTF.preload(u));

const ANIM = {
  idle: 'CharacterArmature|Idle',
  punch: 'CharacterArmature|Punch',
  hit: 'CharacterArmature|HitReact',
  death: 'CharacterArmature|Death',
};

/* ── The yeti ───────────────────────────────────────────────── */

function Yeti({ fx, hpFraction }: { fx: RefObject<BossFx>; hpFraction: number }) {
  const group = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(YETI_URL);
  const { actions, mixer } = useAnimations(animations, group);
  const materialsRef = useRef<THREE.MeshStandardMaterial[]>([]);
  const seenAttackRef = useRef(0);
  const seenHitRef = useRef(0);
  const deadStartedRef = useRef(false);

  // Own the materials so we can flash them red, and never frustum-cull a
  // skinned mesh mid-animation.
  useMemo(() => {
    materialsRef.current = [];
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.frustumCulled = false;
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        // proper yeti colours: icy fur, slate hide
        if (mat.name === 'Yeti_Main') mat.color.set('#e7eef2');
        if (mat.name === 'Yeti_Secondary') mat.color.set('#6e8296');
        mesh.material = mat;
        materialsRef.current.push(mat);
      }
    });
  }, [scene]);

  useEffect(() => {
    actions[ANIM.idle]?.reset().play();
    const onFinished = () => {
      if (!fx.current.dead) actions[ANIM.idle]?.reset().fadeIn(0.25).play();
    };
    mixer.addEventListener('finished', onFinished);
    return () => mixer.removeEventListener('finished', onFinished);
  }, [actions, mixer, fx]);

  const playOnce = (name: string, fade = 0.12) => {
    const action = actions[name];
    if (!action) return;
    actions[ANIM.idle]?.fadeOut(fade);
    action.reset();
    action.setLoop(THREE.LoopOnce, 1);
    action.fadeIn(fade).play();
  };

  useFrame(({ clock }) => {
    const g = group.current;
    if (!g) return;
    const f = fx.current;
    const now = performance.now();
    const t = clock.elapsedTime;

    // one-shot animation triggers
    if (f.dead && !deadStartedRef.current) {
      deadStartedRef.current = true;
      const death = actions[ANIM.death];
      if (death) {
        Object.values(ANIM).forEach((n) => n !== ANIM.death && actions[n]?.fadeOut(0.1));
        death.reset();
        death.setLoop(THREE.LoopOnce, 1);
        death.clampWhenFinished = true;
        death.play();
      }
    } else if (!f.dead) {
      if (f.attackAt !== seenAttackRef.current) {
        seenAttackRef.current = f.attackAt;
        playOnce(ANIM.punch, 0.08);
      } else if (f.hitAt !== seenHitRef.current) {
        seenHitRef.current = f.hitAt;
        // don't interrupt a punch with a flinch
        if (!actions[ANIM.punch]?.isRunning()) playOnce(ANIM.hit);
      }
    }

    // rage: the idle gets faster and the yeti looms taller as charge builds
    const idle = actions[ANIM.idle];
    if (idle) idle.timeScale = 1 + f.charge * 1.4;
    const rage = Math.max(f.charge, 1 - hpFraction) * 0.5;
    const scale = 2.5 + f.charge * 0.25 + (1 - hpFraction) * 0.18;
    g.scale.setScalar(scale);
    if (!f.dead) {
      g.position.set(Math.sin(t * 0.3) * 0.08, 0, -2.2);
      g.rotation.y = Math.sin(t * 0.4) * 0.06;
    }

    // red flash when hit, simmering glow as rage builds
    const sinceHit = now - f.hitAt;
    const flash = sinceHit < 300 ? (1 - sinceHit / 300) * 0.9 : 0;
    const glow = Math.max(flash, rage * 0.25);
    for (const m of materialsRef.current) {
      m.emissive.setRGB(glow, glow * 0.12, glow * 0.08);
    }
  });

  return (
    <>
      <group ref={group} position={[0, 0, -2.2]} scale={2.5}>
        <primitive object={scene} />
      </group>
      {/* grounding shadow blob */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, -2.2]}>
        <circleGeometry args={[2.3, 32]} />
        <meshBasicMaterial color="#000000" transparent opacity={0.4} depthWrite={false} />
      </mesh>
    </>
  );
}

/* ── Dust burst — punch impact and the death fall ───────────── */

function DustBurst({
  getTriggerTime,
  origin,
  delayMs = 180,
}: {
  getTriggerTime: () => number;
  origin: [number, number, number];
  delayMs?: number;
}) {
  const group = useRef<THREE.Group>(null);
  const parts = useMemo(
    () =>
      Array.from({ length: 26 }, () => ({
        dir: new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 0.7 + 0.15, (Math.random() - 0.5) * 2)
          .normalize()
          .multiplyScalar(2.5 + Math.random() * 3.5),
        spin: Math.random() * 6,
        size: 0.07 + Math.random() * 0.12,
      })),
    [],
  );

  useFrame(() => {
    const g = group.current;
    if (!g) return;
    const age = (performance.now() - getTriggerTime() - delayMs) / 1000;
    if (age < 0 || age > 0.9) {
      g.visible = false;
      return;
    }
    g.visible = true;
    const fade = 1 - age / 0.9;
    g.children.forEach((child, i) => {
      const s = parts[i];
      child.position.copy(s.dir).multiplyScalar(age);
      child.position.y = Math.max(0.05, child.position.y - age * age * 2.2);
      child.rotation.x = age * s.spin;
      child.scale.setScalar(fade);
    });
  });

  return (
    <group ref={group} position={origin} visible={false}>
      {parts.map((s, i) => (
        <mesh key={i}>
          <tetrahedronGeometry args={[s.size]} />
          <meshStandardMaterial color="#6d6a58" roughness={1} />
        </mesh>
      ))}
    </group>
  );
}

/* ── Forest of real pines ───────────────────────────────────── */

function Forest() {
  const pines = PINE_URLS.map((u) => useGLTF(u).scene); // eslint-disable-line react-hooks/rules-of-hooks

  // dim the daylight-bright pack colours down to night (once, shared materials)
  useMemo(() => {
    for (const pine of pines) {
      pine.traverse((o) => {
        const mesh = o as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial | undefined;
        if (mesh.isMesh && mat && !mat.userData.nightDimmed) {
          mat.userData.nightDimmed = true;
          mat.color.multiplyScalar(0.72);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const trees = useMemo(() => {
    const list: { x: number; z: number; s: number; rot: number; variant: number }[] = [];
    let guard = 0;
    while (list.length < 26 && guard++ < 400) {
      const a = Math.random() * Math.PI * 2;
      const r = 8 + Math.random() * 22;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r - 10;
      // keep the whole clearing (camera ↔ yeti) open
      if (z > -2) continue;
      if (Math.abs(x) < 7 && z > -9) continue;
      list.push({
        x,
        z,
        s: 0.8 + Math.random() * 0.9,
        rot: Math.random() * Math.PI * 2,
        variant: list.length % 2,
      });
    }
    return list;
  }, []);

  return (
    <group>
      {/* forest floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <circleGeometry args={[46, 40]} />
        <meshStandardMaterial color="#0e150e" roughness={1} />
      </mesh>
      {trees.map((tr, i) => (
        <Clone
          key={i}
          object={pines[tr.variant]}
          position={[tr.x, 0, tr.z]}
          scale={tr.s}
          rotation={[0, tr.rot, 0]}
        />
      ))}
    </group>
  );
}

function Fireflies() {
  const points = useRef<THREE.Points>(null);
  const positions = useMemo(() => {
    const pos = new Float32Array(70 * 3);
    for (let i = 0; i < 70; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 24;
      pos[i * 3 + 1] = 0.4 + Math.random() * 4.5;
      pos[i * 3 + 2] = -14 + Math.random() * 18;
    }
    return pos;
  }, []);

  useFrame(({ clock }) => {
    const p = points.current;
    if (!p) return;
    p.rotation.y = clock.elapsedTime * 0.025;
    p.position.y = Math.sin(clock.elapsedTime * 0.5) * 0.25;
    (p.material as THREE.PointsMaterial).opacity = 0.55 + Math.sin(clock.elapsedTime * 2.2) * 0.25;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.07} color="#d8ff66" transparent opacity={0.7} />
    </points>
  );
}

function Moon() {
  return (
    <group position={[-10, 14, -28]}>
      <mesh>
        <circleGeometry args={[2.6, 36]} />
        <meshBasicMaterial color="#dfe8ee" fog={false} />
      </mesh>
      <mesh position={[0, 0, -0.1]}>
        <circleGeometry args={[4.6, 36]} />
        <meshBasicMaterial color="#9fb6c4" transparent opacity={0.1} fog={false} />
      </mesh>
    </group>
  );
}

function DangerLight({ danger }: { danger: number }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (!light.current) return;
    light.current.intensity = danger * (7 + Math.sin(clock.elapsedTime * 5) * 3);
  });
  return <pointLight ref={light} position={[0, 1.2, 3]} color="#ff3322" intensity={0} distance={12} />;
}

function CameraRig() {
  const { camera } = useThree();
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    camera.position.set(0, 3, 9.6);
    camera.lookAt(0, 3.3, -1);
  });
  return null;
}

export default function BossScene({ fx, hpFraction, danger }: BossSceneProps) {
  return (
    <Canvas camera={{ position: [0, 3, 9.6], fov: 52 }} dpr={[1, 2]}>
      <fog attach="fog" args={['#050a06', 12, 42]} />
      <color attach="background" args={['#050a06']} />
      <CameraRig />
      <ambientLight intensity={0.5} color="#b5c8b8" />
      <directionalLight position={[-8, 14, 8]} intensity={1.6} color="#c3d8e8" />
      <directionalLight position={[6, 4, 9]} intensity={0.4} color="#d8ff66" />
      <DangerLight danger={danger} />
      <Moon />
      <Forest />
      <Fireflies />
      <Yeti fx={fx} hpFraction={hpFraction} />
      <DustBurst getTriggerTime={() => fx.current.attackAt} origin={[0.8, 0.05, 0.8]} delayMs={350} />
      <DustBurst getTriggerTime={() => fx.current.deadAt} origin={[0, 0.05, -1]} delayMs={700} />
    </Canvas>
  );
}
