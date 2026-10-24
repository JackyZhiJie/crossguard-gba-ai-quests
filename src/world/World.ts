import * as THREE from 'three';

export interface MarkerDef {
  id: string;
  x: number;
  z: number;
  color: string;
}

export interface LabelDef {
  id: string;
  x: number;
  z: number;
  y?: number;
}

interface Callbacks {
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
  onFrame: (positions: Record<string, { x: number; y: number; visible: boolean }>) => void;
}

type XZ = [number, number];

// Stylised, not to scale. x = east, z = south. One unit ≈ 2 km.
const LAND: { id: string; color: string; pts: XZ[] }[] = [
  {
    id: 'mainland',
    color: '#8cc274',
    pts: [
      [-70, -60], [70, -60], [70, -9], [52, -9], [44, -7], [37, -9], [30, -8], [24, -9], [18, -8.5], [13, -10], [9, -9],
      [6, -12], [2, -11.5], [-2, -14], [-8, -16], [-14, -13], [-18, -9], [-21, -4], [-24, 2], [-26, 8], [-27, 13], [-30, 20],
      [-34, 26], [-70, 26],
    ],
  },
  {
    id: 'hk',
    color: '#93c97a',
    pts: [
      [9, -8.6], [13, -9.4], [18, -8], [24, -8.4], [30, -7.4], [37, -8.4], [44, -6.4], [46, -1], [42, 3], [38, 2], [36, 6],
      [31, 7], [27, 9.4], [22, 9.6], [18, 8.4], [15, 6], [11, 4], [8, 0], [7, -4],
    ],
  },
  { id: 'hki', color: '#93c97a', pts: [[17, 12], [21, 10.8], [26, 11], [31, 11.6], [33, 14], [29, 16.6], [24, 17], [19, 16], [16.5, 14]] },
  { id: 'lantau', color: '#90c676', pts: [[-3, 9], [1, 6.6], [6, 6], [11, 7], [13, 9], [11, 12], [6, 13.6], [1, 13], [-2.6, 11.4]] },
  { id: 'macau', color: '#9fcd7e', pts: [[-27.5, 13.4], [-22.6, 12.6], [-21, 14.6], [-21.6, 18.8], [-23, 22.4], [-26.4, 22.6], [-28.4, 19]] },
];

const CITIES: { x0: number; x1: number; z0: number; z1: number; n: number; h: [number, number]; land: string }[] = [
  { x0: 8, x1: 34, z0: -22, z1: -12, n: 150, h: [1.5, 9], land: 'mainland' }, // Shenzhen
  { x0: -8, x1: 6, z0: -20, z1: -15, n: 50, h: [1.2, 6], land: 'mainland' }, // Qianhai / Bao'an
  { x0: 17, x1: 26, z0: 3, z1: 8.8, n: 70, h: [1.5, 7], land: 'hk' }, // Kowloon
  { x0: 19, x1: 30, z0: 11.4, z1: 13.4, n: 46, h: [2, 9], land: 'hki' }, // HK Island north shore
  { x0: -26.5, x1: -21.8, z0: 13.6, z1: 17.6, n: 40, h: [1, 5], land: 'macau' }, // Macau
  { x0: -40, x1: -29, z0: 6, z1: 18, n: 50, h: [1, 4], land: 'mainland' }, // Zhuhai
];

function inside(p: XZ, poly: XZ[]): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, zi] = poly[i];
    const [xj, zj] = poly[j];
    if (zi > p[1] !== zj > p[1] && p[0] < ((xj - xi) * (p[1] - zi)) / (zj - zi) + xi) c = !c;
  }
  return c;
}

function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export class World {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private markerMeshes: THREE.Object3D[] = [];
  private markers = new Map<string, { group: THREE.Group; gem: THREE.Mesh; ring: THREE.Mesh; beam: THREE.Mesh; color: THREE.Color }>();
  private labels: LabelDef[] = [];
  private water!: THREE.Mesh;
  private waterBase!: Float32Array;
  private train!: THREE.Group;
  private railCurve!: THREE.CatmullRomCurve3;
  private boats: { mesh: THREE.Group; cx: number; cz: number; r: number; speed: number; phase: number }[] = [];
  private clouds: THREE.Group[] = [];
  private frame = 0;
  private running = true;
  private reduced: boolean;
  private resizeObs: ResizeObserver;
  private clock = new THREE.Clock();

  // orbit state
  private theta = -0.35;
  private phi = 0.95;
  private radius = 92;
  private target = new THREE.Vector3(2, 0, 2);
  private goal: { theta: number; phi: number; radius: number; target: THREE.Vector3 } | null = null;
  private drag: { x: number; y: number; moved: number; pan: boolean } | null = null;
  private pinch: number | null = null;
  private idle = true;
  private hovered: string | null = null;
  private done = new Set<string>();

  constructor(private el: HTMLElement, markers: MarkerDef[], labels: LabelDef[], private cb: Callbacks) {
    this.reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    el.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.touchAction = 'none';

    this.camera = new THREE.PerspectiveCamera(42, 1, 0.5, 600);
    this.scene.fog = new THREE.Fog(0xcdeef2, 130, 280);

    this.buildLights();
    this.buildWater();
    this.buildLand();
    this.buildBridge();
    this.buildRail();
    this.buildBoats();
    this.buildClouds();
    markers.forEach((m) => this.addMarker(m));
    this.labels = labels;

    this.bindInput();
    this.resizeObs = new ResizeObserver(() => this.resize());
    this.resizeObs.observe(el);
    this.resize();
    this.loop();
  }

  private buildLights() {
    this.scene.add(new THREE.HemisphereLight(0xeaf6ff, 0x4d6d4a, 0.6));
    const sun = new THREE.DirectionalLight(0xfff1d6, 1.05);
    sun.position.set(-50, 80, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const s = sun.shadow.camera as THREE.OrthographicCamera;
    s.left = -80;
    s.right = 80;
    s.top = 60;
    s.bottom = -60;
    s.far = 250;
    this.scene.add(sun);
  }

  private buildWater() {
    const g = new THREE.PlaneGeometry(320, 240, 90, 70);
    g.rotateX(-Math.PI / 2);
    this.waterBase = Float32Array.from(g.attributes.position.array as ArrayLike<number>);
    const m = new THREE.MeshStandardMaterial({ color: 0x2d93b5, flatShading: true, roughness: 0.4, metalness: 0.05 });
    this.water = new THREE.Mesh(g, m);
    this.water.receiveShadow = true;
    this.scene.add(this.water);
    // estuary sandbars for depth cues
    const sand = new THREE.MeshStandardMaterial({ color: 0x4aa9c4, flatShading: true });
    const r = rng(7);
    for (let i = 0; i < 14; i++) {
      const bar = new THREE.Mesh(new THREE.CircleGeometry(2 + r() * 4, 7), sand);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(-18 + r() * 16, 0.02, -6 + r() * 26);
      bar.scale.set(1.8, 1, 0.7);
      this.scene.add(bar);
    }
  }

  private buildLand() {
    const r = rng(42);
    for (const land of LAND) {
      const shape = new THREE.Shape(land.pts.map(([x, z]) => new THREE.Vector2(x, -z)));
      const geo = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: true, bevelThickness: 0.4, bevelSize: 0.6, bevelSegments: 1 });
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: land.color, flatShading: true, roughness: 0.9 }));
      mesh.position.y = -0.6;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
      // beach rim
      const rim = new THREE.Mesh(
        new THREE.ExtrudeGeometry(shape, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.2, bevelSize: 1.1, bevelSegments: 1 }).rotateX(-Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xf0e2b6, flatShading: true }),
      );
      rim.position.y = -0.55;
      this.scene.add(rim);
    }

    // hills
    const hillColors = [0x6fa860, 0x5f9a55, 0x7cb46a, 0x8bbd73];
    const city = (x: number, z: number) => CITIES.some((c) => x > c.x0 - 1 && x < c.x1 + 1 && z > c.z0 - 1 && z < c.z1 + 1);
    const nearRoute = (x: number, z: number) => Math.abs(x - 19) < 2 && z > -9 && z < 9;
    for (const land of LAND) {
      const n = land.id === 'mainland' ? 70 : land.id === 'hk' ? 45 : land.id === 'macau' ? 6 : 16;
      let placed = 0;
      for (let tries = 0; placed < n && tries < n * 30; tries++) {
        const xs = land.pts.map((p) => p[0]);
        const zs = land.pts.map((p) => p[1]);
        const x = Math.min(...xs) + r() * (Math.max(...xs) - Math.min(...xs));
        const z = Math.min(...zs) + r() * (Math.max(...zs) - Math.min(...zs));
        if (!inside([x, z], land.pts) || city(x, z) || nearRoute(x, z)) continue;
        if (land.id === 'mainland' && z < -45) continue;
        const h = 1.5 + r() * (land.id === 'hk' || land.id === 'lantau' || land.id === 'hki' ? 5 : 3.5);
        const hill = new THREE.Mesh(
          new THREE.ConeGeometry(1.4 + r() * 2.4, h, 5 + Math.floor(r() * 3)),
          new THREE.MeshStandardMaterial({ color: hillColors[Math.floor(r() * hillColors.length)], flatShading: true }),
        );
        hill.position.set(x, 0.4 + h / 2, z);
        hill.rotation.y = r() * Math.PI;
        hill.castShadow = true;
        hill.receiveShadow = true;
        this.scene.add(hill);
        placed++;
      }
    }

    // buildings as instanced boxes
    const box = new THREE.BoxGeometry(1, 1, 1);
    box.translate(0, 0.5, 0);
    const total = CITIES.reduce((a, c) => a + c.n, 0);
    const mat = new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.6 });
    const inst = new THREE.InstancedMesh(box, mat, total);
    const palette = [0xf4f1ff, 0xdfe8f2, 0xc8d6e5, 0xffe7c2, 0xb9d4f0, 0xe9eef3];
    const m4 = new THREE.Matrix4();
    const col = new THREE.Color();
    let k = 0;
    for (const c of CITIES) {
      const land = LAND.find((l) => l.id === c.land)!;
      let placed = 0;
      for (let tries = 0; placed < c.n && tries < c.n * 20; tries++) {
        const x = c.x0 + r() * (c.x1 - c.x0);
        const z = c.z0 + r() * (c.z1 - c.z0);
        if (!inside([x, z], land.pts)) continue;
        const w = 0.6 + r() * 0.9;
        const h = c.h[0] + Math.pow(r(), 2) * (c.h[1] - c.h[0]);
        m4.compose(new THREE.Vector3(x, 0.4, z), new THREE.Quaternion(), new THREE.Vector3(w, h, w * (0.7 + r() * 0.6)));
        inst.setMatrixAt(k, m4);
        inst.setColorAt(k, col.setHex(palette[Math.floor(r() * palette.length)]));
        k++;
        placed++;
      }
    }
    inst.count = k;
    inst.castShadow = true;
    inst.receiveShadow = true;
    this.scene.add(inst);
  }

  private buildBridge() {
    // Hong Kong–Zhuhai–Macau Bridge: Lantau → tunnel islands → Macau/Zhuhai
    const pts = [
      new THREE.Vector3(-2.5, 1.1, 9.8),
      new THREE.Vector3(-6, 1.1, 10.8),
      new THREE.Vector3(-9, 1.1, 11.2),
      new THREE.Vector3(-13, 1.1, 11.4),
      new THREE.Vector3(-17, 1.1, 12.4),
      new THREE.Vector3(-21.4, 1.1, 13.4),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    const deck = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.32, 5, false), new THREE.MeshStandardMaterial({ color: 0xf4f6f8, flatShading: true }));
    deck.scale.y = 0.6;
    deck.position.y = 0.45;
    deck.castShadow = true;
    this.scene.add(deck);
    const pylonMat = new THREE.MeshStandardMaterial({ color: 0xe7ecef });
    for (let t = 0.04; t < 1; t += 0.06) {
      const p = curve.getPointAt(t);
      const pylon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 1.2, 5), pylonMat);
      pylon.position.set(p.x, 0.5, p.z);
      this.scene.add(pylon);
    }
    // cable-stayed towers
    for (const t of [0.22, 0.5, 0.78]) {
      const p = curve.getPointAt(t);
      const tower = new THREE.Mesh(new THREE.ConeGeometry(0.35, 4.5, 4), new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true }));
      tower.position.set(p.x, 2.9, p.z);
      tower.castShadow = true;
      this.scene.add(tower);
    }
    // artificial islands
    for (const [x, z] of [
      [-7.5, 11],
      [-14.5, 11.7],
    ] as XZ[]) {
      const isl = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 0.9, 8), new THREE.MeshStandardMaterial({ color: 0xe9dcb0, flatShading: true }));
      isl.scale.set(1.6, 1, 0.8);
      isl.position.set(x, 0.2, z);
      isl.receiveShadow = true;
      this.scene.add(isl);
    }
  }

  private buildRail() {
    // Cross-boundary rail: Futian / Lok Ma Chau → West Kowloon
    this.railCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(17, 0.75, -20),
      new THREE.Vector3(18, 0.75, -12),
      new THREE.Vector3(18.6, 0.75, -6),
      new THREE.Vector3(19.4, 0.75, 0),
      new THREE.Vector3(19, 0.75, 5),
      new THREE.Vector3(18.4, 0.75, 8.6),
    ]);
    const track = new THREE.Mesh(new THREE.TubeGeometry(this.railCurve, 100, 0.18, 4, false), new THREE.MeshStandardMaterial({ color: 0x8a6d5b }));
    this.scene.add(track);
    this.train = new THREE.Group();
    const carMat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true });
    const stripe = new THREE.MeshStandardMaterial({ color: 0xd94b3d });
    for (let i = 0; i < 4; i++) {
      const car = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 1.6), carMat);
      car.position.z = -i * 1.75;
      car.castShadow = true;
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.12, 1.62), stripe);
      s.position.set(0, -0.05, -i * 1.75);
      this.train.add(car, s);
    }
    this.scene.add(this.train);
  }

  private buildBoats() {
    const r = rng(99);
    const spots: [number, number, number][] = [
      [-10, 2, 6],
      [-4, 18, 5],
      [10, 17, 4],
      [24, 19, 3],
      [-14, 22, 4],
      [-8, -4, 4],
    ];
    for (const [cx, cz, rad] of spots) {
      const g = new THREE.Group();
      const hull = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.35, 1.6), new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true }));
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.35, 0.6), new THREE.MeshStandardMaterial({ color: r() > 0.5 ? 0xe86a4a : 0x2f6fb5 }));
      cabin.position.set(0, 0.33, -0.2);
      g.add(hull, cabin);
      g.position.y = 0.25;
      this.scene.add(g);
      this.boats.push({ mesh: g, cx, cz, r: rad, speed: 0.05 + r() * 0.08, phase: r() * Math.PI * 2 });
    }
  }

  private buildClouds() {
    const r = rng(5);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 9; i++) {
      const g = new THREE.Group();
      for (let j = 0; j < 4; j++) {
        const puff = new THREE.Mesh(new THREE.IcosahedronGeometry(1.6 + r() * 1.6, 0), mat);
        puff.position.set(j * 1.9 - 3, r() * 0.8, r() * 1.4);
        g.add(puff);
      }
      g.position.set(-80 + r() * 160, 20 + r() * 8, -40 + r() * 70);
      this.scene.add(g);
      this.clouds.push(g);
    }
  }

  private addMarker(m: MarkerDef) {
    const color = new THREE.Color(m.color);
    const group = new THREE.Group();
    group.position.set(m.x, 0, m.z);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 0.5, 12), new THREE.MeshStandardMaterial({ color: 0xffffff, flatShading: true }));
    base.position.y = 0.6;
    base.castShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2, 0.12, 6, 32), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9 }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.7;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.9, 9, 12, 1, true),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.y = 5;
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(1.1, 0), new THREE.MeshStandardMaterial({ color, flatShading: true, emissive: color, emissiveIntensity: 0.35 }));
    gem.position.y = 4;
    gem.castShadow = true;
    // generous invisible hit target
    const hit = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 8, 8), new THREE.MeshBasicMaterial({ visible: false }));
    hit.position.y = 4;
    for (const o of [base, ring, beam, gem, hit]) o.userData.questId = m.id;
    group.add(base, ring, beam, gem, hit);
    this.scene.add(group);
    this.markerMeshes.push(hit, gem);
    this.markers.set(m.id, { group, gem, ring, beam, color });
  }

  setCompleted(ids: string[]) {
    this.done = new Set(ids);
    const gold = new THREE.Color('#f2b632');
    this.markers.forEach((mk, id) => {
      const c = this.done.has(id) ? gold : mk.color;
      (mk.gem.material as THREE.MeshStandardMaterial).color.copy(c);
      (mk.gem.material as THREE.MeshStandardMaterial).emissive.copy(c);
      (mk.ring.material as THREE.MeshBasicMaterial).color.copy(c);
      (mk.beam.material as THREE.MeshBasicMaterial).color.copy(c);
    });
  }

  focus(id: string | null) {
    this.idle = false;
    if (!id) {
      this.goal = { theta: this.theta, phi: 0.95, radius: 92, target: new THREE.Vector3(2, 0, 2) };
      return;
    }
    const mk = this.markers.get(id);
    if (!mk) return;
    this.goal = { theta: this.theta, phi: 0.82, radius: 42, target: mk.group.position.clone() };
  }

  private bindInput() {
    const c = this.renderer.domElement;
    c.addEventListener('pointerdown', (e) => {
      this.idle = false;
      this.goal = null;
      this.drag = { x: e.clientX, y: e.clientY, moved: 0, pan: e.button === 2 || e.shiftKey };
      c.setPointerCapture(e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (this.drag && !this.pinch) {
        const dx = e.clientX - this.drag.x;
        const dy = e.clientY - this.drag.y;
        this.drag.moved += Math.abs(dx) + Math.abs(dy);
        this.drag.x = e.clientX;
        this.drag.y = e.clientY;
        if (this.drag.pan) {
          const s = this.radius / 600;
          const fwd = new THREE.Vector3(Math.sin(this.theta), 0, Math.cos(this.theta));
          const right = new THREE.Vector3(fwd.z, 0, -fwd.x);
          this.target.addScaledVector(right, -dx * s).addScaledVector(fwd, -dy * s);
          this.clampTarget();
        } else {
          this.theta -= dx * 0.006;
          this.phi = Math.min(1.25, Math.max(0.45, this.phi - dy * 0.004));
        }
      } else {
        this.updateHover(e);
      }
    });
    c.addEventListener('pointerup', (e) => {
      if (this.drag && this.drag.moved < 6) {
        const id = this.pick(e);
        if (id) this.cb.onSelect(id);
      }
      this.drag = null;
    });
    c.addEventListener('pointerleave', () => this.setHover(null));
    c.addEventListener('contextmenu', (e) => e.preventDefault());
    c.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        this.idle = false;
        this.goal = null;
        this.radius = Math.min(130, Math.max(22, this.radius * (1 + Math.sign(e.deltaY) * 0.08)));
      },
      { passive: false },
    );
    c.addEventListener('touchstart', (e) => {
      if (e.touches.length === 2) this.pinch = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
    });
    c.addEventListener('touchmove', (e) => {
      if (e.touches.length === 2 && this.pinch) {
        const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
        this.radius = Math.min(130, Math.max(22, this.radius * (this.pinch / d)));
        this.pinch = d;
      }
    });
    c.addEventListener('touchend', () => (this.pinch = null));
  }

  private clampTarget() {
    this.target.x = Math.max(-45, Math.min(45, this.target.x));
    this.target.z = Math.max(-30, Math.min(30, this.target.z));
  }

  private pick(e: PointerEvent): string | null {
    const r = this.renderer.domElement.getBoundingClientRect();
    this.pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.raycaster.intersectObjects(this.markerMeshes, false)[0];
    return (hit?.object.userData.questId as string) ?? null;
  }

  private updateHover(e: PointerEvent) {
    this.setHover(this.pick(e));
  }

  private setHover(id: string | null) {
    if (id === this.hovered) return;
    this.hovered = id;
    this.renderer.domElement.style.cursor = id ? 'pointer' : 'grab';
    this.cb.onHover(id);
  }

  private resize() {
    const w = this.el.clientWidth || 1;
    const h = this.el.clientHeight || 1;
    this.renderer.setSize(w, h, false);
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.camera.aspect = w / h;
    // pull back on narrow screens so the whole bay fits
    this.camera.fov = w / h < 0.8 ? 58 : 42;
    this.camera.updateProjectionMatrix();
  }

  private loop = () => {
    if (!this.running) return;
    this.frame = requestAnimationFrame(this.loop);
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;

    if (this.goal) {
      const k = 1 - Math.pow(0.02, dt);
      this.phi += (this.goal.phi - this.phi) * k;
      this.radius += (this.goal.radius - this.radius) * k;
      this.target.lerp(this.goal.target, k);
      if (Math.abs(this.radius - this.goal.radius) < 0.05 && this.target.distanceTo(this.goal.target) < 0.05) this.goal = null;
    } else if (this.idle && !this.reduced) {
      this.theta += dt * 0.04;
    }

    const cp = new THREE.Vector3(
      this.target.x + this.radius * Math.sin(this.phi) * Math.sin(this.theta),
      this.target.y + this.radius * Math.cos(this.phi),
      this.target.z + this.radius * Math.sin(this.phi) * Math.cos(this.theta),
    );
    this.camera.position.copy(cp);
    this.camera.lookAt(this.target);

    if (!this.reduced) {
      const pos = this.water.geometry.attributes.position as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      for (let i = 0; i < arr.length; i += 3) {
        const x = this.waterBase[i];
        const z = this.waterBase[i + 2];
        arr[i + 1] = Math.sin(x * 0.35 + t * 1.1) * 0.12 + Math.cos(z * 0.42 + t * 0.8) * 0.1 - 0.15;
      }
      pos.needsUpdate = true;

      const u = (t * 0.03) % 1;
      const ping = u < 0.5 ? u * 2 : 2 - u * 2;
      const p = this.railCurve.getPointAt(ping);
      const tan = this.railCurve.getTangentAt(ping);
      this.train.position.copy(p);
      this.train.lookAt(p.clone().add(u < 0.5 ? tan : tan.negate()));

      for (const b of this.boats) {
        const a = b.phase + t * b.speed;
        b.mesh.position.x = b.cx + Math.cos(a) * b.r;
        b.mesh.position.z = b.cz + Math.sin(a) * b.r;
        b.mesh.rotation.y = -a;
      }
      for (const c of this.clouds) {
        c.position.x += dt * 0.8;
        if (c.position.x > 90) c.position.x = -90;
      }
    }

    this.markers.forEach((mk, id) => {
      mk.gem.rotation.y = t * 1.2;
      mk.gem.position.y = 4 + Math.sin(t * 2 + mk.group.position.x) * 0.35;
      const s = 1 + ((t * 0.8 + mk.group.position.z * 0.1) % 1) * 0.5;
      mk.ring.scale.set(s, s, s);
      (mk.ring.material as THREE.MeshBasicMaterial).opacity = 1.4 - s;
      const hov = this.hovered === id ? 1.25 : 1;
      mk.gem.scale.setScalar(hov);
    });

    this.renderer.render(this.scene, this.camera);

    // project label anchors to screen
    const w = this.renderer.domElement.clientWidth;
    const h = this.renderer.domElement.clientHeight;
    const out: Record<string, { x: number; y: number; visible: boolean }> = {};
    const v = new THREE.Vector3();
    const project = (id: string, x: number, y: number, z: number) => {
      v.set(x, y, z).project(this.camera);
      out[id] = { x: (v.x * 0.5 + 0.5) * w, y: (-v.y * 0.5 + 0.5) * h, visible: v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1 };
    };
    this.markers.forEach((mk, id) => project(id, mk.group.position.x, 6.6, mk.group.position.z));
    for (const l of this.labels) project(l.id, l.x, l.y ?? 1.5, l.z);
    this.cb.onFrame(out);
  };

  dispose() {
    this.running = false;
    cancelAnimationFrame(this.frame);
    this.resizeObs.disconnect();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl')));
  } catch {
    return false;
  }
}
