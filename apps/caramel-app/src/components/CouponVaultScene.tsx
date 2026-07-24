'use client'

// CouponVaultScene — the WebGL half of CouponVaultSection (loaded via
// next/dynamic ssr:false so the `three` chunk never blocks first paint).
// Everything here runs client-only inside an <canvas>; all human-readable
// copy + the CTA live in the DOM overlay (CouponVaultSection), never here.
//
// Perf posture (brief requirement 3): DPR clamped [1, 1.75]; frameloop is
// driven by the `active` prop (parent IntersectionObserver) so an offscreen
// section renders zero frames; droplets are ONE instanced mesh and each
// ticket's perforation is ONE instanced mesh whose matrices are written once
// (useLayoutEffect), never per frame; the caramel glass uses
// MeshPhysicalMaterial (clearcoat + sheen + light transmission) lit by a
// one-frame Lightformer environment rather than the heavier
// MeshTransmissionMaterial or a network-fetched HDR — glossy reflections
// with no extra per-frame render passes and no external asset. ContactShadows
// grounds the composition with frames={1} (baked once, zero per-frame cost).
//
// The ticket silhouette (rounded rect + two inward semicircular notches on the
// short edges, extruded with a bevel) is built ONCE as a THREE.Shape →
// ExtrudeGeometry, memoized per size and SHARED across all five orbiting chips.

import {
    ContactShadows,
    Environment,
    Float,
    Lightformer,
    Sparkles,
} from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

const CARAMEL = '#ea6925'
const CARAMEL_DEEP = '#b8480f'
const CARAMEL_LIGHT = '#ffb27a'

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value))

// --- Ticket geometry -------------------------------------------------------
// One THREE.Shape traced clockwise: rounded corners + a semicircular notch
// carved inward on each SHORT edge (left/right) at the perforation axis `ny`.
// The notch arcs run counter-clockwise so they bulge INTO the outline (a real
// cutout, not a hole), giving the classic ticket silhouette in one pass.
function makeTicketShape(
    w: number,
    h: number,
    cr: number,
    nr: number,
    ny: number,
): THREE.Shape {
    const hw = w / 2
    const hh = h / 2
    const s = new THREE.Shape()
    s.moveTo(-hw + cr, hh)
    s.lineTo(hw - cr, hh)
    s.absarc(hw - cr, hh - cr, cr, Math.PI / 2, 0, true)
    s.lineTo(hw, ny + nr)
    s.absarc(hw, ny, nr, Math.PI / 2, (Math.PI * 3) / 2, false)
    s.lineTo(hw, -hh + cr)
    s.absarc(hw - cr, -hh + cr, cr, 0, -Math.PI / 2, true)
    s.lineTo(-hw + cr, -hh)
    s.absarc(-hw + cr, -hh + cr, cr, -Math.PI / 2, -Math.PI, true)
    s.lineTo(-hw, ny - nr)
    s.absarc(-hw, ny, nr, -Math.PI / 2, Math.PI / 2, false)
    s.lineTo(-hw, hh - cr)
    s.absarc(-hw + cr, hh - cr, cr, Math.PI, Math.PI / 2, true)
    s.closePath()
    return s
}

function makeTicketGeometry(
    w: number,
    h: number,
    cr: number,
    nr: number,
    ny: number,
    depth: number,
    bevel: number,
): THREE.ExtrudeGeometry {
    const geometry = new THREE.ExtrudeGeometry(
        makeTicketShape(w, h, cr, nr, ny),
        {
            depth,
            bevelEnabled: true,
            bevelThickness: bevel,
            bevelSize: bevel,
            bevelSegments: 3,
            curveSegments: 32,
            steps: 1,
        },
    )
    // Extrude runs 0→depth on Z; recenter so the ticket floats symmetrically.
    geometry.center()
    return geometry
}

// Card (main coupon) and chip (orbiting) dimensions. Front-face Z after
// center() is depth/2 + bevel — perforation + stub sit just proud of it.
const CARD = {
    w: 3.1,
    h: 2,
    cr: 0.22,
    nr: 0.2,
    ny: -0.5,
    depth: 0.4,
    bevel: 0.05,
}
const CHIP = {
    w: 0.98,
    h: 0.62,
    cr: 0.1,
    nr: 0.09,
    ny: 0,
    depth: 0.1,
    bevel: 0.02,
}
const CARD_FRONT = CARD.depth / 2 + CARD.bevel
const CHIP_FRONT = CHIP.depth / 2 + CHIP.bevel

export interface CouponVaultSceneProps {
    // Drives frameloop: while false the canvas is fully paused (never renders).
    active: boolean
    // Theme-tuned lighting/material tones — kept in parity with the page.
    isDark: boolean
    // Fires once the GL context is created so the parent can cross-fade the
    // poster out from under the canvas.
    onReady?: () => void
}

interface DropletDatum {
    origin: THREE.Vector3
    speed: number
    phase: number
    scale: number
    drift: number
}

// Reads how far the section has travelled through the viewport (0 = just
// entering from below, 1 = fully scrolled past) straight off the canvas rect,
// so scroll drives the scene with no React re-render on the scroll event.
function useSectionProgress(): () => number {
    const gl = useThree(state => state.gl)
    return () => {
        const rect = gl.domElement.getBoundingClientRect()
        const viewportH = window.innerHeight || 1
        return clamp01((viewportH - rect.top) / (viewportH + rect.height))
    }
}

// A row of small dashes along the perforation axis, built as ONE instanced
// mesh whose matrices are written a single time (positions are static in the
// ticket's local space). Sits proud of the front face to read as embossed.
function Perforation({
    width,
    y,
    z,
    count,
    dash,
    color,
}: {
    width: number
    y: number
    z: number
    count: number
    dash: number
    color: string
}): React.JSX.Element {
    const meshRef = useRef<THREE.InstancedMesh>(null)
    const geometry = useMemo(
        () => new THREE.BoxGeometry(dash, dash * 0.42, dash * 0.6),
        [dash],
    )
    const material = useMemo(
        () =>
            new THREE.MeshStandardMaterial({
                color,
                roughness: 0.55,
                metalness: 0.1,
            }),
        [color],
    )
    const xs = useMemo(() => {
        const step = width / (count - 1)
        return Array.from({ length: count }, (_, i) => -width / 2 + i * step)
    }, [width, count])

    useLayoutEffect(() => {
        const mesh = meshRef.current
        if (!mesh) return
        const dummy = new THREE.Object3D()
        xs.forEach((x, i) => {
            dummy.position.set(x, y, z)
            dummy.updateMatrix()
            mesh.setMatrixAt(i, dummy.matrix)
        })
        mesh.instanceMatrix.needsUpdate = true
    }, [xs, y, z])

    return <instancedMesh ref={meshRef} args={[geometry, material, count]} />
}

function PercentEmblem({ isDark }: { isDark: boolean }): React.JSX.Element {
    // The "%" is built from primitives (two rings + a diagonal bar) instead of
    // 3D text so the scene ships no font file / network fetch. Raised off the
    // card face with an emissive caramel tone to read as embossed.
    const emissive = isDark ? 1.1 : 0.65
    return (
        <group position={[0, 0.28, CARD_FRONT + 0.03]}>
            <mesh position={[-0.42, 0.34, 0]}>
                <torusGeometry args={[0.22, 0.09, 16, 40]} />
                <meshPhysicalMaterial
                    color={CARAMEL_LIGHT}
                    emissive={CARAMEL}
                    emissiveIntensity={emissive}
                    metalness={0.35}
                    roughness={0.2}
                    clearcoat={1}
                    clearcoatRoughness={0.12}
                />
            </mesh>
            <mesh position={[0.42, -0.34, 0]}>
                <torusGeometry args={[0.22, 0.09, 16, 40]} />
                <meshPhysicalMaterial
                    color={CARAMEL_LIGHT}
                    emissive={CARAMEL}
                    emissiveIntensity={emissive}
                    metalness={0.35}
                    roughness={0.2}
                    clearcoat={1}
                    clearcoatRoughness={0.12}
                />
            </mesh>
            <mesh rotation={[0, 0, -Math.PI / 4]}>
                <boxGeometry args={[0.15, 1.35, 0.15]} />
                <meshPhysicalMaterial
                    color={CARAMEL_LIGHT}
                    emissive={CARAMEL}
                    emissiveIntensity={emissive}
                    metalness={0.35}
                    roughness={0.2}
                    clearcoat={1}
                    clearcoatRoughness={0.12}
                />
            </mesh>
        </group>
    )
}

function CouponCard({ isDark }: { isDark: boolean }): React.JSX.Element {
    const groupRef = useRef<THREE.Group>(null)
    const progress = useSectionProgress()
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
        const p = progress()
        const { x: px, y: py } = state.pointer
        // Springy mouse-parallax tilt, eased with frame-rate-independent damp.
        const targetRotY = px * 0.5 + p * 0.6
        const targetRotX = -py * 0.35 + p * 0.15
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

    // Stub region: everything below the perforation axis, as a slightly
    // proud + more matte panel so the tear-off stub reads as its own strip.
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
                <PercentEmblem isDark={isDark} />
            </group>
        </Float>
    )
}

function OrbitingChips(): React.JSX.Element {
    const groupRef = useRef<THREE.Group>(null)
    const progress = useSectionProgress()
    // ONE ticket geometry, shared by every chip mesh (built a single time).
    const geometry = useMemo(
        () =>
            makeTicketGeometry(
                CHIP.w,
                CHIP.h,
                CHIP.cr,
                CHIP.nr,
                CHIP.ny,
                CHIP.depth,
                CHIP.bevel,
            ),
        [],
    )
    const chips = useMemo(
        () =>
            [0, 1, 2, 3, 4].map(i => ({
                angle: (i / 5) * Math.PI * 2,
                color: [
                    CARAMEL,
                    CARAMEL_LIGHT,
                    '#ff8a4c',
                    CARAMEL_DEEP,
                    CARAMEL,
                ][i],
                tilt: (i % 2 === 0 ? 1 : -1) * 0.4,
            })),
        [],
    )

    useFrame((state, delta) => {
        const group = groupRef.current
        if (!group) return
        const p = progress()
        // Chips fan OUT (radius grows) and the ring advances as the section
        // scrolls, then idle-spin slowly the rest of the time.
        group.rotation.z = THREE.MathUtils.damp(
            group.rotation.z,
            p * Math.PI * 0.8 + state.clock.elapsedTime * 0.05,
            3,
            delta,
        )
        const radius = 2.3 + p * 1.4
        group.children.forEach((child, i) => {
            const chip = chips[i]
            if (!chip) return
            child.position.x = Math.cos(chip.angle) * radius
            // Flattened ellipse (0.55) keeps orbiting tickets out of the DOM
            // copy band at the bottom of the section, at any scroll fan-out.
            child.position.y = Math.sin(chip.angle) * radius * 0.55
        })
    })

    return (
        <group ref={groupRef} position={[0, 0.2, -0.5]}>
            {chips.map((chip, i) => (
                <group key={i} rotation={[chip.tilt, chip.tilt, chip.angle]}>
                    <mesh geometry={geometry}>
                        <meshPhysicalMaterial
                            color={chip.color}
                            metalness={0.3}
                            roughness={0.2}
                            clearcoat={1}
                            clearcoatRoughness={0.15}
                            sheen={0.4}
                            sheenColor={CARAMEL_LIGHT}
                            emissive={CARAMEL}
                            emissiveIntensity={0.15}
                        />
                    </mesh>
                    <Perforation
                        width={CHIP.w - CHIP.nr * 2 - 0.06}
                        y={CHIP.ny}
                        z={CHIP_FRONT + 0.012}
                        count={7}
                        dash={0.03}
                        color="#fff2e6"
                    />
                </group>
            ))}
        </group>
    )
}

const DROPLET_COUNT = 26

// Randomized droplet layout is computed ONCE at module load (client-only —
// the scene is dynamically imported ssr:false, single instance), never during
// render. Keeping Math.random() out of the render phase satisfies
// react-hooks/purity and keeps the field stable across re-renders.
const DROPLET_DATA: DropletDatum[] = Array.from(
    { length: DROPLET_COUNT },
    () => ({
        origin: new THREE.Vector3(
            (Math.random() - 0.5) * 9,
            (Math.random() - 0.5) * 6,
            (Math.random() - 0.5) * 4 - 1,
        ),
        speed: 0.2 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
        scale: 0.05 + Math.random() * 0.13,
        drift: 0.3 + Math.random() * 0.6,
    }),
)

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
    const progress = useSectionProgress()
    // The vertical FOV keeps world height constant, so on narrow (mobile)
    // aspects the 3.1u-wide card overflows the horizontal frustum — scale the
    // card+chips group down to fit. Reactive to resize via R3F size state.
    const aspect = useThree(state => state.size.width / state.size.height)
    const fit = Math.min(1, aspect / 1.15)

    useFrame((state, delta) => {
        // Scroll drives a gentle camera dolly toward the card.
        const p = progress()
        state.camera.position.z = THREE.MathUtils.damp(
            state.camera.position.z,
            7 - p * 1.6,
            3,
            delta,
        )
        state.camera.position.y = THREE.MathUtils.damp(
            state.camera.position.y,
            p * 0.35,
            3,
            delta,
        )
        state.camera.lookAt(0, 0.6, 0)
    })

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

            {/* Raised so the card never collides with the DOM copy block that
                sits in the bottom third of the section (justify-end layout). */}
            <group position={[0, 1.25, 0]} scale={fit}>
                <CouponCard isDark={isDark} />
                <OrbitingChips />
            </group>
            <Droplets isDark={isDark} />

            {/* Baked-once contact shadow grounds the floating composition; the
                frames={1} means it renders a single time, no per-frame cost. */}
            <ContactShadows
                position={[0, -1.4, 0]}
                scale={13}
                blur={2.8}
                far={5}
                opacity={isDark ? 0.4 : 0.28}
                color={CARAMEL_DEEP}
                frames={1}
            />

            <Sparkles
                count={40}
                scale={[10, 7, 5]}
                size={2.4}
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

export default function CouponVaultScene({
    active,
    isDark,
    onReady,
}: CouponVaultSceneProps): React.JSX.Element {
    return (
        <Canvas
            className="h-full w-full"
            dpr={[1, 1.75]}
            frameloop={active ? 'always' : 'never'}
            camera={{ position: [0, 0, 7], fov: 38 }}
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
