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
import {ElementContent} from "SpectaclesUIKit.lspkg/Scripts/Components/Content/ElementContent"
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
  @ui.group_end

  readonly onDone = new Event<void>()
  readonly onBack = new Event<void>()

  private headerText: Text
  private bodyText: Text
  private doneButton: RoundButton
  private backButton: RectangleButton
  private messageText: Text
  private cardRoot: SceneObject
  private doneRoot: SceneObject
  private backRoot: SceneObject
  private messageRoot: SceneObject
  private lastBody = ""

  onAwake(): void {
    this.buildCard()
    this.buildDone()
    this.buildBack()
    this.buildMessage()
    this.showCard(false)
    this.showDoneBack(false)
    this.showMessage(null)
  }

  // ------------------------------------------------------------------ build
  private buildCard(): void {
    this.cardRoot = this.child(this.cardAnchor, "StepCard")
    this.cardRoot.createComponent("Component.Canvas")
    this.cardRoot.createComponent(Billboard.getTypeName())
    const plate = this.cardRoot.createComponent(BackPlate.getTypeName()) as BackPlate

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
    this.doneButton.onTriggerUp.add(() => this.onDone.invoke())
  }

  private buildBack(): void {
    this.backRoot = this.child(this.backAnchor, "BackButton")
    this.backRoot.createComponent(Billboard.getTypeName())
    this.backButton = this.backRoot.createComponent(RectangleButton.getTypeName()) as RectangleButton
    this.backButton.onInitialized.add(() => {
      this.backButton.size = new vec3(this.backWidth, 3.6, 1)
    })
    this.labelButton(this.backRoot, "Back", "Subheadline", new vec2(this.backWidth, 2.4))
    this.backButton.onTriggerUp.add(() => this.onBack.invoke())
  }

  private labelButton(parent: SceneObject, text: string, role: TextRole, size: vec2): void {
    const ec = parent.createComponent(ElementContent.getTypeName()) as ElementContent
    ec.text = text
    ec.textSize = roleSize(role)
    ec.sizeOverride = size
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

  private child(parent: SceneObject, name: string): SceneObject {
    const so = global.scene.createSceneObject(name)
    so.setParent(parent)
    return so
  }

  // ------------------------------------------------------------------ API
  showCard(visible: boolean): void {
    this.cardRoot.enabled = visible
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
    this.doneAnchor.getTransform().setWorldPosition(worldPos.add(this.doneOffset))
    this.backAnchor.getTransform().setWorldPosition(worldPos.add(this.backOffset))
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
