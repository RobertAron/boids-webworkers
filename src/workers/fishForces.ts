import * as THREE from "three";
import { BoidForces } from "./fishMain";
import {
  SerializedFish,
  alignmentForces,
  applySeparationForces,
  cohesionForces,
  deserializeFish,
  outerBoundsReturn,
  serializeFish,
} from "./fishFunctions";

export type UpdateMessage = {
  forces: BoidForces;
  fishToUpdate: {
    mainFish: SerializedFish;
    nearbyFish: SerializedFish[];
  };
  delta: number;
};
const tempAppliedForces = new THREE.Vector3();
const tempPositionOffset = new THREE.Vector3();
const tempLookA = new THREE.Vector3();
const maxSpeed = 10;
function fishForceUpdate(data: UpdateMessage) {
  const { fishToUpdate, forces, delta } = data;
  const {
    alignmentForeScaling,
    cohesionForceScaling,
    outerBoundsForceScaling,
    separationForceScaling,
  } = forces;
  const mainFish = deserializeFish(fishToUpdate.mainFish);
  const nearbyFish = fishToUpdate.nearbyFish.map(deserializeFish);
  tempAppliedForces.set(0, 0, 0);
  outerBoundsReturn(tempAppliedForces, mainFish, outerBoundsForceScaling);
  alignmentForces(tempAppliedForces, nearbyFish, alignmentForeScaling);
  cohesionForces(tempAppliedForces, mainFish, nearbyFish, cohesionForceScaling);
  applySeparationForces(
    tempAppliedForces,
    mainFish,
    nearbyFish,
    separationForceScaling
  );
  // apply force to the velocity
  tempAppliedForces.multiplyScalar(delta * 10);
  mainFish.velocity.add(tempAppliedForces);
  mainFish.velocity.clampLength(-maxSpeed, maxSpeed);

  tempPositionOffset.copy(mainFish.velocity);
  mainFish.threeObj.position.add(tempPositionOffset.multiplyScalar(delta));
  tempLookA.copy(mainFish.threeObj.position).sub(mainFish.velocity);
  mainFish.threeObj.lookAt(tempLookA);
  mainFish.threeObj.updateMatrix();
  const message = serializeFish(mainFish);
  return message;
}

addEventListener("message", (event) =>
  postMessage(fishForceUpdate(event.data))
);

export type FishForceFunction = typeof fishForceUpdate;
