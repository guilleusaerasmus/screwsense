import {scenariosIndex} from "Leaf.lspkg/Scenarios/decorator/ScenarioIndexDecorator"
import {ScenarioMetadata} from "Leaf.lspkg/Scenarios/scenario/ScenarioMetadata"
import {ScrewSenseP1MatchScenario} from "./ScrewSenseP1MatchScenario"
import {ScrewSenseP1WrongScenario} from "./ScrewSenseP1WrongScenario"
import {ScrewSenseP1FlowScenario} from "./ScrewSenseP1FlowScenario"
import {ScrewSenseP2PanelScenario} from "./ScrewSenseP2PanelScenario"

@component
export class LeafIndex extends BaseScriptComponent {
  @scenariosIndex
  static scenariosIndex: ScenarioMetadata[] = [
    {id: "c3-right-match", typename: ScrewSenseP1MatchScenario.getTypeName()},
    {id: "c4-wrong-match", typename: ScrewSenseP1WrongScenario.getTypeName()},
    {id: "c5-panels-and-flip", typename: ScrewSenseP2PanelScenario.getTypeName()},
    {id: "c6-flow-to-finish", typename: ScrewSenseP1FlowScenario.getTypeName()}
  ]
}
