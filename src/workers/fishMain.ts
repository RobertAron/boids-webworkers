import THREE from 'three'
// This is a module worker, so we can use imports (in the browser too!)

export type BoidForces = {
    outerBoundsForceScaling: number
    alignmentForeScaling: number
    cohesionForceScaling: number
    separationForceScaling: number
}

export type MainFishMessage = { type: 'updateSize', size: number } | { type: 'getNext' } | {
    type: 'updateForces',
} & BoidForces

type Fish = {
    velocity: THREE.Vector3;
    threeObj: THREE.Object3D;
};

function createFishSquare(length: number): Fish[] {
    const totalCount = length ** 3;
    const maxSpeed = 10;
    const hardOffset = -length / 2;
    const fishes = Array.from({ length: totalCount }, (_, index) => {
        const obj = new THREE.Object3D();
        obj.position.set(
            (index % length) + hardOffset,
            (Math.floor(index / length) % length) + hardOffset,
            (Math.floor(index / length ** 2) % length) + hardOffset
        );
        return {
            velocity: new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() - 0.5,
                Math.random() - 0.5
            )
                .normalize()
                .multiplyScalar(maxSpeed),
            threeObj: obj
        };
    });
    return fishes;
}

type Parameter<T extends MainFishMessage['type']> = MainFishMessage & { type: T }
function main() {
    let lastDataRequest = Date.now()
    let fishes: Fish[] = []
    let forces = {
        outerBoundsForceScaling: 0,
        alignmentForeScaling: 0,
        cohesionForceScaling: 0,
        separationForceScaling: 0,
    }
    function updateSize(value: Parameter<'updateSize'>) {
        lastDataRequest = Date.now()
        fishes = createFishSquare(value.size)
    }
    function getNext(_: Parameter<'getNext'>) {
        postMessage(fishes)
        // update fish locations with delta
    }
    function updateForces({ type, ...rest }: Parameter<'updateForces'>) {
        forces = rest
    }


    addEventListener('message', (event: MessageEvent<MainFishMessage>) => {
        if (event.data.type === 'updateSize') updateSize(event.data)
        if (event.data.type === 'getNext') getNext(event.data)
    })
}


main()