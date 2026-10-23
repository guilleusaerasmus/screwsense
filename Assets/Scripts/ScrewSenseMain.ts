// ScrewSenseMain: the guided-assembly state machine for the bedside table.
// Owns step/phase state, decides right and wrong matches, and drives the
// world (3D content), the UI (flat elements) and the sounds.
//
// Expects: @input world, ui and audio tracks wired by the bootstrap.
// Must not: build geometry or UI elements itself.

import {ScrewSenseWorld} from "./ScrewSenseWorld"
import {ScrewSenseUI} from "./ScrewSenseUI"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {PartId, STEPS, StepDef, TOTAL_STEPS} from "./ScrewSenseConfig"

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
  @hint("Start step 1 immediately (otherwise the user must pinch Scan).")
  autoStart: boolean = true
  @input
  @hint("Where the step card hangs relative to the panel being worked on (cm).")
  cardOffset: vec3 = new vec3(2, 17, 12)
  @ui.group_end

  private step = 0
  private phase: Phase = "idle"
  private audio: {[k: string]: AudioComponent} = {}
  private hintTimer: DelayedCallbackEvent
  private token = 0

  onAwake(): void {
    ;(global as any).screwSense = this
    this.audio["match"] = this.makeAudio(this.matchTrack)
    this.audio["wrong"] = this.makeAudio(this.wrongTrack)
    this.audio["snap"] = this.makeAudio(this.snapTrack)
    this.hintTimer = this.createEvent("DelayedCallbackEvent")
    this.hintTimer.bind(() => this.ui.setCardHint(null))
    this.createEvent("OnStartEvent").bind(() => this.onStart())
  }

  private onStart(): void {
    this.placeInFrontOfUser()
    this.world.onPartReleased.add((e) => this.onPartReleased(e.partId, e.outlineId))
    this.ui.onDone.add(() => this.onDone())
    this.ui.onBack.add(() => this.onBack())
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
    if (a && a.audioTrack) a.play(1)
  }

  // ------------------------------------------------------------------ flow
  /** Reset everything to the start of the experience (also used by tests). */
  restart(): void {
    this.world.resetPanels(false)
    this.world.resetParts(false)
    this.world.setTrayVisible(false)
    this.world.clearHoles()
    this.world.setAllSolidFinal(false)
    this.ui.showMessage(null)
    this.ui.showCard(false)
    this.ui.showDoneBack(false)
    this.step = 0
    this.phase = "idle"
    if (this.autoStart) this.beginStep(0)
  }

  /** Begin the guided assembly (called by Scan in phase 3, or at start). */
  start(): void {
    if (this.phase === "idle") this.beginStep(0)
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
    this.showCardFor(s)
    this.ui.showDoneBack(true)
    this.ui.setDoneReady(false)
    this.ui.setBackEnabled(i > 0)
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
    this.ui.setDoneReady(true)
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

  private onDone(): void {
    if (this.phase === "match") {
      this.flashHint("Match the part first")
      return
    }
    if (this.phase !== "place") return
    this.phase = "busy"
    this.token++
    const s = this.currentStep()
    this.world.clearHoles()
    this.world.setTrayVisible(false)
    this.ui.showCard(false)
    this.ui.setDoneReady(false)
    this.world.assemblePanels(s.panels, () => {
      this.play("snap")
      if (this.step === STEPS.length - 1) {
        this.finish()
      } else {
        this.beginStep(this.step + 1)
      }
    })
  }

  private finish(): void {
    this.phase = "finished"
    this.world.setAllSolidFinal(true)
    this.ui.showCard(false)
    this.ui.showMessage("Assembled!")
    this.ui.setDoneReady(false)
    this.ui.setBackEnabled(true)
    this.play("match")
  }

  private onBack(): void {
    if (this.phase === "finished") {
      this.ui.showMessage(null)
      this.world.setAllSolidFinal(false)
      this.undoToPlace(this.step)
      return
    }
    if (this.phase === "place") {
      // Undo the match: the part has to be identified again.
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
    this.world.disassemblePanels(s.panels, () => {
      this.phase = "place"
      this.showCardFor(s)
      this.world.glowHoles(s.panels, s.partId)
      this.ui.showDoneBack(true)
      this.ui.setDoneReady(true)
      this.ui.setBackEnabled(true)
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
}
