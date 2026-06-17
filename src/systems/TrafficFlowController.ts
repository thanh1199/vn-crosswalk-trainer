import Vehicle from '../entities/Vehicle';
import VehicleManager from './VehicleManager';
import LaneSystem from './LaneSystem';
import { TRAFFIC_FLOW_CONFIG } from '../constants/gameConfig';

// TrafficFlowController manages spawn rates and traffic density to maintain smooth flow
export default class TrafficFlowController {
    private spawnTimersByLane: Map<string, number> = new Map();
    private lastCongestedState: boolean = false;

    constructor(
        private vehicleManager: VehicleManager,
        private laneSystem: LaneSystem,
    ) {
        this.initializeSpawnTimers();
    }

    private initializeSpawnTimers(): void {
        const lanes = this.laneSystem.getDrivingLanes();
        lanes.forEach((lane) => {
            this.spawnTimersByLane.set(lane.id, 0);
        });
    }

    public update(dt: number): void {
        // Decrease all spawn timers
        this.spawnTimersByLane.forEach((timer, laneId) => {
            this.spawnTimersByLane.set(laneId, Math.max(0, timer - dt));
        });
    }

    public canSpawnInLane(laneId: string): boolean {
        const timer = this.spawnTimersByLane.get(laneId);
        return timer === undefined || timer <= 0;
    }

    public recordSpawn(laneId: string): void {
        const interval = this.getCurrentSpawnInterval();
        this.spawnTimersByLane.set(laneId, interval);
    }

    public getTrafficDensity(): {
        isCongestedState: boolean;
        activeVehicles: number;
        averageSpacing: number;
        congestionLevel: number;
    } {
        const vehicles = this.vehicleManager.activeVehicles;
        const activeVehicles = vehicles.length;

        // Check if we're at vehicle limit
        const isOverCapacity = activeVehicles >= TRAFFIC_FLOW_CONFIG.maxActiveVehicles;

        // Calculate average spacing per lane
        const lanes = this.laneSystem.getDrivingLanes();
        const spacingByLane = lanes.map((lane) => {
            const laneVehicles = vehicles.filter(
                (v) => v.laneId === lane.id && v.direction === lane.direction,
            );

            if (laneVehicles.length <= 1) {
                return { laneId: lane.id, spacing: TRAFFIC_FLOW_CONFIG.minSpawnDistance * 2 };
            }

            // Calculate average gap between vehicles
            const sortedVehicles = laneVehicles.sort((a, b) =>
                a.direction > 0 ? a.mesh.position.x - b.mesh.position.x : b.mesh.position.x - a.mesh.position.x,
            );

            let totalGap = 0;
            for (let i = 0; i < sortedVehicles.length - 1; i++) {
                const current = sortedVehicles[i];
                const next = sortedVehicles[i + 1];
                const gap = Math.abs(next.mesh.position.x - current.mesh.position.x);
                totalGap += gap;
            }

            const averageGap = totalGap / (sortedVehicles.length - 1);
            return { laneId: lane.id, spacing: averageGap };
        });

        const averageSpacing =
            spacingByLane.reduce((sum, item) => sum + item.spacing, 0) / spacingByLane.length;

        // Count congested lanes (too many vehicles in spawn area)
        let congestedLaneCount = 0;
        const congestionDistance = TRAFFIC_FLOW_CONFIG.congestionDistance;

        lanes.forEach((lane) => {
            const vehiclesInSpawnArea = vehicles.filter((v) => {
                if (v.laneId !== lane.id || v.direction !== lane.direction) {
                    return false;
                }
                // Check distance from spawn point
                const spawnX = 0; // Spawn point reference
                return Math.abs(v.mesh.position.x - spawnX) < congestionDistance;
            });

            if (vehiclesInSpawnArea.length >= TRAFFIC_FLOW_CONFIG.congestionThresholdPerLane) {
                congestedLaneCount++;
            }
        });

        const isCongestedState =
            isOverCapacity ||
            congestedLaneCount >= Math.ceil(lanes.length / 2) ||
            averageSpacing < TRAFFIC_FLOW_CONFIG.minSpawnDistance;

        this.lastCongestedState = isCongestedState;

        return {
            isCongestedState,
            activeVehicles,
            averageSpacing,
            congestionLevel: congestedLaneCount,
        };
    }

    private getCurrentSpawnInterval(): number {
        const density = this.getTrafficDensity();
        return density.isCongestedState
            ? TRAFFIC_FLOW_CONFIG.congestedSpawnInterval
            : TRAFFIC_FLOW_CONFIG.normalSpawnInterval;
    }

    public reset(): void {
        this.spawnTimersByLane.clear();
        this.initializeSpawnTimers();
        this.lastCongestedState = false;
    }
}
