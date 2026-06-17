import * as THREE from 'three';
import Vehicle, { VehicleOptions } from '../entities/Vehicle';
import LaneSystem from './LaneSystem';
import { MIN_VEHICLE_GAP, TRAFFIC_FLOW_CONFIG, OVERTAKE_PATIENCE_SECONDS, VehicleType } from '../constants/gameConfig';

const MIN_SAFE_DISTANCE = 2.0;
const EMERGENCY_BRAKE_DISTANCE = 0.8;
const MIN_SPEED_DIFFERENCE_TO_CHANGE_LANE = 0.7;
const ACCELERATION = 1.8;
const DECELERATION = 3.6;
const SPAWN_CLEAR_DISTANCE = 4.0;
const OFF_MAP_BUFFER = 10;

const LANE_CHANGE_DECISION_TIME = 0.8;
const LANE_CHANGE_SPEED = 2.8;
const LANE_CHANGE_COOLDOWN = 2.0;
const MIN_FRONT_GAP = 3.5;
const MIN_REAR_GAP = 2.5;

export default class VehicleManager {
    private vehicles: Vehicle[] = [];
    private spawnAttemptsByType: Record<VehicleType, number> = { car: 0, motorbike: 0 };
    private spawnFailuresByType: Record<VehicleType, number> = { car: 0, motorbike: 0 };

    constructor(private scene: THREE.Scene, private level: any, private laneSystem: LaneSystem) { }

    public get activeVehicles(): Vehicle[] {
        return this.vehicles;
    }

    public spawnVehicle(options: VehicleOptions): Vehicle | null {
        const direction = options.direction ?? 1;
        const type = options.type ?? 'car';
        this.spawnAttemptsByType[type] += 1;
        const laneId = options.laneId ?? this.laneSystem.getPreferredLaneId(direction) ?? '';
        const lane = this.laneSystem.getLaneById(laneId);
        if (!lane || !lane.canDrive || lane.direction !== direction) {
            this.spawnFailuresByType[type] += 1;
            return null;
        }

        const spawnX = options.position?.x ?? this.level.getSpawnXForDirection(direction);
        const z = options.position?.z ?? lane.worldPosition;
        const length = Vehicle.getLengthForType(type);

        if (!this.isSpawnAreaClear(laneId, spawnX, direction, length)) {
            this.spawnFailuresByType[type] += 1;
            return null;
        }

        const vehicle = new Vehicle({
            ...options,
            position: { x: spawnX, z },
            direction,
            type,
            laneId,
            preferredLaneId: options.preferredLaneId ?? this.laneSystem.getPreferredLaneId(direction) ?? laneId,
        });
        this.vehicles.push(vehicle);
        this.scene.add(vehicle.mesh);
        return vehicle;
    }

    public update(dt: number): void {
        const vehiclesCopy = [...this.vehicles];

        for (const vehicle of vehiclesCopy) {
            if (vehicle.laneChangeCooldown > 0) {
                vehicle.laneChangeCooldown = Math.max(0, vehicle.laneChangeCooldown - dt);
            }

            const frontVehicle = this.findNearestVehicleInFront(vehicle);
            if (frontVehicle) {
                this.applyFollowingBehavior(vehicle, frontVehicle, dt);
            } else {
                vehicle.followTime = 0;
                vehicle.laneChangeDecisionTime = 0;
                this.accelerateToDesiredSpeed(vehicle, dt);
                this.tryReturnToPreferredLane(vehicle);
            }

            // Evaluate speed recovery whenever the lane ahead is free enough to safely
            // accelerate, even if a distant vehicle exists ahead.
            this.updateSpeedRecovery(vehicle, dt);

            this.applyLaneChange(vehicle, dt);
            vehicle.update(dt);
            this.cleanupOffMapVehicle(vehicle);
        }
    }

    public reset(): void {
        for (const vehicle of this.vehicles) {
            if (vehicle.mesh.parent) {
                vehicle.mesh.parent.remove(vehicle.mesh);
            }
            vehicle.dispose();
        }
        this.vehicles = [];
        this.spawnAttemptsByType = { car: 0, motorbike: 0 };
        this.spawnFailuresByType = { car: 0, motorbike: 0 };
    }

    public getSpawnMetrics() {
        return {
            attempts: { ...this.spawnAttemptsByType },
            failures: { ...this.spawnFailuresByType },
        };
    }

    public getActiveVehicleCounts() {
        return this.vehicles.reduce(
            (counts, vehicle) => {
                counts[vehicle.type] += 1;
                return counts;
            },
            { car: 0, motorbike: 0 } as Record<VehicleType, number>,
        );
    }

    private isSpawnAreaClear(laneId: string, spawnX: number, direction: number, length: number): boolean {
        return !this.vehicles.some((vehicle) => {
            if (vehicle.laneId !== laneId || vehicle.direction !== direction) {
                return false;
            }

            const distance = Math.abs(vehicle.mesh.position.x - spawnX);
            const combinedBuffer = SPAWN_CLEAR_DISTANCE + length / 2 + vehicle.length / 2 + MIN_VEHICLE_GAP;
            return distance < combinedBuffer;
        });
    }

    private findNearestVehicleInFront(vehicle: Vehicle): Vehicle | undefined {
        const laneVehicles = this.vehicles.filter(
            (other) =>
                other !== vehicle &&
                other.laneId === vehicle.laneId &&
                other.direction === vehicle.direction &&
                ((vehicle.direction > 0 && other.mesh.position.x > vehicle.mesh.position.x) ||
                    (vehicle.direction < 0 && other.mesh.position.x < vehicle.mesh.position.x)),
        );

        let nearest: Vehicle | undefined;
        let smallestGap = Number.POSITIVE_INFINITY;

        for (const candidate of laneVehicles) {
            const gap = this.getDistanceBetween(vehicle, candidate);
            if (gap >= 0 && gap < smallestGap) {
                smallestGap = gap;
                nearest = candidate;
            }
        }

        return nearest;
    }

    private getDistanceBetween(backVehicle: Vehicle, frontVehicle: Vehicle): number {
        const frontRearX = frontVehicle.mesh.position.x - frontVehicle.direction * (frontVehicle.length / 2);
        const backFrontX = backVehicle.mesh.position.x + backVehicle.direction * (backVehicle.length / 2);
        return frontRearX - backFrontX;
    }

    private applyFollowingBehavior(vehicle: Vehicle, frontVehicle: Vehicle, dt: number): void {
        const gap = this.getDistanceBetween(vehicle, frontVehicle);

        if (gap < 0) {
            const overlap = -gap;
            vehicle.mesh.position.x -= vehicle.direction * overlap;
            vehicle.speed = 0;
            vehicle.followTime = 0;
            return;
        }

        const blockedBySlower = frontVehicle.speed < vehicle.desiredSpeed && gap <= MIN_SAFE_DISTANCE * 1.4;
        if (blockedBySlower) {
            vehicle.followTime += dt;
        } else {
            vehicle.followTime = 0;
            vehicle.laneChangeDecisionTime = 0;
            this.tryReturnToPreferredLane(vehicle);
        }

        if (this.shouldAttemptOvertake(vehicle, frontVehicle, gap)) {
            vehicle.laneChangeDecisionTime += dt;
            if (vehicle.laneChangeDecisionTime >= LANE_CHANGE_DECISION_TIME) {
                this.tryStartLaneChange(vehicle);
            }
        } else {
            vehicle.laneChangeDecisionTime = 0;
        }

        if (gap <= EMERGENCY_BRAKE_DISTANCE) {
            this.changeSpeed(vehicle, 0, DECELERATION * 2, dt);
            return;
        }

        if (gap <= MIN_SAFE_DISTANCE) {
            const targetSpeed = Math.min(vehicle.desiredSpeed, frontVehicle.speed);
            this.changeSpeed(vehicle, targetSpeed, DECELERATION, dt);
            return;
        }

        this.accelerateToDesiredSpeed(vehicle, dt);
    }

    private tryReturnToPreferredLane(vehicle: Vehicle): void {
        if (!vehicle.laneId || !vehicle.preferredLaneId || vehicle.laneId === vehicle.preferredLaneId || vehicle.isChangingLane || vehicle.laneChangeCooldown > 0) {
            return;
        }

        const nextLaneId = this.laneSystem.getBestAdjacentLaneTowards(vehicle.laneId, vehicle.preferredLaneId);
        if (!nextLaneId) {
            return;
        }

        if (!this.laneSystem.canChangeToLane(vehicle, nextLaneId, this.vehicles)) {
            return;
        }

        const lane = this.laneSystem.getLaneById(nextLaneId);
        if (!lane) {
            return;
        }

        vehicle.targetLaneId = nextLaneId;
        vehicle.targetLaneZ = lane.worldPosition;
        vehicle.isChangingLane = true;
        vehicle.laneChangeReason = 'returnToPreferred';
    }

    private shouldAttemptOvertake(vehicle: Vehicle, frontVehicle: Vehicle, gap: number): boolean {
        if (vehicle.isChangingLane || vehicle.laneChangeCooldown > 0) {
            return false;
        }

        if (frontVehicle.speed >= vehicle.desiredSpeed - MIN_SPEED_DIFFERENCE_TO_CHANGE_LANE) {
            return false;
        }

        const patience = OVERTAKE_PATIENCE_SECONDS[vehicle.drivingBehavior] ?? OVERTAKE_PATIENCE_SECONDS.calm;
        return gap <= MIN_SAFE_DISTANCE * 1.4 && vehicle.followTime >= patience;
    }

    private tryStartLaneChange(vehicle: Vehicle): void {
        if (!vehicle.laneId) {
            return;
        }

        const adjacentLaneIds = this.laneSystem.getAdjacentLaneIds(vehicle.laneId);
        for (const laneId of adjacentLaneIds) {
            const lane = this.laneSystem.getLaneById(laneId);
            if (!lane || lane.direction !== vehicle.direction) {
                continue;
            }

            // Prefer staying in or moving toward the preferred lane only when the lane is safe.
            if (!this.laneSystem.canChangeToLane(vehicle, laneId, this.vehicles)) {
                continue;
            }

            vehicle.targetLaneId = laneId;
            vehicle.targetLaneZ = lane.worldPosition;
            vehicle.isChangingLane = true;
            vehicle.laneChangeReason = 'overtake';
            return;
        }
    }

    private applyLaneChange(vehicle: Vehicle, dt: number): void {
        if (!vehicle.isChangingLane || vehicle.targetLaneZ === undefined) {
            return;
        }

        const directionZ = Math.sign(vehicle.targetLaneZ - vehicle.mesh.position.z);
        const stepZ = LANE_CHANGE_SPEED * dt * directionZ;
        const remainingZ = vehicle.targetLaneZ - vehicle.mesh.position.z;

        if (Math.abs(stepZ) >= Math.abs(remainingZ)) {
            vehicle.mesh.position.z = vehicle.targetLaneZ;
            vehicle.laneId = vehicle.targetLaneId;
            vehicle.targetLaneId = undefined;
            vehicle.targetLaneZ = undefined;
            vehicle.isChangingLane = false;
            vehicle.laneChangeCooldown = LANE_CHANGE_COOLDOWN;
            vehicle.followTime = 0;
            vehicle.laneChangeDecisionTime = 0;
            vehicle.laneChangeReason = undefined;
            return;
        }

        vehicle.mesh.position.z += stepZ;
    }

    private accelerateToDesiredSpeed(vehicle: Vehicle, dt: number): void {
        this.changeSpeed(vehicle, vehicle.desiredSpeed, ACCELERATION, dt);
    }

    private changeSpeed(vehicle: Vehicle, target: number, rate: number, dt: number): void {
        const delta = target - vehicle.speed;
        const maxChange = rate * dt;
        if (Math.abs(delta) <= maxChange) {
            vehicle.speed = target;
            return;
        }

        vehicle.speed += Math.sign(delta) * maxChange;
        if (vehicle.speed < 0) {
            vehicle.speed = 0;
        }
    }

    private cleanupOffMapVehicle(vehicle: Vehicle): void {
        const mapHalf = this.level.getMapBoundsX();
        const x = vehicle.mesh.position.x;

        if ((vehicle.direction > 0 && x > mapHalf + OFF_MAP_BUFFER) ||
            (vehicle.direction < 0 && x < -mapHalf - OFF_MAP_BUFFER)) {
            this.removeVehicle(vehicle);
        }
    }

    private removeVehicle(vehicle: Vehicle): void {
        const index = this.vehicles.indexOf(vehicle);
        if (index >= 0) {
            this.vehicles.splice(index, 1);
        }

        if (vehicle.mesh.parent) {
            vehicle.mesh.parent.remove(vehicle.mesh);
        }
        vehicle.dispose();
    }

    private updateSpeedRecovery(vehicle: Vehicle, dt: number): void {
        const slowThreshold = vehicle.desiredSpeed * TRAFFIC_FLOW_CONFIG.slowSpeedThreshold;
        const isSlow = vehicle.speed < slowThreshold;

        if (isSlow) {
            if (vehicle.slowSpeedStartTime === 0) {
                vehicle.slowSpeedStartTime = dt;
            } else {
                vehicle.slowSpeedStartTime += dt;
            }
        } else {
            vehicle.slowSpeedStartTime = 0;
            vehicle.isAttemptingSpeedRecovery = false;
            return;
        }

        // Check if vehicle has been slow long enough to attempt recovery
        const slowDuration = vehicle.slowSpeedStartTime;
        if (slowDuration < TRAFFIC_FLOW_CONFIG.slowSpeedDuration) {
            return;
        }

        // Check if road ahead is clear enough
        if (!this.canAttemptSpeedRecovery(vehicle)) {
            vehicle.isAttemptingSpeedRecovery = false;
            return;
        }

        vehicle.isAttemptingSpeedRecovery = true;

        const recoveryTarget = Math.min(
            vehicle.desiredSpeed,
            Math.max(
                vehicle.speed + TRAFFIC_FLOW_CONFIG.speedRecoveryAcceleration * dt,
                vehicle.minNormalSpeed,
            ),
        );

        this.changeSpeed(vehicle, recoveryTarget, TRAFFIC_FLOW_CONFIG.speedRecoveryAcceleration * 2, dt);
    }

    private canAttemptSpeedRecovery(vehicle: Vehicle): boolean {
        // Only recover when below the vehicle-specific minimum normal speed.
        // This prevents a vehicle with a high desiredSpeed from lingering at very
        // low absolute speed once the road ahead is sufficiently clear.
        if (vehicle.speed >= vehicle.minNormalSpeed) {
            return false;
        }

        // Check for vehicles ahead within safe recovery distance
        const laneVehicles = this.vehicles.filter(
            (other) =>
                other !== vehicle &&
                other.laneId === vehicle.laneId &&
                other.direction === vehicle.direction &&
                ((vehicle.direction > 0 && other.mesh.position.x > vehicle.mesh.position.x) ||
                    (vehicle.direction < 0 && other.mesh.position.x < vehicle.mesh.position.x)),
        );

        // Find if any vehicle is within recovery clear distance
        for (const candidate of laneVehicles) {
            const gap = this.getDistanceBetween(vehicle, candidate);
            if (gap >= 0 && gap < TRAFFIC_FLOW_CONFIG.speedRecoveryClearDistance) {
                return false;
            }
        }

        return true;
    }
}
