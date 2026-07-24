'use client'

// couponTicket3d — the reusable ticket visual language shared by BOTH 3D
// scenes (CouponVaultScene's full vault + HeroTicketScene's compact hero
// ticket) so the notched-ticket geometry has ONE codepath and zero
// duplication. Holds the caramel palette, the pure geometry factories
// (rounded rect + two inward semicircular notches, extruded with a bevel),
// the two small mesh building blocks (Perforation, PercentEmblem), and the
// CSS notch-mask used by the DOM posters. No scene/camera/frameloop logic
// lives here — that stays per-scene.

import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'

export const CARAMEL = '#ea6925'
export const CARAMEL_DEEP = '#b8480f'
export const CARAMEL_LIGHT = '#ffb27a'

// --- Ticket geometry -------------------------------------------------------
// One THREE.Shape traced clockwise: rounded corners + a semicircular notch
// carved inward on each SHORT edge (left/right) at the perforation axis `ny`.
// The notch arcs run counter-clockwise so they bulge INTO the outline (a real
// cutout, not a hole), giving the classic ticket silhouette in one pass.
// Module-private: only makeTicketGeometry consumes it.
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

export function makeTicketGeometry(
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

// A row of small dashes along the perforation axis, built as ONE instanced
// mesh whose matrices are written a single time (positions are static in the
// ticket's local space). Sits proud of the front face to read as embossed.
export function Perforation({
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

// The "%" is built from primitives (two rings + a diagonal bar) instead of 3D
// text so the scene ships no font file / network fetch. Raised off the card
// face (frontZ = the card's front-face Z) with an emissive caramel tone to
// read as embossed.
export function PercentEmblem({
    isDark,
    frontZ,
}: {
    isDark: boolean
    frontZ: number
}): React.JSX.Element {
    const emissive = isDark ? 1.1 : 0.65
    return (
        <group position={[0, 0.28, frontZ + 0.03]}>
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

// A CSS mask that punches a semicircular notch into each SHORT edge of a
// ticket (left/right at the perforation axis) — the 2D twin of the extruded
// notch above, used by the DOM poster fallbacks. Two radial gradients — each
// opaque except a transparent disc at one edge — intersected so only the two
// discs read as cut-outs. `axis` is the vertical position of the notch line.
export function ticketNotchMask(
    radius: string,
    axis: string,
): React.CSSProperties {
    const grad = (at: string): string =>
        `radial-gradient(circle ${radius} at ${at}, transparent calc(${radius} - 1px), #000 ${radius})`
    const image = `${grad(`0 ${axis}`)}, ${grad(`100% ${axis}`)}`
    return {
        maskImage: image,
        WebkitMaskImage: image,
        maskComposite: 'intersect',
        WebkitMaskComposite: 'source-in',
    }
}
