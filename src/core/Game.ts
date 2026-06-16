import * as THREE from 'three';
import Input from './Input';
import { Constants } from './Constants';
import Level01 from '../levels/Level01';
import TrafficSystem from '../systems/TrafficSystem';
import CollisionSystem from '../systems/CollisionSystem';

type EventMap = { [k: string]: ((...args: any[]) => void)[] };

// Game class: orchestrates scene, systems and main loop.
export default class Game {
    public scene: THREE.Scene;
    public camera: THREE.PerspectiveCamera;
    public renderer: THREE.WebGLRenderer;
    public clock: THREE.Clock;
    public input: Input;
    public level: Level01;
    public traffic: TrafficSystem;
    public collision: CollisionSystem;
    public player: any;
    private running = false;
    private lastTime = 0;
    private handlers: EventMap = {};

    constructor({ container }: { container?: HTMLElement } = {}) {
        console.log('Game initialized');
        const mount = container || document.body;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);

        this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, Constants.CAMERA_HEIGHT, 0);
        this.camera.rotation.x = -Constants.CAMERA_LOOK_DOWN;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        mount.appendChild(this.renderer.domElement);

        this.clock = new THREE.Clock();
        this.input = new Input();

        // Create level and systems
        this.level = new Level01(this.scene, this);
        console.log('Scene created');
        this.traffic = new TrafficSystem(this.scene, this.level);
        this.collision = new CollisionSystem(this.level);

        this.player = this.level.spawnPlayer();

        // Lighting
        const light = new THREE.DirectionalLight(0xffffff, 0.8);
        light.position.set(5, 10, 2);
        this.scene.add(light);
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.6));

        this._update = this._update.bind(this);

        console.log('Application started');
    }

    on(evt: string, fn: (...args: any[]) => void) {
        (this.handlers[evt] = this.handlers[evt] || []).push(fn);
    }

    emit(evt: string, ...args: any[]) {
        (this.handlers[evt] || []).forEach((f) => f(...args));
    }

    start() {
        if (this.running) return;
        this.running = true;
        this.clock.start();
        this.lastTime = this.clock.getElapsedTime();
        requestAnimationFrame(this._update);
        console.log('Render loop running');
    }

    stop() {
        this.running = false;
        this.clock.stop();
    }

    reset() {
        this.level.reset();
        this.player = this.level.spawnPlayer();
        this.traffic.reset();
        this.collision.reset();
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private _update() {
        if (!this.running) return;

        const time = this.clock.getElapsedTime();
        const dt = Math.min(0.05, time - this.lastTime);
        this.lastTime = time;

        // Player movement
        this.level.updatePlayer(this.player, this.input, dt);

        // Update traffic system
        this.traffic.update(dt);

        // Collision detection
        const hit = this.collision.checkCollision(this.player, this.traffic.vehicles);
        if (hit) {
            this.emit('gameOver');
            this.running = false;
        }

        // Win check
        if (this.level.checkWin(this.player)) {
            this.emit('levelClear');
            this.running = false;
        }

        // Smooth camera follow
        const target = new THREE.Vector3(this.player.mesh.position.x, 0, this.player.mesh.position.z);
        const camTargetX = THREE.MathUtils.lerp(this.camera.position.x, target.x, Constants.CAMERA_FOLLOW_LERP);
        const camTargetZ = THREE.MathUtils.lerp(this.camera.position.z, target.z + 6, Constants.CAMERA_FOLLOW_LERP);
        this.camera.position.x = camTargetX;
        this.camera.position.z = camTargetZ;
        this.camera.lookAt(target.x, 0, target.z);

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this._update);
    }
}
