// Done criterion 5: dragging the current step's panel close to its slot snaps it into the
// hologram; a panel placed flipped shows a red edge and the Flip button, and pinching Flip
// corrects it.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {ScrewSenseLeafInteractor} from "./ScrewSenseLeafInteractor"
import {begin, dragPanel, matchCurrentStep, sys, tap} from "./ScrewSenseLeafKit"

@component
export class ScrewSenseP2PanelScenario extends Scenario {
  async run(): Promise<void> {
    const ix = new ScrewSenseLeafInteractor()
    await begin(ix)
    const world = sys().world
    const ui = sys().ui
    expect(world.panelsDraggable).toBe(true)

    // Step 1: dowels first, then the two side panels.
    await matchCurrentStep(ix, "C")

    // Done is refused until the panels are in their slots.
    await tap(ix, "DoneButton")
    expect(sys().getStepIndex()).toBe(0)
    expect(sys().getPhase()).toBe("place")
    expect(ui.getCardText().includes("Place")).toBe(true)

    // Released far from the slot: the panel goes back to the pile.
    await dragPanel(ix, "sideL", new vec3(30, 0, 0))
    await sleep(600)
    expect(sys().isPanelPlaced("sideL")).toBe(false)
    expect(world.panelIsAssembled("sideL")).toBe(false)

    // Released close to the slot: it snaps in and turns solid, no red edge.
    await dragPanel(ix, "sideL", new vec3(3, 0, 0))
    await sleep(600)
    expect(sys().isPanelPlaced("sideL")).toBe(true)
    expect(world.panelIsAssembled("sideL")).toBe(true)
    expect(world.panelWorldPos("sideL").distance(world.panelSlotWorldPos("sideL"))).toBeLessThan(0.5)
    expect(world.panelRedEdgeVisible("sideL")).toBe(false)

    await dragPanel(ix, "sideR", new vec3(-3, 0, 0))
    await sleep(600)
    expect(sys().isPanelPlaced("sideR")).toBe(true)

    await tap(ix, "DoneButton")
    await sleep(1000)
    expect(sys().getStepIndex()).toBe(1)
    expect(sys().getPhase()).toBe("match")

    // Step 2: the bottom panel starts upside down.
    await matchCurrentStep(ix, "A")
    await dragPanel(ix, "bottom", new vec3(0, 0, 2))
    await sleep(600)
    expect(sys().isPanelPlaced("bottom")).toBe(true)
    expect(world.panelIsFlipped("bottom")).toBe(true)
    expect(world.panelRedEdgeVisible("bottom")).toBe(true)
    expect(ui.isFlipVisible()).toBe(true)

    // Done is refused while a panel is flipped.
    await tap(ix, "DoneButton")
    expect(sys().getStepIndex()).toBe(1)
    expect(ui.getCardText().includes("Flip")).toBe(true)

    // Pinching Flip corrects it.
    await tap(ix, "FlipButton")
    await sleep(800)
    expect(world.panelIsFlipped("bottom")).toBe(false)
    expect(world.panelRedEdgeVisible("bottom")).toBe(false)
    expect(ui.isFlipVisible()).toBe(false)

    await tap(ix, "DoneButton")
    await sleep(1000)
    expect(sys().getStepIndex()).toBe(2)
    expect(sys().getPhase()).toBe("match")
  }
}
