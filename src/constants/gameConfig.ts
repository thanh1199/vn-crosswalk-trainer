import * as THREE from 'three';

// Centralized game configuration values for movement, camera, and world layout.
export const PLAYER_START_SIDE = 'bottom' as const;
export const PLAYER_GOAL_SIDE = 'top' as const;
export const PLAYER_FORWARD_DIRECTION = new THREE.Vector3(0, 0, 1);
export const PLAYER_BACKWARD_DIRECTION = new THREE.Vector3(0, 0, -1);
export const PLAYER_RIGHT_DIRECTION = new THREE.Vector3(1, 0, 0);
export const PLAYER_LEFT_DIRECTION = new THREE.Vector3(-1, 0, 0);

export const SIDEWALK_WIDTH = 3;
export const MAP_HALF_LENGTH = 40;

export const LANES_PER_DIRECTION = 3;
export const PREFERRED_LANE_NUMBER = 1;
export const LANE_SPACING = 2;
export const LANE_START_OFFSET = 1.5;
export const ROAD_EDGE_BUFFER = 1.5;
export const ROAD_WIDTH = 2 * (LANE_START_OFFSET + (LANES_PER_DIRECTION - 1) * LANE_SPACING + ROAD_EDGE_BUFFER);

// Lane speed hierarchy. Lane 1 is the preferred inner lane and should carry the fastest
// cruising speed. Lane 2 is the mid lane used for maneuvering and temporary overtaking,
// while Lane 3 is the outer lane with the lowest cruising speed.
export const LANE_SPEED_MODIFIERS: Record<number, number> = {
    1: 1.5,
    2: 1.0,
    3: 0.5,
};

export const WORLD_UNIT_TO_METER = 1.0;
export const MIN_CAR_NORMAL_SPEED_KMH = 20;
export const MIN_CAR_NORMAL_SPEED = MIN_CAR_NORMAL_SPEED_KMH / 3.6;
export const MIN_VEHICLE_GAP = 0.3;

export type VehicleType = 'car' | 'motorbike';
export type VehicleSpawnWeights = Record<VehicleType, number>;
export interface VehicleTypeConfigEntry {
    width: number;
    length: number;
    height: number;
    minNormalSpeed: number;
    desiredSpeedRange: {
        min: number;
        max: number;
    };
    color: number;
}

export const VEHICLE_TYPE_CONFIG: Record<VehicleType, VehicleTypeConfigEntry> = {
    car: {
        width: 1.2,
        length: 2.2,
        height: 1.0,
        minNormalSpeed: MIN_CAR_NORMAL_SPEED,
        desiredSpeedRange: {
            min: 1.0,
            max: 12.0,
        },
        color: 0xe74c3c,
    },
    motorbike: {
        width: 0.75,
        length: 2.0,
        height: 1.2,
        minNormalSpeed: 5.56,
        desiredSpeedRange: {
            min: 5.5,
            max: 8.5,
        },
        color: 0x2ecc71,
    },
};

export const PLAYER_SPEED = 8;
export const PLAYER_WIDTH = 0.45;
export const PLAYER_DEPTH = 0.7;
export const PLAYER_HEIGHT = 1.75;
export const PLAYER_FOOTPRINT_AREA_LIMIT = 0.5;

export const VEHICLE_SIZE = 1.2;
export const VEHICLE_BASE_SPEED = 6;
export const VEHICLE_SPEED_VARIANCE = 2;
export const VEHICLE_SPAWN_GAP = 8;

// Vehicle spawn configuration
export const VEHICLE_SPAWN_CONFIG: { vehicleTypeWeights: VehicleSpawnWeights } = {
    // Vehicle type weights for spawning (must sum to > 0)
    // Adjust these to control the mix of vehicles
    vehicleTypeWeights: {
        car: 0.85,
        motorbike: 0.15,
    },
};

// Overtake patience values determine how long each driver style waits while blocked
// before attempting a lane change. This keeps aggressive drivers quick to move around
// slow traffic while calm drivers remain more patient.
export const OVERTAKE_PATIENCE_SECONDS: Record<'aggressive' | 'calm', number> = {
    aggressive: 1.5,
    calm: 4.0,
};

// Traffic Flow Control Configuration
export const TRAFFIC_FLOW_CONFIG = {
    // Spawn control
    maxActiveVehicles: 30,              // Maximum vehicles before reducing spawn rate
    minSpawnDistance: 10,               // Minimum distance to next vehicle for spawning
    congestionDistance: 15,             // Distance to check for congestion around spawn points
    normalSpawnInterval: 1.0,           // Seconds between spawns in light traffic
    congestedSpawnInterval: 2.5,        // Seconds between spawns in heavy traffic
    congestionThresholdPerLane: 4,      // Number of vehicles in congestion area to trigger congestion
    
    // Speed recovery
    slowSpeedThreshold: 0.5,            // Below this ratio of desired speed, vehicle is considered slow
    slowSpeedDuration: 3.0,             // Seconds vehicle must be slow before recovery attempt
    speedRecoveryAcceleration: 1.2,     // Acceleration rate for speed recovery (m/s²)
    speedRecoveryClearDistance: 8.0,    // Clear distance needed ahead to attempt recovery
    minNormalSpeedRatio: 0.45,          // Minimum normal driving speed as a ratio of desiredSpeed
};

export const CAMERA_FOV = 38;
export const CAMERA_HEIGHT = 36;
export const CAMERA_DISTANCE = 24;
export const CAMERA_LOOK_AT_OFFSET = new THREE.Vector3(0, 0, 8);
export const CAMERA_FOLLOW_LERP = 0.1;

export const COLLISION_MARGIN = 0.1;
export const FIXED_TIME_STEP = 1 / 60;

export type LaneRole = 'preferred' | 'standard' | 'pedestrian-safe-zone';
export interface LaneDefinition {
    id: string;
    direction: -1 | 0 | 1;
    laneNumber: number;
    worldPosition: number;
    canDrive: boolean;
    role: LaneRole;
}

const buildDrivingLanes = (direction: -1 | 1): LaneDefinition[] => {
    return Array.from({ length: LANES_PER_DIRECTION }, (_, index) => {
        const laneNumber = index + 1;
        const worldPosition = direction * (LANE_START_OFFSET + (laneNumber - 1) * LANE_SPACING);
        return {
            id: `${direction === -1 ? 'left' : 'right'}-${laneNumber}`,
            direction,
            laneNumber,
            worldPosition,
            canDrive: true,
            role: laneNumber === PREFERRED_LANE_NUMBER ? 'preferred' : 'standard',
        };
    });
};

export const LANE_DEFINITIONS: LaneDefinition[] = [
    ...buildDrivingLanes(-1),
    {
        id: 'center-safe-zone',
        direction: 0,
        laneNumber: 0,
        worldPosition: 0,
        canDrive: false,
        role: 'pedestrian-safe-zone',
    },
    ...buildDrivingLanes(1),
];
