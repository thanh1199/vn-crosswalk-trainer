import * as THREE from 'three';
import {
    CAMERA_FOV,
    CAMERA_HEIGHT,
    CAMERA_DISTANCE,
    CAMERA_LOOK_AT_OFFSET,
    CAMERA_FOLLOW_LERP,
} from '../constants/gameConfig';

export default class GameCamera {
    public camera: THREE.PerspectiveCamera;

    constructor() {
        this.camera = new THREE.PerspectiveCamera(
            CAMERA_FOV,
            window.innerWidth / window.innerHeight,
            0.1,
            1000,
        );
        this.camera.position.set(0, CAMERA_HEIGHT, -CAMERA_DISTANCE);
        this.camera.lookAt(new THREE.Vector3(0, 0, CAMERA_LOOK_AT_OFFSET.z));
    }

    public update(targetPosition: THREE.Vector3) {
        const desired = new THREE.Vector3(
            targetPosition.x,
            CAMERA_HEIGHT,
            targetPosition.z - CAMERA_DISTANCE,
        );
        this.camera.position.lerp(desired, CAMERA_FOLLOW_LERP);
        const lookAtTarget = targetPosition.clone().add(CAMERA_LOOK_AT_OFFSET);
        this.camera.lookAt(lookAtTarget);
    }

    public onResize(width: number, height: number) {
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
    }
}
