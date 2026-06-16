import * as THREE from 'three';
import { PLAYER_SIZE, COLLISION_MARGIN } from '../constants/gameConfig';

// Player entity represented as a green cube.
export default class Player {
    public mesh: THREE.Mesh;

    constructor(startPosition: THREE.Vector3) {
        const geometry = new THREE.BoxGeometry(PLAYER_SIZE, PLAYER_SIZE, PLAYER_SIZE);
        const material = new THREE.MeshStandardMaterial({ color: 0x2ecc71 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.reset(startPosition);
    }

    reset(startPosition: THREE.Vector3) {
        this.mesh.position.set(startPosition.x, PLAYER_SIZE / 2, startPosition.z);
        this.mesh.rotation.set(0, 0, 0);
    }

    // Get axis-aligned bounding box for collision checks.
    getBounds(): { min: THREE.Vector3; max: THREE.Vector3 } {
        const half = PLAYER_SIZE / 2 - COLLISION_MARGIN;
        return {
            min: new THREE.Vector3(this.mesh.position.x - half, this.mesh.position.y - half, this.mesh.position.z - half),
            max: new THREE.Vector3(this.mesh.position.x + half, this.mesh.position.y + half, this.mesh.position.z + half),
        };
    }
}
