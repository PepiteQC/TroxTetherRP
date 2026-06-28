// EtherWorld RP — Port-Éther
// Système d'éclairage — cycle jour/nuit, soleil, ombres, ambiante

import * as THREE from 'three';

export class LightingSystem {
  public scene: THREE.Scene;
  public sun: THREE.DirectionalLight;
  public ambient: THREE.AmbientLight;
  public hemisphere: THREE.HemisphereLight;

  private readonly dawnColor = 0xff8844;
  private readonly noonColor = 0xffeecc;
  private readonly duskColor = 0xff6633;
  private readonly nightColor = 0x224466;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // Lumière ambiante (base)
    this.ambient = new THREE.AmbientLight(0x404060, 0.3);
    scene.add(this.ambient);

    // Lumière hémisphérique (ciel/sol)
    this.hemisphere = new THREE.HemisphereLight(0x87ceeb, 0x3a6a2a, 0.6);
    scene.add(this.hemisphere);

    // Soleil (directionnel)
    this.sun = new THREE.DirectionalLight(0xffeecc, 1.2);
    this.sun.position.set(50, 80, 30);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.width = 2048;
    this.sun.shadow.mapSize.height = 2048;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 200;
    this.sun.shadow.camera.left = -100;
    this.sun.shadow.camera.right = 100;
    this.sun.shadow.camera.top = 100;
    this.sun.shadow.camera.bottom = -100;
    scene.add(this.sun);

    // Brouillard
    scene.fog = new THREE.Fog(0x87ceeb, 150, 400);
  }

  /** Met à jour l'éclairage selon l'heure (0-24) */
  update(timeOfDay: number): void {
    const sunAngle = ((timeOfDay - 6) / 12) * Math.PI;
    const sunHeight = Math.sin(sunAngle);

    if (sunHeight > 0) {
      // Jour
      this.sun.position.x = 60 * Math.cos(sunAngle);
      this.sun.position.y = 80 * sunHeight;
      this.sun.position.z = 40 * Math.sin(sunAngle);

      // Intensité solaire selon la hauteur
      const intensity = Math.max(0.3, Math.min(1.5, sunHeight * 1.5));
      this.sun.intensity = intensity;

      // Couleur selon l'heure
      if (timeOfDay > 5 && timeOfDay < 8) {
        // Aube
        const t = (timeOfDay - 5) / 3;
        this.sun.color.lerpColors(
          new THREE.Color(this.dawnColor),
          new THREE.Color(this.noonColor),
          t,
        );
        this.scene.background = new THREE.Color().lerpColors(
          new THREE.Color(0xff8844),
          new THREE.Color(0x87ceeb),
          t,
        );
      } else if (timeOfDay > 18 && timeOfDay < 21) {
        // Crépuscule
        const t = (timeOfDay - 18) / 3;
        this.sun.color.lerpColors(
          new THREE.Color(this.noonColor),
          new THREE.Color(this.duskColor),
          t,
        );
        this.scene.background = new THREE.Color().lerpColors(
          new THREE.Color(0x87ceeb),
          new THREE.Color(0xff6633),
          t,
        );
      } else {
        this.sun.color.setHex(this.noonColor);
        this.scene.background = new THREE.Color(0x87ceeb);
      }

      this.ambient.intensity = 0.3 + intensity * 0.2;
      this.hemisphere.intensity = 0.4 + intensity * 0.3;
    } else {
      // Nuit
      this.sun.intensity = 0.05;
      this.ambient.intensity = 0.1;
      this.ambient.color.setHex(0x446688);
      this.hemisphere.intensity = 0.15;
      this.scene.background = new THREE.Color(0x0a1a2a);
    }

    // Brouillard adaptatif
    if (this.scene.fog instanceof THREE.Fog) {
      if (timeOfDay > 6 && timeOfDay < 20) {
        this.scene.fog.color.setHex(this.scene.background.getHex());
      } else {
        this.scene.fog.color.setHex(0x0a1a2a);
      }
    }
  }
}