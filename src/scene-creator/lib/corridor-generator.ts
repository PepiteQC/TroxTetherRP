export const FLOOR_HEIGHT = 3.0;

export interface CorridorConfig {
  width: number;
  height: number;
  length: number;
  doorsPerSide: number;
  doorSpacing: number;
}

export const CORRIDOR_DEFAULTS: CorridorConfig = {
  width: 4,
  height: FLOOR_HEIGHT,
  length: 40,
  doorsPerSide: 10,
  doorSpacing: 4,
};
