import * as THREE from "../vendor/three.module.js";

const AMBER = new THREE.Color("#e0a45a");
const CYAN = new THREE.Color("#7dcec4");
const SELECTED = new THREE.Color("#fff1cf");

export function createGlobe(container, options) {
  const motion = options.motion !== false;
  const light = !!options.light;
  const renderer = new THREE.WebGLRenderer({
    antialias: !light,
    alpha: false,
    powerPreference: light ? "low-power" : "high-performance",
  });
  renderer.setClearColor(0x070b10, 1);
  renderer.setPixelRatio(light ? 1 : Math.min(window.devicePixelRatio || 1, 1.6));
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 40);
  const state = { theta: 0.55, phi: 1.08, radius: light ? 3.35 : 3.05, dragging: false, lastInput: 0 };
  const markerGroup = new THREE.Group();
  const arcGroup = new THREE.Group();
  const satelliteGroup = new THREE.Group();
  scene.add(markerGroup, arcGroup, satelliteGroup);

  scene.add(new THREE.AmbientLight(0x8eb8b4, 0.55));
  const key = new THREE.DirectionalLight(0xe7fff8, 1.15);
  key.position.set(5, 2.2, 3);
  scene.add(key);

  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(1, light ? 32 : 64, light ? 24 : 48),
    new THREE.MeshPhongMaterial({ color: 0x10242c, emissive: 0x07141a, shininess: 12, specular: 0x1c4a52 })
  );
  scene.add(earth);
  scene.add(atmosphere());
  if (!light) scene.add(stars());
  let particles = null;
  if (motion && !light) {
    particles = makeParticles();
    scene.add(particles);
  }

  let borders = null;
  let snapshot = null;
  let filter = { feed: "all", type: "all", country: "all" };
  let selected = null;
  let satellites = [];
  let travelers = [];
  let pointer = null;
  let request = 0;
  let running = true;

  function resize() {
    const width = container.clientWidth || 640;
    const height = container.clientHeight || 480;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }

  function placeCamera() {
    camera.position.set(
      state.radius * Math.sin(state.phi) * Math.sin(state.theta),
      state.radius * Math.cos(state.phi),
      state.radius * Math.sin(state.phi) * Math.cos(state.theta)
    );
    camera.lookAt(0, 0, 0);
  }

  function frame(now) {
    if (!running) return;
    request = requestAnimationFrame(frame);
    if (motion && !state.dragging && now - state.lastInput > 1600) state.theta += 0.00055;
    if (particles && motion) particles.rotation.y += 0.00035;
    for (const sat of satellites) {
      if (!motion) continue;
      sat.angle += sat.speed;
      sat.mesh.position.set(
        Math.cos(sat.angle) * sat.orbit,
        Math.sin(sat.angle * 2) * sat.lift,
        Math.sin(sat.angle) * sat.orbit
      );
    }
    for (const traveler of travelers) {
      if (motion) traveler.progress = (traveler.progress + 0.004) % 1;
      traveler.mesh.position.copy(traveler.curve.getPoint(traveler.progress));
    }
    placeCamera();
    renderer.render(scene, camera);
  }

  function onPointerDown(event) {
    pointer = { x: event.clientX, y: event.clientY, theta: state.theta, phi: state.phi };
    state.dragging = true;
    state.lastInput = performance.now();
    renderer.domElement.setPointerCapture(event.pointerId);
  }
  function onPointerMove(event) {
    if (!pointer) return;
    state.theta = pointer.theta - (event.clientX - pointer.x) * 0.005;
    state.phi = clamp(pointer.phi + (event.clientY - pointer.y) * 0.005, 0.28, Math.PI - 0.28);
    state.lastInput = performance.now();
  }
  function onPointerUp(event) {
    const moved = pointer ? Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) : 0;
    pointer = null;
    state.dragging = false;
    if (moved < 6) pick(event);
  }
  function onWheel(event) {
    event.preventDefault();
    state.radius = clamp(state.radius + Math.sign(event.deltaY) * 0.18, 1.8, 6);
    state.lastInput = performance.now();
  }

  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("pointercancel", onPointerUp);
  renderer.domElement.addEventListener("wheel", onWheel, { passive: false });

  function pick(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2(x, y), camera);
    const hits = ray.intersectObjects(markerGroup.children, false);
    const hit = hits.find((item) => item.instanceId != null && item.object.userData.codes);
    if (!hit) return;
    const code = hit.object.userData.codes[hit.instanceId];
    if (code) options.onPick(code);
  }

  function setCountries(geojson) {
    if (borders) {
      scene.remove(borders);
      borders.geometry.dispose();
      borders.material.dispose();
    }
    const positions = [];
    for (const feature of geojson.features || []) {
      for (const ring of rings(feature.geometry)) {
        for (let i = 1; i < ring.length; i += 1) {
          const a = ring[i - 1];
          const b = ring[i];
          if (!a || !b || Math.abs(a[0] - b[0]) > 180) continue;
          const va = lonLat(a[0], a[1], 1.004);
          const vb = lonLat(b[0], b[1], 1.004);
          positions.push(va.x, va.y, va.z, vb.x, vb.y, vb.z);
        }
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    borders = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: 0x2f6f73, transparent: true, opacity: 0.55 })
    );
    scene.add(borders);
  }

  function setSnapshot(next, nextFilter) {
    snapshot = next;
    filter = nextFilter || filter;
    drawMarkers();
    drawArcs();
    drawSatellites();
  }

  function setFilter(next) {
    filter = next;
    if (snapshot) {
      drawMarkers();
      drawArcs();
    }
  }

  function select(code) {
    selected = code;
    if (snapshot) drawMarkers();
  }

  function drawMarkers() {
    clear(markerGroup);
    const beams = [];
    const dots = [];
    for (const country of snapshot.countries || []) {
      if (!passes(country, filter)) continue;
      const beam = beamValue(country, filter);
      const hosts = hostValue(country, filter);
      if (beam > 0) beams.push({ country, value: beam });
      if (hosts > 0) dots.push({ country, value: hosts });
    }
    if (beams.length) markerGroup.add(instances(beams, "beam"));
    if (dots.length) markerGroup.add(instances(dots, "dot"));
  }

  function instances(items, kind) {
    const geometry = kind === "beam"
      ? new THREE.CylinderGeometry(1, 1, 1, light ? 5 : 8)
      : new THREE.SphereGeometry(1, light ? 6 : 10, light ? 6 : 8);
    if (kind === "beam") geometry.translate(0, 0.5, 0);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.InstancedMesh(geometry, material, items.length);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    mesh.userData.codes = items.map((item) => item.country.code);
    items.forEach((item, index) => {
      const normal = lonLat(item.country.lon, item.country.lat, 1).normalize();
      const height = kind === "beam" ? 0.035 + Math.min(0.42, Math.log10(item.value + 1) / 14) : 0.014 + Math.min(0.03, Math.log10(item.value + 1) / 80);
      dummy.position.copy(normal).multiplyScalar(1.01);
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
      dummy.scale.set(kind === "beam" ? 0.006 : height, height, kind === "beam" ? 0.006 : height);
      if (kind === "dot") dummy.position.copy(normal).multiplyScalar(1.02);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
      const base = kind === "beam" ? AMBER : CYAN;
      color.copy(selected && selected !== item.country.code ? base.clone().multiplyScalar(0.28) : selected === item.country.code ? SELECTED : base);
      mesh.setColorAt(index, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    return mesh;
  }

  function drawArcs() {
    clear(arcGroup);
    travelers = [];
    const arcs = (snapshot.arcs || []).filter((arc) => snapshot.simulated || (!arc.simulated && arc.source_country && arc.target_country));
    const byCode = new Map((snapshot.countries || []).map((country) => [country.code, country]));
    for (const arc of arcs) {
      const from = byCode.get(arc.source_country);
      const to = byCode.get(arc.target_country);
      if (!from || !to) continue;
      if (filter.country !== "all" && filter.country !== from.code && filter.country !== to.code) continue;
      const start = lonLat(from.lon, from.lat, 1.02);
      const end = lonLat(to.lon, to.lat, 1.02);
      const mid = start.clone().add(end).multiplyScalar(0.5);
      mid.normalize().multiplyScalar(1.35 + start.distanceTo(end) * 0.15);
      const curve = new THREE.QuadraticBezierCurve3(start, mid, end);
      const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(48));
      arcGroup.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: snapshot.simulated ? 0xd46a55 : 0xe0a45a })));
      const mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0xfff1cf })
      );
      arcGroup.add(mesh);
      travelers.push({ curve, mesh, progress: Math.random() });
    }
  }

  function drawSatellites() {
    clear(satelliteGroup);
    satellites = [];
    if (!snapshot.simulated) return;
    for (let i = 0; i < (light ? 3 : 5); i += 1) {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(0.03, 0.012, 0.05),
        new THREE.MeshBasicMaterial({ color: 0xf2f6f5 })
      );
      satelliteGroup.add(mesh);
      satellites.push({ mesh, angle: i * 1.3, speed: 0.004 + i * 0.0007, orbit: 1.55 + i * 0.12, lift: 0.18 + i * 0.05 });
    }
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();
  placeCamera();
  request = requestAnimationFrame(frame);

  return {
    setCountries,
    setSnapshot,
    setFilter,
    select,
    resize,
    destroy() {
      running = false;
      cancelAnimationFrame(request);
      observer.disconnect();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}

function passes(country, filter) {
  if (filter.country !== "all" && country.code !== filter.country) return false;
  if (filter.type !== "all" && !(country.types || []).includes(filter.type)) return false;
  if (filter.feed !== "all" && !country.by_feed?.[filter.feed]) return false;
  return true;
}

function beamValue(country, filter) {
  if (filter.type !== "all" && filter.type !== "sensor-source") return 0;
  if (filter.feed !== "all" && filter.feed !== "dshield") return 0;
  return country.source_addresses || 0;
}

function hostValue(country, filter) {
  if (filter.feed === "dshield") return 0;
  if (filter.type === "sensor-source") return 0;
  if (filter.feed !== "all") return country.by_feed?.[filter.feed]?.observations || 0;
  return country.host_observations || 0;
}

function rings(geometry) {
  if (!geometry) return [];
  if (geometry.type === "Polygon") return geometry.coordinates || [];
  if (geometry.type === "MultiPolygon") return (geometry.coordinates || []).flat();
  return [];
}

function lonLat(lon, lat, radius) {
  const phi = (90 - lat) * Math.PI / 180;
  const theta = (lon + 180) * Math.PI / 180;
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function atmosphere() {
  return new THREE.Mesh(
    new THREE.SphereGeometry(1.08, 48, 32),
    new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      uniforms: { glow: { value: new THREE.Color("#1f8f8a") } },
      vertexShader: "varying vec3 vNormal; varying vec3 vWorld; void main(){ vNormal = normalize(normalMatrix * normal); vec4 w = modelMatrix * vec4(position,1.0); vWorld = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
      fragmentShader: "varying vec3 vNormal; varying vec3 vWorld; uniform vec3 glow; void main(){ vec3 viewDir = normalize(cameraPosition - vWorld); float fresnel = pow(1.0 - abs(dot(viewDir, normalize(vNormal))), 2.2); gl_FragColor = vec4(glow, fresnel * 0.85); }",
    })
  );
}

function stars() {
  const positions = [];
  for (let i = 0; i < 350; i += 1) {
    const point = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(8 + Math.random() * 6);
    positions.push(point.x, point.y, point.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xc9ddd8, size: 0.02 }));
}

function makeParticles() {
  const positions = [];
  for (let i = 0; i < 420; i += 1) {
    const point = new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize().multiplyScalar(1.05 + Math.random() * 0.35);
    positions.push(point.x, point.y, point.z);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  return new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0x7dcec4, size: 0.012, transparent: true, opacity: 0.7 }));
}

function clear(group) {
  for (const child of [...group.children]) {
    group.remove(child);
    child.geometry?.dispose();
    if (Array.isArray(child.material)) child.material.forEach((material) => material.dispose());
    else child.material?.dispose();
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
