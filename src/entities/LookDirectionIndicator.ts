import * as THREE from 'three';
import { PLAYER_HEIGHT } from '../constants/gameConfig';

// Indicator arrow following the player and showing intended direction.
export default class LookDirectionIndicator {
    public mesh: THREE.Mesh;

    constructor() {
        const geometry = new THREE.ConeGeometry(0.25, 0.6, 10);
        const material = new THREE.MeshStandardMaterial({ color: 0x00bfff });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.rotation.x = -Math.PI / 2;
        this.mesh.position.set(0, PLAYER_HEIGHT * 0.75, 0);
    }

    public update(playerPosition: THREE.Vector3, moveDirection: THREE.Vector3) {
        this.mesh.position.set(playerPosition.x, playerPosition.y + PLAYER_HEIGHT * 0.6, playerPosition.z);

        if (moveDirection.lengthSq() > 0.001) {
            const normalized = moveDirection.clone().normalize();
            const angle = Math.atan2(normalized.x, normalized.z);
            this.mesh.rotation.set(-Math.PI / 2, angle, 0);
        }
    }
}
