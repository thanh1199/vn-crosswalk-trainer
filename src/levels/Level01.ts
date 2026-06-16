import * as THREE from 'three';
import {
    ROAD_WIDTH,
    SIDEWALK_WIDTH,
    MAP_HALF_LENGTH,
    LANE_DEFINITIONS,
    PLAYER_SPEED,
    PLAYER_START_SIDE,
    PLAYER_GOAL_SIDE,
} from '../constants/gameConfig';
import Player from '../entities/Player';

// Level01 constructs a simple Vietnamese street with two sidewalks and road lanes.
export default class Level01 {
    public scene: THREE.Scene;
    public game: any;
    public roadWidth = ROAD_WIDTH;
    public sidewalkWidth = SIDEWALK_WIDTH;
    public mapHalfLength = MAP_HALF_LENGTH;
    public laneDefinitions = LANE_DEFINITIONS;
    public playerStartPos: THREE.Vector3;
    public playerGoalZ: number;
    public player?: Player;

    constructor(scene: THREE.Scene, game: any) {
        this.scene = scene;
        this.game = game;

        this.roadWidth = ROAD_WIDTH;
        this.sidewalkWidth = SIDEWALK_WIDTH;
        this.mapHalfLength = MAP_HALF_LENGTH;

        this.laneDefinitions = LANE_DEFINITIONS;

        const startZ = PLAYER_START_SIDE === 'bottom'
            ? -this.roadWidth / 2 - this.sidewalkWidth / 2 + 1
            : this.roadWidth / 2 + this.sidewalkWidth / 2 - 1;
        this.playerStartPos = new THREE.Vector3(0, 0, startZ);
        this.playerGoalZ = PLAYER_GOAL_SIDE === 'top'
            ? this.roadWidth / 2 + this.sidewalkWidth / 2
            : -this.roadWidth / 2 - this.sidewalkWidth / 2;

        this._setupScene();
    }

    private _setupScene() {
        // Ground plane (extended)
        const ground = new THREE.Mesh(
            new THREE.PlaneGeometry(this.mapHalfLength * 2 + 20, this.roadWidth + this.sidewalkWidth * 2),
            new THREE.MeshStandardMaterial({ color: 0x8d6e63 })
        );
        ground.rotation.x = -Math.PI / 2;
        this.scene.add(ground);

        // Left sidewalk (start)
        const sidewalkMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
        const leftSidewalk = new THREE.Mesh(
            new THREE.BoxGeometry(this.mapHalfLength * 2, 0.2, this.sidewalkWidth),
            sidewalkMat
        );
        leftSidewalk.position.set(0, 0.1, -this.roadWidth / 2 - this.sidewalkWidth / 2);
        this.scene.add(leftSidewalk);

        // Right sidewalk (goal)
        const rightSidewalk = leftSidewalk.clone();
        rightSidewalk.position.set(0, 0.1, this.roadWidth / 2 + this.sidewalkWidth / 2);
        this.scene.add(rightSidewalk);

        // Road surface
        const road = new THREE.Mesh(
            new THREE.BoxGeometry(this.mapHalfLength * 2, 0.1, this.roadWidth),
            new THREE.MeshStandardMaterial({ color: 0x333333 })
        );
        road.position.set(0, 0.05, 0);
        this.scene.add(road);

        // Lane markings and the pedestrian-safe zone.
        this.laneDefinitions.forEach((lane) => {
            if (lane.role === 'pedestrian-safe-zone') {
                const safeZone = new THREE.Mesh(
                    new THREE.BoxGeometry(this.mapHalfLength * 2, 0.02, 1.2),
                    new THREE.MeshStandardMaterial({ color: 0x999999 }),
                );
                safeZone.position.set(0, 0.06, lane.worldPosition);
                this.scene.add(safeZone);
                return;
            }

            const mark = new THREE.Mesh(
                new THREE.BoxGeometry(this.mapHalfLength * 2, 0.02, 0.2),
                new THREE.MeshStandardMaterial({ color: 0xffff66 }),
            );
            mark.position.set(0, 0.06, lane.worldPosition);
            this.scene.add(mark);
        });

        // Simple edge markers for sidewalk boundaries
        this.scene.add(new THREE.AxesHelper(5));
    }

    spawnPlayer(): Player {
        if (this.player) {
            this.player.reset(this.playerStartPos);
            return this.player;
        }

        this.player = new Player(this.playerStartPos);
        this.scene.add(this.player.mesh);
        return this.player;
    }

    updatePlayer(player: Player, moveDirection: THREE.Vector3, dt: number) {
        const direction = moveDirection.clone();
        if (direction.lengthSq() > 0) {
            direction.normalize();
            player.mesh.position.add(direction.multiplyScalar(PLAYER_SPEED * dt));
        }

        // Clamp player within map bounds
        const halfX = this.mapHalfLength - 1;
        player.mesh.position.x = Math.max(-halfX, Math.min(halfX, player.mesh.position.x));
        const minZ = -this.roadWidth / 2 - this.sidewalkWidth;
        const maxZ = this.roadWidth / 2 + this.sidewalkWidth;
        player.mesh.position.z = Math.max(minZ, Math.min(maxZ, player.mesh.position.z));
    }

    getLaneWorldZById(id: string): number | undefined {
        return this.laneDefinitions.find((lane) => lane.id === id)?.worldPosition;
    }

    getSpawnXForDirection(direction: number): number {
        // spawn slightly off-map so vehicles come in
        return direction > 0 ? -this.mapHalfLength - 8 : this.mapHalfLength + 8;
    }

    getMapBoundsX(): number {
        return this.mapHalfLength;
    }

    checkWin(player: Player): boolean {
        // Win when player reaches the opposite sidewalk area (top side)
        return player.mesh.position.z >= this.playerGoalZ + 0.5;
    }

    reset() {
        // Reset player if exists
        if (this.player) {
            this.player.reset(this.playerStartPos);
        }
    }
}
