// Centralized keyboard input handling.

export default class Input {
    private keys: Map<string, boolean>;
    private _onKeyDown: (e: KeyboardEvent) => void;
    private _onKeyUp: (e: KeyboardEvent) => void;

    constructor() {
        this.keys = new Map();
        this._onKeyDown = this._onKeyDownImpl.bind(this);
        this._onKeyUp = this._onKeyUpImpl.bind(this);
        window.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('keyup', this._onKeyUp);
    }

    private _onKeyDownImpl(e: KeyboardEvent) {
        this.keys.set(e.code, true);
    }

    private _onKeyUpImpl(e: KeyboardEvent) {
        this.keys.set(e.code, false);
    }

    // Query whether a logical move direction is active.
    isDown(keyName: 'left' | 'right' | 'up' | 'down' | string): boolean {
        // Accept both WASD and Arrow keys
        switch (keyName) {
            case 'left':
                return !!(this.keys.get('ArrowLeft') || this.keys.get('KeyA'));
            case 'right':
                return !!(this.keys.get('ArrowRight') || this.keys.get('KeyD'));
            case 'up':
                return !!(this.keys.get('ArrowUp') || this.keys.get('KeyW'));
            case 'down':
                return !!(this.keys.get('ArrowDown') || this.keys.get('KeyS'));
            default:
                return !!this.keys.get(keyName);
        }
    }

    dispose() {
        window.removeEventListener('keydown', this._onKeyDown);
        window.removeEventListener('keyup', this._onKeyUp);
    }
}
