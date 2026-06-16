import * as THREE from 'three';
import { Constants } from '../core/Constants';

// Player entity represented as a green cube.
export default class Player {
    public mesh: THREE.Mesh;
    public size: number;

    constructor(startPosition: THREE.Vector3) {
        this.size = Constants.PLAYER_SIZE;
        const geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
        const material = new THREE.MeshStandardMaterial({ color: 0x2ecc71 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.reset(startPosition);
    }

    reset(startPosition: THREE.Vector3) {
        // Position the player on the sidewalk start location.
        this.mesh.position.set(startPosition.x, this.size / 2, startPosition.z);
        this.mesh.rotation.set(0, 0, 0);
    }

    // Get axis-aligned bounding box for collision checks.
    getBounds(): { min: THREE.Vector3; max: THREE.Vector3 } {
        const half = this.size / 2 - Constants.COLLISION_MARGIN;
        return {
            min: new THREE.Vector3(this.mesh.position.x - half, this.mesh.position.y - half, this.mesh.position.z - half),
            max: new THREE.Vector3(this.mesh.position.x + half, this.mesh.position.y + half, this.mesh.position.z + half),
        };
    }
}
