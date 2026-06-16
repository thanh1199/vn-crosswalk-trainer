import * as THREE from 'three';
import { VEHICLE_SPEED_VARIANCE } from '../constants/gameConfig';
import { randomRange } from '../utils/MathUtils';

export type VehicleType = 'car' | 'motorbike';
export type DrivingBehavior = 'calm' | 'aggressive';

export interface VehicleOptions {
    position?: { x: number; z: number };
    speed?: number;
    direction?: number;
    type?: VehicleType;
    laneId?: string;
    preferredLaneId?: string;
    drivingBehavior?: DrivingBehavior;
}

const VEHICLE_HEIGHT = 1.0;
const CAR_WIDTH = 1.2;
const CAR_LENGTH = 2.2;
const MOTORBIKE_WIDTH = 0.7;
const MOTORBIKE_LENGTH = 1.6;
const VEHICLE_COLORS: Record<VehicleType, number> = {
    car: 0xe74c3c,
    motorbike: 0x2ecc71,
};

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

    public get currentSpeed(): number {
        return this.speed;
    }

    public set currentSpeed(value: number) {
        this.speed = value;
    }

    constructor({ position = { x: 0, z: 0 }, speed = 1, direction = 1, type = 'car', laneId, preferredLaneId, drivingBehavior }: VehicleOptions = {}) {
        this.type = type;
        this.laneId = laneId;
        this.preferredLaneId = preferredLaneId ?? laneId;
        this.width = this.getVehicleWidth();
        this.height = VEHICLE_HEIGHT;
        this.length = this.getVehicleLength();

        const geometry = new THREE.BoxGeometry(this.length, this.height, this.width);
        const material = new THREE.MeshStandardMaterial({ color: this.getVehicleColor() });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(position.x, this.height / 2, position.z);
        this.mesh.rotation.y = this.directionToRotation(direction);

        this.desiredSpeed = speed + randomRange(-VEHICLE_SPEED_VARIANCE, VEHICLE_SPEED_VARIANCE);
        this.speed = this.desiredSpeed;
        this.direction = direction; // 1 => positive X, -1 => negative X
        this.drivingBehavior = drivingBehavior ?? (Math.random() < 0.5 ? 'aggressive' : 'calm');
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
        return type === 'motorbike' ? MOTORBIKE_WIDTH : CAR_WIDTH;
    }

    public static getLengthForType(type: VehicleType): number {
        return type === 'motorbike' ? MOTORBIKE_LENGTH : CAR_LENGTH;
    }

    public getVehicleWidth(): number {
        return Vehicle.getWidthForType(this.type);
    }

    public getVehicleLength(): number {
        return Vehicle.getLengthForType(this.type);
    }

    public getVehicleColor(): number {
        return VEHICLE_COLORS[this.type];
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
