import * as THREE from 'three';
import { TRAFFIC_FLOW_CONFIG, VEHICLE_SPEED_VARIANCE, VEHICLE_TYPE_CONFIG, VehicleType } from '../constants/gameConfig';
import { randomRange } from '../utils/MathUtils';

export type DrivingBehavior = 'calm' | 'aggressive';
export type LaneChangeReason = 'overtake' | 'returnToPreferred' | 'futureAvoidPedestrian';

export interface VehicleOptions {
    position?: { x: number; z: number };
    speed?: number;
    direction?: number;
    type?: VehicleType;
    laneId?: string;
    preferredLaneId?: string;
    drivingBehavior?: DrivingBehavior;
    laneChangeReason?: LaneChangeReason;
}

// Vehicle entity represented as a moving 3D box along the X axis.
export default class Vehicle {
    public mesh: THREE.Mesh;
    public type: VehicleType;
    public laneId?: string;
    public preferredLaneId?: string;
    public width: number;
    public height: number;
    public length: number;
    public speed: number;
    public desiredSpeed: number;
    public direction: number;
    public drivingBehavior: DrivingBehavior;
    public followTime = 0;
    public laneChangeDecisionTime = 0;
    public targetLaneId?: string;
    public targetLaneZ?: number;
    public isChangingLane = false;
    public laneChangeCooldown = 0;
    public laneChangeReason?: LaneChangeReason;
    
    // Speed recovery
    public slowSpeedStartTime: number = 0;
    public isAttemptingSpeedRecovery: boolean = false;

    public get minNormalSpeed(): number {
        return Math.max(
            this.desiredSpeed * TRAFFIC_FLOW_CONFIG.minNormalSpeedRatio,
            VEHICLE_TYPE_CONFIG[this.type].minNormalSpeed,
        );
    }

    public get currentSpeed(): number {
        return this.speed;
    }

    public set currentSpeed(value: number) {
        this.speed = value;
    }

    constructor({ position = { x: 0, z: 0 }, speed = 1, direction = 1, type = 'car', laneId, preferredLaneId, drivingBehavior, laneChangeReason }: VehicleOptions = {}) {
        this.type = type;
        this.laneId = laneId;
        this.preferredLaneId = preferredLaneId ?? laneId;
        this.width = this.getVehicleWidth();
        this.height = this.getVehicleHeight();
        this.length = this.getVehicleLength();

        const geometry = new THREE.BoxGeometry(this.length, this.height, this.width);
        const material = new THREE.MeshStandardMaterial({ color: this.getVehicleColor() });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(position.x, this.height / 2, position.z);
        this.mesh.rotation.y = this.directionToRotation(direction);

        const baseSpeed = speed + randomRange(-VEHICLE_SPEED_VARIANCE, VEHICLE_SPEED_VARIANCE);
        this.desiredSpeed = this.clampDesiredSpeed(baseSpeed);
        this.speed = this.desiredSpeed;
        this.direction = direction; // 1 => positive X, -1 => negative X
        this.drivingBehavior = drivingBehavior ?? (Math.random() < 0.5 ? 'aggressive' : 'calm');
        this.laneChangeReason = laneChangeReason;
    }

    private directionToRotation(direction: number): number {
        return direction >= 0 ? 0 : Math.PI;
    }

    public update(dt: number): void {
        this.mesh.position.x += this.speed * this.direction * dt;
    }

    public getBounds(): { min: THREE.Vector3; max: THREE.Vector3 } {
        const halfX = this.length / 2;
        const halfY = this.height / 2;
        const halfZ = this.width / 2;

        return {
            min: new THREE.Vector3(
                this.mesh.position.x - halfX,
                this.mesh.position.y - halfY,
                this.mesh.position.z - halfZ,
            ),
            max: new THREE.Vector3(
                this.mesh.position.x + halfX,
                this.mesh.position.y + halfY,
                this.mesh.position.z + halfZ,
            ),
        };
    }

    public static getWidthForType(type: VehicleType): number {
        return VEHICLE_TYPE_CONFIG[type].width;
    }

    public static getLengthForType(type: VehicleType): number {
        return VEHICLE_TYPE_CONFIG[type].length;
    }

    public static getHeightForType(type: VehicleType): number {
        return VEHICLE_TYPE_CONFIG[type].height;
    }

    public getVehicleWidth(): number {
        return VEHICLE_TYPE_CONFIG[this.type].width;
    }

    public getVehicleHeight(): number {
        return VEHICLE_TYPE_CONFIG[this.type].height;
    }

    public getVehicleLength(): number {
        return VEHICLE_TYPE_CONFIG[this.type].length;
    }

    public getVehicleColor(): number {
        return VEHICLE_TYPE_CONFIG[this.type].color;
    }

    private clampDesiredSpeed(speed: number): number {
        const range = VEHICLE_TYPE_CONFIG[this.type].desiredSpeedRange;
        return Math.min(Math.max(speed, range.min), range.max);
    }

    public dispose(): void {
        if (this.mesh.geometry) {
            this.mesh.geometry.dispose();
        }

        const material = this.mesh.material;
        if (Array.isArray(material)) {
            material.forEach((item) => item.dispose());
        } else {
            material.dispose();
        }
    }
}
