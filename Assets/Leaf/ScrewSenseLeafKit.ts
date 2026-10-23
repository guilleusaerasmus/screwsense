// Shared helpers for the ScrewSense LEAF scenarios.

import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import {findInteractableByName} from "Leaf.lspkg/Interactors/InteractableUtils"
import {Interactable} from "SpectaclesInteractionKit.lspkg/Components/Interaction/Interactable/Interactable"
import {ScrewSenseLeafInteractor} from "./ScrewSenseLeafInteractor"

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
  await ix.dragTo(must("Part" + part), dest)
  await sleep(150)
}

/** Complete the matching half of the current step with the right part. */
export async function matchCurrentStep(ix: ScrewSenseLeafInteractor, part: string): Promise<void> {
  await dropPart(ix, part, part)
  await sleep(400)
  expect(sys().getPhase()).toBe("place")
}
