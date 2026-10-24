// ScrewSenseMain: the guided-assembly state machine for the bedside table.
// Owns step/phase state, decides right and wrong matches, and drives the
// world (3D content), the UI (flat elements) and the sounds.
//
// Expects: @input world, ui and audio tracks wired by the bootstrap.
// Must not: build geometry or UI elements itself.

import {ScrewSenseWorld} from "./ScrewSenseWorld"
import {ScrewSenseUI} from "./ScrewSenseUI"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {PanelId, PartId, STEPS, StepDef, TOTAL_STEPS, panelDef} from "./ScrewSenseConfig"

// A released panel snaps into its slot when its centre is this close (cm).
const SNAP_CM = 5

export type Phase = "idle" | "match" | "place" | "busy" | "finished"

@component
export class ScrewSenseMain extends BaseScriptComponent {
  @ui.label("<b>ScrewSense</b>")
  @ui.separator
  @ui.group_start("References")
  @input
  world: ScrewSenseWorld
  @input
  ui: ScrewSenseUI
  @input
  @allowUndefined
  @hint("High tone on a right match.")
  matchTrack: AudioTrackAsset
  @input
  @allowUndefined
  @hint("Low tone on a wrong match.")
  wrongTrack: AudioTrackAsset
  @input
  @allowUndefined
  @hint("Soft click when something snaps into place.")
  snapTrack: AudioTrackAsset
  @ui.group_end
  @ui.group_start("Settings")
  @input
  @hint("Start step 1 immediately (otherwise the user must pinch Scan on the manual).")
  autoStart: boolean = false
  @input
  @hint("Where the step card hangs relative to the panel being worked on (cm).")
  cardOffset: vec3 = new vec3(2, 17, 12)
  @input
  @hint("Scan button position in table space (cm), beside the paper manual.")
  scanPos: vec3 = new vec3(-38, 8, 60)
  @input
  @hint("Rewind slider centre in table space (cm), along the front edge under the hologram.")
  sliderPos: vec3 = new vec3(30, 4, 74)
  @ui.group_end

  private step = 0
  private phase: Phase = "idle"
  private audio: {[k: string]: AudioComponent} = {}
  private plays: {[k: string]: number} = {}
  private hintTimer: DelayedCallbackEvent
  private token = 0
  private placed: PanelId[] = []
  private rewinding = false
  private releaseTimer: DelayedCallbackEvent

  onAwake(): void {
    ;(global as any).screwSense = this
    this.audio["match"] = this.makeAudio(this.matchTrack)
    this.audio["wrong"] = this.makeAudio(this.wrongTrack)
    this.audio["snap"] = this.makeAudio(this.snapTrack)
    this.hintTimer = this.createEvent("DelayedCallbackEvent")
    this.hintTimer.bind(() => this.ui.setCardHint(null))
    this.releaseTimer = this.createEvent("DelayedCallbackEvent")
    this.releaseTimer.bind(() => this.finishRewind())
    this.createEvent("OnStartEvent").bind(() => this.onStart())
  }

  private onStart(): void {
    this.placeInFrontOfUser()
    this.world.onPartReleased.add((e) => this.onPartReleased(e.partId, e.outlineId))
    this.world.onPanelGrabbed.add((id) => this.onPanelGrabbed(id))
    this.world.onPanelReleased.add((e) => this.onPanelReleased(e.panelId, e.slotDistance))
    this.ui.onDone.add(() => this.onDone())
    this.ui.onBack.add(() => this.onBack())
    this.ui.onFlip.add(() => this.onFlip())
    this.ui.onScan.add(() => this.scan())
    this.ui.onRewindGrab.add(() => (this.rewinding = true))
    this.ui.onRewindMove.add((k) => this.rewindTo(k))
    this.ui.onRewindRelease.add(() => this.rewindRelease())
    this.restart()
  }

  /**
   * Put the whole rig where the user is: it takes the head position and heading at
   * start, so the table (authored 70 cm ahead, 22 cm below the eyes) is in front of
   * the user wherever the world origin happens to be.
   */
  placeInFrontOfUser(): void {
    const cam = WorldCameraFinderProvider.getInstance().getTransform()
    const pos = cam.getWorldPosition()
    const fwd = cam.getWorldRotation().multiplyVec3(new vec3(0, 0, -1))
    const yaw = Math.atan2(-fwd.x, -fwd.z)
    const tr = this.sceneObject.getTransform()
    tr.setWorldPosition(pos)
    tr.setWorldRotation(quat.fromEulerAngles(0, yaw, 0))
  }

  private makeAudio(track: AudioTrackAsset): AudioComponent {
    const obj = global.scene.createSceneObject("Audio")
    obj.setParent(this.sceneObject)
    const a = obj.createComponent("Component.AudioComponent") as AudioComponent
    if (track) a.audioTrack = track
    return a
  }

  private play(name: string): void {
    const a = this.audio[name]
    this.plays[name] = (this.plays[name] || 0) + 1
    if (a && a.audioTrack) a.play(1)
  }

  /** How many times a sound ("match", "wrong", "snap") has been triggered (tests). */
  playCount(name: string): number {
    return this.plays[name] || 0
  }

  // ------------------------------------------------------------------ flow
  /** Reset everything to the start of the experience (also used by tests). */
  restart(): void {
    this.rewinding = false
    this.world.cancelRewind()
    this.world.resetManual()
    this.world.resetPanels(false)
    this.world.resetParts(false)
    this.world.setTrayVisible(false)
    this.world.clearHoles()
    this.world.setAllSolidFinal(false)
    // The hologram only exists once the manual has been scanned (or at once with autoStart).
    this.world.setHologramVisible(this.dragMode() && this.autoStart)
    this.world.setActiveSlots([])
    this.placed = []
    this.ui.showFlip(null)
    this.ui.showMessage(null)
    this.ui.showCard(false)
    this.ui.showDoneBack(false)
    this.step = 0
    this.phase = "idle"
    this.ui.showScanAt(this.autoStart ? null : this.world.tableWorldPoint(this.scanPos))
    this.ui.showSliderAt(this.autoStart ? this.world.tableWorldPoint(this.sliderPos) : null)
    this.syncSlider()
    if (this.autoStart) this.beginStep(0)
  }

  /** Pinching Scan: the drawing becomes the hologram, then the guided assembly starts at step 1. */
  scan(): void {
    if (this.phase !== "idle" || this.world.isScanning()) return
    this.phase = "busy"
    this.ui.showScanAt(null)
    this.play("snap")
    this.world.playScan(() => {
      this.ui.showSliderAt(this.world.tableWorldPoint(this.sliderPos))
      this.syncSlider()
      this.beginStep(0)
    })
  }

  // ------------------------------------------------------------------ rewind (phase 3)
  /** Progress as a 0..1 value: completed steps out of all steps (the slider's resting value). */
  getProgress(): number {
    if (this.phase === "finished") return 1
    if (this.phase === "idle") return 0
    return this.step / TOTAL_STEPS
  }

  /** Move the slider knob to the current progress (unless the user is holding it). */
  private syncSlider(animate: boolean = false): void {
    if (this.rewinding) return
    this.ui.setSliderValue(this.getProgress(), animate)
  }

  /** Show the whole bedside table at `k` (0 exploded, 1 assembled). Progress is untouched. */
  rewindTo(k: number): void {
    if (this.phase === "idle") return
    this.rewinding = true
    this.releaseTimer.enabled = false
    this.world.showRewind(k)
  }

  /** The slider was let go: the model and the knob return to the current progress. */
  rewindRelease(): void {
    if (!this.rewinding) return
    // Let the slider finish its own drag-end handling before its knob is moved back.
    this.releaseTimer.enabled = true
    this.releaseTimer.reset(0.05)
  }

  private finishRewind(): void {
    const p = this.getProgress()
    this.world.endRewind(p)
    this.rewinding = false
    this.syncSlider(true)
  }

  /** True while the rewind model is on show (tests). */
  isRewinding(): boolean {
    return this.rewinding
  }

  /** Begin the guided assembly (from the start state). */
  start(): void {
    if (this.phase === "idle") this.scan()
  }

  private currentStep(): StepDef {
    return STEPS[this.step]
  }

  private beginStep(i: number): void {
    this.token++
    this.step = i
    this.phase = "match"
    const s = this.currentStep()
    this.world.clearHoles()
    this.world.resetParts(true)
    this.world.setTrayVisible(true)
    this.placed = []
    this.ui.showFlip(null)
    this.world.setActiveSlots(this.dragMode() ? s.panels : [])
    this.showCardFor(s)
    this.ui.showDoneBack(true)
    this.ui.setDoneReady(false)
    this.ui.setBackEnabled(i > 0)
    this.syncSlider(true)
  }

  private showCardFor(s: StepDef): void {
    this.ui.setCard(s.index, TOTAL_STEPS, s.text)
    const base = this.world.panelWorldPos(s.panels[0])
    this.ui.moveCardTo(base.add(this.cardOffset))
    this.ui.showCard(true)
  }

  private onPartReleased(partId: PartId, outlineId: PartId | null): void {
    if (this.phase !== "match" || outlineId === null) {
      this.world.returnPartHome(partId)
      return
    }
    const s = this.currentStep()
    const fits = partId === outlineId
    if (fits && partId === s.partId) {
      this.rightMatch(partId)
    } else {
      this.wrongMatch(partId, outlineId, fits ? s.partId : partId)
    }
  }

  private rightMatch(partId: PartId): void {
    this.phase = "place"
    const token = ++this.token
    const s = this.currentStep()
    this.world.setOutlineState(partId, "match")
    this.world.snapPartIntoOutline(partId)
    this.play("match")
    this.world.glowHoles(s.panels, partId)
    this.refreshPlaceUi()
    // The step counts as matched immediately; the tray leaves after a short beat.
    this.after(0.7, () => {
      if (token === this.token && this.phase === "place") {
        this.world.setTrayVisible(false)
        this.world.setPartVisible(partId, false)
      }
    })
  }

  private wrongMatch(partId: PartId, outlineId: PartId, hintId: PartId): void {
    this.world.setOutlineState(outlineId, "wrong")
    this.world.shakeOutline(outlineId)
    this.play("wrong")
    this.world.returnPartHome(partId)
    for (const id of ["A", "B", "C"]) {
      if (id !== outlineId) this.world.setOutlineState(id as PartId, "neutral")
    }
    this.world.setOutlineState(hintId, "hint")
    this.after(0.9, () => {
      if (this.phase === "match" && this.world.getOutlineState(outlineId) === "wrong") {
        this.world.setOutlineState(outlineId, "neutral")
      }
    })
  }

  // ------------------------------------------------------------------ panels (phase 2)
  /** Panels are placed by hand into the hologram instead of flying there. */
  private dragMode(): boolean {
    return this.world.panelsDraggable
  }

  private flippedPlaced(): PanelId | null {
    for (const id of this.placed) if (this.world.panelIsFlipped(id)) return id
    return null
  }

  private allPlaced(): boolean {
    const s = this.currentStep()
    return s.panels.every((id) => this.placed.indexOf(id) >= 0 && !this.world.panelIsFlipped(id))
  }

  /** Done is ready once the step is matched and, in hand-placement mode, every panel sits right. */
  private refreshPlaceUi(): void {
    if (!this.dragMode()) {
      this.ui.setDoneReady(true)
      return
    }
    this.ui.setDoneReady(this.phase === "place" && this.allPlaced())
    const flipped = this.flippedPlaced()
    if (flipped === null) {
      this.ui.showFlip(null)
    } else {
      this.ui.showFlip(this.world.panelSlotWorldPos(flipped).add(new vec3(0, 14, 10)))
    }
  }

  private onPanelGrabbed(id: PanelId): void {
    const i = this.placed.indexOf(id)
    if (i >= 0) {
      this.placed.splice(i, 1)
      this.world.markPanelUnplaced(id)
      this.refreshPlaceUi()
    }
  }

  private onPanelReleased(id: PanelId, slotDistance: number): void {
    const s = this.currentStep()
    const mine = this.phase === "place" && s.panels.indexOf(id) >= 0
    if (!mine && panelDef(id).step < s.index && this.world.panelIsAssembled(id)) {
      // A panel of a finished step belongs in its slot: put it back.
      this.world.snapPanelToSlot(id)
      return
    }
    if (!mine || slotDistance > SNAP_CM) {
      this.world.returnPanelToPile(id)
      this.refreshPlaceUi()
      return
    }
    if (this.placed.indexOf(id) < 0) this.placed.push(id)
    this.world.snapPanelToSlot(id)
    this.play("snap")
    this.refreshPlaceUi()
    if (this.world.panelIsFlipped(id)) this.flashHint("Upside down: pinch Flip")
  }

  private onFlip(): void {
    const id = this.flippedPlaced()
    if (id === null) return
    this.world.flipPanel(id, () => this.refreshPlaceUi())
    this.ui.showFlip(null)
  }

  private onDone(): void {
    if (this.phase === "match") {
      this.flashHint("Match the part first")
      return
    }
    if (this.phase !== "place") return
    if (this.dragMode() && !this.allPlaced()) {
      this.flashHint(this.flippedPlaced() !== null ? "Flip the panel first" : "Place the panels in their slots")
      return
    }
    this.phase = "busy"
    this.token++
    const s = this.currentStep()
    this.world.clearHoles()
    this.world.setTrayVisible(false)
    this.ui.showCard(false)
    this.ui.setDoneReady(false)
    this.ui.showFlip(null)
    const advance = (): void => {
      this.play("snap")
      if (this.step === STEPS.length - 1) {
        this.finish()
      } else {
        this.beginStep(this.step + 1)
      }
    }
    if (this.dragMode()) {
      // The panels already sit in the hologram; a short beat, then the next step.
      this.world.setActiveSlots([])
      this.after(0.4, advance)
    } else {
      this.world.assemblePanels(s.panels, advance)
    }
  }

  private finish(): void {
    this.phase = "finished"
    this.world.setAllSolidFinal(true)
    this.world.setHologramVisible(false)
    this.ui.showCard(false)
    this.ui.showMessage("Assembled!")
    this.ui.setDoneReady(false)
    this.ui.setBackEnabled(true)
    this.play("match")
    this.syncSlider(true)
  }

  private onBack(): void {
    if (this.phase === "finished") {
      this.ui.showMessage(null)
      this.world.setAllSolidFinal(false)
      this.undoToPlace(this.step)
      return
    }
    if (this.phase === "place") {
      // Undo the match: the part has to be identified again, panels go back to the pile.
      if (this.dragMode()) for (const id of this.currentStep().panels) this.world.returnPanelToPile(id)
      this.beginStep(this.step)
      return
    }
    if (this.phase === "match" && this.step > 0) {
      this.undoToPlace(this.step - 1)
    }
  }

  /** Return the panels of step `i` to the pile and show that step as matched. */
  private undoToPlace(i: number): void {
    this.token++
    this.phase = "busy"
    this.step = i
    const s = this.currentStep()
    this.world.setTrayVisible(false)
    this.ui.showCard(false)
    this.ui.showFlip(null)
    this.placed = []
    this.world.setAllSolidFinal(false)
    if (this.dragMode()) this.world.setHologramVisible(true)
    this.world.disassemblePanels(s.panels, () => {
      this.phase = "place"
      this.world.setActiveSlots(this.dragMode() ? s.panels : [])
      this.showCardFor(s)
      this.world.glowHoles(s.panels, s.partId)
      this.ui.showDoneBack(true)
      this.refreshPlaceUi()
      this.ui.setBackEnabled(true)
      this.syncSlider(true)
    })
  }

  private flashHint(text: string): void {
    this.ui.setCardHint(text)
    this.hintTimer.reset(2.2)
  }

  private after(seconds: number, fn: () => void): void {
    const e = this.createEvent("DelayedCallbackEvent")
    e.bind(fn)
    e.reset(seconds)
  }

  // ------------------------------------------------------------------ queries (tests)
  getStepIndex(): number {
    return this.step
  }

  getPhase(): Phase {
    return this.phase
  }

  isPanelPlaced(id: PanelId): boolean {
    return this.placed.indexOf(id) >= 0
  }
}
