// Done criterion 2: pinching Scan turns the manual's drawing into the life-size translucent
// hologram on the table and shows the "Step 1 of 4" card.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ScrewSenseLeafInteractor} from "./ScrewSenseLeafInteractor"
import {must, sys} from "./ScrewSenseLeafKit"

@component
export class ScrewSenseP3ScanScenario extends Scenario {
  async run(): Promise<void> {
    const ix = new ScrewSenseLeafInteractor()
    sys().restart()
    await sleep(800)
    const world = sys().world
    const ui = sys().ui
    expect(sys().getPhase()).toBe("idle")
    expect(world.isDrawingOnPage()).toBe(true)
    const pageY = world.drawingWorldPos().y

    await ix.trigger(must("ScanButton"))
    await sleep(500)
    // Mid-scan: the drawing has lifted off the page and the card is not there yet.
    expect(world.isScanning()).toBe(true)
    expect(world.drawingWorldPos().y - pageY).toBeGreaterThan(3)
    expect(ui.isCardVisible()).toBe(false)

    await sleep(2200)
    expect(world.isScanning()).toBe(false)
    expect(world.hasScanned()).toBe(true)
    expect(world.isDrawingOnPage()).toBe(false)
    if (world.panelsDraggable) expect(world.isHologramVisible()).toBe(true)
    expect(sys().getPhase()).toBe("match")
    expect(ui.isCardVisible()).toBe(true)
    expect(ui.getCardText().includes("Step 1 of 4")).toBe(true)
    expect(ui.isScanVisible()).toBe(false)
    expect(ui.isSliderVisible()).toBe(true)
  }
}
