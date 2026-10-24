import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {ScrewSenseP1MatchScenario} from "./ScrewSenseP1MatchScenario"
import {ScrewSenseP1WrongScenario} from "./ScrewSenseP1WrongScenario"
import {ScrewSenseP1FlowScenario} from "./ScrewSenseP1FlowScenario"
import {ScrewSenseP2PanelScenario} from "./ScrewSenseP2PanelScenario"
import {ScrewSenseP3StartScenario} from "./ScrewSenseP3StartScenario"
import {ScrewSenseP3ScanScenario} from "./ScrewSenseP3ScanScenario"
import {ScrewSenseP3RewindScenario} from "./ScrewSenseP3RewindScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "c1-start-view", typename: ScrewSenseP3StartScenario.getTypeName()},
    {id: "c2-scan-to-hologram", typename: ScrewSenseP3ScanScenario.getTypeName()},
    {id: "c3-right-match", typename: ScrewSenseP1MatchScenario.getTypeName()},
    {id: "c4-wrong-match", typename: ScrewSenseP1WrongScenario.getTypeName()},
    {id: "c5-panels-and-flip", typename: ScrewSenseP2PanelScenario.getTypeName()},
    {id: "c6-flow-to-finish", typename: ScrewSenseP1FlowScenario.getTypeName()},
    {id: "c7-rewind-slider", typename: ScrewSenseP3RewindScenario.getTypeName()}
  ]
}
