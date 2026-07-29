'use client'

// HeroTicketScene — the compact WebGL half of the split hero (right column,
// desktop/lg+ only). Same ticket visual language as the shared ./couponTicket3d
// geometry + palette, deliberately LIGHT: one big main ticket with springy
// mouse-parallax tilt + Float, PLUS three LARGE 3D stat coupons (each a real
// ticket mesh at 0.62–0.71× the main coupon's size) SCATTERED around it at
// varied depths — an art-directed "random soft floating" composition, not a
// row. Each stat coupon drifts/bobs/sways on its own frequency + phase (never
// in sync), and reacts to the pointer: the coupon nearest the cursor gently
// lifts toward the camera, tilts toward the pointer and pops ~4% — all damped,
// no snapping. Numbers count up as IN-CANVAS 3D text so the type moves with
// the ticket like print. A handful of instanced droplets, low-count Sparkles,
// and a one-frame Lightformer environment complete the scene. No
// ContactShadows and no scroll dolly — the hero doesn't scroll-drive. Loaded
// via next/dynamic ssr:false and only mounted after the browser is idle + a
// real WebGL context + a lg+ viewport (HeroSection gates all of that), so the
// `three` chunk never touches phones or first paint. Below lg /
// reduced-motion / no-WebGL the stats fall back to DOM coupon cards in
// HeroSection (shared HERO_STATS data).
//
// Perf posture (brief "not heavy"): DPR clamped [1, 1.5]; frameloop gated by
// the `active` prop (parent IntersectionObserver → 'never' when the hero is
// scrolled out of view); every ticket geometry is built once (memoized) and the
// three stat coupons SHARE one geometry; droplets are ONE instanced mesh (≤10);
// the environment + emblem ship no network fetch; the stat type is SDF text
// (drei <Text>) on a SELF-HOSTED font, count-up runs only ~1.2s after mount.
// The per-coupon pointer reaction adds one Vector3 project per stat coupon per
// frame (3 total) — negligible.

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

// The main coupon's rest anchor — nudged left/up so the right-heavy stat
// scatter (see SCATTER below) balances asymmetrically instead of stacking.
const MAIN_POS: [number, number, number] = [-0.15, 0.9, 0.1]
// drei Float on the main card translates ~±0.05 world at floatIntensity 0.45.
const MAIN_FLOAT_SLACK = 0.06

// The three stat coupons — ONE shared geometry, deliberately BIG (w 2.2 =
// 0.71× the main coupon's 3.1) so they read as siblings of the hero ticket,
// not chips. Per-coupon size variety comes from SCATTER[i].scale, not from
// separate geometries. Front-face Z (post-center) is depth/2 + bevel.
const STAT = {
    w: 2.2,
    h: 1.42,
    cr: 0.18,
    nr: 0.16,
    ny: 0,
    depth: 0.3,
    bevel: 0.045,
}
const STAT_FRONT = STAT.depth / 2 + STAT.bevel

// Art-directed scatter: one spot per HERO_STATS entry (index-matched). Varied
// x/y/z, individual base rotations and per-coupon float parameters make the
// composition read as coupons drifting in space around the main ticket —
// "random-looking" but balanced:
//   [0] "3,000+ Supported Stores" — front-left-low, nearest the camera and the
//       largest (the headline stat).
//   [1] "100% Open Source" — top-right, IN FRONT of the main coupon so its
//       lower-left overlaps the main card's top-right corner like a fanned
//       coupon stack. In-front on purpose: iteration-2 screenshots proved a
//       behind-main placement intermittently occludes the label at float
//       extremes ("EN SOURCE"), and the overlap only covers blank main-card
//       face (emblem is central, perforation sits at ny −0.5). The in-front
//       guarantee is POINTER-PROOF by construction: the main card's parallax
//       is capped at rotY 0.25 / rotX 0.2 (see HeroCard), so its top-right
//       corner's worst forward swing is 0.1 + 1.55·sin(0.25) + 1.05·sin(0.2)
//       ≈ 0.69, while this coupon's overlapping corner never dips below
//       ≈ z 0.65 + 0.10 (field parallax moves it forward on the same pointer
//       side that swings the main corner forward). Iteration-3's z 0.35 +
//       main rotY 0.5 violated exactly this and re-ate the label on hover.
//   [2] "0% Data Selling" — mid-right and the DEEPEST ticket, so the four
//       tickets cascade top-right → bottom-left (1.9 / 0.9 / −0.95 / −1.35)
//       instead of pairing into a residual bottom row, with depth spread
//       front→back (0.65 / 0.4 / 0.1 / −0.5).
// Frequencies/phases are mutually irrational-ish so no two coupons ever sync.
interface ScatterSpot {
    position: [number, number, number]
    scale: number
    rotZ: number
    rotY: number
    bobAmp: number
    bobFreq: number
    driftAmp: number
    swayFreq: number
    phase: number
}
const SCATTER: ScatterSpot[] = [
    {
        position: [-1.4, -1.35, 0.4],
        scale: 1,
        rotZ: 0.07,
        rotY: 0.16,
        bobAmp: 0.15,
        bobFreq: 0.55,
        driftAmp: 0.07,
        swayFreq: 0.5,
        phase: 0,
    },
    {
        position: [1.6, 1.9, 0.65],
        scale: 0.88,
        rotZ: -0.08,
        rotY: -0.12,
        bobAmp: 0.13,
        bobFreq: 0.72,
        driftAmp: 0.06,
        swayFreq: 0.62,
        phase: 2.1,
    },
    {
        position: [1.8, -0.95, -0.5],
        scale: 0.92,
        rotZ: 0.1,
        rotY: -0.16,
        bobAmp: 0.17,
        bobFreq: 0.45,
        driftAmp: 0.08,
        swayFreq: 0.55,
        phase: 4.2,
    },
]

// Pointer-reaction envelope (per stat coupon): proximity is a gaussian of the
// NDC distance between the pointer and the coupon's projected rest anchor
// (sigma² = PROX_SIGMA_SQ, ~0.45 NDC sigma — reaction peaks while hovering the
// coupon, fades smoothly by ~1 NDC). The nearest coupon lifts toward the
// camera (≤ LIFT_MAX), tilts toward the cursor (the d·e^(−d²/σ²) product
// self-caps at ~0.15 rad) and pops ≤ (POP_MAX−1). All damped — no snapping.
const PROX_SIGMA_SQ = 0.4
const LIFT_MAX = 0.3
const POP_MAX = 1.045

// --- Scene bounds (drive the fit-to-layout-box scale) ----------------------
// Computed FROM the scatter config so moving/resizing a coupon can never
// silently break the clip math. For every ticket the half-extent includes:
// worst-case in-plane tilt (base rotZ + sway + parallax ≤ TILT_ALLOWANCE, via
// the rotated-rect formula), bevel, pointer pop, ambient drift/bob amplitude —
// then the whole extent is scaled by the perspective factor at the ticket's
// CLOSEST approach to the camera (rest z + LIFT_MAX), because the camera
// projects near geometry wider than the z=0 plane the fit math reasons in.
// Pointer-parallax swing of the whole scatter group and the main card's Float
// spill past these rest bounds by a few % — that lands in the canvas bleed
// below, never at the raster edge.
const CAM_DIST = 7
const TILT_ALLOWANCE = 0.25

function tiltedHalfExtents(
    halfW: number,
    halfH: number,
    bevel: number,
    scale: number,
): { x: number; y: number } {
    const c = Math.cos(TILT_ALLOWANCE)
    const s = Math.sin(TILT_ALLOWANCE)
    return {
        x: (halfW * c + halfH * s + bevel) * scale,
        y: (halfH * c + halfW * s + bevel) * scale,
    }
}

function perspectiveFactor(closestZ: number): number {
    return CAM_DIST / (CAM_DIST - closestZ)
}

const SCENE_BOUNDS = ((): { halfW: number; halfH: number } => {
    const mainExt = tiltedHalfExtents(CARD.w / 2, CARD.h / 2, CARD.bevel, 1)
    const mainPersp = perspectiveFactor(MAIN_POS[2] + MAIN_FLOAT_SLACK)
    let halfW = (Math.abs(MAIN_POS[0]) + mainExt.x) * mainPersp
    let halfH =
        (Math.abs(MAIN_POS[1]) + MAIN_FLOAT_SLACK + mainExt.y) * mainPersp
    for (const spot of SCATTER) {
        const ext = tiltedHalfExtents(
            STAT.w / 2,
            STAT.h / 2,
            STAT.bevel,
            spot.scale * POP_MAX,
        )
        const persp = perspectiveFactor(spot.position[2] + LIFT_MAX)
        halfW = Math.max(
            halfW,
            (Math.abs(spot.position[0]) + spot.driftAmp + ext.x) * persp,
        )
        halfH = Math.max(
            halfH,
            (Math.abs(spot.position[1]) + spot.bobAmp + ext.y) * persp,
        )
    }
    return { halfW, halfH }
})()

// The DOM shell (HeroSection) bleeds the canvas raster past the reserved
// layout box by these px per side (the -inset-x-[48px] -inset-y-[40px]
// wrapper — keep the two in sync) so tilted coupons and drifting droplets
// never get guillotined at the raster edge. The fit math subtracts the bleed,
// so the composition still sizes itself to the LAYOUT box: the bleed is pure
// clip headroom, not extra content room.
const CANVAS_BLEED_X_PX = 48
const CANVAS_BLEED_Y_PX = 40

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
// and the field is stable across re-renders. The y-spread is capped at 5 (not
// the previous 6) because the field now lives inside the fit-scaled group:
// worst case |y| = 2.5 origin + 0.9 drift + 0.17 radius = 3.57, times the
// largest realistic fit (~0.66) = 2.36 world — safely inside the frustum
// half-height (2.687), so a floating sphere never gets sliced at the top or
// bottom raster edge.
const DROPLET_DATA: DropletDatum[] = Array.from(
    { length: DROPLET_COUNT },
    () => ({
        // z ∈ [−3.2, −1.2]: strictly BEHIND every coupon (deepest stat rests
        // at −0.5; its type sits nearer still), so a drifting droplet can
        // never occlude a stat glyph — iteration-1 screenshots caught one
        // parked on the "100%" in dark mode.
        origin: new THREE.Vector3(
            (Math.random() - 0.5) * 7,
            (Math.random() - 0.5) * 5,
            -1.2 - Math.random() * 2,
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
        // Capped at 0.25/0.2 (was 0.5/0.35): calmer for the biggest object,
        // and load-bearing for the coupon-stack z-order — SCATTER[1] sits in
        // front of this card and its comment derives the corner-swing budget
        // from THESE two constants. Don't raise them without redoing that.
        const targetRotY = px * 0.25
        const targetRotX = -py * 0.2
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
// coupon face — it inherits every float/tilt transform, so the type moves
// with the ticket like print, instead of hovering as a flat DOM billboard.
// The number counts up from 0 on mount.
//
// Motion = two nested groups:
//   anchor (outer) — ambient drift/bob position (set directly each frame from
//     smooth periodic functions) + damped pointer lift (z) + damped scale pop.
//   tilt (inner)   — damped rotations: base pose + slow sway + tilt-toward-
//     cursor. Split so position writes never fight rotation damping.
function StatCoupon3D({
    geometry,
    spot,
    stat,
    isDark,
}: {
    geometry: THREE.ExtrudeGeometry
    spot: ScatterSpot
    stat: (typeof HERO_STATS)[number]
    isDark: boolean
}): React.JSX.Element {
    // The scene only ever mounts when motion is allowed (HeroSection gates it),
    // so count-up always animates here — start=true, reduce=false.
    const n = useCountUp(stat.value, true, false)
    const shown = formatStat(n, stat)
    const anchorRef = useRef<THREE.Group>(null)
    const tiltRef = useRef<THREE.Group>(null)
    const scratch = useMemo(() => new THREE.Vector3(), [])

    useFrame((state, delta) => {
        const anchor = anchorRef.current
        const tilt = tiltRef.current
        if (!anchor || !tilt || !anchor.parent) return
        const t = state.clock.elapsedTime

        // Ambient float: independent frequencies + phase offsets per coupon.
        anchor.position.x =
            spot.position[0] +
            Math.cos(t * spot.bobFreq * 0.63 + spot.phase * 1.7) * spot.driftAmp
        anchor.position.y =
            spot.position[1] +
            Math.sin(t * spot.bobFreq + spot.phase) * spot.bobAmp

        // Pointer proximity, measured in NDC against the coupon's projected
        // REST anchor (parent world matrix = fit scale + scatter parallax).
        scratch
            .set(spot.position[0], spot.position[1], spot.position[2])
            .applyMatrix4(anchor.parent.matrixWorld)
            .project(state.camera)
        const dx = THREE.MathUtils.clamp(state.pointer.x - scratch.x, -0.8, 0.8)
        const dy = THREE.MathUtils.clamp(state.pointer.y - scratch.y, -0.8, 0.8)
        const influence = Math.exp(-(dx * dx + dy * dy) / PROX_SIGMA_SQ)

        // Lift toward the camera + gentle scale pop under the cursor.
        anchor.position.z = THREE.MathUtils.damp(
            anchor.position.z,
            spot.position[2] + LIFT_MAX * influence,
            3.5,
            delta,
        )
        const pop = THREE.MathUtils.damp(
            anchor.scale.x,
            spot.scale * (1 + (POP_MAX - 1) * influence),
            3.5,
            delta,
        )
        anchor.scale.setScalar(pop)

        // Base pose + slow sway + tilt toward the cursor (the d·gaussian
        // product self-caps at ~0.15 rad — tasteful, never a snap).
        tilt.rotation.y = THREE.MathUtils.damp(
            tilt.rotation.y,
            spot.rotY +
                Math.sin(t * spot.swayFreq + spot.phase) * 0.06 +
                dx * 0.55 * influence,
            3.5,
            delta,
        )
        tilt.rotation.x = THREE.MathUtils.damp(
            tilt.rotation.x,
            Math.sin(t * spot.swayFreq * 0.8 + spot.phase * 2.3) * 0.045 -
                dy * 0.4 * influence,
            3.5,
            delta,
        )
        tilt.rotation.z = THREE.MathUtils.damp(
            tilt.rotation.z,
            spot.rotZ +
                Math.sin(t * spot.swayFreq * 0.7 + spot.phase * 0.9) * 0.035,
            3.5,
            delta,
        )
    })

    return (
        <group ref={anchorRef} position={spot.position} scale={spot.scale}>
            <group ref={tiltRef} rotation={[0, spot.rotY, spot.rotZ]}>
                <mesh geometry={geometry} castShadow receiveShadow>
                    <TicketMaterial isDark={isDark} />
                </mesh>
                <Perforation
                    width={STAT.w - STAT.nr * 2 - 0.08}
                    y={STAT.ny}
                    z={STAT_FRONT + 0.015}
                    count={11}
                    dash={0.06}
                    color={isDark ? CARAMEL_LIGHT : '#fff2e6'}
                />
                {/* Sticker-print treatment (2026-07-29 legibility rework):
                    white fill + a SOLID full-opacity espresso outline — a
                    crisp dark rim keeps contrast against BOTH theme faces
                    (bright CARAMEL in light, CARAMEL_DEEP in dark) no matter
                    where the clearcoat highlight sweeps. sdfGlyphSize 128
                    (troika default 64) keeps the "%" crisp — its two small
                    counters and thin diagonal go lumpy at 64. Lifted a touch
                    off the face (0.03) so the specular sheen doesn't kiss the
                    glyph edges. Sizes are the shipped 1.7-wide treatment
                    scaled by the new 2.2-wide face (×1.29). */}
                <Text
                    font={STAT_FONT}
                    fontSize={0.49}
                    position={[0, 0.18, STAT_FRONT + 0.03]}
                    anchorX="center"
                    anchorY="middle"
                    color="#ffffff"
                    outlineWidth={0.031}
                    outlineColor="#4a1c05"
                    outlineOpacity={1}
                    sdfGlyphSize={128}
                >
                    {shown}
                </Text>
                {/* Label fit math (longest label = "SUPPORTED STORES", 16
                    glyphs): Poppins-Bold uppercase averages ~0.62em advance,
                    so width ≈ 16 × 0.155 × (0.62 + 0.06 letterSpacing) ≈ 1.69
                    — inside the usable face width of STAT.w 2.2 − 2 × notch r
                    0.16 = 1.88, with ~0.095 margin per side (tilt only rotates
                    the ticket, the type rides it like print). */}
                <Text
                    font={STAT_FONT}
                    fontSize={0.155}
                    letterSpacing={0.06}
                    position={[0, -0.285, STAT_FRONT + 0.03]}
                    anchorX="center"
                    anchorY="middle"
                    color="#ffffff"
                    outlineWidth={0.01}
                    outlineColor="#4a1c05"
                    outlineOpacity={1}
                    sdfGlyphSize={128}
                >
                    {stat.label.toUpperCase()}
                </Text>
            </group>
        </group>
    )
}

function StatCoupons({ isDark }: { isDark: boolean }): React.JSX.Element {
    const fieldRef = useRef<THREE.Group>(null)
    // ONE geometry shared by all three coupons (same shape; per-coupon size
    // comes from SCATTER[i].scale on the anchor group).
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

    // Mild whole-field pointer parallax (well under the main card's 0.5/0.35)
    // so the scatter answers the mouse as one drifting constellation; the
    // per-coupon proximity reaction in StatCoupon3D layers on top of this.
    useFrame((state, delta) => {
        const field = fieldRef.current
        if (!field) return
        const { x: px, y: py } = state.pointer
        field.rotation.y = THREE.MathUtils.damp(
            field.rotation.y,
            px * 0.14,
            4,
            delta,
        )
        field.rotation.x = THREE.MathUtils.damp(
            field.rotation.x,
            -py * 0.1,
            4,
            delta,
        )
    })

    return (
        <group ref={fieldRef}>
            {HERO_STATS.map((stat, i) => (
                <StatCoupon3D
                    key={stat.label}
                    geometry={geometry}
                    spot={SCATTER[i]}
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
    // The vertical FOV keeps world height constant, so on the narrow hero
    // column the main ticket + the scattered stat coupons can overflow the
    // frustum — scale the whole ticket group down to fit both dimensions
    // (bounds come from SCENE_BOUNDS, computed from the scatter config). The
    // canvas raster is BLED past the layout box (CANVAS_BLEED_*_PX), so the
    // fit is computed against the layout-box slice of the frustum, not the
    // whole canvas: the composition keeps the size it had when canvas ==
    // layout box, and the bleed becomes pure headroom that tilted geometry can
    // swing into without clipping. The 0.92 margin leaves ~8% of the layout
    // box as rest-pose slack before the bleed even starts (SCENE_BOUNDS
    // already bakes in tilt/lift/pop/drift extremes, so this is belt-and-
    // braces, not the only guard). Reactive to resize via R3F size state; no
    // per-frame camera work.
    const { width, height } = useThree(state => state.size)
    const halfH = Math.tan((42 * Math.PI) / 180 / 2) * CAM_DIST
    const worldPerPx = (halfH * 2) / height
    const layoutHalfW =
        (Math.max(1, width - CANVAS_BLEED_X_PX * 2) / 2) * worldPerPx
    const layoutHalfH =
        (Math.max(1, height - CANVAS_BLEED_Y_PX * 2) / 2) * worldPerPx
    const fit = Math.min(
        1,
        (layoutHalfW * 0.92) / SCENE_BOUNDS.halfW,
        (layoutHalfH * 0.92) / SCENE_BOUNDS.halfH,
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
                <group position={MAIN_POS}>
                    <HeroCard isDark={isDark} />
                </group>
                <StatCoupons isDark={isDark} />
                {/* Inside the fit group ON PURPOSE: the droplet field is wider
                    than the layout box in raw world units, so scaling it with
                    the content keeps every sphere inside the (bled) frustum
                    instead of slicing them mid-sphere at the raster edge. */}
                <Droplets isDark={isDark} />
            </group>

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
            camera={{ position: [0, 0, CAM_DIST], fov: 42 }}
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
