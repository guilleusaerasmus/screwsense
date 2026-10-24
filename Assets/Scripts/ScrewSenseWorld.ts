// ScrewSenseWorld: builds and animates the 3D content (table, flat-pack panels,
// parts dish, outline tray, glowing holes). It owns no game rules: it reports
// what the user did through events and executes visual commands from ScrewSenseMain.
//
// Expects: authored anchors (pile, dish, tray, cabinet, manual) as children of this
// object with identity rotation/scale (the tray may be tilted).
// Must not: decide whether a match is right or wrong.

import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {InteractableManipulation} from "SpectaclesInteractionKit.lspkg/Components/Interaction/InteractableManipulation/InteractableManipulation"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"
import {
  A4_CM,
  COLORS,
  DRAWING_CENTER,
  DRAWING_LINES,
  EXPLODED_OFFSET,
  PAGE_DRAWING_SCALE,
  PANELS,
  PARTS,
  PanelDef,
  PanelId,
  PartDef,
  PartId,
  SCAN_SECONDS,
  clamp01,
  easeInOut,
  eulerDeg,
  panelDef,
  partDef
} from "./ScrewSenseConfig"

export type OutlineState = "neutral" | "match" | "wrong" | "hint"

interface Tween {
  key: string
  t: number
  dur: number
  delay: number
  update: (k: number) => void
  done?: () => void
}

interface PanelRt {
  def: PanelDef
  root: SceneObject
  visual: SceneObject
  body: RenderMeshVisual
  finish: RenderMeshVisual
  holes: SceneObject[]
  redEdge: SceneObject
  interactable: Interactable | null
  dragging: boolean
  flipped: boolean
  assembled: boolean
  solidFinal: boolean
}

interface SlotRt {
  root: SceneObject
  ghost: RenderMeshVisual
  edges: RenderMeshVisual[]
  active: boolean
}

interface DrawingBar {
  ink: RenderMeshVisual
  glow: RenderMeshVisual
}

interface PartRt {
  def: PartDef
  root: SceneObject
  home: vec3
  interactable: Interactable
  visuals: RenderMeshVisual[]
  dragging: boolean
}

interface OutlineRt {
  id: PartId
  root: SceneObject
  pad: RenderMeshVisual
  frame: RenderMeshVisual[]
  fill: RenderMeshVisual[]
  basePos: vec3
  state: OutlineState
}

@component
export class ScrewSenseWorld extends BaseScriptComponent {
  @ui.label("<b>ScrewSense world</b>")
  @ui.separator
  @ui.group_start("References")
  @input
  @hint("Unit box mesh (the builder normalises its size).")
  boxMesh: RenderMesh
  @input
  @hint("Unit cylinder mesh (axis along Y).")
  cylinderMesh: RenderMesh
  @input
  @hint("Lit opaque material, cloned per object and tinted.")
  solidMat: Material
  @input
  @hint("Unlit opaque material (parts, labels).")
  unlitMat: Material
  @input
  @hint("Unlit alpha-blended material for translucent surfaces.")
  ghostMat: Material
  @input
  @hint("Unlit additive material for glows and outlines.")
  glowMat: Material
  @input
  @hint("Origin of the flat-pack pile on the table.")
  pileAnchor: SceneObject
  @input
  @hint("Centre of the parts dish.")
  dishAnchor: SceneObject
  @input
  @hint("Outline tray (floats above the front-right edge, tilted towards the user).")
  trayAnchor: SceneObject
  @input
  @hint("Centre of the cabinet base where the finished bedside table stands.")
  cabinetAnchor: SceneObject
  @input
  @hint("Centre of the paper manual lying on the table.")
  manualAnchor: SceneObject
  @ui.group_end
  @ui.group_start("Settings")
  @input
  @hint("Let the user drag the flat panels (phase 2).")
  panelsDraggable: boolean = false
  @input
  @hint("Collider padding around the tiny parts so they are easy to catch (cm).")
  partGrabPadding: number = 3
  @input
  @hint("Maximum distance from an outline centre that counts as 'over the outline' (cm).")
  outlineReleaseRadius: number = 5
  @input
  @hint("Show colliders for debugging.")
  debugColliders: boolean = false
  @ui.group_end

  // Events -------------------------------------------------------------
  readonly onPartGrabbed = new Event<PartId>()
  readonly onPartReleased = new Event<{partId: PartId; outlineId: PartId | null}>()
  readonly onPanelGrabbed = new Event<PanelId>()
  // slotDistance: distance in cm between the released panel and its hologram slot.
  readonly onPanelReleased = new Event<{panelId: PanelId; slotDistance: number}>()

  private root: SceneObject
  private unit: {[k: string]: vec3} = {}
  private tweens: Tween[] = []
  private time = 0

  private panels: {[id: string]: PanelRt} = {}
  private slots: {[id: string]: SlotRt} = {}
  private hologramVisible = false
  private parts: {[id: string]: PartRt} = {}
  private outlines: {[id: string]: OutlineRt} = {}
  private trayRoot: SceneObject
  private tableRoot: SceneObject
  private holePulse: SceneObject[] = []
  private built = false

  // Phase 3: paper manual with its drawing, and the rewind model.
  private drawingRoot: SceneObject
  private drawingBars: DrawingBar[] = []
  private scanning = false
  private scanned = false
  private rewindRoot: SceneObject
  private rewindPieces: {[id: string]: SceneObject} = {}
  private rewindShown = false
  private rewindK = 1

  onAwake(): void {
    this.root = this.sceneObject
    this.build()
    this.createEvent("OnStartEvent").bind(() => {
      this.bindInteractions()
      this.bindPanelInteractions()
    })
    this.createEvent("UpdateEvent").bind(() => this.onUpdate())
  }

  // ------------------------------------------------------------------ build
  private build(): void {
    this.computeUnits()
    this.buildTable()
    this.buildDish()
    this.buildTray()
    for (const def of PARTS) this.buildPart(def)
    for (const def of PANELS) this.buildPanel(def)
    for (const def of PANELS) this.buildSlot(def)
    this.buildManual()
    this.buildRewind()
    this.resetPanels(false)
    this.resetParts(false)
    this.setTrayVisible(false)
    this.built = true
  }

  private computeUnits(): void {
    const m = (mesh: RenderMesh): vec3 => {
      const a = mesh.aabbMin
      const b = mesh.aabbMax
      return new vec3(1 / Math.max(0.0001, b.x - a.x), 1 / Math.max(0.0001, b.y - a.y), 1 / Math.max(0.0001, b.z - a.z))
    }
    this.unit["box"] = m(this.boxMesh)
    this.unit["cyl"] = m(this.cylinderMesh)
  }

  /** Create a mesh primitive of an exact size in cm. Cylinder size = (diameter, height, diameter). */
  prim(
    parent: SceneObject,
    name: string,
    kind: "box" | "cyl",
    size: vec3,
    pos: vec3,
    color: vec4,
    mat: Material,
    rot?: quat
  ): RenderMeshVisual {
    const obj = global.scene.createSceneObject(name)
    obj.setParent(parent)
    const tr = obj.getTransform()
    tr.setLocalPosition(pos)
    if (rot) tr.setLocalRotation(rot)
    const u = this.unit[kind]
    tr.setLocalScale(new vec3(size.x * u.x, size.y * u.y, size.z * u.z))
    const rmv = obj.createComponent("Component.RenderMeshVisual") as RenderMeshVisual
    rmv.mesh = kind === "box" ? this.boxMesh : this.cylinderMesh
    const clone = mat.clone()
    clone.mainPass.baseColor = color
    rmv.mainMaterial = clone
    return rmv
  }

  static tint(rmv: RenderMeshVisual, color: vec4): void {
    rmv.mainMaterial.mainPass.baseColor = color
  }

  private addCollider(obj: SceneObject, size: vec3): void {
    const col = obj.createComponent("Physics.ColliderComponent") as ColliderComponent
    const shape = Shape.createBoxShape()
    shape.size = size
    col.shape = shape
    col.debugDrawEnabled = this.debugColliders
  }

  private buildTable(): void {
    this.tableRoot = global.scene.createSceneObject("Table")
    this.tableRoot.setParent(this.root)
    // 160 x 130 cm top, 75 cm high: wide enough to lay all five panels flat on the left half
    // (z -50 to 50) with the paper manual in front of them (z 50 to 80). The origin of the
    // world root is the table's reference point on the top surface; the top extends
    // 30 cm further towards the user than behind it.
    this.prim(this.tableRoot, "Top", "box", new vec3(160, 4, 130), new vec3(0, -2, 15), COLORS.table, this.solidMat)
    const legSize = new vec3(5, 71, 5)
    const lx = 75
    const lz = 60
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        this.prim(
          this.tableRoot,
          "Leg",
          "box",
          legSize,
          new vec3(sx * lx, -4 - 35.5, 15 + sz * lz),
          COLORS.tableLeg,
          this.solidMat
        )
      }
    }
  }

  private buildDish(): void {
    const c = this.localPos(this.dishAnchor)
    this.prim(this.tableRoot, "Dish", "cyl", new vec3(17, 1.0, 17), c.add(new vec3(0, 0.5, 0)), COLORS.dish, this.solidMat)
  }

  // ------------------------------------------------------------------ parts
  private buildPart(def: PartDef): void {
    const root = global.scene.createSceneObject("Part" + def.id)
    root.setParent(this.root)
    const index = PARTS.indexOf(def)
    const dish = this.localPos(this.dishAnchor)
    const home = dish.add(new vec3((index - 1) * 5.2, 2.3, 0))
    root.getTransform().setLocalPosition(home)

    const visuals: RenderMeshVisual[] = []
    const alongX = eulerDeg(0, 0, 90)
    // Shank: cylinder along X, starting at the head end.
    visuals.push(
      this.prim(
        root,
        "Shank",
        "cyl",
        new vec3(def.radius * 2, def.length, def.radius * 2),
        new vec3(def.headLength / 2, 0, 0),
        def.color,
        this.unlitMat,
        alongX
      )
    )
    if (def.headRadius > 0) {
      visuals.push(
        this.prim(
          root,
          "Head",
          "cyl",
          new vec3(def.headRadius * 2, def.headLength, def.headRadius * 2),
          new vec3(-def.length / 2 + def.headLength / 2 - 0.05, 0, 0),
          def.color,
          this.unlitMat,
          alongX
        )
      )
    }

    const pad = this.partGrabPadding
    this.addCollider(root, new vec3(def.length + pad, 2.2 + pad, 2.2 + pad))
    const interactable = root.createComponent(Interactable.getTypeName()) as Interactable
    interactable.targetingMode = 3
    const manip = root.createComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
    manip.setCanRotate(false)
    manip.setCanScale(false)

    this.parts[def.id] = {def, root, home, interactable, visuals, dragging: false}
  }

  // ------------------------------------------------------------------ tray
  private buildTray(): void {
    this.trayRoot = global.scene.createSceneObject("TrayContent")
    this.trayRoot.setParent(this.trayAnchor)
    this.prim(this.trayRoot, "TrayPlate", "box", new vec3(34, 0.4, 14), new vec3(0, 0, 0), COLORS.tray, this.ghostMat)

    const xs = [-11, 0, 11]
    for (let i = 0; i < PARTS.length; i++) {
      const def = PARTS[i]
      const root = global.scene.createSceneObject("Outline" + def.id)
      root.setParent(this.trayRoot)
      const basePos = new vec3(xs[i], 0.3, 1.2)
      root.getTransform().setLocalPosition(basePos)

      const pad = this.prim(
        root,
        "Pad",
        "cyl",
        new vec3(8, 0.1, 8),
        new vec3(0, 0, 0),
        COLORS.outlineFill,
        this.ghostMat
      )
      const frame: RenderMeshVisual[] = []
      const fill: RenderMeshVisual[] = []
      // Real-size silhouette of the part: shank + head, drawn as hollow frames.
      this.addFrame(root, frame, new vec3(0.25, 0.2, 0), def.length + 0.5, def.radius * 2 + 0.5)
      if (def.headRadius > 0) {
        this.addFrame(
          root,
          frame,
          new vec3(-def.length / 2 - 0.05, 0.2, 0),
          def.headLength + 0.5,
          def.headRadius * 2 + 0.5
        )
      }
      fill.push(
        this.prim(
          root,
          "Silhouette",
          "box",
          new vec3(def.length + 0.25, 0.1, def.radius * 2),
          new vec3(0.1, 0.12, 0),
          COLORS.outline,
          this.glowMat
        )
      )

      this.buildLabel(root, def.label, new vec3(0, 0.3, 5.6))
      this.outlines[def.id] = {id: def.id, root, pad, frame, fill, basePos, state: "neutral"}
    }
  }

  private addFrame(parent: SceneObject, list: RenderMeshVisual[], center: vec3, w: number, h: number): void {
    const t = 0.14
    const y = center.y
    list.push(this.prim(parent, "BarT", "box", new vec3(w, 0.1, t), new vec3(center.x, y, center.z - h / 2), COLORS.outline, this.glowMat))
    list.push(this.prim(parent, "BarB", "box", new vec3(w, 0.1, t), new vec3(center.x, y, center.z + h / 2), COLORS.outline, this.glowMat))
    list.push(this.prim(parent, "BarL", "box", new vec3(t, 0.1, h), new vec3(center.x - w / 2, y, center.z), COLORS.outline, this.glowMat))
    list.push(this.prim(parent, "BarR", "box", new vec3(t, 0.1, h), new vec3(center.x + w / 2, y, center.z), COLORS.outline, this.glowMat))
  }

  private buildLabel(parent: SceneObject, text: string, pos: vec3): void {
    const obj = global.scene.createSceneObject("Label")
    obj.setParent(parent)
    // Lie flat on the tray, readable from the front (+Z) side.
    obj.getTransform().setLocalPosition(pos)
    obj.getTransform().setLocalRotation(eulerDeg(-90, 0, 0))
    const t = obj.createComponent("Component.Text") as Text
    t.text = text
    t.size = 70
    t.depthTest = true
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-5, 5, -1.2, 1.2)
    ;(t as Text & {weight?: number}).weight = 700
  }

  // ------------------------------------------------------------------ panels
  private buildPanel(def: PanelDef): void {
    const root = global.scene.createSceneObject("Panel_" + def.id)
    root.setParent(this.root)
    const visual = global.scene.createSceneObject("Visual")
    visual.setParent(root)
    const body = this.prim(visual, "Body", "box", def.size, new vec3(0, 0, 0), COLORS.panelRaw, this.solidMat)
    const finish = this.prim(
      visual,
      "Finish",
      "box",
      new vec3(def.size.x - 0.3, 0.14, def.size.z - 0.3),
      new vec3(0, def.size.y / 2 + 0.05, 0),
      COLORS.panelFinish,
      this.solidMat
    )
    // Generous collider: at least 3 cm thick so a thin panel is easy to hit.
    this.addCollider(root, new vec3(def.size.x, Math.max(3, def.size.y + 1.2), def.size.z))
    let panelInteractable: Interactable | null = null
    if (this.panelsDraggable) {
      panelInteractable = root.createComponent(Interactable.getTypeName()) as Interactable
      panelInteractable.targetingMode = 3
      const manip = root.createComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
      manip.setCanRotate(false)
      manip.setCanScale(false)
    }

    // Red edge around the panel, shown when it sits in its slot upside down.
    const redEdge = global.scene.createSceneObject("RedEdge")
    redEdge.setParent(root)
    this.addPerimeter(redEdge, [], def.size, COLORS.red, this.glowMat, 0.7)
    redEdge.enabled = false

    // Glowing holes for the part this panel receives.
    const holes: SceneObject[] = []
    for (const key in def.holes) {
      for (const h of def.holes[key]) {
        const hole = this.prim(
          root,
          "Hole_" + key,
          "cyl",
          new vec3(1.3, 0.12, 1.3),
          new vec3(h.x, def.size.y / 2 + 0.15, h.y),
          COLORS.hole,
          this.glowMat
        )
        hole.sceneObject.enabled = false
        holes.push(hole.sceneObject)
      }
    }

    const rt: PanelRt = {
      def,
      root,
      visual,
      body,
      finish,
      holes,
      redEdge,
      interactable: panelInteractable,
      dragging: false,
      flipped: def.startsFlipped,
      assembled: false,
      solidFinal: false
    }
    this.panels[def.id] = rt
    this.applyFlip(rt)
  }

  /** Four bars around a panel's outline (all of its thickness, so they read from both sides). */
  private addPerimeter(
    parent: SceneObject,
    list: RenderMeshVisual[],
    size: vec3,
    color: vec4,
    mat: Material,
    t: number
  ): void {
    const h = Math.max(0.5, size.y)
    const hx = size.x / 2
    const hz = size.z / 2
    list.push(this.prim(parent, "EdgeN", "box", new vec3(size.x + t, h, t), new vec3(0, 0, -hz), color, mat))
    list.push(this.prim(parent, "EdgeS", "box", new vec3(size.x + t, h, t), new vec3(0, 0, hz), color, mat))
    list.push(this.prim(parent, "EdgeW", "box", new vec3(t, h, size.z + t), new vec3(-hx, 0, 0), color, mat))
    list.push(this.prim(parent, "EdgeE", "box", new vec3(t, h, size.z + t), new vec3(hx, 0, 0), color, mat))
  }

  /** Hologram slot: translucent ghost of the panel with a glowing outline, at its assembled pose. */
  private buildSlot(def: PanelDef): void {
    const root = global.scene.createSceneObject("Slot_" + def.id)
    root.setParent(this.root)
    const pose = this.assembledPose(def)
    root.getTransform().setLocalPosition(pose.pos)
    root.getTransform().setLocalRotation(pose.rot)
    const ghost = this.prim(root, "Ghost", "box", def.size, vec3.zero(), COLORS.ghost, this.ghostMat)
    const edges: RenderMeshVisual[] = []
    this.addPerimeter(root, edges, def.size, COLORS.slot, this.glowMat, 0.5)
    root.enabled = false
    this.slots[def.id] = {root, ghost, edges, active: false}
  }

  private applyFlip(p: PanelRt): void {
    p.visual.getTransform().setLocalRotation(p.flipped ? eulerDeg(180, 0, 0) : quat.quatIdentity())
  }

  // ------------------------------------------------------------------ manual (phase 3)
  /** The A4 page lying on the table with the bedside table drawn on it. */
  private buildManual(): void {
    const c = this.localPos(this.manualAnchor)
    const page = this.prim(
      this.root,
      "ManualPage",
      "box",
      new vec3(A4_CM.x, 0.3, A4_CM.y),
      c.add(new vec3(0, 0.15, 0)),
      COLORS.paper,
      this.unlitMat
    )
    page.sceneObject.getTransform().setLocalPosition(c.add(new vec3(0, 0.15, 0)))
    const ink = new vec4(0.1, 0.18, 0.4, 1)

    const title = global.scene.createSceneObject("ManualTitle")
    title.setParent(this.root)
    title.getTransform().setLocalPosition(c.add(new vec3(0, 0.35, -A4_CM.y / 2 + 2.6)))
    title.getTransform().setLocalRotation(eulerDeg(-90, 0, 0))
    const t = title.createComponent("Component.Text") as Text
    t.text = "Bedside table"
    t.size = 60
    t.textFill.color = ink
    t.depthTest = true
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-8, 8, -1.5, 1.5)
    ;(t as Text & {weight?: number}).weight = 700

    // The drawing: ink bars on the page; glowing copies take over when it lifts off.
    this.drawingRoot = global.scene.createSceneObject("ManualDrawing")
    this.drawingRoot.setParent(this.root)
    for (const seg of DRAWING_LINES) {
      const dx = seg[2] - seg[0]
      const dy = seg[3] - seg[1]
      const len = Math.sqrt(dx * dx + dy * dy) + 1.2
      const mid = new vec3((seg[0] + seg[2]) / 2, (seg[1] + seg[3]) / 2, 0)
      const rot = eulerDeg(0, 0, (Math.atan2(dy, dx) * 180) / Math.PI)
      const size = new vec3(len, 1.2, 0.4)
      this.drawingBars.push({
        ink: this.prim(this.drawingRoot, "Line", "box", size, mid, ink, this.unlitMat, rot),
        glow: this.prim(this.drawingRoot, "LineGlow", "box", size, mid, COLORS.ghostEdge.uniformScale(0), this.glowMat, rot)
      })
    }
    this.resetManual()
  }

  private drawingPagePose(): {pos: vec3; rot: quat; scale: number} {
    const s = PAGE_DRAWING_SCALE
    const c = this.localPos(this.manualAnchor)
    // Lying flat, the drawing's up points to the back of the table.
    return {
      pos: c.add(new vec3(-DRAWING_CENTER.x * s, 0.5, DRAWING_CENTER.y * s)),
      rot: eulerDeg(-90, 0, 0),
      scale: s
    }
  }

  private drawingFinalPose(): {pos: vec3; rot: quat; scale: number} {
    // Standing at life size against the front of the hologram.
    return {pos: this.localPos(this.cabinetAnchor).add(new vec3(0, 0, 17.5)), rot: quat.quatIdentity(), scale: 1}
  }

  private applyDrawingPose(pos: vec3, rot: quat, scale: number): void {
    const tr = this.drawingRoot.getTransform()
    tr.setLocalPosition(pos)
    tr.setLocalRotation(rot)
    tr.setLocalScale(vec3.one().uniformScale(scale))
  }

  private setDrawingGlow(g: number): void {
    for (const b of this.drawingBars) {
      ScrewSenseWorld.tint(b.glow, new vec4(COLORS.ghostEdge.x * g, COLORS.ghostEdge.y * g, COLORS.ghostEdge.z * g, 1))
      b.ink.sceneObject.enabled = g <= 0
      b.glow.sceneObject.enabled = g > 0
    }
  }

  /** Put the drawing back on the page, ready to be scanned. */
  resetManual(): void {
    this.cancelTween("scan")
    this.scanning = false
    this.scanned = false
    const p = this.drawingPagePose()
    this.applyDrawingPose(p.pos, p.rot, p.scale)
    this.drawingRoot.enabled = true
    this.setDrawingGlow(0)
  }

  /**
   * The scan: the drawing lifts off the page, grows and stands up while it turns into light,
   * then the life-size hologram appears where it settles. Takes SCAN_SECONDS.
   */
  playScan(done?: () => void): void {
    if (this.scanning) return
    this.scanning = true
    const from = this.drawingPagePose()
    const to = this.drawingFinalPose()
    let hologramOn = false
    this.tween(
      "scan",
      SCAN_SECONDS,
      (k) => {
        const e = easeInOut(clamp01((k - 0.15) / 0.7))
        const lift = 14 * Math.sin(Math.PI * clamp01(k / 0.85))
        const pos = vec3.lerp(from.pos, to.pos, e).add(new vec3(0, lift, 0))
        this.applyDrawingPose(pos, quat.slerp(from.rot, to.rot, e), from.scale + (to.scale - from.scale) * e)
        let g = clamp01((k - 0.08) / 0.17)
        if (k > 0.85) g *= 1 - (k - 0.85) / 0.15
        this.setDrawingGlow(g)
        if (k >= 0.85) {
          if (!hologramOn) {
            hologramOn = true
            this.setHologramVisible(this.panelsDraggable)
          }
          const f = clamp01((k - 0.85) / 0.15)
          for (const id in this.slots) {
            const sl = this.slots[id]
            ScrewSenseWorld.tint(sl.ghost, new vec4(COLORS.ghost.x, COLORS.ghost.y, COLORS.ghost.z, COLORS.ghost.w * f))
          }
        }
      },
      () => {
        this.drawingRoot.enabled = false
        this.scanning = false
        this.scanned = true
        for (const id in this.slots) ScrewSenseWorld.tint(this.slots[id].ghost, COLORS.ghost)
        if (done) done()
      }
    )
  }

  isScanning(): boolean {
    return this.scanning
  }

  hasScanned(): boolean {
    return this.scanned
  }

  /** True while the drawing still lies on the page (before the scan). */
  isDrawingOnPage(): boolean {
    return this.drawingRoot.enabled && !this.scanning
  }

  drawingWorldPos(): vec3 {
    return this.drawingRoot.getTransform().getWorldPosition()
  }

  isHologramVisible(): boolean {
    return this.hologramVisible
  }

  manualWorldPos(): vec3 {
    return this.manualAnchor.getTransform().getWorldPosition()
  }

  /** World position of a point on the table, in table space (x right, y up, z towards the user). */
  tableWorldPoint(local: vec3): vec3 {
    return this.root.getTransform().getWorldTransform().multiplyPoint(local)
  }

  // ------------------------------------------------------------------ rewind (phase 3)
  /** Five solid pieces standing for the whole bedside table; they never touch the real panels. */
  private buildRewind(): void {
    this.rewindRoot = global.scene.createSceneObject("RewindModel")
    this.rewindRoot.setParent(this.root)
    for (const def of PANELS) {
      const piece = global.scene.createSceneObject("Rewind_" + def.id)
      piece.setParent(this.rewindRoot)
      this.prim(piece, "Body", "box", def.size, vec3.zero(), COLORS.panelFinal, this.solidMat)
      this.addPerimeter(piece, [], def.size, COLORS.slot, this.glowMat, 0.4)
      this.rewindPieces[def.id] = piece
    }
    this.rewindRoot.enabled = false
    this.poseRewind(1)
  }

  /** k = 1: assembled, k = 0: fully exploded. */
  private poseRewind(k: number): void {
    this.rewindK = k
    for (const def of PANELS) {
      const a = this.assembledPose(def)
      const off = EXPLODED_OFFSET[def.id].uniformScale(1 - k)
      const tr = this.rewindPieces[def.id].getTransform()
      tr.setLocalPosition(a.pos.add(off))
      tr.setLocalRotation(a.rot)
    }
  }

  /** Show the whole bedside table at `k` (0 exploded to 1 assembled); the real hologram steps aside. */
  showRewind(k: number): void {
    this.cancelTween("rewind")
    if (!this.rewindShown) {
      this.rewindShown = true
      this.rewindRoot.enabled = true
      for (const id in this.panels) if (this.panels[id].assembled) this.panels[id].root.enabled = false
      for (const id in this.slots) this.slots[id].root.enabled = false
    }
    this.poseRewind(clamp01(k))
  }

  /** Slide the model to `k`, then hand the view back to the real progress. */
  endRewind(k: number, done?: () => void): void {
    if (!this.rewindShown) {
      if (done) done()
      return
    }
    const from = this.rewindK
    this.tween("rewind", 0.35, (t) => this.poseRewind(from + (clamp01(k) - from) * easeInOut(t)), () => {
      this.cancelRewind()
      if (done) done()
    })
  }

  /** Drop the model at once and restore the real panels and hologram. */
  cancelRewind(): void {
    this.cancelTween("rewind")
    if (!this.rewindShown) return
    this.rewindShown = false
    this.rewindRoot.enabled = false
    for (const id in this.panels) this.panels[id].root.enabled = true
    this.setHologramVisible(this.hologramVisible)
  }

  isRewindShown(): boolean {
    return this.rewindShown
  }

  rewindValue(): number {
    return this.rewindK
  }

  /** World position of a model piece (tests). */
  rewindPieceWorldPos(id: PanelId): vec3 {
    return this.rewindPieces[id].getTransform().getWorldPosition()
  }

  // ------------------------------------------------------------------ poses
  private localPos(anchor: SceneObject): vec3 {
    return anchor.getTransform().getLocalPosition()
  }

  private pilePose(def: PanelDef): {pos: vec3; rot: quat} {
    return {pos: this.localPos(this.pileAnchor).add(def.pilePos), rot: eulerDeg(0, def.pileYawDeg, 0)}
  }

  private assembledPose(def: PanelDef): {pos: vec3; rot: quat} {
    const e = def.assembledEuler
    return {pos: this.localPos(this.cabinetAnchor).add(def.assembledPos), rot: eulerDeg(e.x, e.y, e.z)}
  }

  private setPose(p: PanelRt, pos: vec3, rot: quat): void {
    const tr = p.root.getTransform()
    tr.setLocalPosition(pos)
    tr.setLocalRotation(rot)
  }

  // ------------------------------------------------------------------ tweens
  tween(key: string, dur: number, update: (k: number) => void, done?: () => void, delay: number = 0): void {
    this.tweens = this.tweens.filter((t) => t.key !== key)
    this.tweens.push({key, t: 0, dur: Math.max(0.001, dur), delay, update, done})
  }

  cancelTween(key: string): void {
    this.tweens = this.tweens.filter((t) => t.key !== key)
  }

  private onUpdate(): void {
    const dt = getDeltaTime()
    this.time += dt
    const finished: Tween[] = []
    for (const tw of this.tweens.slice()) {
      if (tw.delay > 0) {
        tw.delay -= dt
        continue
      }
      tw.t += dt
      const k = clamp01(tw.t / tw.dur)
      tw.update(k)
      if (k >= 1) finished.push(tw)
    }
    if (finished.length > 0) {
      this.tweens = this.tweens.filter((t) => finished.indexOf(t) < 0)
      for (const tw of finished) if (tw.done) tw.done()
    }
    this.pulseHoles()
    this.pulseHints()
    this.pulseSlots()
  }

  private pulseSlots(): void {
    if (!this.hologramVisible) return
    const k = 0.5 + 0.5 * Math.sin(this.time * 5)
    for (const id in this.slots) {
      const sl = this.slots[id]
      const c = sl.active ? this.mix(COLORS.slotPulse, COLORS.slot, k) : COLORS.slot.uniformScale(0.55)
      for (const e of sl.edges) ScrewSenseWorld.tint(e, new vec4(c.x, c.y, c.z, 1))
    }
  }

  private pulseHoles(): void {
    const s = 1 + 0.25 * Math.sin(this.time * 6)
    for (const key in this.panels) {
      for (const h of this.panels[key].holes) {
        if (h.enabled) {
          const base = h.getTransform().getLocalScale()
          // Keep scale uniform pulse relative to authored scale stored in name-less cache.
          const u = this.unit["cyl"]
          h.getTransform().setLocalScale(new vec3(1.3 * s * u.x, 0.12 * u.y, 1.3 * s * u.z))
          void base
        }
      }
    }
  }

  private pulseHints(): void {
    const k = 0.5 + 0.5 * Math.sin(this.time * 7)
    for (const id in this.outlines) {
      const o = this.outlines[id]
      if (o.state === "hint") this.tintOutline(o, this.mix(COLORS.hint, COLORS.outline, k))
    }
  }

  private mix(a: vec4, b: vec4, k: number): vec4 {
    return new vec4(a.x + (b.x - a.x) * k, a.y + (b.y - a.y) * k, a.z + (b.z - a.z) * k, a.w + (b.w - a.w) * k)
  }

  // ------------------------------------------------------------------ interaction
  private bindInteractions(): void {
    for (const id in this.parts) {
      const p = this.parts[id]
      const manip = p.root.getComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
      p.interactable.onTriggerStart.add(() => {
        p.dragging = true
        this.cancelTween("part-" + id)
        this.onPartGrabbed.invoke(p.def.id)
      })
      manip.onManipulationEnd.add(() => this.partReleased(p))
      p.interactable.onTriggerEnd.add(() => {
        // Safety net: a release without manipulation (a plain click) also resolves.
        if (p.dragging) this.partReleased(p)
      })
    }
  }

  private bindPanelInteractions(): void {
    for (const id in this.panels) {
      const p = this.panels[id]
      if (!p.interactable) continue
      const manip = p.root.getComponent(InteractableManipulation.getTypeName()) as InteractableManipulation
      p.interactable.onTriggerStart.add(() => {
        p.dragging = true
        this.cancelTween("panel-" + id)
        this.onPanelGrabbed.invoke(p.def.id)
      })
      manip.onManipulationEnd.add(() => this.panelReleased(p))
      p.interactable.onTriggerEnd.add(() => {
        if (p.dragging) this.panelReleased(p)
      })
    }
  }

  private panelReleased(p: PanelRt): void {
    if (!p.dragging) return
    p.dragging = false
    const dist = p.root.getTransform().getWorldPosition().distance(this.panelSlotWorldPos(p.def.id))
    this.onPanelReleased.invoke({panelId: p.def.id, slotDistance: dist})
  }

  private partReleased(p: PartRt): void {
    if (!p.dragging) return
    p.dragging = false
    this.onPartReleased.invoke({partId: p.def.id, outlineId: this.outlineUnder(p)})
  }

  /** Nearest visible outline within the release radius of the part, or null. */
  outlineUnder(p: PartRt): PartId | null {
    if (!this.trayRoot.enabled) return null
    const pos = p.root.getTransform().getWorldPosition()
    let best: PartId | null = null
    let bestD = this.outlineReleaseRadius
    for (const id in this.outlines) {
      const d = this.outlines[id].root.getTransform().getWorldPosition().distance(pos)
      if (d <= bestD) {
        bestD = d
        best = id as PartId
      }
    }
    return best
  }

  // ------------------------------------------------------------------ commands
  setTrayVisible(v: boolean): void {
    this.trayRoot.enabled = v
    if (v) {
      for (const id in this.outlines) this.setOutlineState(id as PartId, "neutral")
    }
  }

  isTrayVisible(): boolean {
    return this.trayRoot.enabled
  }

  setOutlineState(id: PartId, state: OutlineState): void {
    const o = this.outlines[id]
    o.state = state
    if (state === "hint") return
    const c = state === "match" ? COLORS.match : state === "wrong" ? COLORS.wrong : COLORS.outline
    this.tintOutline(o, c)
  }

  getOutlineState(id: PartId): OutlineState {
    return this.outlines[id].state
  }

  private tintOutline(o: OutlineRt, c: vec4): void {
    for (const r of o.frame) ScrewSenseWorld.tint(r, c)
    for (const r of o.fill) ScrewSenseWorld.tint(r, c)
    ScrewSenseWorld.tint(o.pad, new vec4(c.x, c.y, c.z, 0.3))
  }

  shakeOutline(id: PartId): void {
    const o = this.outlines[id]
    this.tween("shake-" + id, 0.6, (k) => {
      const dx = Math.sin(k * 40) * 0.7 * (1 - k)
      o.root.getTransform().setLocalPosition(o.basePos.add(new vec3(dx, 0, 0)))
    }, () => o.root.getTransform().setLocalPosition(o.basePos))
  }

  /** World position of an outline centre. */
  outlineWorldPos(id: PartId): vec3 {
    return this.outlines[id].root.getTransform().getWorldPosition()
  }

  /** Move a released part into its outline. */
  snapPartIntoOutline(id: PartId, done?: () => void): void {
    const p = this.parts[id]
    const o = this.outlines[id]
    const tr = p.root.getTransform()
    const from = tr.getWorldPosition()
    const fromRot = tr.getWorldRotation()
    const to = o.root.getTransform().getWorldPosition().add(this.trayAnchor.getTransform().up.uniformScale(0.5))
    const toRot = this.trayAnchor.getTransform().getWorldRotation()
    this.tween("part-" + id, 0.18, (k) => {
      const e = easeInOut(k)
      tr.setWorldPosition(vec3.lerp(from, to, e))
      tr.setWorldRotation(quat.slerp(fromRot, toRot, e))
    }, done)
  }

  returnPartHome(id: PartId, done?: () => void): void {
    const p = this.parts[id]
    const tr = p.root.getTransform()
    const from = tr.getLocalPosition()
    const fromRot = tr.getLocalRotation()
    this.tween("part-" + id, 0.25, (k) => {
      const e = easeInOut(k)
      tr.setLocalPosition(vec3.lerp(from, p.home, e))
      tr.setLocalRotation(quat.slerp(fromRot, quat.quatIdentity(), e))
    }, done)
  }

  setPartVisible(id: PartId, v: boolean): void {
    this.parts[id].root.enabled = v
  }

  resetParts(animate: boolean): void {
    for (const id in this.parts) {
      const p = this.parts[id]
      p.dragging = false
      p.root.enabled = true
      if (animate) {
        this.returnPartHome(id as PartId)
      } else {
        this.cancelTween("part-" + id)
        p.root.getTransform().setLocalPosition(p.home)
        p.root.getTransform().setLocalRotation(quat.quatIdentity())
      }
    }
  }

  /** Glowing holes on the panels that receive `part`. */
  glowHoles(panelIds: PanelId[], part: PartId): void {
    this.clearHoles()
    for (const pid of panelIds) {
      const p = this.panels[pid]
      for (const h of p.holes) h.enabled = h.name === "Hole_" + part
    }
  }

  clearHoles(): void {
    for (const k in this.panels) for (const h of this.panels[k].holes) h.enabled = false
  }

  holesGlowing(panelId: PanelId): boolean {
    return this.panels[panelId].holes.some((h) => h.enabled)
  }

  // ------------------------------------------------------------------ hologram (phase 2)
  setHologramVisible(v: boolean): void {
    this.hologramVisible = v
    for (const id in this.slots) {
      const sl = this.slots[id]
      sl.root.enabled = v
      sl.ghost.sceneObject.enabled = v && !this.panels[id].assembled
    }
  }

  /** The slots of these panels pulse; the others rest dimmed. */
  setActiveSlots(ids: PanelId[]): void {
    for (const id in this.slots) this.slots[id].active = ids.indexOf(id as PanelId) >= 0
  }

  panelSlotWorldPos(id: PanelId): vec3 {
    return this.slots[id].root.getTransform().getWorldPosition()
  }

  /** Move a released panel into its hologram slot; it turns solid unless it lies upside down. */
  snapPanelToSlot(id: PanelId, done?: () => void): void {
    const p = this.panels[id]
    const tr = p.root.getTransform()
    const from = tr.getLocalPosition()
    const fromRot = tr.getLocalRotation()
    const target = this.assembledPose(p.def)
    p.assembled = true
    this.slots[id].ghost.sceneObject.enabled = false
    this.setSolidFinal(id, !p.flipped)
    p.redEdge.enabled = p.flipped
    this.tween("panel-" + id, 0.35, (k) => {
      const e = easeInOut(k)
      tr.setLocalPosition(vec3.lerp(from, target.pos, e))
      tr.setLocalRotation(quat.slerp(fromRot, target.rot, e))
    }, done)
  }

  /** Send one released panel back to its place in the flat-pack layout. */
  returnPanelToPile(id: PanelId, done?: () => void): void {
    const p = this.panels[id]
    const tr = p.root.getTransform()
    const from = tr.getLocalPosition()
    const fromRot = tr.getLocalRotation()
    const target = this.pilePose(p.def)
    this.markPanelUnplaced(p)
    this.tween("panel-" + id, 0.3, (k) => {
      const e = easeInOut(k)
      tr.setLocalPosition(vec3.lerp(from, target.pos, e))
      tr.setLocalRotation(quat.slerp(fromRot, target.rot, e))
    }, done)
  }

  /** The panel was lifted out of its slot (or sent away): it is no longer placed. */
  markPanelUnplaced(p: PanelRt | PanelId): void {
    const rt = typeof p === "string" ? this.panels[p] : p
    rt.assembled = false
    rt.redEdge.enabled = false
    this.setSolidFinal(rt.def.id, false)
    if (this.hologramVisible) this.slots[rt.def.id].ghost.sceneObject.enabled = true
  }

  /** Turn a placed panel over (the Flip button). */
  flipPanel(id: PanelId, done?: () => void): void {
    const p = this.panels[id]
    if (!p.flipped) {
      if (done) done()
      return
    }
    p.flipped = false
    p.redEdge.enabled = false
    const tr = p.visual.getTransform()
    const from = tr.getLocalRotation()
    this.tween("flip-" + id, 0.4, (k) => {
      tr.setLocalRotation(quat.slerp(from, quat.quatIdentity(), easeInOut(k)))
    }, () => {
      this.setSolidFinal(id, true)
      if (done) done()
    })
  }

  panelRedEdgeVisible(id: PanelId): boolean {
    return this.panels[id].redEdge.enabled
  }

  /** Animate panels from where they are to the assembled pose in the cabinet. */
  assemblePanels(ids: PanelId[], done?: () => void): void {
    let remaining = ids.length
    ids.forEach((id, i) => {
      const p = this.panels[id]
      const tr = p.root.getTransform()
      const from = tr.getLocalPosition()
      const fromRot = tr.getLocalRotation()
      const target = this.assembledPose(p.def)
      p.assembled = true
      p.flipped = false
      this.applyFlip(p)
      this.tween("panel-" + id, 0.8, (k) => {
        const e = easeInOut(k)
        tr.setLocalPosition(vec3.lerp(from, target.pos, e))
        tr.setLocalRotation(quat.slerp(fromRot, target.rot, e))
      }, () => {
        remaining--
        if (remaining === 0 && done) done()
      }, i * 0.15)
    })
    if (ids.length === 0 && done) done()
  }

  /** Send panels back to the pile (undo). */
  disassemblePanels(ids: PanelId[], done?: () => void): void {
    let remaining = ids.length
    ids.forEach((id, i) => {
      const p = this.panels[id]
      const tr = p.root.getTransform()
      const from = tr.getLocalPosition()
      const fromRot = tr.getLocalRotation()
      const target = this.pilePose(p.def)
      this.markPanelUnplaced(p)
      p.flipped = p.def.startsFlipped
      this.applyFlip(p)
      this.tween("panel-" + id, 0.6, (k) => {
        const e = easeInOut(k)
        tr.setLocalPosition(vec3.lerp(from, target.pos, e))
        tr.setLocalRotation(quat.slerp(fromRot, target.rot, e))
      }, () => {
        remaining--
        if (remaining === 0 && done) done()
      }, i * 0.1)
    })
    if (ids.length === 0 && done) done()
  }

  resetPanels(animate: boolean): void {
    const ids = PANELS.map((d) => d.id)
    if (animate) {
      this.disassemblePanels(ids)
      return
    }
    for (const id of ids) {
      const p = this.panels[id]
      const pose = this.pilePose(p.def)
      this.cancelTween("panel-" + id)
      this.setPose(p, pose.pos, pose.rot)
      this.markPanelUnplaced(p)
      p.dragging = false
      p.flipped = p.def.startsFlipped
      this.applyFlip(p)
    }
    this.clearHoles()
  }

  /** Switch panels to the solid finished look (or back). */
  setSolidFinal(id: PanelId, solid: boolean): void {
    const p = this.panels[id]
    p.solidFinal = solid
    ScrewSenseWorld.tint(p.body, solid ? COLORS.panelFinal : COLORS.panelRaw)
    p.finish.sceneObject.enabled = !solid
  }

  setAllSolidFinal(solid: boolean): void {
    for (const id in this.panels) this.setSolidFinal(id as PanelId, solid)
  }

  // ------------------------------------------------------------------ queries (also used by tests)
  panelWorldPos(id: PanelId): vec3 {
    return this.panels[id].root.getTransform().getWorldPosition()
  }

  panelAssembledWorldPos(id: PanelId): vec3 {
    const p = this.assembledPose(panelDef(id))
    return this.root.getTransform().getWorldTransform().multiplyPoint(p.pos)
  }

  panelIsAssembled(id: PanelId): boolean {
    return this.panels[id].assembled
  }

  panelIsFlipped(id: PanelId): boolean {
    return this.panels[id].flipped
  }

  partWorldPos(id: PartId): vec3 {
    return this.parts[id].root.getTransform().getWorldPosition()
  }

  partHomeWorldPos(id: PartId): vec3 {
    return this.root.getTransform().getWorldTransform().multiplyPoint(this.parts[id].home)
  }

  cabinetWorldCenter(): vec3 {
    return this.cabinetAnchor.getTransform().getWorldPosition().add(new vec3(0, 25, 0))
  }

  isBuilt(): boolean {
    return this.built
  }

  partDefOf(id: PartId): PartDef {
    return partDef(id)
  }
}
