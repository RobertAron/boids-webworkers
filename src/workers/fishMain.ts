import THREE from "three";
import {
  createFishSquare,
  createNearbyGraph,
  fishLogic,
} from "./fishFunctions";
import { FishForceFunction, UpdateMessage } from "./fishForces";
import { WorkerQueMessageCallback, workerQue } from "./workerQue";
// This is a module worker, so we can use imports (in the browser too!)

export type BoidForces = {
  outerBoundsForceScaling: number;
  alignmentForeScaling: number;
  cohesionForceScaling: number;
  separationForceScaling: number;
};

export type MainFishMessage =
  | { type: "updateSize"; size: number }
  | { type: "getNext" }
  | ({
      type: "updateForces";
    } & BoidForces);

type Fish = {
  velocity: THREE.Vector3;
  threeObj: THREE.Object3D;
};

type Parameter<T extends MainFishMessage["type"]> = MainFishMessage & {
  type: T;
};

const workers = new Array(100).fill(null).map(() => {
  return new Worker(new URL("./fishForces.ts", import.meta.url));
});
const chunkArray = <T>(array: T[], chunk_size: number) =>
  Array(Math.ceil(array.length / chunk_size))
    .fill(null)
    .map((_, index) => index * chunk_size)
    .map((begin) => array.slice(begin, begin + chunk_size));
function main() {
  let lastDataRequest = Date.now();
  let fishes: Fish[] = [];
  let forces = {
    outerBoundsForceScaling: 0,
    alignmentForeScaling: 0,
    cohesionForceScaling: 0,
    separationForceScaling: 0,
  };
  function updateSize(value: Parameter<"updateSize">) {
    lastDataRequest = Date.now();
    fishes = createFishSquare(value.size);
  }
  let sent = true;
  function getNext(_: Parameter<"getNext">) {
    if (!sent) return;
    sent = false;
    const serializedFish = fishes.map(fishLogic.fishToFishLogic);
    const matrixes = fishes.map((fish) => fish.threeObj.matrix.toArray());
    postMessage(matrixes);
    const now = Date.now();
    const delta = now - lastDataRequest;
    const cappedDelta = Math.min(delta, 0.5);
    lastDataRequest = now;
    const nearbyGraph = createNearbyGraph(fishes, 5);

    const updateMessage = chunkArray(
      nearbyGraph.map((ele, i) => ({
        nearby: ele,
        mainIndex: i,
      })),
      30
    ).map(
      (chunk): UpdateMessage => ({
        delta: cappedDelta,
        forces,
        fishToUpdates: chunk.map((fish) => ({
          mainFish: serializedFish[fish.mainIndex],
          nearbyFish: fish.nearby.map(
            (nearbyIndex) => serializedFish[nearbyIndex]
          ),
        })),
      })
    );
    workerQue<WorkerQueMessageCallback<FishForceFunction>>(
      updateMessage,
      workers,
      (data) => {
        sent = true;
        fishes = data.flatMap((chunk) => chunk.map(fishLogic.fishLogicToFish));
      }
    );
    // update fish locations with delta
  }
  function updateForces({ type, ...rest }: Parameter<"updateForces">) {
    forces = rest;
  }
  addEventListener("message", (event: MessageEvent<MainFishMessage>) => {
    if (event.data.type === "updateSize") updateSize(event.data);
    if (event.data.type === "getNext") getNext(event.data);
    if (event.data.type === "updateForces") updateForces(event.data);
  });
}

main();
