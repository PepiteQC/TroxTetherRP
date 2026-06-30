import { useMemo } from "react";
import * as THREE from "three";

interface TerrainProps {
  width?: number;
  depth?: number;
  widthSegments?: number;
  depthSegments?: number;
}

export default function Terrain({ width = 400, depth = 2000, widthSegments = 40, depthSegments = 200 }: TerrainProps) {
  const geometry = useMemo(() => {
    const geo = new THREE.PlaneGeometry(width, depth, widthSegments, depthSegments);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.attributes.position;
    const count = positions.count;

    for (let i = 0; i < count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const absX = Math.abs(x);

      // Flat road corridor in the middle
      if (absX < 22) {
        positions.setY(i, 0);
        continue;
      }

      // Terrain rises away from road
      const distFromRoad = absX - 22;
      const baseHeight =
        Math.sin(x * 0.04) * 4 +
        Math.cos(z * 0.008 + x * 0.02) * 6 +
        Math.sin(z * 0.015) * 3 +
        distFromRoad * 0.04;

      // Add Laurentians on the north side
      const laurentianHeight = x > 0 ? Math.max(0, Math.sin(z * 0.005 + 1.2) * 20 + Math.cos(x * 0.01) * 15) : 0;

      positions.setY(i, baseHeight + laurentianHeight * (Math.max(0, x - 50) / 150));
    }

    positions.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [width, depth, widthSegments, depthSegments]);

  const colorArray = useMemo(() => {
    const positions = geometry.attributes.position;
    const count = positions.count;
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const y = positions.getY(i);
      const x = positions.getX(i);

      let r, g, b;
      if (y < 0.5) {
        // Low ground - grassy
        r = 0.25 + Math.random() * 0.05;
        g = 0.42 + Math.random() * 0.08;
        b = 0.18 + Math.random() * 0.04;
      } else if (y < 8) {
        // Mid ground - mixed green
        r = 0.22 + Math.random() * 0.06;
        g = 0.36 + Math.random() * 0.08;
        b = 0.15 + Math.random() * 0.04;
      } else if (y < 18) {
        // Forested hills - dark green
        r = 0.18 + Math.random() * 0.04;
        g = 0.28 + Math.random() * 0.06;
        b = 0.12 + Math.random() * 0.03;
      } else {
        // Peaks - grey rock
        r = 0.50 + Math.random() * 0.1;
        g = 0.48 + Math.random() * 0.08;
        b = 0.45 + Math.random() * 0.08;
      }

      colors[i * 3] = r;
      colors[i * 3 + 1] = g;
      colors[i * 3 + 2] = b;
    }

    return colors;
  }, [geometry]);

  useMemo(() => {
    geometry.setAttribute("color", new THREE.BufferAttribute(colorArray, 3));
  }, [geometry, colorArray]);

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshLambertMaterial vertexColors side={THREE.DoubleSide} />
    </mesh>
  );
}
