import * as THREE from 'three';
import { PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_DEPTH, COLLISION_MARGIN } from '../constants/gameConfig';

// Player entity represented as a green box.
export default class Player {
    public mesh: THREE.Mesh;

    constructor(startPosition: THREE.Vector3) {
        const geometry = new THREE.BoxGeometry(PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_DEPTH);
        const material = new THREE.MeshStandardMaterial({ color: 0x2ecc71 });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.castShadow = true;
        this.reset(startPosition);
    }

    reset(startPosition: THREE.Vector3) {
        this.mesh.position.set(startPosition.x, PLAYER_HEIGHT / 2, startPosition.z);
        this.mesh.rotation.set(0, 0, 0);
    }

    // Get axis-aligned bounding box for collision checks.
    getBounds(): { min: THREE.Vector3; max: THREE.Vector3 } {
        const halfX = PLAYER_WIDTH / 2 - COLLISION_MARGIN;
        const halfY = PLAYER_HEIGHT / 2 - COLLISION_MARGIN;
        const halfZ = PLAYER_DEPTH / 2 - COLLISION_MARGIN;
        return {
            min: new THREE.Vector3(this.mesh.position.x - halfX, this.mesh.position.y - halfY, this.mesh.position.z - halfZ),
            max: new THREE.Vector3(this.mesh.position.x + halfX, this.mesh.position.y + halfY, this.mesh.position.z + halfZ),
        };
    }
}
