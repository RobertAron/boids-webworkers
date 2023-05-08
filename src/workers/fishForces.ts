import * as THREE from "three";
import { BoidForces } from "./fishMain";
import {
  FishLogicData,
  alignmentForces,
  applySeparationForces,
  cohesionForces,
  fishLogic,
  outerBoundsReturn,
} from "./fishFunctions";

export type UpdateMessage = {
  forces: BoidForces;
  delta: number;
  fishToUpdates: {
    mainFish: FishLogicData;
    nearbyFish: FishLogicData[];
  }[];
};
const tempAppliedForces = new THREE.Vector3();
const tempPositionOffset = new THREE.Vector3();
const tempLookA = new THREE.Vector3();
const maxSpeed = 10;
function fishForceUpdate(data: UpdateMessage) {
  const { fishToUpdates, forces, delta } = data;
  const {
    alignmentForeScaling,
    cohesionForceScaling,
    outerBoundsForceScaling,
    separationForceScaling,
  } = forces;
  return fishToUpdates.map((fishToUpdate) => {
    const mainFish = fishLogic.fishLogicToFish(fishToUpdate.mainFish);
    const nearbyFish = fishToUpdate.nearbyFish.map(fishLogic.fishLogicToFish);
    tempAppliedForces.set(0, 0, 0);
    outerBoundsReturn(tempAppliedForces, mainFish, outerBoundsForceScaling);
    alignmentForces(tempAppliedForces, nearbyFish, alignmentForeScaling);
    cohesionForces(
      tempAppliedForces,
      mainFish,
      nearbyFish,
      cohesionForceScaling
    );
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
    const message = fishLogic.fishToFishLogic(mainFish);
    return message;
  });
}

addEventListener("message", (event) =>
  postMessage(fishForceUpdate(event.data))
);

export type FishForceFunction = typeof fishForceUpdate;
