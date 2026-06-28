// EtherWorld RP — Port-Éther
// Système météo — cycle jour/nuit, brouillard, pluie, éclaircies

import * as THREE from 'three';

export type WeatherType = 'clear' | 'cloudy' | 'fog' | 'rain' | 'storm';

export class WeatherSystem {
  public scene: THREE.Scene;
  public currentWeather: WeatherType = 'clear';
  public windSpeed = 0;
  public temperature = 22;
  public humidity = 40;

  private particles: THREE.Points | null = null;
  private transitionTimer = 0;
  private weatherDuration = 120; // secondes entre chaque changement

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  /** Change la météo */
  setWeather(type: WeatherType): void {
    this.currentWeather = type;
    this.applyWeather();
  }

  /** Met à jour la météo en continue */
  update(deltaTime: number): void {
    this.transitionTimer += deltaTime;

    // Changement météo aléatoire toutes les 2 minutes environ
    if (this.transitionTimer > this.weatherDuration) {
      this.transitionTimer = 0;
      const types: WeatherType[] = ['clear', 'cloudy', 'fog', 'rain'];
      const newWeather = types[Math.floor(Math.random() * types.length)];
      this.currentWeather = newWeather;
      this.applyWeather();
    }

    // Animation des particules (pluie)
    if (this.particles && (this.currentWeather === 'rain' || this.currentWeather === 'storm')) {
      const positions = this.particles.geometry.attributes.position.array as Float32Array;
      const count = positions.length / 3;
      for (let i = 0; i < count; i++) {
        positions[i * 3 + 1] -= (3 + this.windSpeed * 0.5) * deltaTime * 60;
        positions[i * 3] += this.windSpeed * deltaTime * 10;
        if (positions[i * 3 + 1] < -5) {
          positions[i * 3 + 1] = 15;
          positions[i * 3] = (Math.random() - 0.5) * 100;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
        }
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  private applyWeather(): void {
    // Nettoyer les anciennes particules
    this.removeParticles();

    const fog = this.scene.fog as THREE.Fog;

    switch (this.currentWeather) {
      case 'clear':
        this.scene.background = new THREE.Color(0x87ceeb);
        if (fog) {
          fog.color.setHex(0x87ceeb);
          fog.far = 400;
        }
        this.windSpeed = 0;
        this.temperature = 25;
        this.humidity = 30;
        break;

      case 'cloudy':
        this.scene.background = new THREE.Color(0x88aacc);
        if (fog) {
          fog.color.setHex(0x88aacc);
          fog.far = 300;
        }
        this.windSpeed = 2;
        this.temperature = 20;
        this.humidity = 55;
        break;

      case 'fog':
        this.scene.background = new THREE.Color(0xaaaaaa);
        if (fog) {
          fog.color.setHex(0xaaaaaa);
          fog.far = 80;
          fog.near = 5;
        }
        this.windSpeed = 0.5;
        this.temperature = 15;
        this.humidity = 85;
        break;

      case 'rain':
        this.scene.background = new THREE.Color(0x668899);
        if (fog) {
          fog.color.setHex(0x668899);
          fog.far = 150;
        }
        this.windSpeed = 5;
        this.temperature = 12;
        this.humidity = 95;
        this.createRainParticles(3000);
        break;

      case 'storm':
        this.scene.background = new THREE.Color(0x445566);
        if (fog) {
          fog.color.setHex(0x445566);
          fog.far = 100;
        }
        this.windSpeed = 15;
        this.temperature = 8;
        this.humidity = 98;
        this.createRainParticles(6000);
        break;
    }
  }

  private createRainParticles(count: number): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 1] = Math.random() * 15;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 100;
      velocities[i] = 5 + Math.random() * 5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0x88bbff,
      size: 0.05,
      transparent: true,
      opacity: 0.6,
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.position.y = 0;
    this.scene.add(this.particles);
  }

  private removeParticles(): void {
    if (this.particles) {
      this.scene.remove(this.particles);
      this.particles.geometry.dispose();
      (this.particles.material as THREE.Material).dispose();
      this.particles = null;
    }
  }
}