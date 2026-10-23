// Shared helpers for the ScrewSense LEAF scenarios.

import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {ScrewSenseLeafInteractor} from "./ScrewSenseLeafInteractor"
import {STEPS} from "../Scripts/ScrewSenseConfig"

/** The running ScrewSenseMain (it publishes itself as global.screwSense). */
export function sys(): any {
  const s = (global as any).screwSense
  if (!s) throw new Error("ScrewSenseMain is not running (global.screwSense missing)")
  return s
}

export function must(name: string): Interactable {
  const i = findInteractableByName(name, undefined, true)
  if (!i) throw new Error("Interactable " + name + " not found or not enabled")
  return i
}

/** Reset the Lens to its start state and, if needed, start the guided assembly. */
export async function begin(ix: ScrewSenseLeafInteractor): Promise<void> {
  sys().restart()
  await sleep(800)
  if (sys().getPhase() === "idle") {
    await ix.trigger(must("ScanButton"))
    await sleep(3200)
  }
  expect(sys().getPhase()).toBe("match")
}

export async function tap(ix: ScrewSenseLeafInteractor, name: string): Promise<void> {
  await ix.trigger(must(name))
  await sleep(250)
}

/** Grab a part from the dish and release it over an outline. */
export async function dropPart(ix: ScrewSenseLeafInteractor, part: string, outline: string): Promise<void> {
  const dest = sys().world.outlineWorldPos(outline)
  const target = must("Part" + part)
  // The closed-loop drag occasionally diverges; a failed attempt releases the part (it
  // returns to the dish) and the drag is retried.
  let lastError: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await ix.dragTo(target, dest)
      lastError = null
      break
    } catch (e) {
      lastError = e
      await sleep(700)
      if (sys().getPhase() !== "match") break
    }
  }
  if (lastError !== null) {
    const at = target.getTransform().getWorldPosition()
    throw new Error(
      "dropPart " + part + "->" + outline + " (step " + sys().getStepIndex() + ", phase " + sys().getPhase() + "): " +
        lastError + " | part at " + at + " dest " + dest
    )
  }
  await sleep(150)
}

/** Drag a panel to its hologram slot (plus an offset in cm) and release it there. */
export async function dragPanel(ix: ScrewSenseLeafInteractor, id: string, offset: vec3): Promise<void> {
  const dest = sys().world.panelSlotWorldPos(id).add(offset)
  const target = must("Panel_" + id)
  let lastError: unknown = null
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await ix.dragTo(target, dest, 0.8, 8000)
      lastError = null
      break
    } catch (e) {
      lastError = e
      await sleep(700)
    }
  }
  if (lastError !== null) throw new Error("dragPanel " + id + ": " + lastError)
  await sleep(150)
}

/** Phase 2: put every panel of a step into its slot and flip the ones that are upside down. */
export async function placeStepPanels(ix: ScrewSenseLeafInteractor, stepIndex: number): Promise<void> {
  for (const id of STEPS[stepIndex].panels) {
    await dragPanel(ix, id, new vec3(0, 0, 0))
    await sleep(600)
    if (sys().world.panelIsFlipped(id)) {
      await tap(ix, "FlipButton")
      await sleep(800)
    }
  }
}

/** Complete the matching half of the current step with the right part. */
export async function matchCurrentStep(ix: ScrewSenseLeafInteractor, part: string): Promise<void> {
  await dropPart(ix, part, part)
  await sleep(400)
  expect(sys().getPhase()).toBe("place")
}
