export const serverBlueprint = {
  name: "TroxT EtherWorld",
  mode: "server-first",
  apiPort: 4000,
  routes: ["/api/health", "/api/world/schema", "/api/admin/command", "/api/build/patch"],
  realtime: ["server:hello", "admin:command", "build:patch", "world:buildPatch", "brain:result"],
};
