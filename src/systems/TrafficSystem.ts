import * as THREE from 'three';
import Vehicle from '../entities/Vehicle';
import VehicleManager from './VehicleManager';
import LaneSystem from './LaneSystem';
import TrafficFlowController from './TrafficFlowController';
import {
    VEHICLE_BASE_SPEED,
    VEHICLE_SPAWN_GAP,
    VEHICLE_SPAWN_CONFIG,
    LANE_DEFINITIONS,
    LANE_SPEED_MODIFIERS,
    VehicleType,
} from '../constants/gameConfig';
import { randomRange } from '../utils/MathUtils';

// TrafficSystem manages all vehicle spawning and movement.
export default class TrafficSystem {
    private laneSystem: LaneSystem;
    private vehicleManager: VehicleManager;
    private trafficFlowController: TrafficFlowController;

    constructor(public scene: THREE.Scene, public level: any) {
        this.laneSystem = new LaneSystem(LANE_DEFINITIONS);
        this.vehicleManager = new VehicleManager(this.scene, this.level, this.laneSystem);
        this.trafficFlowController = new TrafficFlowController(this.vehicleManager, this.laneSystem);
        this._initVehicles();
        console.log('Vehicles spawned');
    }

    public get vehicles(): Vehicle[] {
        return this.vehicleManager.activeVehicles;
    }

    private selectVehicleType(): VehicleType {
        const weights = VEHICLE_SPAWN_CONFIG.vehicleTypeWeights;
        const entries = Object.entries(weights) as [VehicleType, number][];
        const total = entries.reduce((sum, [, weight]) => sum + weight, 0);

        if (total <= 0) {
            console.warn('Vehicle type weights sum to 0 or less; defaulting to car');
            return 'car';
        }

        let rand = Math.random() * total;
        for (const [type, weight] of entries) {
            if (rand < weight) {
                return type;
            }
            rand -= weight;
        }

        return entries[0][0];
    }

    private _initVehicles() {
        const lanes = this.laneSystem.getDrivingLanes();
        lanes.forEach((lane) => {
            const count = Math.floor((this.level.mapHalfLength * 2) / VEHICLE_SPAWN_GAP);
            for (let k = 0; k < count; k++) {
                const gap = VEHICLE_SPAWN_GAP;
                const offset = k * gap * randomRange(0.8, 1.4);
                const spawnX = this.level.getSpawnXForDirection(lane.direction) + (lane.direction > 0 ? offset : -offset);
                const speedModifier = LANE_SPEED_MODIFIERS[lane.laneNumber] ?? 1.0;
                const speed = VEHICLE_BASE_SPEED * speedModifier + randomRange(-1, 1);
                const type = this.selectVehicleType();
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
        this.trafficFlowController.update(dt);

        // Continuously spawn new vehicles to maintain traffic
        this._respawnVehicles();
    }

    private _respawnVehicles() {
        const lanes = this.laneSystem.getDrivingLanes();
        lanes.forEach((lane) => {
            // Check if this lane can spawn based on traffic flow control
            if (!this.trafficFlowController.canSpawnInLane(lane.id)) {
                return;
            }

            const speedModifier = LANE_SPEED_MODIFIERS[lane.laneNumber] ?? 1.0;
            const speed = VEHICLE_BASE_SPEED * speedModifier + randomRange(-1, 1);
            const type = this.selectVehicleType();
            const spawnX = this.level.getSpawnXForDirection(lane.direction);

            const vehicle = this.vehicleManager.spawnVehicle({
                position: { x: spawnX, z: lane.worldPosition },
                speed,
                direction: lane.direction,
                type,
                laneId: lane.id,
                preferredLaneId: this.laneSystem.getPreferredLaneId(lane.direction),
            });

            // Record spawn for traffic flow control
            if (vehicle) {
                this.trafficFlowController.recordSpawn(lane.id);
            }
        });
    }

    reset() {
        this.vehicleManager.reset();
        this.trafficFlowController.reset();
        this._initVehicles();
    }
}
