import { InteractiveGraphics } from "graphics-debug/react"
import { SingleIntraNodeRouteSolver } from "lib/solvers/HighDensitySolver/SingleIntraNodeRouteSolver"
import { combineVisualizations } from "lib/utils/combineVisualizations"
import { generateColorMapFromNodeWithPortPoints } from "lib/utils/generateColorMapFromNodeWithPortPoints"
import cn4046 from "./assets/nodeWithPortPoints_cn4046.json"
import { HighDensityDebugger } from "lib/testing/HighDensityDebugger"

export default () => (
  <HighDensityDebugger
    startSeed={335233}
    hyperParameters={{}}
    {...{
      nodeWithPortPoints: cn4046.nodeWithPortPoints,
    }}
  />
)
