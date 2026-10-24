// Done criterion 1: at start, the table with the paper manual, the flat-packed parts, the
// parts dish and the Scan button are in view in front of the user.

import {Scenario} from "Leaf.lspkg/Scenarios/scenario/Scenario"
import {expect} from "Leaf.lspkg/Utils/common/Expect"
import {sleep} from "Leaf.lspkg/Utils/common/Utils"
import WorldCameraFinderProvider from "SpectaclesInteractionKit.lspkg/Providers/CameraProvider/WorldCameraFinderProvider"
import {must, sys} from "./ScrewSenseLeafKit"

// Everything has to sit within this angle of the view direction.
const VIEW_HALF_ANGLE_DEG = 25

function angleFromView(p: vec3): number {
  const cam = WorldCameraFinderProvider.getInstance().getTransform()
  const dir = p.sub(cam.getWorldPosition()).normalize()
  const fwd = cam.getWorldRotation().multiplyVec3(new vec3(0, 0, -1))
  return (Math.acos(Math.max(-1, Math.min(1, dir.dot(fwd)))) * 180) / Math.PI
}

@component
export class ScrewSenseP3StartScenario extends Scenario {
  async run(): Promise<void> {
    sys().restart()
    await sleep(800)
    const world = sys().world
    const ui = sys().ui

    // Before scanning: only the table, the manual, the flat parts, the dish and the Scan button.
    expect(sys().getPhase()).toBe("idle")
    expect(ui.isScanVisible()).toBe(true)
    expect(world.isDrawingOnPage()).toBe(true)
    expect(world.isHologramVisible()).toBe(false)
    expect(world.isTrayVisible()).toBe(false)
    expect(ui.isCardVisible()).toBe(false)
    expect(ui.isSliderVisible()).toBe(false)

    // Everything is in view.
    const items: {[name: string]: vec3} = {
      scan: must("ScanButton").getTransform().getWorldPosition(),
      manual: world.manualWorldPos(),
      dish: must("PartC").getTransform().getWorldPosition(),
      panelSideL: world.panelWorldPos("sideL"),
      panelBottom: world.panelWorldPos("bottom"),
      panelTop: world.panelWorldPos("top")
    }
    for (const name in items) {
      const angle = angleFromView(items[name])
      if (angle >= VIEW_HALF_ANGLE_DEG) {
        throw new Error(name + " is " + angle.toFixed(1) + " deg from the view direction (limit " + VIEW_HALF_ANGLE_DEG + ")")
      }
    }
  }
}
