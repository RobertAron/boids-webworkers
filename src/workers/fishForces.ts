import * as THREE from "three";
import { BoidForces } from "./fishMain";

export type SerialziedFish = {
    velocity: [number, number, number];
    position: [number, number, number];
}
export type FishToUpdate = {
    nearby: SerialziedFish[]
} & SerialziedFish

type ConvertedFish = {
    velocity: THREE.Vector3;
    position: THREE.Vector3;
}
type ConvertedFishToUpdate = {
    nearby: []
} & ConvertedFish
const outerBoundsVec3 = new THREE.Vector3();
/**
Mutates a vector. Add a force the keeps fish within a bounds.
 */
function outerBoundsReturn(
    inVec: THREE.Vector3,
    fish: ConvertedFish,
    forceScaling = 1,
    maxDistanceAllowed = 100
) {
    const distanceFromCenter = fish.position.length();
    // How close to the edge are we? We don't want a number <=0
    const distanceFromEdge = Math.max(
        maxDistanceAllowed - distanceFromCenter,
        Number.EPSILON
    );
    // invert it so when we are very close, the force is very large.
    const forceMagnitude = 1.5 / distanceFromEdge;
    // vector pointing from the fish, directly towards the center of the circle
    outerBoundsVec3.copy(fish.position).multiplyScalar(-1).normalize();
    // force to apply
    outerBoundsVec3.multiplyScalar(forceMagnitude * forceScaling);
    inVec.add(outerBoundsVec3);
}

const tempAlignmentDirection = new THREE.Vector3();
/**
Mutates a vector. Add forces that align with other forces.
 */
function alignmentForces(
    inVec: THREE.Vector3,
    nearbyFish: ConvertedFish[],
    forceScaling = 6
) {
    tempAlignmentDirection.set(0, 0, 0);
    for (const otherFish of nearbyFish) {
        tempAlignmentDirection.add(otherFish.velocity);
    }
    tempAlignmentDirection.normalize();
    inVec.add(tempAlignmentDirection.multiplyScalar(forceScaling));
}

const tempCohesion = new THREE.Vector3(0, 0, 0);
/**
Mutates a vector. Applies a force that pushes fish together.
*/
function cohesionForces(
    inVec: THREE.Vector3,
    fish: ConvertedFish,
    nearbyFish: ConvertedFish[],
    centerOfMassForceScaling = 0.8
) {
    if (nearbyFish.length === 0) return;
    // combined locations
    tempCohesion.set(0, 0, 0);
    for (const otherFish of nearbyFish) {
        tempCohesion.add(otherFish.velocity);
    }
    // average location
    tempCohesion.multiplyScalar(1 / nearbyFish.length);
    // vector to center of mass
    tempCohesion.sub(fish.position).normalize();
    // applied scaling
    tempCohesion.multiplyScalar(centerOfMassForceScaling);
    inVec.add(tempCohesion);
}

const tempSeparation = new THREE.Vector3(0, 0, 0);
const tempSeparationSum = new THREE.Vector3();
/**
Mutates a vector. Applies a force that pushes fish away from each other.
 */
function applySeparationForces(
    inVec: THREE.Vector3,
    fish: ConvertedFish,
    nearbyFish: ConvertedFish[],
    separationScaling = 0.1
) {
    tempSeparationSum.set(0, 0, 0);
    for (const otherFish of nearbyFish) {
        // vector pointing from other fish towards main fish
        tempSeparation
            .copy(fish.position)
            .sub(otherFish.position);
        // when distance is small, this number gets really high
        const inverseDistance = 1 / tempSeparation.length();
        // direction of force
        // tempSeparation.normalize();
        // applied force
        tempSeparation.multiplyScalar(inverseDistance * separationScaling);
        tempSeparationSum.add(tempSeparation);
    }
    inVec.add(tempSeparationSum);
}

export type UpdateMessage = { forces: BoidForces; fishesToUpdate: FishToUpdate[]; delta: number }
const tempAppliedForces = new THREE.Vector3();

addEventListener('message', (event: MessageEvent<UpdateMessage>) => {
    const { fishesToUpdate, forces, delta } = event.data
    const { alignmentForeScaling, cohesionForceScaling, outerBoundsForceScaling, separationForceScaling } = forces
    const fishWithUpdatedInfo = fishesToUpdate.map((fish) => {
        tempAppliedForces.set(0, 0, 0);
        const convertedFishMain: ConvertedFish = {
            position: new THREE.Vector3().fromArray(fish.position),
            velocity: new THREE.Vector3().fromArray(fish.velocity),
        }
        const nearbyFish = fish.nearby.map((fish) => ({
            position: new THREE.Vector3().fromArray(fish.position),
            velocity: new THREE.Vector3().fromArray(fish.velocity),
        }))
        outerBoundsReturn(tempAppliedForces, convertedFishMain, outerBoundsForceScaling);
        alignmentForces(tempAppliedForces, nearbyFish, alignmentForeScaling);
        cohesionForces(tempAppliedForces, convertedFishMain, nearbyFish, cohesionForceScaling);
        applySeparationForces(
            tempAppliedForces,
            convertedFishMain,
            nearbyFish,
            separationForceScaling
        );
        // apply force to the velocity
        tempAppliedForces.multiplyScalar(delta * 10);
        convertedFishMain.velocity.add(tempAppliedForces);
        return convertedFishMain
    })
    const resultFishSerialized = fishWithUpdatedInfo.map(({ position,
        velocity }) => ({
            position: position.toArray(),
            velocity: velocity.toArray(),
        }))
    postMessage(resultFishSerialized)
})