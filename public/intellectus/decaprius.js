export class DecapriusCommands {
  constructor({ contracts, thirdEye, bus }) {
    this.contracts = contracts;
    this.thirdEye = thirdEye;
    this.bus = bus;
  }

  async executeAdminCommand(input, handler) {
    const contract = this.contracts.validateCommand(input);
    if (!contract.ok) return { ok: false, reason: contract.reason, risk: "YELLOW" };

    const risk = this.thirdEye.assess(contract.prompt);
    if (risk.level === "RED") return { ok: false, reason: risk.reason, risk: risk.level };

    await this.bus.emit("admin.command.accepted", { prompt: contract.prompt, risk }, "high");
    const result = await handler(contract.prompt, risk);
    await this.bus.emit("admin.command.completed", result, "normal");
    return { ok: true, result, risk: risk.level };
  }
}
