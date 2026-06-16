import * as THREE from 'three';
import { Constants } from '../core/Constants';
import { randomRange } from '../utils/MathUtils';

export interface VehicleOptions {
    position?: { x: number; z: number };
    speed?: number;
    direction?: number;
}

// Vehicle entity represented as a red cube.
export default class Vehicle {
    public mesh: THREE.Mesh;
    public size: number;
    public speed: number;
    public direction: number;

    constructor({ position = { x: 0, z: 0 }, speed = 1, direction = 1 }: VehicleOptions = {}) {
        this.size = Constants.VEHICLE_SIZE;
        const geometry = new THREE.BoxGeometry(this.size, this.size * 0.8, this.size * 2);
        const material = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(position.x, this.size / 2, position.z);
        this.speed = speed + randomRange(-Constants.VEHICLE_SPEED_VARIANCE, Constants.VEHICLE_SPEED_VARIANCE);
        this.direction = direction; // 1 => positive X, -1 => negative X
    }

    update(dt: number) {
        this.mesh.position.x += this.speed * this.direction * dt;
    }

    getBounds(): { min: THREE.Vector3; max: THREE.Vector3 } {
        const halfX = 1; // approximate half extents
        const halfZ = 1;
        return {
            min: new THREE.Vector3(this.mesh.position.x - halfX, 0, this.mesh.position.z - halfZ),
            max: new THREE.Vector3(this.mesh.position.x + halfX, this.mesh.position.y + 0.8, this.mesh.position.z + halfZ),
        };
    }
}
