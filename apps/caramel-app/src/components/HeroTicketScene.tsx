'use client'

// HeroTicketScene — the compact WebGL half of the split hero (right column,
// desktop/lg+ only). Same ticket visual language as the shared ./couponTicket3d
// geometry + palette, deliberately LIGHT: one big main ticket with springy
// mouse-parallax tilt + Float, PLUS a row of THREE same-size 3D stat coupons
// beneath it (each a real ticket mesh, floating like the main card, its number
// counting up as IN-CANVAS 3D text so the type moves with the ticket like
// print), a handful of instanced droplets, low-count Sparkles,
// and a one-frame Lightformer environment. No ContactShadows and no scroll
// dolly — the hero doesn't scroll-drive. Loaded via next/dynamic ssr:false and
// only mounted after the browser is idle + a real WebGL context + a lg+ viewport
// (HeroSection gates all of that), so the `three` chunk never touches phones or
// first paint. Below lg / reduced-motion / no-WebGL the stats fall back to DOM
// coupon cards in HeroSection (shared HERO_STATS data).
//
// Perf posture (brief "not heavy"): DPR clamped [1, 1.5]; frameloop gated by
// the `active` prop (parent IntersectionObserver → 'never' when the hero is
// scrolled out of view); every ticket geometry is built once (memoized) and the
// three stat coupons SHARE one geometry; droplets are ONE instanced mesh (≤10);
// the environment + emblem ship no network fetch; the stat type is SDF text
// (drei <Text>) on a SELF-HOSTED font, count-up runs only ~1.2s after mount.

import { formatStat, HERO_STATS, useCountUp } from '@/lib/heroStats'
import {
    Environment,
    Float,
    Lightformer,
    Sparkles,
    Text,
} from '@react-three/drei'
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
// the perforation dashes + emblem sit just proud of it.
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

// The three stat coupons — deliberately ALL THE SAME SIZE (a uniform row reads
// cleaner than mixed sizes). Shared geometry, laid out in a row below the main
// ticket. Front-face Z (post-center) is depth/2 + bevel; the <Html> label sits
// just proud of it.
const STAT = {
    w: 1.7,
    h: 1.15,
    cr: 0.15,
    nr: 0.14,
    ny: 0,
    depth: 0.24,
    bevel: 0.035,
}
const STAT_FRONT = STAT.depth / 2 + STAT.bevel
const STAT_Y = -1.55
const STAT_X = [-2.15, 0, 2.15]
const MAIN_Y = 1.4

// Content bounds of the main + stat group (world units, pre-fit) used to scale
// the group so nothing clips the narrow hero column. Kept as consts so the fit
// math stays readable.
const CONTENT_HALF_W = 3.0
const CONTENT_HALF_H = 2.4

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
            (Math.random() - 0.5) * 6,
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

// Shared caramel-glass material for every ticket (main + stats) so they read as
// one family. Slightly tuned per theme.
function TicketMaterial({ isDark }: { isDark: boolean }): React.JSX.Element {
    return (
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
    )
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

    return (
        <Float speed={2} rotationIntensity={0.25} floatIntensity={0.45}>
            <group ref={groupRef}>
                <mesh geometry={geometry} castShadow receiveShadow>
                    <TicketMaterial isDark={isDark} />
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

// Self-hosted bold font for the in-canvas stat text (troika needs ttf/otf/woff
// — NOT woff2, and its default font is a CDN fetch we deliberately avoid).
// Only requested when the scene mounts (desktop + idle), never on first paint.
const STAT_FONT = '/fonts/Poppins-Bold.ttf'

// One 3D stat coupon: a real caramel-glass ticket mesh (shared geometry) with
// the number/label as IN-CANVAS 3D text (drei <Text>, SDF) sitting on the
// coupon face — it inherits the Float + parallax transforms, so the type moves
// and tilts WITH the ticket like print, instead of hovering as a flat DOM
// billboard. The number counts up from 0 on mount.
function StatCoupon3D({
    geometry,
    position,
    stat,
    isDark,
}: {
    geometry: THREE.ExtrudeGeometry
    position: [number, number, number]
    stat: (typeof HERO_STATS)[number]
    isDark: boolean
}): React.JSX.Element {
    // The scene only ever mounts when motion is allowed (HeroSection gates it),
    // so count-up always animates here — start=true, reduce=false.
    const n = useCountUp(stat.value, true, false)
    const shown = formatStat(n, stat)
    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.45}>
            <group position={position}>
                <mesh geometry={geometry} castShadow receiveShadow>
                    <TicketMaterial isDark={isDark} />
                </mesh>
                <Perforation
                    width={STAT.w - STAT.nr * 2 - 0.06}
                    y={STAT.ny}
                    z={STAT_FRONT + 0.015}
                    count={9}
                    dash={0.05}
                    color={isDark ? CARAMEL_LIGHT : '#fff2e6'}
                />
                {/* Soft dark outline-blur = printed-ink shadow, so the type
                    reads as pressed into the caramel glass. */}
                <Text
                    font={STAT_FONT}
                    fontSize={0.3}
                    position={[0, 0.13, STAT_FRONT + 0.012]}
                    anchorX="center"
                    anchorY="middle"
                    color="#ffffff"
                    outlineWidth={0.012}
                    outlineBlur={0.02}
                    outlineColor="#7a2f00"
                    outlineOpacity={0.35}
                >
                    {shown}
                </Text>
                <Text
                    font={STAT_FONT}
                    fontSize={0.088}
                    letterSpacing={0.12}
                    position={[0, -0.22, STAT_FRONT + 0.012]}
                    anchorX="center"
                    anchorY="middle"
                    color="#ffffff"
                    fillOpacity={0.92}
                    outlineWidth={0.006}
                    outlineBlur={0.012}
                    outlineColor="#7a2f00"
                    outlineOpacity={0.3}
                >
                    {stat.label.toUpperCase()}
                </Text>
            </group>
        </Float>
    )
}

function StatCoupons({ isDark }: { isDark: boolean }): React.JSX.Element {
    const rowRef = useRef<THREE.Group>(null)
    // ONE geometry shared by all three coupons (they're the same size).
    const geometry = useMemo(
        () =>
            makeTicketGeometry(
                STAT.w,
                STAT.h,
                STAT.cr,
                STAT.nr,
                STAT.ny,
                STAT.depth,
                STAT.bevel,
            ),
        [],
    )

    // Mild pointer parallax for the whole row (about half the main card's) so
    // the stat coupons answer the mouse like the main model does — Float alone
    // reads static next to the parallaxing hero card.
    useFrame((state, delta) => {
        const row = rowRef.current
        if (!row) return
        const { x: px, y: py } = state.pointer
        row.rotation.y = THREE.MathUtils.damp(
            row.rotation.y,
            px * 0.22,
            4,
            delta,
        )
        row.rotation.x = THREE.MathUtils.damp(
            row.rotation.x,
            -py * 0.16,
            4,
            delta,
        )
    })

    return (
        <group ref={rowRef}>
            {HERO_STATS.map((stat, i) => (
                <StatCoupon3D
                    key={stat.label}
                    geometry={geometry}
                    position={[STAT_X[i], STAT_Y, 0]}
                    stat={stat}
                    isDark={isDark}
                />
            ))}
        </group>
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
    // The vertical FOV keeps world height constant, so on the narrow hero column
    // the main ticket + the stat-coupon row can overflow the frustum — scale the
    // whole ticket group down to fit both dimensions (with a small margin).
    // Reactive to resize via R3F size state; no per-frame camera work.
    const aspect = useThree(state => state.size.width / state.size.height)
    const dist = 7
    const halfH = Math.tan((42 * Math.PI) / 180 / 2) * dist
    const halfW = halfH * aspect
    const fit = Math.min(
        1,
        (halfW * 0.94) / CONTENT_HALF_W,
        (halfH * 0.94) / CONTENT_HALF_H,
    )

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
                <group position={[0, MAIN_Y, 0]}>
                    <HeroCard isDark={isDark} />
                </group>
                <StatCoupons isDark={isDark} />
            </group>
            <Droplets isDark={isDark} />

            <Sparkles
                count={16}
                scale={[7, 6, 4]}
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
            camera={{ position: [0, 0, 7], fov: 42 }}
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
