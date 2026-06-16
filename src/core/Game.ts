import * as THREE from 'three';
import Input from './Input';
import Level01 from '../levels/Level01';
import TrafficSystem from '../systems/TrafficSystem';
import CollisionSystem from '../systems/CollisionSystem';
import GameCamera from '../camera/GameCamera';
import LookDirectionIndicator from '../entities/LookDirectionIndicator';
import mapInputToWorldDirection from '../input/inputMapper';

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
    public gameCamera: GameCamera;
    public lookIndicator: LookDirectionIndicator;
    public player: any;
    private running = false;
    private lastTime = 0;
    private handlers: EventMap = {};

    constructor({ container }: { container?: HTMLElement } = {}) {
        console.log('Game initialized');
        const mount = container || document.body;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87ceeb);

        this.gameCamera = new GameCamera();
        this.camera = this.gameCamera.camera;

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setPixelRatio(window.devicePixelRatio);
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
        this.lookIndicator = new LookDirectionIndicator();
        this.scene.add(this.lookIndicator.mesh);

        // Lighting
        const light = new THREE.DirectionalLight(0xffffff, 0.8);
        light.position.set(5, 10, -5);
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
        this.player = this.level.player as any;
        this.traffic.reset();
        this.collision.reset();
    }

    onResize() {
        this.gameCamera.onResize(window.innerWidth, window.innerHeight);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    private _update() {
        if (!this.running) return;

        const time = this.clock.getElapsedTime();
        const dt = Math.min(0.05, time - this.lastTime);
        this.lastTime = time;

        // Player movement
        const moveDirection = mapInputToWorldDirection(this.input.getKeys());
        this.level.updatePlayer(this.player, moveDirection, dt);
        this.lookIndicator.update(this.player.mesh.position, moveDirection);

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

        // Smooth camera follow with fixed offset for top-down visibility
        this.gameCamera.update(this.player.mesh.position);

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this._update);
    }
}
