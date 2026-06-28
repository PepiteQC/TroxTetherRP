export class Input {
  public keys: Set<string> = new Set();
  public mouse: { x: number; y: number; buttons: number[] } = {
    x: 0, y: 0, buttons: [],
  };

  constructor() {
    document.addEventListener('keydown', (e) => this.keys.add(e.code));
    document.addEventListener('keyup', (e) => this.keys.delete(e.code));

    document.addEventListener('mousemove', (e) => {
      if (document.pointerLockElement) {
        this.mouse.x += e.movementX;
        this.mouse.y += e.movementY;
      }
    });

    document.addEventListener('mousedown', (e) => {
      this.mouse.buttons[e.button] = 1;
    });
    document.addEventListener('mouseup', (e) => {
      this.mouse.buttons[e.button] = 0;
    });
  }

  update() {
    // Call each frame to reset frame-specific stuff
  }

  isDown(code: string): boolean {
    return this.keys.has(code);
  }
}