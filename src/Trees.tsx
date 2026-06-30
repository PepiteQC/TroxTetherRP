import { useMemo } from "react";

interface TreeData {
  id: number;
  x: number;
  z: number;
  height: number;
  radius: number;
  layers: number;
  colorShade: number;
}

export default function Trees() {
  const treeData = useMemo<TreeData[]>(() => {
    const trees: TreeData[] = [];
    let id = 0;

    // Dense forests on both sides of Route 138
    for (let z = -950; z < 950; z += 8) {
      // Right side (south/river side)
      for (let i = 0; i < 3; i++) {
        const xBase = 14 + i * 12;
        const xJitter = (Math.sin(z * 0.7 + i * 2.3) * 4);
        const zJitter = (Math.cos(z * 0.5 + i * 1.7) * 3);
        // Skip near A-40
        const x = xBase + xJitter;
        if (x > 45 && x < 75) continue;
        trees.push({
          id: id++,
          x,
          z: z + zJitter,
          height: 4 + Math.abs(Math.sin(z * 0.3 + i)) * 4,
          radius: 1.5 + Math.abs(Math.cos(z * 0.2 + i)) * 1.2,
          layers: 2 + Math.floor(Math.abs(Math.sin(z * 0.4 + i)) * 2),
          colorShade: Math.abs(Math.sin(z * 0.11 + i * 0.37)),
        });
      }

      // Left side (north / Laurentians side)
      for (let i = 0; i < 4; i++) {
        const xBase = -(14 + i * 14);
        const xJitter = (Math.sin(z * 0.6 + i * 3.1) * 5);
        const zJitter = (Math.cos(z * 0.4 + i * 2.2) * 4);
        trees.push({
          id: id++,
          x: xBase + xJitter,
          z: z + zJitter,
          height: 5 + Math.abs(Math.sin(z * 0.25 + i)) * 5,
          radius: 1.8 + Math.abs(Math.cos(z * 0.18 + i)) * 1.5,
          layers: 2 + Math.floor(Math.abs(Math.sin(z * 0.35 + i)) * 3),
          colorShade: Math.abs(Math.sin(z * 0.09 + i * 0.41)),
        });
      }
    }
    return trees;
  }, []);

  return (
    <group>
      {treeData.map((tree) => {
        const trunkColor = "#3a2210";
        const baseGreen = tree.colorShade;
        // Conifer colors - dark blue-green to medium green
        const r = 0.1 + baseGreen * 0.05;
        const g = 0.25 + baseGreen * 0.15;
        const b = 0.12 + baseGreen * 0.08;
        const treeColor = `rgb(${Math.floor(r * 255)},${Math.floor(g * 255)},${Math.floor(b * 255)})`;
        const treeColor2 = `rgb(${Math.floor((r + 0.03) * 255)},${Math.floor((g + 0.06) * 255)},${Math.floor((b + 0.02) * 255)})`;

        return (
          <group key={tree.id} position={[tree.x, 0, tree.z]}>
            {/* Trunk */}
            <mesh position={[0, tree.height * 0.25, 0]} castShadow>
              <cylinderGeometry args={[0.2, 0.3, tree.height * 0.5, 5]} />
              <meshLambertMaterial color={trunkColor} />
            </mesh>

            {/* Conifer layers - top to bottom, getting wider */}
            {Array.from({ length: tree.layers }).map((_, li) => {
              const layerFrac = li / (tree.layers - 1 || 1);
              const layerY = tree.height * (1.0 - layerFrac * 0.55);
              const layerRadius = tree.radius * (0.3 + layerFrac * 0.7);
              const layerH = tree.height * 0.45 / tree.layers;
              return (
                <mesh key={li} position={[0, layerY, 0]} castShadow>
                  <coneGeometry args={[layerRadius, layerH * 2.2, 6]} />
                  <meshLambertMaterial color={li % 2 === 0 ? treeColor : treeColor2} />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}
