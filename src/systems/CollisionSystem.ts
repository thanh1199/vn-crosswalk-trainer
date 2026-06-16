import * as THREE from 'three';

// Simple AABB collision system that can be extended for more obstacle types.
export default class CollisionSystem {
    constructor(public level: any) { }

    reset() {
        // No persistent state for now.
    }

    checkCollision(player: { getBounds: () => { min: THREE.Vector3; max: THREE.Vector3 } }, vehicles: any[]): boolean {
        const pMin = player.getBounds().min;
        const pMax = player.getBounds().max;

        for (const v of vehicles) {
            const vb = v.getBounds();
            if (this._aabbIntersect(pMin, pMax, vb.min, vb.max)) {
                return true;
            }
        }
        return false;
    }

    private _aabbIntersect(aMin: THREE.Vector3, aMax: THREE.Vector3, bMin: THREE.Vector3, bMax: THREE.Vector3): boolean {
        return (aMin.x <= bMax.x && aMax.x >= bMin.x) &&
            (aMin.y <= bMax.y && aMax.y >= bMin.y) &&
            (aMin.z <= bMax.z && aMax.z >= bMin.z);
    }
}
