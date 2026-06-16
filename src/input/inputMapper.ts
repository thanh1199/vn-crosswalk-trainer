import * as THREE from 'three';

export type InputDirection = 'left' | 'right' | 'forward' | 'backward';

export default function mapInputToWorldDirection(keys: Map<string, boolean>): THREE.Vector3 {
    const direction = new THREE.Vector3();

    if (keys.get('ArrowLeft') || keys.get('KeyA')) {
        direction.x += 1;
    }
    if (keys.get('ArrowRight') || keys.get('KeyD')) {
        direction.x -= 1;
    }
    if (keys.get('ArrowUp') || keys.get('KeyW')) {
        direction.z += 1;
    }
    if (keys.get('ArrowDown') || keys.get('KeyS')) {
        direction.z -= 1;
    }

    return direction.normalize();
}

export function getRotationFromInput(_keys: Map<string, boolean>): number {
    // No rotation applied - removed tilt effect
    return 0;
}
