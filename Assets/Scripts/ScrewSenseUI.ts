// ScrewSenseUI: every flat UI element of ScrewSense, built from SpectaclesUIKit.
// Passive view: ScrewSenseMain pushes state in through the public methods and
// listens to the public events. It holds no game state.
//
// Expects: authored anchor SceneObjects (card, done, back, message) wired by the
// bootstrap. Each element is created under its anchor, so a human can move an
// anchor in the Scene panel to retune the layout.

import {FlexLayout} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexLayout"
import {FlexItem} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexItem"
import {FlexAlign, FlexDirection, FlexJustify} from "SpectaclesUIKit.lspkg/Scripts/Components/Layout2D/Flex/FlexTypes"
import {BackPlate} from "SpectaclesUIKit.lspkg/Scripts/BackPlate"
import {RoundButton} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/RoundButton"
import {RectangleButton} from "SpectaclesUIKit.lspkg/Scripts/Components/Button/RectangleButton"
import {Slider} from "SpectaclesUIKit.lspkg/Scripts/Components/Slider/Slider"
import {ElementContent} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent"
import {RoundedRectangle, GradientParameters} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangle"
import {RoundedRectangleVisual} from "SpectaclesUIKit.lspkg/Scripts/Visuals/RoundedRectangle/RoundedRectangleVisual"
import {Billboard} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Billboard/Billboard"
import Event from "SpectaclesInteractionKit.lspkg/Utils/Event"

// Type scale (single source of truth for text size). Calibrated for 110 cm; the
// table content is read from about 80 cm, so sizes are scaled by distance.
const READ_DISTANCE_CM = 85
type TextRole = "Title2" | "Headline1" | "Headline2" | "Subheadline" | "Body" | "Button"
const TYPE_SCALE: Record<TextRole, {size: number; weight: number}> = {
  Title2: {size: 93, weight: 700},
  Headline1: {size: 54, weight: 700},
  Headline2: {size: 48, weight: 700},
  Subheadline: {size: 41, weight: 700},
  Body: {size: 39, weight: 500},
  Button: {size: 39, weight: 500}
}
// Light palette: the display is additive, so dark plates would vanish. Plates are
// bright with dark text, which stays readable against any room.
const UI_PLATE = new vec4(0.9, 0.95, 1.0, 1)
const UI_TEXT = new vec4(0.04, 0.1, 0.22, 1)
function solid(c: vec4): GradientParameters {
  return {
    type: "Linear",
    start: new vec2(-1, 1),
    end: new vec2(1, -1),
    stop0: {enabled: true, color: c, percent: 0},
    stop1: {enabled: true, color: c, percent: 1}
  }
}
function styleVisual(v: RoundedRectangleVisual, base: vec4, hover: vec4, press: vec4): void {
  v.defaultGradient = solid(base)
  v.hoveredGradient = solid(hover)
  v.triggeredGradient = solid(press)
  v.inactiveGradient = solid(base.uniformScale(0.8))
}
function darkText(ec: ElementContent): void {
  const e = ec as any
  e._useTextColorOverride = true
  e._textColorOverride = UI_TEXT
}
function roleSize(role: TextRole): number {
  return TYPE_SCALE[role].size * (READ_DISTANCE_CM / 110)
}
function applyTextRole(t: Text, role: TextRole): void {
  t.size = roleSize(role)
  ;(t as Text & {weight?: number}).weight = TYPE_SCALE[role].weight
}

@component
export class ScrewSenseUI extends BaseScriptComponent {
  @ui.label("<b>ScrewSense UI</b>")
  @ui.separator
  @ui.group_start("Anchors")
  @input
  @hint("Where the step card hangs (moved at runtime next to the panel being worked on).")
  cardAnchor: SceneObject
  @input
  @hint("Where the big round Done button sits.")
  doneAnchor: SceneObject
  @input
  @hint("Where the smaller Back button sits.")
  backAnchor: SceneObject
  @input
  @hint("Where the 'Assembled!' message floats.")
  messageAnchor: SceneObject
  @ui.group_end
  @ui.group_start("Settings")
  @input
  @hint("Step card width (cm).")
  cardWidth: number = 18
  @input
  @hint("Done button position relative to the card (cm).")
  doneOffset: vec3 = new vec3(15, -1, 0)
  @input
  @hint("Back button position relative to the card (cm).")
  backOffset: vec3 = new vec3(15, -8, 0)
  @input
  @hint("Diameter of the Done button (cm).")
  doneSize: number = 8
  @input
  @hint("Width of the Back button (cm).")
  backWidth: number = 6
  @input
  @hint("Diameter of the Scan button in the world (cm).")
  scanSize: number = 8
  @input
  @hint("Length of the rewind slider track in the world (cm).")
  sliderLength: number = 30
  @input
  @hint("Demo caption text size.")
  captionSize: number = 120
  @input
  @hint("Demo caption width (cm).")
  captionWidth: number = 76
  @input
  @hint("Uniform scale of every UI element: the table is read from about 1.5 m, so the UI is enlarged.")
  uiScale: number = 3
  @ui.group_end

  readonly onDone = new Event<void>()
  readonly onBack = new Event<void>()
  readonly onFlip = new Event<void>()
  readonly onScan = new Event<void>()
  // Rewind slider: grabbed, moved (0 exploded to 1 assembled) and released.
  readonly onRewindGrab = new Event<void>()
  readonly onRewindMove = new Event<number>()
  readonly onRewindRelease = new Event<void>()

  private headerText: Text
  private bodyText: Text
  private doneButton: RoundButton
  private backButton: RectangleButton
  private flipButton: RectangleButton
  private flipRoot: SceneObject
  private messageText: Text
  private captionRoot: SceneObject
  private captionText: Text
  private captionRecolor: DelayedCallbackEvent
  private cardRoot: SceneObject
  private doneRoot: SceneObject
  private backRoot: SceneObject
  private messageRoot: SceneObject
  private scanRoot: SceneObject
  private scanButton: RoundButton
  private sliderRoot: SceneObject
  private slider: Slider
  private sliderHolding = false
  private plateRecolor: DelayedCallbackEvent
  private lastBody = ""

  onAwake(): void {
    this.sceneObject.getTransform().setLocalScale(vec3.one().uniformScale(this.uiScale))
    this.buildCard()
    this.buildDone()
    this.buildBack()
    this.buildFlip()
    this.buildMessage()
    this.buildScan()
    this.buildSlider()
    this.buildCaption()
    this.showCard(false)
    this.showFlip(null)
    this.showDoneBack(false)
    this.showMessage(null)
    this.showScan(false)
    this.showSlider(false)
  }

  // ------------------------------------------------------------------ build
  private buildCard(): void {
    this.cardRoot = this.child(this.cardAnchor, "StepCard")
    this.cardRoot.createComponent("Component.Canvas")
    this.cardRoot.createComponent(Billboard.getTypeName())
    const plate = this.cardRoot.createComponent(BackPlate.getTypeName()) as BackPlate
    // The plate initialises itself on OnStart and sets its dark default; recolour it just after.
    this.plateRecolor = this.createEvent("DelayedCallbackEvent")
    this.plateRecolor.bind(() => this.colorPlate(this.cardRoot))
    this.createEvent("OnStartEvent").bind(() => this.plateRecolor.reset(0.1))

    const content = this.child(this.cardRoot, "Content")
    content.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    flex.width = this.cardWidth
    flex.height = -1
    flex.direction = FlexDirection.Column
    flex.justifyContent = FlexJustify.Start
    flex.alignItems = FlexAlign.Stretch
    flex.rowGap = 0.4
    flex.paddingTop = 1.0
    flex.paddingBottom = 1.0
    flex.paddingLeft = 1.2
    flex.paddingRight = 1.2
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })

    const innerW = this.cardWidth - 2.4
    this.headerText = this.rowText(content, "Header", innerW, 2.4, "Title2")
    this.bodyText = this.rowText(content, "Body", innerW, 4.2, "Subheadline")
    this.bodyText.horizontalOverflow = HorizontalOverflow.Wrap
    this.bodyText.verticalAlignment = VerticalAlignment.Top
    this.headerText.text = "Step 1 of 4"
    this.bodyText.text = ""
  }

  private rowText(parent: SceneObject, name: string, w: number, h: number, role: TextRole): Text {
    const so = this.child(parent, name)
    const t = so.createComponent("Component.Text") as Text
    t.depthTest = true
    applyTextRole(t, role)
    t.textFill.color = UI_TEXT
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-w / 2, w / 2, -h / 2, h / 2)
    so.createComponent(FlexItem.getTypeName())
    return t
  }

  private buildDone(): void {
    this.doneRoot = this.child(this.doneAnchor, "DoneButton")
    this.doneRoot.createComponent(Billboard.getTypeName())
    this.doneButton = this.doneRoot.createComponent(RoundButton.getTypeName()) as RoundButton
    this.doneButton.width = this.doneSize
    this.labelButton(this.doneRoot, "Done", "Headline2", new vec2(this.doneSize, 3))
    this.doneButton.onInitialized.add(() =>
      styleVisual(
        this.doneButton.visual as RoundedRectangleVisual,
        new vec4(0.6, 0.97, 0.7, 1),
        new vec4(0.85, 1, 0.9, 1),
        new vec4(0.4, 0.82, 0.55, 1)
      )
    )
    this.doneButton.onTriggerUp.add(() => this.onDone.invoke())
  }

  private buildBack(): void {
    this.backRoot = this.child(this.backAnchor, "BackButton")
    this.backRoot.createComponent(Billboard.getTypeName())
    this.backButton = this.backRoot.createComponent(RectangleButton.getTypeName()) as RectangleButton
    this.backButton.onInitialized.add(() => {
      this.backButton.size = new vec3(this.backWidth, 3.6, 1)
      styleVisual(
        this.backButton.visual as RoundedRectangleVisual,
        new vec4(0.85, 0.9, 1, 1),
        new vec4(1, 1, 1, 1),
        new vec4(0.6, 0.7, 0.92, 1)
      )
    })
    this.labelButton(this.backRoot, "Back", "Subheadline", new vec2(this.backWidth, 2.4))
    this.backButton.onTriggerUp.add(() => this.onBack.invoke())
  }

  /** The Flip button hangs next to a panel that was placed upside down (phase 2). */
  private buildFlip(): void {
    const anchor = global.scene.createSceneObject("FlipAnchor")
    anchor.setParent(this.sceneObject)
    this.flipRoot = this.child(anchor, "FlipButton")
    this.flipRoot.createComponent(Billboard.getTypeName())
    this.flipButton = this.flipRoot.createComponent(RectangleButton.getTypeName()) as RectangleButton
    this.flipButton.onInitialized.add(() => {
      this.flipButton.size = new vec3(this.backWidth, 3.6, 1)
      styleVisual(
        this.flipButton.visual as RoundedRectangleVisual,
        new vec4(1, 0.78, 0.7, 1),
        new vec4(1, 0.9, 0.85, 1),
        new vec4(0.95, 0.55, 0.45, 1)
      )
    })
    this.labelButton(this.flipRoot, "Flip", "Subheadline", new vec2(this.backWidth, 2.4))
    this.flipButton.onTriggerUp.add(() => this.onFlip.invoke())
  }

  /** The big Scan button beside the paper manual. */
  private buildScan(): void {
    const anchor = global.scene.createSceneObject("ScanAnchor")
    anchor.setParent(this.sceneObject)
    this.scanRoot = this.child(anchor, "ScanButton")
    this.scanRoot.createComponent(Billboard.getTypeName())
    this.scanButton = this.scanRoot.createComponent(RoundButton.getTypeName()) as RoundButton
    this.scanButton.width = this.scanSize / this.uiScale
    this.labelButton(this.scanRoot, "Scan", "Headline2", new vec2(this.scanSize / this.uiScale, 2.4), 1.2)
    this.scanButton.onInitialized.add(() =>
      styleVisual(
        this.scanButton.visual as RoundedRectangleVisual,
        new vec4(0.55, 0.92, 1, 1),
        new vec4(0.85, 0.98, 1, 1),
        new vec4(0.35, 0.75, 0.95, 1)
      )
    )
    this.scanButton.onTriggerUp.add(() => this.onScan.invoke())
  }

  /** The rewind slider along the front edge: left = exploded, right = assembled. */
  private buildSlider(): void {
    const anchor = global.scene.createSceneObject("SliderAnchor")
    anchor.setParent(this.sceneObject)
    this.sliderRoot = this.child(anchor, "RewindSlider")
    this.slider = this.sliderRoot.createComponent(Slider.getTypeName()) as Slider
    this.slider.onInitialized.add(() => {
      this.slider.size = new vec3(this.sliderLength / this.uiScale, 1.2, 1)
      const track = this.slider.visual as RoundedRectangleVisual
      if (track) styleVisual(track, new vec4(0.55, 0.62, 0.75, 1), new vec4(0.65, 0.72, 0.85, 1), new vec4(0.5, 0.58, 0.72, 1))
      const knob = this.slider.knobVisual as unknown as RoundedRectangleVisual
      if (knob) styleVisual(knob, new vec4(0.55, 0.92, 1, 1), new vec4(0.85, 0.98, 1, 1), new vec4(0.35, 0.75, 0.95, 1))
    })
    this.slider.onTriggerDown.add(() => {
      this.sliderHolding = true
      this.onRewindGrab.invoke()
    })
    this.slider.onKnobMoved.add((v) => {
      if (this.sliderHolding) this.onRewindMove.invoke(v)
    })
    this.slider.onTriggerUp.add(() => {
      if (!this.sliderHolding) return
      this.sliderHolding = false
      this.onRewindRelease.invoke()
    })
    const w = this.sliderLength / this.uiScale / 2
    this.sliderLabel("Rewind", new vec3(0, 2.4, 0), "Subheadline")
    this.sliderLabel("Exploded", new vec3(-w, -2.2, 0), "Body")
    this.sliderLabel("Assembled", new vec3(w, -2.2, 0), "Body")
  }

  private sliderLabel(text: string, pos: vec3, role: TextRole): void {
    const so = this.child(this.sliderRoot, "Label_" + text)
    so.getTransform().setLocalPosition(pos)
    const t = so.createComponent("Component.Text") as Text
    t.text = text
    t.depthTest = true
    applyTextRole(t, role)
    t.textFill.color = new vec4(0.92, 0.97, 1, 1)
    t.horizontalAlignment = HorizontalAlignment.Center
    t.verticalAlignment = VerticalAlignment.Center
    t.horizontalOverflow = HorizontalOverflow.Overflow
    t.verticalOverflow = VerticalOverflow.Overflow
    t.layoutRect = Rect.create(-3, 3, -0.9, 0.9)
  }

  private labelButton(parent: SceneObject, text: string, role: TextRole, size: vec2, scale: number = 1.4): void {
    const ec = parent.createComponent(ElementContent.getTypeName()) as ElementContent
    ec.text = text
    ec.textSize = roleSize(role) * scale
    ec.sizeOverride = size
    darkText(ec)
  }

  private buildMessage(): void {
    this.messageRoot = this.child(this.messageAnchor, "Message")
    this.messageRoot.createComponent(Billboard.getTypeName())
    this.messageText = this.messageRoot.createComponent("Component.Text") as Text
    this.messageText.depthTest = true
    applyTextRole(this.messageText, "Title2")
    this.messageText.size = roleSize("Title2") * 1.6
    this.messageText.horizontalAlignment = HorizontalAlignment.Center
    this.messageText.verticalAlignment = VerticalAlignment.Center
    this.messageText.horizontalOverflow = HorizontalOverflow.Overflow
    this.messageText.layoutRect = Rect.create(-14, 14, -3, 3)
    this.messageText.textFill.color = new vec4(0.5, 1, 0.6, 1)
  }

  /** Demo caption card: a large light plate with dark text floating above the table (demo flag only). */
  private buildCaption(): void {
    const anchor = global.scene.createSceneObject("CaptionAnchor")
    anchor.setParent(this.sceneObject)
    this.captionRoot = this.child(anchor, "Caption")
    this.captionRoot.createComponent("Component.Canvas")
    this.captionRoot.createComponent(Billboard.getTypeName())
    const plate = this.captionRoot.createComponent(BackPlate.getTypeName()) as BackPlate
    this.captionRecolor = this.createEvent("DelayedCallbackEvent")
    this.captionRecolor.bind(() => this.colorPlate(this.captionRoot))
    const content = this.child(this.captionRoot, "Content")
    content.getTransform().setLocalPosition(new vec3(0, 0, 0.6))
    const flex = content.createComponent(FlexLayout.getTypeName()) as FlexLayout
    const w = this.captionWidth / this.uiScale
    flex.width = w
    flex.height = -1
    flex.direction = FlexDirection.Column
    flex.justifyContent = FlexJustify.Start
    flex.alignItems = FlexAlign.Stretch
    flex.paddingTop = 1.2
    flex.paddingBottom = 1.2
    flex.paddingLeft = 1.4
    flex.paddingRight = 1.4
    flex.onLayoutComplete.add((r) => {
      plate.size = new vec2(r.containerWidth, r.containerHeight)
    })
    this.captionText = this.rowText(content, "CaptionText", w - 2.8, 9.5, "Title2")
    this.captionText.size = this.captionSize
    this.captionText.horizontalOverflow = HorizontalOverflow.Wrap
    this.captionRoot.enabled = false
  }

  private child(parent: SceneObject, name: string): SceneObject {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    return so
  }

  // ------------------------------------------------------------------ API
  showCard(visible: boolean): void {
    this.cardRoot.enabled = visible
    // The plate resets itself to its dark default when it is first enabled: recolour it again.
    if (visible) {
      this.colorPlate(this.cardRoot)
      this.plateRecolor.reset(0.1)
    }
  }

  private colorPlate(root: SceneObject): void {
    const rr = root.getComponent(RoundedRectangle.getTypeName()) as RoundedRectangle
    if (!rr) return
    rr.gradient = false
    rr.backgroundColor = UI_PLATE
  }

  isCardVisible(): boolean {
    return this.cardRoot.enabled
  }

  setCard(step: number, total: number, text: string): void {
    this.headerText.text = "Step " + step + " of " + total
    this.lastBody = text
    this.bodyText.text = text
  }

  /** Temporarily replace the card line (e.g. a hint); `null` restores the step text. */
  setCardHint(hint: string | null): void {
    this.bodyText.text = hint === null ? this.lastBody : hint
  }

  getCardText(): string {
    return this.headerText.text + " | " + this.bodyText.text
  }

  /** World position of the card anchor, used to hang it next to a panel. */
  moveCardTo(worldPos: vec3): void {
    this.cardAnchor.getTransform().setWorldPosition(worldPos)
    this.doneAnchor.getTransform().setWorldPosition(worldPos.add(this.doneOffset.uniformScale(this.uiScale)))
    this.backAnchor.getTransform().setWorldPosition(worldPos.add(this.backOffset.uniformScale(this.uiScale)))
  }

  showDoneBack(visible: boolean): void {
    this.doneRoot.enabled = visible
    this.backRoot.enabled = visible
  }

  setDoneReady(ready: boolean): void {
    this.doneButton.opacity = ready ? 1 : 0.45
  }

  setBackEnabled(enabled: boolean): void {
    this.backButton.opacity = enabled ? 1 : 0.45
  }

  /** Show the Flip button at a world position, or hide it with `null`. */
  showFlip(worldPos: vec3 | null): void {
    this.flipRoot.enabled = worldPos !== null
    if (worldPos !== null) this.flipRoot.getParent().getTransform().setWorldPosition(worldPos)
  }

  isFlipVisible(): boolean {
    return this.flipRoot.enabled
  }

  /** Show the Scan button at a world position, or hide it with `null`. */
  showScanAt(worldPos: vec3 | null): void {
    this.showScan(worldPos !== null)
    if (worldPos !== null) this.scanRoot.getParent().getTransform().setWorldPosition(worldPos)
  }

  private showScan(visible: boolean): void {
    this.scanRoot.enabled = visible
  }

  isScanVisible(): boolean {
    return this.scanRoot.enabled
  }

  /** Show the rewind slider with its centre at a world position, or hide it with `null`. */
  showSliderAt(worldPos: vec3 | null): void {
    this.showSlider(worldPos !== null)
    if (worldPos !== null) this.sliderRoot.getParent().getTransform().setWorldPosition(worldPos)
  }

  private showSlider(visible: boolean): void {
    this.sliderRoot.enabled = visible
    if (!visible) this.sliderHolding = false
  }

  isSliderVisible(): boolean {
    return this.sliderRoot.enabled
  }

  /** Move the slider knob (0 exploded to 1 assembled) without it counting as a user drag. */
  setSliderValue(v: number, animate: boolean = false): void {
    this.sliderHolding = false
    const c = Math.max(0, Math.min(1, v))
    if (animate) this.slider.updateCurrentValue(c, true)
    else this.slider.resetToValue(c)
  }

  getSliderValue(): number {
    return this.slider.knobValue
  }

  /** Show a demo caption with its centre at a world position, or hide it with `null`. */
  showCaptionAt(text: string | null, worldPos?: vec3): void {
    this.captionRoot.enabled = text !== null
    if (text === null) return
    this.captionText.text = text
    // The plate resets itself to its dark default when first enabled: recolour it again.
    this.colorPlate(this.captionRoot)
    this.captionRecolor.reset(0.1)
    if (worldPos) this.captionRoot.getParent().getTransform().setWorldPosition(worldPos)
  }

  getCaption(): string {
    return this.captionRoot.enabled ? this.captionText.text : ""
  }

  showMessage(text: string | null): void {
    this.messageRoot.enabled = text !== null
    if (text !== null) this.messageText.text = text
  }

  getMessage(): string {
    return this.messageRoot.enabled ? this.messageText.text : ""
  }

  isDoneVisible(): boolean {
    return this.doneRoot.enabled
  }

}
