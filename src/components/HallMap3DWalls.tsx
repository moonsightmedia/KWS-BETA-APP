import { useEffect, useRef } from 'react';
import type { BufferGeometry, Material, WebGLRenderer } from 'three';
import { toHallMapDisplayPoint } from '@/lib/hallMapOrientation';
import type { MapPoint, SectorMapRegion } from '@/types/hallMap';

interface Props {
  regions: readonly SectorMapRegion[];
  width: number;
  height: number;
  rotateClockwise: boolean;
  onReady: (ready: boolean) => void;
}

/** Real extruded meshes; SVG above them remains the accessible interaction layer.
 * Orthographic compensation aligns the top footprint with saved 2D coordinates.
 * Schematic thickness is visual only: no surveyed wall heights are implied.
 */
export function HallMap3DWalls({ regions, width, height, rotateClockwise, onReady }: Props) {
  const host = useRef<HTMLDivElement>(null);
  // Query results may use new object identities for unchanged coordinates.
  // Only actual geometry changes should rebuild the expensive GPU scene.
  const footprints = JSON.stringify(regions.map(region => region.points_json));

  useEffect(() => {
    const node = host.current;
    if (!node) return;
    let cancelled = false;
    let renderer: WebGLRenderer | undefined;
    let observer: ResizeObserver | undefined;
    let frame = 0;
    let releaseEvents: (() => void) | undefined;
    const geometries: BufferGeometry[] = [];
    const materials: Material[] = [];
    const releaseShadows: (() => void)[] = [];
    const release = () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      releaseEvents?.();
      releaseEvents = undefined;
      geometries.splice(0).forEach(geometry => geometry.dispose());
      materials.splice(0).forEach(material => material.dispose());
      releaseShadows.splice(0).forEach(dispose => dispose());
      renderer?.dispose();
      renderer?.forceContextLoss();
      renderer?.domElement.remove();
      renderer = undefined;
    };
    onReady(false);
    node.dataset.mapRenderer = 'loading';

    const load = async () => {
      try {
        // The engine is a separate chunk, downloaded only while a map is open.
        const THREE = await import('three');
        if (cancelled) return;
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.6;
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.setClearColor(0x000000, 0);
        renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
        node.appendChild(renderer.domElement);

        const scene = new THREE.Scene();
        const unit = Math.max(Math.min(width, height) / 100, 1);
        const bevel = 0.85 * unit;
        const depth = 3.4 * unit;
        const top = depth + bevel;
        const tilt = Math.PI / 5;
        const camera = new THREE.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, 0.1, 10000);
        const distance = Math.max(width, height) * 2;
        camera.position.set(0, -distance * Math.sin(tilt), top + distance * Math.cos(tilt));
        camera.lookAt(0, 0, top);

        scene.add(new THREE.HemisphereLight(0xffffff, 0xe5e9e5, 1.6));
        scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const sunlight = new THREE.DirectionalLight(0xffffff, 2.5);
        releaseShadows.push(() => sunlight.shadow.dispose());
        sunlight.position.set(-width * 0.7, height * 0.65, distance);
        sunlight.castShadow = true;
        sunlight.shadow.mapSize.set(2048, 2048);
        sunlight.shadow.radius = 4;
        Object.assign(sunlight.shadow.camera, { left: -width * 0.65, right: width * 0.65, top: height * 0.8, bottom: -height * 0.8, near: 1, far: distance * 3 });
        sunlight.shadow.normalBias = 0.3 * unit;
        sunlight.shadow.bias = -0.0001;
        scene.add(sunlight);

        const cap = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 });
        const sides = new THREE.MeshStandardMaterial({ color: 0xe5e8e5, roughness: 1 });
        const shadow = new THREE.ShadowMaterial({ opacity: 0.12 });
        materials.push(cap, sides, shadow);
        let meshCount = 0;
        for (const points of JSON.parse(footprints) as MapPoint[][]) {
          if (points.length < 3) continue;
          const shape = new THREE.Shape();
          points.forEach((point, index) => {
            const display = toHallMapDisplayPoint(point, rotateClockwise);
            const x = display.x * width / 100 - width / 2;
            const y = (height / 2 - display.y * height / 100) / Math.cos(tilt);
            if (index === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
          });
          shape.closePath();
          const geometry = new THREE.ExtrudeGeometry(shape, {
            depth, steps: 1, bevelEnabled: true, bevelSize: bevel,
            bevelThickness: bevel, bevelOffset: -bevel, bevelSegments: 2,
          });
          geometries.push(geometry);
          const mesh = new THREE.Mesh(geometry, [cap, sides]);
          mesh.castShadow = true;
          mesh.receiveShadow = true;
          scene.add(mesh);
          meshCount += 1;
        }
        const floor = new THREE.PlaneGeometry(width * 3, height * 3);
        geometries.push(floor);
        const receiver = new THREE.Mesh(floor, shadow);
        receiver.position.z = -bevel;
        receiver.receiveShadow = true;
        scene.add(receiver);

        const draw = () => {
          if (cancelled || !renderer || renderer.getContext().isContextLost()) return;
          const { width: pixelsX, height: pixelsY } = node.getBoundingClientRect();
          if (pixelsX <= 0 || pixelsY <= 0) return;
          // Match SVG preserveAspectRatio="xMidYMid meet", including its padding.
          const paddedX = width + 8 * unit, paddedY = height + 8 * unit;
          const aspect = pixelsX / pixelsY;
          const viewX = Math.max(paddedX, paddedY * aspect);
          const viewY = Math.max(paddedY, paddedX / aspect);
          camera.left = -viewX / 2; camera.right = viewX / 2;
          camera.top = viewY / 2; camera.bottom = -viewY / 2;
          camera.updateProjectionMatrix();
          renderer.setSize(pixelsX, pixelsY, false);
          renderer.render(scene, camera);
          node.dataset.mapRenderer = 'webgl';
          node.dataset.meshCount = String(meshCount);
          onReady(true);
        };
        const lost = (event: Event) => {
          event.preventDefault();
          node.dataset.mapRenderer = 'fallback';
          onReady(false);
        };
        renderer.domElement.addEventListener('webglcontextlost', lost);
        renderer.domElement.addEventListener('webglcontextrestored', draw);
        const canvas = renderer.domElement;
        releaseEvents = () => {
          canvas.removeEventListener('webglcontextlost', lost);
          canvas.removeEventListener('webglcontextrestored', draw);
        };
        // Static rendering: no continuous animation loop or battery drain at rest.
        observer = new ResizeObserver(() => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(draw);
        });
        observer.observe(node);
        draw();
      } catch {
        if (!cancelled) {
          release();
          node.dataset.mapRenderer = 'fallback';
          onReady(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
      release();
    };
  }, [footprints, height, onReady, rotateClockwise, width]);

  return <div ref={host} aria-hidden="true" className="pointer-events-none absolute inset-0" data-map-renderer="loading" />;
}
