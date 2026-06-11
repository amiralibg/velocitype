import { useMemo, useRef } from 'react';
import type { RefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Night drive on a Tokyo Shuto-style expressway — concrete barriers, sign
 * gantries, neon-lit towers that scroll past, and slower traffic to overtake.
 * The car's throttle is the player's recent typing speed.
 */

export interface DriveControl {
  /** Desired speed in m/s, derived from the player's recent WPM. */
  getTargetSpeed: () => number;
  started: boolean;
  finished: boolean;
  // Written by the frame loop, read by the HUD:
  speed: number; // m/s
  distance: number; // meters
  braking: boolean;
}

interface RoadSceneProps {
  ctrl: RefObject<DriveControl>;
  onStop: () => void;
}

const CYCLE = 480; // length of the recycled scenery band
const STOP_SPEED = 0.5; // m/s — below this the engine is considered stalled
const STOP_GRACE = 1.3; // seconds at stall speed before the run ends
const MIN_RUN_TIME = 4; // seconds after GO before a stall can end the run

const PLAYER_LANE = 3.1; // right lane

const CAR_URL = '/models/car.glb';
useGLTF.preload(CAR_URL);

const NEON = ['#ff4f9a', '#22d3ee', '#ffd24a', '#7cffb0', '#ff7a3b'];

/* ── Canvas-generated textures (no asset files) ─────────────── */

function makeSkyTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0d1330');
  grad.addColorStop(0.5, '#1c2a55');
  grad.addColorStop(0.8, '#3b4a80');
  grad.addColorStop(0.93, '#b06a36');
  grad.addColorStop(1, '#ffb061');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 512);
  return new THREE.CanvasTexture(c);
}

function makeWindowsTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0a0d18';
  g.fillRect(0, 0, 64, 128);
  for (let y = 4; y < 124; y += 7) {
    for (let x = 4; x < 60; x += 8) {
      if (Math.random() < 0.45) {
        g.fillStyle = Math.random() < 0.7 ? 'rgba(255, 205, 140, 0.95)' : 'rgba(200, 220, 255, 0.9)';
        g.fillRect(x, y, 4, 3);
      }
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

function makeGlowTexture(): THREE.CanvasTexture {
  const s = 128;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  grad.addColorStop(0, 'rgba(255, 200, 130, 0.55)');
  grad.addColorStop(1, 'rgba(255, 200, 130, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, s, s);
  return new THREE.CanvasTexture(c);
}

function makeSignTexture(main: string, sub: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 160;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0e6b45';
  g.fillRect(0, 0, 512, 160);
  g.strokeStyle = '#e9efe9';
  g.lineWidth = 6;
  g.strokeRect(9, 9, 494, 142);
  g.fillStyle = '#ffffff';
  g.font = 'bold 58px "Hiragino Sans", sans-serif';
  g.fillText(main, 28, 80);
  g.font = '34px "Hiragino Sans", sans-serif';
  g.fillText(sub, 30, 130);
  return new THREE.CanvasTexture(c);
}

/* ── Car model helpers ──────────────────────────────────────── */

/**
 * Clone the GLB and normalize it: length along Z, rear toward the camera,
 * scaled to `length` meters, centered, wheels touching y=0.
 */
function buildCar(source: THREE.Object3D, length: number) {
  const root = source.clone(true);
  const wrapper = new THREE.Group();
  wrapper.add(root);

  // longest horizontal axis = car length → rotate onto Z,
  // then 180° so the rear (not the grille) faces the camera
  const box0 = new THREE.Box3().setFromObject(root);
  const size0 = box0.getSize(new THREE.Vector3());
  root.rotation.y = (size0.x > size0.z ? Math.PI / 2 : 0) + Math.PI;

  let box = new THREE.Box3().setFromObject(wrapper);
  let size = box.getSize(new THREE.Vector3());
  const s = length / size.z;
  wrapper.scale.setScalar(s);

  box = new THREE.Box3().setFromObject(wrapper);
  const center = box.getCenter(new THREE.Vector3());
  const inner = new THREE.Group();
  inner.add(wrapper);
  wrapper.position.set(-center.x, -box.min.y, -center.z);

  return { object: inner, rear: length / 2 };
}

/* ── Static backdrop: sky, stars, moon, horizon glow ────────── */

function Backdrop() {
  const skyTex = useMemo(makeSkyTexture, []);
  const glowTex = useMemo(makeGlowTexture, []);
  const stars = useMemo(() => {
    const pos = new Float32Array(220 * 3);
    for (let i = 0; i < 220; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 480;
      pos[i * 3 + 1] = 35 + Math.random() * 130;
      pos[i * 3 + 2] = -255 + Math.random() * 50;
    }
    return pos;
  }, []);

  return (
    <group>
      <mesh position={[0, 50, -266]}>
        <planeGeometry args={[560, 220]} />
        <meshBasicMaterial map={skyTex} fog={false} depthWrite={false} />
      </mesh>
      <points>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[stars, 3]} />
        </bufferGeometry>
        <pointsMaterial size={1.4} color="#dde4ff" sizeAttenuation={false} fog={false} transparent opacity={0.7} />
      </points>
      <mesh position={[-65, 78, -250]}>
        <circleGeometry args={[7, 40]} />
        <meshBasicMaterial color="#eef1f7" fog={false} />
      </mesh>
      <mesh position={[-65, 78, -250.5]}>
        <circleGeometry args={[13, 40]} />
        <meshBasicMaterial color="#b6c2e2" transparent opacity={0.14} fog={false} />
      </mesh>
      <mesh position={[0, 12, -258]}>
        <planeGeometry args={[420, 80]} />
        <meshBasicMaterial
          map={glowTex}
          transparent
          opacity={0.55}
          fog={false}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>
    </group>
  );
}

/* ── Frame loop: physics + scrolling world + traffic ────────── */

const SIGNS: [string, string][] = [
  ['新宿 Shinjuku', '4 km  ↑'],
  ['渋谷 Shibuya', '7 km  ↑'],
  ['東京 Tokyo', '12 km  ↑'],
];

function DriveRunner({ ctrl, onStop }: RoadSceneProps) {
  const { camera } = useThree();
  const { scene: carScene } = useGLTF(CAR_URL);
  const playerCar = useMemo(() => buildCar(carScene, 4.4), [carScene]);

  const carRef = useRef<THREE.Group>(null);
  const moversRef = useRef<THREE.Object3D[]>([]);
  const streakMatsRef = useRef<THREE.MeshBasicMaterial[]>([]);
  const windowsTex = useMemo(makeWindowsTexture, []);
  const glowTex = useMemo(makeGlowTexture, []);
  const signTextures = useMemo(() => SIGNS.map(([m, s]) => makeSignTexture(m, s)), []);
  const runTimeRef = useRef(0);
  const stallTimeRef = useRef(0);
  const endedRef = useRef(false);

  const addMover = (o: THREE.Object3D | null) => {
    if (o && !moversRef.current.includes(o)) moversRef.current.push(o);
  };
  const addStreakMat = (m: THREE.MeshBasicMaterial | null) => {
    if (m && !streakMatsRef.current.includes(m)) streakMatsRef.current.push(m);
  };

  const dashes = useMemo(
    () => Array.from({ length: Math.floor(CYCLE / 14) }, (_, i) => -460 + i * 14),
    [],
  );
  const studs = useMemo(
    () => Array.from({ length: Math.floor(CYCLE / 12) }, (_, i) => -460 + i * 12),
    [],
  );
  const lamps = useMemo(
    () => Array.from({ length: Math.floor(CYCLE / 24) }, (_, i) => ({ z: -460 + i * 24, side: i % 2 === 0 ? -1 : 1 })),
    [],
  );
  const gantries = useMemo(
    () => Array.from({ length: 3 }, (_, i) => ({ z: -440 + i * 160, sign: i % SIGNS.length })),
    [],
  );
  const streaks = useMemo(
    () =>
      Array.from({ length: 14 }, () => ({
        x: PLAYER_LANE + (Math.random() < 0.5 ? -1 : 1) * (2.5 + Math.random() * 4),
        y: 0.4 + Math.random() * 2.6,
        z: -460 + Math.random() * CYCLE,
      })),
    [],
  );
  // the whole skyline lives in the scroll band now, so it glides past
  const buildings = useMemo(
    () =>
      Array.from({ length: 52 }, (_, i) => {
        const side = i % 2 === 0 ? -1 : 1;
        return {
          x: side * (22 + Math.random() * 105),
          z: -460 + (i / 52) * CYCLE + Math.random() * 8,
          w: 7 + Math.random() * 15,
          h: 12 + Math.random() * 44,
          d: 7 + Math.random() * 12,
          neon: Math.random() < 0.45 ? NEON[i % NEON.length] : null,
          side,
        };
      }),
    [],
  );
  useFrame(({ clock }, delta) => {
    const c = ctrl.current;
    if (!c) return;
    const dt = Math.min(delta, 0.05);
    const t = clock.elapsedTime;

    // ── throttle physics ──
    let target = 0;
    if (c.started && !c.finished) target = Math.max(0, c.getTargetSpeed());
    c.braking = c.started && target < c.speed - 3;
    const rate = target > c.speed ? 1.5 : 0.5;
    c.speed += (target - c.speed) * Math.min(1, dt * rate);
    if (c.speed < 0.01) c.speed = 0;
    c.distance += c.speed * dt;

    // ── stall detection ──
    if (c.started && !c.finished) {
      runTimeRef.current += dt;
      if (c.speed < STOP_SPEED && runTimeRef.current > MIN_RUN_TIME) {
        stallTimeRef.current += dt;
        if (stallTimeRef.current > STOP_GRACE && !endedRef.current) {
          endedRef.current = true;
          c.finished = true;
          onStop();
        }
      } else {
        stallTimeRef.current = 0;
      }
    }

    // ── scroll the world toward the camera ──
    const move = c.speed * dt;
    for (const o of moversRef.current) {
      o.position.z += move;
      if (o.position.z > 24) o.position.z -= CYCLE;
    }

    // ── speed streaks fade in only at high speed ──
    const sf = Math.min(1, c.speed / 28);
    const streakOpacity = Math.max(0, (sf - 0.55) * 0.7);
    for (const m of streakMatsRef.current) m.opacity = streakOpacity;

    // ── car + camera life ──
    const car = carRef.current;
    if (car) {
      car.position.x = PLAYER_LANE + Math.sin(t * 1.1) * 0.1 * sf;
      car.position.y = Math.sin(t * 13) * 0.015 * sf;
      car.rotation.z = -(car.position.x - PLAYER_LANE) * 0.18;
      car.rotation.x = c.braking ? 0.022 : -0.012 * sf;
    }
    camera.position.x = PLAYER_LANE + Math.sin(t * 8) * 0.035 * sf;
    camera.position.y = 3.4 + Math.sin(t * 11.7) * 0.02 * sf;
    const cam = camera as THREE.PerspectiveCamera;
    const targetFov = 55 + sf * 9;
    if (Math.abs(cam.fov - targetFov) > 0.1) {
      cam.fov += (targetFov - cam.fov) * Math.min(1, dt * 3);
      cam.updateProjectionMatrix();
    }
  });

  return (
    <group>
      {/* terrain */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.08, -120]}>
        <planeGeometry args={[560, 520]} />
        <meshStandardMaterial color="#0c0f18" roughness={1} />
      </mesh>
      {/* scrolling skyline */}
      {buildings.map((b, i) => (
        <group key={`bl${i}`} position={[b.x, 0, b.z]} ref={addMover}>
          <mesh position={[0, b.h / 2 - 0.5, 0]}>
            <boxGeometry args={[b.w, b.h, b.d]} />
            <meshBasicMaterial map={windowsTex} map-repeat={[Math.ceil(b.w / 7), Math.ceil(b.h / 9)]} />
          </mesh>
          {b.neon && (
            <mesh position={[-b.side * (b.w / 2 + 0.25), b.h * 0.45, 0]}>
              <boxGeometry args={[0.35, b.h * 0.55, 0.35]} />
              <meshStandardMaterial color="#10101a" emissive={b.neon} emissiveIntensity={2.6} toneMapped={false} />
            </mesh>
          )}
          {b.h > 40 && (
            <mesh position={[0, b.h - 0.2, 0]}>
              <sphereGeometry args={[0.45, 10, 10]} />
              <meshStandardMaterial color="#400b10" emissive="#ff3344" emissiveIntensity={3} toneMapped={false} />
            </mesh>
          )}
        </group>
      ))}
      {/* asphalt */}
      <mesh position={[0, -0.02, -180]}>
        <boxGeometry args={[13.6, 0.1, 560]} />
        <meshStandardMaterial color="#191c26" roughness={0.9} />
      </mesh>
      {/* painted edge lines */}
      {[-6.2, 6.2].map((x) => (
        <mesh key={`e${x}`} position={[x, 0.04, -180]}>
          <boxGeometry args={[0.16, 0.04, 560]} />
          <meshStandardMaterial color="#8a8d88" emissive="#dadcd2" emissiveIntensity={0.7} />
        </mesh>
      ))}
      {/* concrete barriers — Shuto signature */}
      {[-7.1, 7.1].map((x) => (
        <group key={`b${x}`}>
          <mesh position={[x, 0.42, -180]}>
            <boxGeometry args={[0.45, 0.84, 560]} />
            <meshStandardMaterial color="#555b68" roughness={0.8} />
          </mesh>
          <mesh position={[x, 0.87, -180]}>
            <boxGeometry args={[0.45, 0.06, 560]} />
            <meshStandardMaterial color="#777d88" emissive="#cdd2da" emissiveIntensity={0.4} />
          </mesh>
        </group>
      ))}
      {/* lane dashes (scrolling) */}
      {dashes.map((z, i) => (
        <mesh key={`d${i}`} position={[0, 0.04, z]} ref={addMover}>
          <boxGeometry args={[0.24, 0.04, 4.0]} />
          <meshStandardMaterial color="#9a9d94" emissive="#e6e8dd" emissiveIntensity={0.8} />
        </mesh>
      ))}
      {/* amber reflector studs */}
      {studs.map((z, i) =>
        [-5.9, 5.9].map((x) => (
          <mesh key={`s${i}${x}`} position={[x, 0.05, z]} ref={addMover}>
            <boxGeometry args={[0.09, 0.05, 0.14]} />
            <meshStandardMaterial color="#3a2502" emissive="#ffb338" emissiveIntensity={2} toneMapped={false} />
          </mesh>
        )),
      )}
      {/* streetlights (scrolling) */}
      {lamps.map((l, i) => (
        <group key={`l${i}`} position={[l.side * 8.2, 0, l.z]} ref={addMover}>
          <mesh position={[0, 3, 0]}>
            <cylinderGeometry args={[0.07, 0.1, 6, 8]} />
            <meshStandardMaterial color="#2a2d36" metalness={0.7} roughness={0.5} />
          </mesh>
          <mesh position={[-l.side * 1.1, 5.9, 0]}>
            <boxGeometry args={[2.4, 0.08, 0.08]} />
            <meshStandardMaterial color="#2a2d36" metalness={0.7} roughness={0.5} />
          </mesh>
          <mesh position={[-l.side * 2.2, 5.82, 0]}>
            <boxGeometry args={[0.5, 0.1, 0.22]} />
            <meshStandardMaterial color="#403208" emissive="#ffc868" emissiveIntensity={3.5} toneMapped={false} />
          </mesh>
          <mesh position={[-l.side * 2.2, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[8, 8]} />
            <meshBasicMaterial
              map={glowTex}
              transparent
              opacity={0.3}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </mesh>
        </group>
      ))}
      {/* overhead sign gantries (scrolling) */}
      {gantries.map((gt, i) => (
        <group key={`g${i}`} position={[0, 0, gt.z]} ref={addMover}>
          {[-7.8, 7.8].map((x) => (
            <mesh key={x} position={[x, 3.5, 0]}>
              <boxGeometry args={[0.32, 7, 0.32]} />
              <meshStandardMaterial color="#3a3f4a" metalness={0.6} roughness={0.5} />
            </mesh>
          ))}
          <mesh position={[0, 7, 0]}>
            <boxGeometry args={[16, 0.5, 0.4]} />
            <meshStandardMaterial color="#3a3f4a" metalness={0.6} roughness={0.5} />
          </mesh>
          <mesh position={[2.2, 5.7, 0.3]}>
            <planeGeometry args={[6.2, 1.95]} />
            <meshBasicMaterial map={signTextures[gt.sign]} toneMapped={false} />
          </mesh>
        </group>
      ))}
      {/* speed streaks */}
      {streaks.map((s, i) => (
        <mesh key={`st${i}`} position={[s.x, s.y, s.z]} ref={addMover}>
          <boxGeometry args={[0.025, 0.025, 7]} />
          <meshBasicMaterial
            ref={addStreakMat}
            color="#cfd4da"
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      ))}

      {/* ── the player's car ── */}
      <group ref={carRef} position={[PLAYER_LANE, 0, 2]}>
        <primitive object={playerCar.object} />
        {/* headlight pool on the road ahead */}
        <mesh position={[0, 0.02, -7]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[7, 9]} />
          <meshBasicMaterial map={glowTex} transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      </group>
    </group>
  );
}

function CameraRig() {
  const { camera } = useThree();
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    camera.position.set(PLAYER_LANE, 3.4, 10);
    camera.lookAt(PLAYER_LANE, 1.4, -12);
  });
  return null;
}

export default function RaceTrack({ ctrl, onStop }: RoadSceneProps) {
  return (
    <Canvas
      camera={{ position: [PLAYER_LANE, 3.4, 10], fov: 55 }}
      dpr={[1, 2]}
      onCreated={({ gl }) => {
        gl.toneMappingExposure = 1.4;
      }}
    >
      <fog attach="fog" args={['#141a2c', 55, 280]} />
      <CameraRig />
      <ambientLight intensity={0.55} color="#b8c4e0" />
      <directionalLight position={[-30, 40, -20]} intensity={1.1} color="#bcc8e8" />
      {/* cool fill from the camera side so the cars read */}
      <directionalLight position={[12, 18, 35]} intensity={0.7} color="#9db2d8" />
      <Backdrop />
      <DriveRunner ctrl={ctrl} onStop={onStop} />
    </Canvas>
  );
}
