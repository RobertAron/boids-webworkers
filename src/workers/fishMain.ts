import THREE from "three";
import {
  createFishSquare,
  createNearbyGraph,
  deserializeFish,
  serializeFish,
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
    const serializedFish = fishes.map(serializeFish);

    postMessage(serializedFish);
    const now = Date.now();
    const delta = now - lastDataRequest;
    const cappedDelta = Math.min(delta, 0.5);
    lastDataRequest = now;
    const nearbyGraph = createNearbyGraph(fishes, 5);
    const updateMessage = nearbyGraph.map(
      (ele, index): UpdateMessage => ({
        delta: cappedDelta,
        fishToUpdate: {
          mainFish: serializedFish[index],
          nearbyFish: ele.map((ele) => serializedFish[ele]),
        },
        forces,
      })
    );
    workerQue<WorkerQueMessageCallback<FishForceFunction>>(
      updateMessage,
      workers,
      (data) => {
        sent = true;
        fishes = data.map(deserializeFish);
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
