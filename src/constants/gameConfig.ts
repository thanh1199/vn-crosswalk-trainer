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

export const PLAYER_SPEED = 8;
export const PLAYER_SIZE = 1;

export const VEHICLE_SIZE = 1.2;
export const VEHICLE_BASE_SPEED = 6;
export const VEHICLE_SPEED_VARIANCE = 2;
export const VEHICLE_SPAWN_GAP = 8;

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
