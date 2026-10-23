// ScrewSense shared data: panels, parts, steps, colours and layout constants.
// All lengths are centimetres. Table space: origin = centre of the table top,
// +X right, +Y up, +Z towards the user.

export type PartId = "A" | "B" | "C"
export type PanelId = "sideL" | "sideR" | "bottom" | "top" | "back"

export const TOTAL_STEPS = 4

export const COLORS = {
  table: new vec4(0.62, 0.52, 0.42, 1),
  tableLeg: new vec4(0.5, 0.42, 0.34, 1),
  paper: new vec4(0.95, 0.95, 0.9, 1),
  dish: new vec4(0.7, 0.72, 0.78, 1),
  panelRaw: new vec4(0.66, 0.68, 0.74, 1),
  panelFinish: new vec4(0.95, 0.78, 0.52, 1),
  panelFinal: new vec4(0.98, 0.82, 0.58, 1),
  ghost: new vec4(0.5, 0.92, 1.0, 0.22),
  ghostEdge: new vec4(0.5, 0.95, 1.0, 1),
  slot: new vec4(0.4, 0.95, 1.0, 1),
  slotPulse: new vec4(1.0, 0.92, 0.35, 1),
  tray: new vec4(0.25, 0.45, 0.6, 0.55),
  outline: new vec4(0.5, 0.95, 1.0, 1),
  outlineFill: new vec4(0.3, 0.7, 0.85, 0.35),
  match: new vec4(0.35, 1.0, 0.5, 1),
  wrong: new vec4(1.0, 0.3, 0.3, 1),
  hint: new vec4(1.0, 0.92, 0.35, 1),
  hole: new vec4(1.0, 0.95, 0.4, 1),
  red: new vec4(1.0, 0.25, 0.25, 1)
}

export interface PartDef {
  id: PartId
  label: string
  lengthMm: number
  // Visual size of the real part in cm.
  length: number
  radius: number
  headRadius: number
  headLength: number
  color: vec4
}

export const PARTS: PartDef[] = [
  {
    id: "A",
    label: "A  30 mm",
    lengthMm: 30,
    length: 3.0,
    radius: 0.2,
    headRadius: 0.4,
    headLength: 0.25,
    color: new vec4(1.0, 0.82, 0.3, 1)
  },
  {
    id: "B",
    label: "B  12 mm",
    lengthMm: 12,
    length: 1.2,
    radius: 0.2,
    headRadius: 0.4,
    headLength: 0.25,
    color: new vec4(0.75, 0.85, 1.0, 1)
  },
  {
    id: "C",
    label: "C  35 mm",
    lengthMm: 35,
    length: 3.5,
    radius: 0.4,
    headRadius: 0,
    headLength: 0,
    color: new vec4(0.9, 0.68, 0.4, 1)
  }
]

export interface PanelDef {
  id: PanelId
  // Dimensions in the lying-flat frame (x, y = thickness, z).
  size: vec3
  // Pose when assembled, in cabinet space (origin = centre of the cabinet base).
  assembledPos: vec3
  assembledEuler: vec3 // degrees
  // Pose when lying in the flat-pack layout, in pile space (origin = pile anchor).
  pilePos: vec3
  pileYawDeg: number
  step: number // 1-based step that fits this panel
  startsFlipped: boolean
  // Hole positions (x, z) on the panel's top face in its lying frame.
  holes: { [part: string]: vec2[] }
}

const T = 1.8
const W = 36.4
const CAB_D = 34.4

export const PANELS: PanelDef[] = [
  {
    id: "back",
    size: new vec3(W, 0.6, 49),
    assembledPos: new vec3(0, 25, -17.2),
    assembledEuler: new vec3(-90, 0, 0),
    pilePos: new vec3(6, 0.3, 31.8),
    pileYawDeg: 90,
    step: 4,
    startsFlipped: false,
    holes: {
      B: [
        new vec2(-15, -21),
        new vec2(-15, 0),
        new vec2(-15, 21),
        new vec2(15, -21),
        new vec2(15, 0),
        new vec2(15, 21)
      ]
    }
  },
  {
    id: "top",
    size: new vec3(W, T, CAB_D),
    assembledPos: new vec3(0, 49.1, 0.3),
    assembledEuler: new vec3(0, 0, 0),
    pilePos: new vec3(18.7, 1.5, 22.2),
    pileYawDeg: 0,
    step: 3,
    startsFlipped: false,
    holes: {
      A: [new vec2(-17, -9), new vec2(-17, 9), new vec2(17, -9), new vec2(17, 9)]
    }
  },
  {
    id: "bottom",
    size: new vec3(W, T, CAB_D),
    assembledPos: new vec3(0, 5.9, 0.3),
    assembledEuler: new vec3(180, 0, 0),
    pilePos: new vec3(-20.3, 1.5, 22.2),
    pileYawDeg: 0,
    step: 2,
    startsFlipped: true,
    holes: {
      A: [new vec2(-17, -9), new vec2(-17, 9), new vec2(17, -9), new vec2(17, 9)]
    }
  },
  {
    id: "sideR",
    size: new vec3(50, T, 35),
    assembledPos: new vec3(19.1, 25, 0),
    assembledEuler: new vec3(0, 0, -90),
    pilePos: new vec3(-21, 0.9, -25),
    pileYawDeg: 90,
    step: 1,
    startsFlipped: false,
    holes: {
      C: [new vec2(19.1, -10), new vec2(19.1, 0), new vec2(19.1, 10)]
    }
  },
  {
    id: "sideL",
    size: new vec3(50, T, 35),
    assembledPos: new vec3(-19.1, 25, 0),
    assembledEuler: new vec3(0, 0, 90),
    pilePos: new vec3(17, 0.9, -25),
    pileYawDeg: 90,
    step: 1,
    startsFlipped: false,
    holes: {
      C: [new vec2(-19.1, -10), new vec2(-19.1, 0), new vec2(-19.1, 10)]
    }
  }
]

export interface StepDef {
  index: number // 1-based
  partId: PartId
  panels: PanelId[]
  text: string
}

export const STEPS: StepDef[] = [
  { index: 1, partId: "C", panels: ["sideL", "sideR"], text: "Push dowels C into both side panels" },
  { index: 2, partId: "A", panels: ["bottom"], text: "Join the sides to the bottom panel with screws A" },
  { index: 3, partId: "A", panels: ["top"], text: "Fit the top panel with screws A" },
  { index: 4, partId: "B", panels: ["back"], text: "Fix the back panel with screws B" }
]

// Exploded offsets (cabinet space) used by the rewind scrub.
export const EXPLODED_OFFSET: { [id: string]: vec3 } = {
  sideL: new vec3(-26, 0, 0),
  sideR: new vec3(26, 0, 0),
  bottom: new vec3(0, -16, 0),
  top: new vec3(0, 22, 0),
  back: new vec3(0, 0, -28)
}

export function panelDef(id: PanelId): PanelDef {
  return PANELS.filter((p) => p.id === id)[0]
}

export function partDef(id: PartId): PartDef {
  return PARTS.filter((p) => p.id === id)[0]
}

export function easeInOut(t: number): number {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}

export function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t))
}

export function eulerDeg(x: number, y: number, z: number): quat {
  const d = Math.PI / 180
  return quat.fromEulerAngles(x * d, y * d, z * d)
}
