import * as THREE from 'three';
import Vehicle from '../entities/Vehicle';
import { Constants } from '../core/Constants';
import { randomRange } from '../utils/MathUtils';

// TrafficSystem manages all vehicle spawning and movement.
export default class TrafficSystem {
    public vehicles: Vehicle[] = [];

    constructor(public scene: THREE.Scene, public level: any) {
        this._initVehicles();
        console.log('Vehicles spawned');
    }

    private _initVehicles() {
        // Spawn vehicles for each lane in both directions with spacing
        const lanes = this.level.lanePositions;
        lanes.forEach((laneZ: number, i: number) => {
            // Alternate directions per lane
            const direction = i % 2 === 0 ? 1 : -1;
            // How many vehicles to seed across map
            const count = Math.floor((this.level.mapHalfLength * 2) / Constants.VEHICLE_SPAWN_GAP);
            for (let k = 0; k < count; k++) {
                const gap = Constants.VEHICLE_SPAWN_GAP;
                const offset = k * gap * randomRange(0.8, 1.4);
                const spawnX = this.level.getSpawnXForDirection(direction) + (direction > 0 ? offset : -offset);
                const speed = Constants.VEHICLE_BASE_SPEED + i * 1.5 + randomRange(-1, 1);
                const veh = new Vehicle({ position: { x: spawnX, z: laneZ }, speed, direction });
                this.vehicles.push(veh);
                this.scene.add(veh.mesh);
            }
        });
    }

    update(dt: number) {
        const mapHalf = this.level.getMapBoundsX();
        for (const v of this.vehicles) {
            v.update(dt);
            // Loop back when off-map
            if (v.direction > 0 && v.mesh.position.x > mapHalf + 10) {
                v.mesh.position.x = this.level.getSpawnXForDirection(1);
            }
            else if (v.direction < 0 && v.mesh.position.x < -mapHalf - 10) {
                v.mesh.position.x = this.level.getSpawnXForDirection(-1);
            }
        }
    }

    reset() {
        // remove and recreate vehicles
        for (const v of this.vehicles) {
            if (v.mesh.parent) v.mesh.parent.remove(v.mesh);
        }
        this.vehicles = [];
        this._initVehicles();
    }
}
