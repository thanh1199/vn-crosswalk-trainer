import Vehicle from '../entities/Vehicle';
import { LaneDefinition } from '../constants/gameConfig';

export type LaneRole = 'preferred' | 'standard' | 'pedestrian-safe-zone';
export interface Lane {
    id: string;
    direction: -1 | 0 | 1;
    laneNumber: number;
    worldPosition: number;
    canDrive: boolean;
    role: LaneRole;
}

const MIN_FRONT_GAP = 3.5;
const MIN_REAR_GAP = 2.5;

export default class LaneSystem {
    private laneMap = new Map<string, Lane>();

    constructor(public readonly lanes: Lane[]) {
        for (const lane of lanes) {
            this.laneMap.set(lane.id, lane);
        }
    }

    public getLaneById(id: string): Lane | undefined {
        return this.laneMap.get(id);
    }

    public getLaneByIndex(index: number): Lane | undefined {
        return this.lanes[index];
    }

    public getDrivingLanes(): Lane[] {
        return this.lanes.filter((lane) => lane.canDrive);
    }

    public getDrivingLanesByDirection(direction: -1 | 1): Lane[] {
        return this.getDrivingLanes()
            .filter((lane) => lane.direction === direction)
            .sort((a, b) => a.laneNumber - b.laneNumber);
    }

    public getPreferredLaneId(direction: -1 | 1): string | undefined {
        const group = this.getDrivingLanesByDirection(direction);
        return group.reduce<string | undefined>((best, lane) => {
            if (!best || lane.laneNumber < this.getLaneById(best)!.laneNumber) {
                return lane.id;
            }
            return best;
        }, undefined);
    }

    public getAdjacentLaneIds(laneId: string): string[] {
        const lane = this.getLaneById(laneId);
        if (!lane || lane.direction === 0) {
            return [];
        }

        const group = this.getDrivingLanesByDirection(lane.direction);
        const index = group.findIndex((item) => item.id === lane.id);
        if (index === -1) {
            return [];
        }

        const adjacent: string[] = [];
        if (index > 0) {
            adjacent.push(group[index - 1].id);
        }
        if (index < group.length - 1) {
            adjacent.push(group[index + 1].id);
        }
        return adjacent;
    }

    public getBestAdjacentLaneTowards(currentLaneId: string, targetLaneId: string): string | undefined {
        const current = this.getLaneById(currentLaneId);
        const target = this.getLaneById(targetLaneId);
        if (!current || !target || current.direction !== target.direction || current.direction === 0) {
            return undefined;
        }

        const neighbors = this.getAdjacentLaneIds(currentLaneId)
            .map((id) => this.getLaneById(id)!)
            .sort((a, b) => Math.abs(a.laneNumber - target.laneNumber) - Math.abs(b.laneNumber - target.laneNumber));

        return neighbors.length ? neighbors[0].id : undefined;
    }

    public findVehicleAhead(vehicle: Vehicle, vehicles: Vehicle[], laneId: string): Vehicle | undefined {
        const candidates = vehicles.filter(
            (other) =>
                other !== vehicle &&
                other.laneId === laneId &&
                other.direction === vehicle.direction &&
                ((vehicle.direction > 0 && other.mesh.position.x > vehicle.mesh.position.x) ||
                    (vehicle.direction < 0 && other.mesh.position.x < vehicle.mesh.position.x)),
        );

        let nearest: Vehicle | undefined;
        let smallestGap = Number.POSITIVE_INFINITY;

        for (const candidate of candidates) {
            const gap = Math.abs(candidate.mesh.position.x - vehicle.mesh.position.x) - vehicle.length / 2 - candidate.length / 2;
            if (gap >= 0 && gap < smallestGap) {
                smallestGap = gap;
                nearest = candidate;
            }
        }

        return nearest;
    }

    public findVehicleBehind(vehicle: Vehicle, vehicles: Vehicle[], laneId: string): Vehicle | undefined {
        const candidates = vehicles.filter(
            (other) =>
                other !== vehicle &&
                other.laneId === laneId &&
                other.direction === vehicle.direction &&
                ((vehicle.direction > 0 && other.mesh.position.x < vehicle.mesh.position.x) ||
                    (vehicle.direction < 0 && other.mesh.position.x > vehicle.mesh.position.x)),
        );

        let nearest: Vehicle | undefined;
        let smallestGap = Number.POSITIVE_INFINITY;

        for (const candidate of candidates) {
            const gap = Math.abs(vehicle.mesh.position.x - candidate.mesh.position.x) - vehicle.length / 2 - candidate.length / 2;
            if (gap >= 0 && gap < smallestGap) {
                smallestGap = gap;
                nearest = candidate;
            }
        }

        return nearest;
    }

    public canChangeToLane(vehicle: Vehicle, targetLaneId: string, vehicles: Vehicle[]): boolean {
        if (!vehicle.laneId) {
            return false;
        }

        const targetLane = this.getLaneById(targetLaneId);
        if (!targetLane || !targetLane.canDrive || targetLane.direction !== vehicle.direction) {
            return false;
        }

        const ahead = this.findVehicleAhead(vehicle, vehicles, targetLaneId);
        const behind = this.findVehicleBehind(vehicle, vehicles, targetLaneId);

        if (ahead) {
            const gapAhead = Math.abs(ahead.mesh.position.x - vehicle.mesh.position.x) - vehicle.length / 2 - ahead.length / 2;
            if (gapAhead < MIN_FRONT_GAP) {
                return false;
            }
        }

        if (behind) {
            const gapBehind = Math.abs(vehicle.mesh.position.x - behind.mesh.position.x) - vehicle.length / 2 - behind.length / 2;
            if (gapBehind < MIN_REAR_GAP) {
                return false;
            }
        }

        return true;
    }
}
