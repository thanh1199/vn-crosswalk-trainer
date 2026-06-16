// Math utilities used across the project.

export function clamp(v: number, a: number, b: number): number {
    return Math.max(a, Math.min(b, v));
}

export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

export function randomRange(min: number, max: number): number {
    return Math.random() * (max - min) + min;
}

export function distance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
}
