import type { AlertLevel, AgentName, AgentTelemetry, AgentResult, AgentScore, ThirdEyeAlert, ThirdEyeAssurance, TroxtTaskPacket } from './types.js';
import type { AgentScoreHistory } from './memory/AgentScoreHistory.js';
export declare class ThirdEye {
    private readonly scoreHistory;
    private alerts;
    private readonly MAX_ALERTS;
    private readonly startedAt;
    private observationCount;
    constructor(scoreHistory: AgentScoreHistory);
    observe(telemetry: Record<string, AgentTelemetry>): ThirdEyeAlert[];
    assureDecision(packets: TroxtTaskPacket[]): ThirdEyeAssurance;
    predict(completedResults: AgentResult[], pendingPackets: TroxtTaskPacket[]): string[];
    scoreResult(result: AgentResult): AgentScore;
    react(telemetry: Record<string, AgentTelemetry>): {
        agent: AgentName;
        signal: string;
        reason: string;
    }[];
    detectConventionConflict(ids: string[]): ThirdEyeAlert[];
    private createAlert;
    private pushAlerts;
    resolveAlert(id: string): void;
    getAlerts(level?: AlertLevel, includeResolved?: boolean): ThirdEyeAlert[];
    getStatus(): {
        systemLevel: "GREEN" | "BLUE" | "YELLOW" | "ORANGE" | "RED";
        systemLevelColor: string;
        activeAlerts: number;
        criticalAlerts: number;
        observationCount: number;
        uptimeMs: number;
        recentAlerts: ThirdEyeAlert[];
    };
    private buildRecommendation;
}
//# sourceMappingURL=ThirdEye.d.ts.map