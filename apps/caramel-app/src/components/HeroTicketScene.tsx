'use client'

// HeroTicketScene — the compact WebGL half of the split hero (right column,
// desktop/lg+ only). Same ticket visual language as CouponVaultScene (it
// shares the ./couponTicket3d geometry + palette) but deliberately LIGHT: a
// single main ticket with springy mouse-parallax tilt + Float, a handful of
// instanced droplets, low-count Sparkles, and a one-frame Lightformer
// environment. No ContactShadows and no scroll dolly — the hero doesn't
// scroll-drive. Loaded via next/dynamic ssr:false and only mounted after the
// browser is idle + a real WebGL context + a lg+ viewport (HeroSection gates
// all of that), so the `three` chunk never touches phones or first paint.
//
// Perf posture (brief "not heavy"): DPR clamped [1, 1.5]; frameloop gated by
// the `active` prop (parent IntersectionObserver → 'never' when the hero is
// scrolled out of view); the ticket geometry is built once (memoized) and is
// the SAME codepath as the vault scene; droplets are ONE instanced mesh
// (≤10); the environment + emblem ship no external asset / network fetch.

import { Environment, Float, Lightformer, Sparkles } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import {
    CARAMEL,
    CARAMEL_DEEP,
    CARAMEL_LIGHT,
    makeTicketGeometry,
    PercentEmblem,
    Perforation,
} from './couponTicket3d'

// One main coupon ticket. Front-face Z after center() is depth/2 + bevel —
// perforation + stub + emblem sit just proud of it.
const CARD = {
    w: 3.1,
    h: 2,
    cr: 0.22,
    nr: 0.2,
    ny: -0.5,
    depth: 0.4,
    bevel: 0.05,
}
const CARD_FRONT = CARD.depth / 2 + CARD.bevel

// A small drifting caramel field — one instanced mesh, ≤10 spheres.
const DROPLET_COUNT = 10

interface DropletDatum {
    origin: THREE.Vector3
    speed: number
    phase: number
    scale: number
    drift: number
}

// Randomized droplet layout is computed ONCE at module load (client-only — the
// scene is dynamically imported ssr:false, single instance), never during
// render, so Math.random() stays out of the render phase (react-hooks/purity)
// and the field is stable across re-renders.
const DROPLET_DATA: DropletDatum[] = Array.from(
    { length: DROPLET_COUNT },
    () => ({
        origin: new THREE.Vector3(
            (Math.random() - 0.5) * 7,
            (Math.random() - 0.5) * 5,
            (Math.random() - 0.5) * 4 - 1,
        ),
        speed: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        scale: 0.05 + Math.random() * 0.12,
        drift: 0.3 + Math.random() * 0.6,
    }),
)

export interface HeroTicketSceneProps {
    // Drives frameloop: while false the canvas is fully paused (never renders).
    active: boolean
    // Theme-tuned lighting/material tones — kept in parity with the page.
    isDark: boolean
    // Fires once the GL context is created so the parent can cross-fade the
    // poster out from under the canvas.
    onReady?: () => void
}

function HeroCard({ isDark }: { isDark: boolean }): React.JSX.Element {
    const groupRef = useRef<THREE.Group>(null)
    const geometry = useMemo(
        () =>
            makeTicketGeometry(
                CARD.w,
                CARD.h,
                CARD.cr,
                CARD.nr,
                CARD.ny,
                CARD.depth,
                CARD.bevel,
            ),
        [],
    )

    useFrame((state, delta) => {
        const group = groupRef.current
        if (!group) return
        const { x: px, y: py } = state.pointer
        // Springy mouse-parallax tilt, eased with frame-rate-independent damp.
        // No scroll term — the hero ticket only responds to the pointer.
        const targetRotY = px * 0.5
        const targetRotX = -py * 0.35
        group.rotation.y = THREE.MathUtils.damp(
            group.rotation.y,
            targetRotY,
            4,
            delta,
        )
        group.rotation.x = THREE.MathUtils.damp(
            group.rotation.x,
            targetRotX,
            4,
            delta,
        )
    })

    // Stub region: everything below the perforation axis, as a slightly proud +
    // more matte panel so the tear-off stub reads as its own strip.
    const stubHeight = CARD.ny + CARD.h / 2 - 0.04
    const stubCenterY = (CARD.ny - CARD.h / 2) / 2

    return (
        <Float speed={2} rotationIntensity={0.25} floatIntensity={0.45}>
            <group ref={groupRef}>
                <mesh geometry={geometry} castShadow receiveShadow>
                    <meshPhysicalMaterial
                        color={isDark ? CARAMEL_DEEP : CARAMEL}
                        metalness={0.2}
                        roughness={0.1}
                        clearcoat={1}
                        clearcoatRoughness={0.06}
                        transmission={0.28}
                        thickness={1.4}
                        ior={1.45}
                        sheen={0.6}
                        sheenColor={CARAMEL_LIGHT}
                        sheenRoughness={0.4}
                        iridescence={0.18}
                        iridescenceIOR={1.3}
                        emissive={CARAMEL}
                        emissiveIntensity={isDark ? 0.3 : 0.12}
                        attenuationColor={CARAMEL_LIGHT}
                        attenuationDistance={2.2}
                    />
                </mesh>
                <mesh position={[0, stubCenterY, CARD_FRONT + 0.005]}>
                    <boxGeometry
                        args={[CARD.w - CARD.cr * 2, stubHeight, 0.02]}
                    />
                    <meshPhysicalMaterial
                        color={isDark ? CARAMEL : CARAMEL_LIGHT}
                        metalness={0.15}
                        roughness={0.38}
                        clearcoat={0.6}
                        clearcoatRoughness={0.25}
                        emissive={CARAMEL}
                        emissiveIntensity={isDark ? 0.16 : 0.06}
                    />
                </mesh>
                <Perforation
                    width={CARD.w - CARD.nr * 2 - 0.1}
                    y={CARD.ny}
                    z={CARD_FRONT + 0.02}
                    count={13}
                    dash={0.075}
                    color={isDark ? CARAMEL_LIGHT : '#fff2e6'}
                />
                <PercentEmblem isDark={isDark} frontZ={CARD_FRONT} />
            </group>
        </Float>
    )
}

function Droplets({ isDark }: { isDark: boolean }): React.JSX.Element {
    const meshRef = useRef<THREE.InstancedMesh>(null)
    const dummy = useMemo(() => new THREE.Object3D(), [])
    const data = DROPLET_DATA
    const geometry = useMemo(() => new THREE.SphereGeometry(1, 14, 14), [])
    // Deeper caramel grade (dark color + short attenuation distance + modest
    // transmission) so the drops read as thick caramel, not clear bubbles.
    const material = useMemo(
        () =>
            new THREE.MeshPhysicalMaterial({
                color: new THREE.Color(CARAMEL),
                metalness: 0.1,
                roughness: 0.15,
                clearcoat: 1,
                clearcoatRoughness: 0.1,
                transmission: 0.35,
                thickness: 0.9,
                ior: 1.4,
                attenuationColor: new THREE.Color(CARAMEL_DEEP),
                attenuationDistance: 0.6,
                emissive: new THREE.Color(CARAMEL),
                emissiveIntensity: isDark ? 0.35 : 0.15,
            }),
        [isDark],
    )

    useFrame(state => {
        const mesh = meshRef.current
        if (!mesh) return
        const t = state.clock.elapsedTime
        for (let i = 0; i < DROPLET_COUNT; i++) {
            const d = data[i]
            const y = d.origin.y + Math.sin(t * d.speed + d.phase) * d.drift
            const x = d.origin.x + Math.cos(t * d.speed * 0.7 + d.phase) * 0.2
            dummy.position.set(x, y, d.origin.z)
            dummy.scale.setScalar(d.scale)
            dummy.updateMatrix()
            mesh.setMatrixAt(i, dummy.matrix)
        }
        mesh.instanceMatrix.needsUpdate = true
    })

    return (
        <instancedMesh
            ref={meshRef}
            args={[geometry, material, DROPLET_COUNT]}
        />
    )
}

function SceneContents({ isDark }: { isDark: boolean }): React.JSX.Element {
    // The vertical FOV keeps world height constant, so on the narrower hero
    // column the 3.1u-wide card can overflow the horizontal frustum — scale the
    // ticket group down to fit. Reactive to resize via R3F size state; no
    // per-frame camera work (the hero never scroll-drives the camera).
    const aspect = useThree(state => state.size.width / state.size.height)
    const fit = Math.min(1, aspect / 0.85)

    return (
        <>
            <ambientLight intensity={isDark ? 0.45 : 0.8} />
            <directionalLight
                position={[4, 6, 5]}
                intensity={isDark ? 1.6 : 2.1}
                color={CARAMEL_LIGHT}
            />
            <pointLight
                position={[-5, -2, 3]}
                intensity={isDark ? 2.2 : 1.4}
                color={CARAMEL}
                distance={18}
            />

            <group scale={fit}>
                <HeroCard isDark={isDark} />
            </group>
            <Droplets isDark={isDark} />

            <Sparkles
                count={16}
                scale={[7, 5, 4]}
                size={2.2}
                speed={0.3}
                opacity={isDark ? 0.7 : 0.45}
                color={CARAMEL_LIGHT}
            />

            {/* One-frame Lightformer env: a warm 3-point rig (key fill, cool-
                warm side, back rim) baked once (frames={1}) — no HDR fetch, no
                per-frame cost, sculpted highlights across the glass. */}
            <Environment resolution={256} frames={1} background={false}>
                <Lightformer
                    intensity={isDark ? 1.3 : 1.9}
                    color={CARAMEL_LIGHT}
                    position={[0, 4, 4]}
                    scale={[9, 4, 1]}
                />
                <Lightformer
                    intensity={isDark ? 1.6 : 1.1}
                    color={CARAMEL}
                    position={[-5, -1, 2]}
                    scale={[6, 6, 1]}
                />
                <Lightformer
                    form="ring"
                    intensity={isDark ? 2.4 : 1.7}
                    color={CARAMEL_LIGHT}
                    position={[4, 2, -4]}
                    scale={[5, 5, 1]}
                />
            </Environment>
        </>
    )
}

export default function HeroTicketScene({
    active,
    isDark,
    onReady,
}: HeroTicketSceneProps): React.JSX.Element {
    return (
        <Canvas
            className="h-full w-full"
            dpr={[1, 1.5]}
            frameloop={active ? 'always' : 'never'}
            camera={{ position: [0, 0.2, 6.5], fov: 38 }}
            gl={{
                alpha: true,
                antialias: true,
                powerPreference: 'high-performance',
            }}
            onCreated={() => onReady?.()}
        >
            <SceneContents isDark={isDark} />
        </Canvas>
    )
}
