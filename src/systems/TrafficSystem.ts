import * as THREE from 'three';
import Vehicle from '../entities/Vehicle';
import VehicleManager from './VehicleManager';
import LaneSystem from './LaneSystem';
import {
    VEHICLE_BASE_SPEED,
    VEHICLE_SPAWN_GAP,
    LANE_DEFINITIONS,
} from '../constants/gameConfig';
import { randomRange } from '../utils/MathUtils';

// TrafficSystem manages all vehicle spawning and movement.
export default class TrafficSystem {
    private laneSystem: LaneSystem;
    private vehicleManager: VehicleManager;

    constructor(public scene: THREE.Scene, public level: any) {
        this.laneSystem = new LaneSystem(LANE_DEFINITIONS);
        this.vehicleManager = new VehicleManager(this.scene, this.level, this.laneSystem);
        this._initVehicles();
        console.log('Vehicles spawned');
    }

    public get vehicles(): Vehicle[] {
        return this.vehicleManager.activeVehicles;
    }

    private _initVehicles() {
        const lanes = this.laneSystem.getDrivingLanes();
        lanes.forEach((lane) => {
            const count = Math.floor((this.level.mapHalfLength * 2) / VEHICLE_SPAWN_GAP);
            for (let k = 0; k < count; k++) {
                const gap = VEHICLE_SPAWN_GAP;
                const offset = k * gap * randomRange(0.8, 1.4);
                const spawnX = this.level.getSpawnXForDirection(lane.direction) + (lane.direction > 0 ? offset : -offset);
                const speed = VEHICLE_BASE_SPEED + lane.laneNumber * 0.5 + randomRange(-1, 1);
                const type = lane.direction > 0 ? 'car' : 'motorbike';
                this.vehicleManager.spawnVehicle({
                    position: { x: spawnX, z: lane.worldPosition },
                    speed,
                    direction: lane.direction,
                    type,
                    laneId: lane.id,
                    preferredLaneId: this.laneSystem.getPreferredLaneId(lane.direction),
                });
            }
        });
    }

    update(dt: number) {
        this.vehicleManager.update(dt);

        // Continuously spawn new vehicles to maintain traffic
        this._respawnVehicles();
    }

    private _respawnVehicles() {
        const lanes = this.laneSystem.getDrivingLanes();
        lanes.forEach((lane) => {
            const speed = VEHICLE_BASE_SPEED + lane.laneNumber * 0.5 + randomRange(-1, 1);
            const type = lane.direction > 0 ? 'car' : 'motorbike';
            const spawnX = this.level.getSpawnXForDirection(lane.direction);

            this.vehicleManager.spawnVehicle({
                position: { x: spawnX, z: lane.worldPosition },
                speed,
                direction: lane.direction,
                type,
                laneId: lane.id,
                preferredLaneId: this.laneSystem.getPreferredLaneId(lane.direction),
            });
        });
    }

    reset() {
        this.vehicleManager.reset();
        this._initVehicles();
    }
}
