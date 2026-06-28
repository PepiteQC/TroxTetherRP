export class DatabaseGateway {
  constructor() {
    this.status = "memory-only";
  }

  async ping() {
    return {
      mysql: "not-configured",
      redis: "not-configured",
      activeMode: this.status,
    };
  }
}

export const database = new DatabaseGateway();
