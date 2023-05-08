import * as THREE from "three";
import React, { useRef, useMemo, useEffect, useState } from "react";
import { useFrame, useLoader } from "@react-three/fiber";

import { Mesh } from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader";
const colorPallete = [
  "#18F6C4",
  "#40F0FA",
  "#C5DCE0",
  "#FD26DE",
  "#FD26DE",
  "#FE7558",
];

function randomColor() {
  return colorPallete[Math.floor(Math.random() * colorPallete.length)];
}

const tempColor = new THREE.Color();
const ABSOLUTE_MAX_INSTANCE_COUNT = 100_000;
type BoxesProps = {
  boxSize: number;
  outerBoundsForceScaling: number;
  alignmentForeScaling: number;
  cohesionForceScaling: number;
  separationForceScaling: number;
};
function FishesComponent({
  boxSize,
  outerBoundsForceScaling,
  alignmentForeScaling,
  cohesionForceScaling,
  separationForceScaling,
}: BoxesProps) {
  const fishObj = useLoader(
    OBJLoader,
    `${process.env.PUBLIC_URL ?? ""}/LowPolyFish.obj`
  );
  const geometry = useMemo(() => {
    const mesh = fishObj.children.find(
      (ele): ele is Mesh => ele instanceof Mesh
    );
    return mesh?.geometry;
  }, [fishObj]);
  const fishes = useRef<THREE.Matrix4[]>([new THREE.Matrix4()]);
  const colorArray = useMemo(
    () =>
      Float32Array.from(
        new Array(ABSOLUTE_MAX_INSTANCE_COUNT)
          .fill(null)
          .flatMap(() => tempColor.set(randomColor()).toArray())
      ),

    [ABSOLUTE_MAX_INSTANCE_COUNT]
  );
  const [worker, setWorker] = useState<Worker | null>(null);
  useEffect(() => {
    const worker = new Worker(
      new URL("../workers/fishMain.ts", import.meta.url)
    );
    worker.onmessage = (e) => {
      fishes.current = e.data.map((e: number[]) => new THREE.Matrix4().fromArray(e));
    };
    setWorker(worker);
    return () => {
      worker.terminate();
    };
  }, []);
  worker?.postMessage({ type: "updateSize", size: boxSize });
  worker?.postMessage({
    type: "updateForces",
    outerBoundsForceScaling,
    alignmentForeScaling,
    cohesionForceScaling,
    separationForceScaling,
  });
  const instancedMeshRef = useRef<THREE.InstancedMesh | null>(null);
  useFrame(function frameLoop(_, delta) {
    if (instancedMeshRef.current === null) return;
    worker?.postMessage({ type: "getNext" });
    // delta is the time since the last frame.
    // If you tab out, then back in this number could be large.
    // don't render as if more than .5 seconds has passed in this scenario.
    for (let i = 0; i < fishes.current.length; ++i) {
      const fish = fishes.current[i];
      instancedMeshRef.current.setMatrixAt(i, fish);
    }
    instancedMeshRef.current.count = fishes.current.length;
    instancedMeshRef.current.instanceMatrix.needsUpdate = true;
  });

  if (geometry === undefined) return null;
  return (
    <instancedMesh
      ref={instancedMeshRef}
      args={[undefined, undefined, ABSOLUTE_MAX_INSTANCE_COUNT]}
    >
      <primitive object={geometry}>
        <instancedBufferAttribute
          attach="attributes-color"
          args={[colorArray, 3]}
        />
      </primitive>
      <meshToonMaterial vertexColors clipShadows />
    </instancedMesh>
  );
}

export { FishesComponent };
