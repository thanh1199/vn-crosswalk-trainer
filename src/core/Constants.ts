// Centralized configurable values used across the game.
export const Constants = {
    // World layout
    ROAD_WIDTH: 12, // width of the drivable road area (z direction)
    SIDEWALK_WIDTH: 3, // sidewalk width on each side
    MAP_HALF_LENGTH: 40, // half-length of the playable map along x axis

    // Lanes: positions offset from center (z positions)
    LANES: [-2.5, 2.5] as number[],

    // Player
    PLAYER_SPEED: 8, // units per second
    PLAYER_SIZE: 1, // cube size

    // Vehicles
    VEHICLE_SIZE: 1.2,
    VEHICLE_BASE_SPEED: 6, // base speed in units/sec
    VEHICLE_SPEED_VARIANCE: 2,
    VEHICLE_SPAWN_GAP: 8, // spacing between vehicles on spawn line

    // Camera
    CAMERA_HEIGHT: 20,
    CAMERA_LOOK_DOWN: 30 * (Math.PI / 180), // radians
    CAMERA_FOLLOW_LERP: 0.08,

    // Collision
    COLLISION_MARGIN: 0.1,

    // Timing
    FIXED_TIME_STEP: 1 / 60,
} as const;

export type ConstantsType = typeof Constants;
