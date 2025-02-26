import { InteractiveGraphics } from "graphics-debug/react"
import { CapacitySegmentToPointSolver } from "lib/solvers/CapacityMeshSolver/CapacitySegmentToPointSolver"
import inputs from "./assets/segmenttopoint1.json"
import { useMemo } from "react"

export default () => {
  const solver = useMemo(() => {
    const solver = new CapacitySegmentToPointSolver(inputs)
    solver.solve()
    return solver
  }, [])

  return <InteractiveGraphics graphics={solver.visualize()} />
}
