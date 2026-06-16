import * as THREE from 'three';
import { Constants } from '../core/Constants';
import Player from '../entities/Player';

// Level01 constructs a simple Vietnamese street with two sidewalks and road lanes.
export default class Level01 {
    public scene: THREE.Scene;
    public game: any;
    public roadWidth: number;
    public sidewalkWidth: number;
    public mapHalfLength: number;
    public lanePositions: number[];
    public playerStartPos: THREE.Vector3;
    public playerGoalZ: number;
    public player?: Player;

    constructor(scene: THREE.Scene, game: any) {
        this.scene = scene;
        this.game = game;

        this.roadWidth = Constants.ROAD_WIDTH;
        this.sidewalkWidth = Constants.SIDEWALK_WIDTH;
        this.mapHalfLength = Constants.MAP_HALF_LENGTH;

        this.lanePositions = Constants.LANES;

        this.playerStartPos = new THREE.Vector3(-this.mapHalfLength + 2, 0, -(this.roadWidth / 2 + this.sidewalkWidth / 2));
        this.playerGoalZ = this.roadWidth / 2 + this.sidewalkWidth / 2;

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

        // Lane markings (simple rectangles)
        this.lanePositions.forEach((zPos) => {
            const mark = new THREE.Mesh(
                new THREE.BoxGeometry(this.mapHalfLength * 2, 0.02, 0.2),
                new THREE.MeshStandardMaterial({ color: 0xffff66 })
            );
            mark.position.set(0, 0.06, zPos);
            this.scene.add(mark);
        });

        // Simple edge markers for sidewalk boundaries
        this.scene.add(new THREE.AxesHelper(5));
    }

    spawnPlayer(): Player {
        // Create a player at the start sidewalk location
        this.player = new Player(this.playerStartPos);
        this.scene.add(this.player.mesh);
        return this.player;
    }

    updatePlayer(player: Player, input: any, dt: number) {
        // Compute movement vector based on input and speed constants
        const dir = new THREE.Vector3();
        if (input.isDown('left')) dir.x -= 1;
        if (input.isDown('right')) dir.x += 1;
        if (input.isDown('up')) dir.z -= 1;
        if (input.isDown('down')) dir.z += 1;

        if (dir.lengthSq() > 0) dir.normalize();

        const speed = Constants.PLAYER_SPEED;
        player.mesh.position.x += dir.x * speed * dt;
        player.mesh.position.z += dir.z * speed * dt;

        // Clamp player within map bounds
        const halfX = this.mapHalfLength - 1;
        player.mesh.position.x = Math.max(-halfX, Math.min(halfX, player.mesh.position.x));
        const minZ = -this.roadWidth / 2 - this.sidewalkWidth;
        const maxZ = this.roadWidth / 2 + this.sidewalkWidth;
        player.mesh.position.z = Math.max(minZ, Math.min(maxZ, player.mesh.position.z));
    }

    getLaneWorldZ(index: number): number {
        return this.lanePositions[index];
    }

    getSpawnXForDirection(direction: number): number {
        // spawn slightly off-map so vehicles come in
        return direction > 0 ? -this.mapHalfLength - 8 : this.mapHalfLength + 8;
    }

    getMapBoundsX(): number {
        return this.mapHalfLength;
    }

    checkWin(player: Player): boolean {
        // Win when player reaches the opposite sidewalk area (z greater than goal)
        return player.mesh.position.z >= this.playerGoalZ + 0.5;
    }

    reset() {
        // Reset player if exists
        if (this.player) {
            this.player.reset(this.playerStartPos);
        }
    }
}
