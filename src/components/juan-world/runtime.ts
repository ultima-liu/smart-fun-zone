import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  Workshop,
  createPlace,
  createMail,
  makeReward,
  makeDrift,
  pointOf,
  type Model,
} from './models';
import { WORLD_PLACES, type WorldPoint, type WorldState } from './places';
import { createCelestialWorld } from './planet';
import type { WorldAppearance } from './appearances';

export type WorldOptions = {
  childId: string;
  appearance?: WorldAppearance;
  getState: () => WorldState;
  onPoint: (point: WorldPoint) => void;
  onHover: (point: WorldPoint | null) => void;
  onAnchor: (point: WorldPoint, x: number, y: number, visible: boolean) => void;
  onReady: () => void;
  onFailure: () => void;
  arrival: boolean;
};
export function createJuanWorld(host: HTMLElement, options: WorldOptions) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
  });
  renderer.setClearColor('#000000', 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.98;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  const canvas = renderer.domElement;
  canvas.setAttribute('aria-hidden', 'true');
  host.appendChild(canvas);
  const scene = new THREE.Scene(),
    world = new THREE.Group();
  scene.add(world);
  const camera = new THREE.PerspectiveCamera(39, 1, 0.1, 140);
  const look = new THREE.Vector3(0, 0.12, 0);
  const orbitPitch = 0.25;
  const pmrem = new THREE.PMREMGenerator(renderer),
    room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  room.dispose();
  pmrem.dispose();
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.32;
  const w = new Workshop();
  const galaxy = w.loadTexture(
    `${import.meta.env.BASE_URL}assets/juan-world/galaxy-sky-atlas-v1.webp`,
    (texture) => {
      scene.background = texture;
    },
    '#000000',
  );
  // Present the full fine star panorama at cover scale, avoiding a magnified blurry sky crop.
  galaxy.mapping = THREE.UVMapping;
  scene.backgroundIntensity = 0.72;
  const fill = new THREE.HemisphereLight('#86b8ef', '#0c1021', 0.75);
  scene.add(fill);
  const sun = new THREE.DirectionalLight('#e6efff', 1.9);
  sun.position.set(-5, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = sun.shadow.camera.bottom = -7;
  sun.shadow.camera.right = sun.shadow.camera.top = 7;
  sun.shadow.normalBias = 0.035;
  scene.add(sun);
  const rim = new THREE.DirectionalLight('#238cff', 2.4);
  rim.position.set(4, 1, -5);
  scene.add(rim);
  const celestial = createCelestialWorld(w, options.appearance);
  const { planet, clouds, halo, ring } = celestial;
  world.add(planet, clouds, halo, ring);
  const positions = {
    school: [-2.5, 2.2, 2.65],
    hq: [-3.45, 0.2, -3.05],
    archive: [2.5, 2.18, 2.65],
    dock: [0, -0.65, -4.55],
    supply: [3.45, 0.25, -3.05],
    park: [-3.12, -0.55, 2.9],
  };
  const models = new Map<WorldPoint, Model>();
  const pickables: THREE.Object3D[] = [];
  WORLD_PLACES.forEach((place) => {
    const model = createPlace(w, place.id);
    const p = new THREE.Vector3(...(positions[place.id] as [number, number, number]));
    if (place.id === 'school') {
      model.root.position.copy(p);
      model.root.scale.setScalar(0.68);
    } else {
      model.root.position.copy(p);
      model.root.rotation.y = place.id === 'park' ? 0.22 : Math.atan2(p.x, p.z);
      if (place.id === 'hq') model.root.scale.setScalar(0.94);
      if (place.id === 'archive') {
        model.root.scale.setScalar(0.88);
      }
    }
    model.root.userData.baseY = model.root.position.y;
    world.add(model.root);
    models.set(place.id, model);
    pickables.push(model.root);
  });
  const mail = createMail(w);
  mail.root.position.set(3.15, -0.45, 2.95);
  mail.root.userData.baseY = -0.45;
  world.add(mail.root);
  models.set('mail', mail);
  pickables.push(mail.root);
  const reward = makeReward(w, models.get('school')!.root);
  pickables.push(reward.root);
  const drift = makeDrift(w);
  drift.position.set(-0.6, -1.3, 4.65);
  world.add(drift);
  pickables.push(drift);
  const starGeometry = new THREE.BufferGeometry(),
    starPositions: number[] = [],
    starColors: number[] = [];
  for (let i = 0; i < 1100; i++) {
    const y = 1 - (2 * (i + 0.5)) / 1100,
      a = i * 2.39996,
      r = 27 + (Math.sin(i * 91.7) * 0.5 + 0.5) * 35,
      q = Math.sqrt(1 - y * y);
    starPositions.push(Math.cos(a) * q * r, y * r, Math.sin(a) * q * r);
    const c = new THREE.Color(i % 9 === 0 ? '#71bfff' : i % 17 === 0 ? '#f2c089' : '#b8cae7');
    starColors.push(c.r, c.g, c.b);
  }
  starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starPositions, 3));
  starGeometry.setAttribute('color', new THREE.Float32BufferAttribute(starColors, 3));
  const starMaterial = new THREE.PointsMaterial({
    size: 0.052,
    vertexColors: true,
    transparent: true,
    opacity: 0.45,
    sizeAttenuation: true,
    depthWrite: false,
  });
  // Rounded optical cores, faint halos and varied apparent brightness avoid square star pixels.
  starMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = 'varying float starMagnitude;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nstarMagnitude=fract(sin(dot(position,vec3(12.98,78.23,37.71)))*43758.5);',
      )
      .replace('gl_PointSize = size;', 'gl_PointSize = size * (.65 + starMagnitude * 1.8);');
    shader.fragmentShader = 'varying float starMagnitude;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <color_fragment>',
      `#include <color_fragment>
      vec2 starUV=gl_PointCoord-.5;float starR=length(starUV);
      float core=exp(-starR*starR*24.);
      float halo=exp(-starR*starR*8.)*.12;
      diffuseColor.a*=(core+halo)*(1.-smoothstep(.4,.5,starR))*(.35+.65*starMagnitude);`,
    );
  };
  scene.add(new THREE.Points(starGeometry, starMaterial));
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 48, 32),
    new THREE.MeshStandardMaterial({
      color: '#818b9d',
      map: celestial.rockAtlas,
      bumpMap: celestial.rockAtlas,
      bumpScale: 0.003,
      roughness: 0.95,
    }),
  );
  moon.position.set(-14, -6, -19);
  scene.add(moon);
  const touch = matchMedia('(pointer: coarse)').matches;
  // Canvas antialiasing does not cover the composer's offscreen scene buffer.
  const sceneTarget = new THREE.WebGLRenderTarget(1, 1, {
    type: THREE.HalfFloatType,
    samples: Math.min(touch ? 2 : 4, renderer.capabilities.maxSamples),
    resolveDepthBuffer: false,
    resolveStencilBuffer: false,
  });
  const composer = new EffectComposer(renderer, sceneTarget);
  composer.addPass(new RenderPass(scene, camera));
  // Keep ordinary lit surfaces below the bloom threshold; energy accents get a small halo.
  const bloom = new UnrealBloomPass(new THREE.Vector2(1, 1), 0.14, 0.16, 2.4);
  // A single invalid fragment must not spread through every Bloom mip and flash the frame.
  bloom.materialHighPassFilter.fragmentShader = bloom.materialHighPassFilter.fragmentShader.replace(
    'vec4 texel = texture2D( tDiffuse, vUv );',
    `vec4 texel = texture2D( tDiffuse, vUv );
    if (any(isnan(texel)) || any(isinf(texel))) texel = vec4(0.);`,
  );
  // Keep the original-image mask while adding RGB glow to the scene.
  bloom.blendMaterial.blending = THREE.CustomBlending;
  bloom.blendMaterial.blendSrc = THREE.OneFactor;
  bloom.blendMaterial.blendDst = THREE.OneFactor;
  bloom.blendMaterial.blendSrcAlpha = THREE.ZeroFactor;
  bloom.blendMaterial.blendDstAlpha = THREE.OneFactor;
  composer.addPass(bloom);
  const output = new OutputPass();
  output.material.fragmentShader = output.material.fragmentShader
    .replace(
      'gl_FragColor = texture2D( tDiffuse, vUv );',
      'gl_FragColor = texture2D( tDiffuse, vUv );\nvec3 originalImageRGB = gl_FragColor.rgb;',
    )
    .replace(
      '#ifdef SRGB_TRANSFER',
      'gl_FragColor.rgb = mix(originalImageRGB, gl_FragColor.rgb, gl_FragColor.a);\ngl_FragColor.a = 1.;\n#ifdef SRGB_TRANSFER',
    );
  composer.addPass(output);
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let disposed = false,
    loaded = false,
    width = 1,
    height = 1,
    frame = 0,
    timer = 0,
    visible = true,
    last = 0,
    time = 0,
    yaw = 0,
    targetYaw = 0,
    spin = 0,
    resumeAt = Infinity,
    distance = 12.5,
    inspectionMix = 0,
    targetInspectionMix = 0,
    inspectionDistance = 5;
  let inspection: WorldPoint | null = null;
  const inspectionLocal = new THREE.Vector3(),
    inspectionWorld = new THREE.Vector3(),
    inspectionSize = new THREE.Vector3(),
    overviewPosition = new THREE.Vector3(),
    inspectionPosition = new THREE.Vector3(),
    cameraLook = new THREE.Vector3();
  try {
    const saved = JSON.parse(sessionStorage.getItem(`sfz-world-view:${options.childId}`) ?? 'null');
    if (saved) {
      yaw = targetYaw = Number.isFinite(saved.yaw) ? saved.yaw : 0;
    }
  } catch {
    /* viewpoint is optional */
  }
  const ray = new THREE.Raycaster(),
    pointer = new THREE.Vector2(),
    projected = new THREE.Vector3(),
    surface = new THREE.Sphere(new THREE.Vector3(), 3.04),
    intersectionPoint = new THREE.Vector3();
  let drag: {
    x: number;
    y: number;
    yaw: number;
    moved: boolean;
    id: number;
  } | null = null;
  let navigation: {
    point: WorldPoint | null;
    fromSpin?: number;
    fromInspection: number;
    toInspection: number;
    start: number;
    done?: () => void;
    fromYaw: number;
    toYaw: number;
    duration: number;
  } | null = null;
  let deliverySeen = 0,
    deliveryAt = -10,
    arrivalAt = -1;
  const hover = new Map<WorldPoint, number>();
  const pauseDuration = 10000;
  const spinSpeed = Math.PI / 90; // One calm revolution in three minutes.
  const facilityPosition = new THREE.Vector3();
  function pauseRotation(now = performance.now()) {
    resumeAt = now + pauseDuration;
  }
  function save() {
    try {
      sessionStorage.setItem(
        `sfz-world-view:${options.childId}`,
        JSON.stringify({ yaw: targetYaw }),
      );
    } catch {
      /* optional */
    }
  }
  function hit(e: PointerEvent) {
    const r = canvas.getBoundingClientRect();
    pointer.set(((e.clientX - r.left) / width) * 2 - 1, (-(e.clientY - r.top) / height) * 2 + 1);
    ray.setFromCamera(pointer, camera);
    const hits = ray.intersectObjects(
      [planet, ...pickables.filter((object) => object.visible)],
      true,
    );
    return hits[0] ? (pointOf(hits[0].object) ?? null) : null;
  }
  function down(e: PointerEvent) {
    if (e.button !== 0 || navigation?.done) return;
    navigation = null;
    targetInspectionMix = 0;
    pauseRotation();
    drag = {
      x: e.clientX,
      y: e.clientY,
      yaw: targetYaw,
      moved: false,
      id: e.pointerId,
    };
    canvas.setPointerCapture(e.pointerId);
  }
  function move(e: PointerEvent) {
    if (drag) {
      const dx = e.clientX - drag.x,
        dy = e.clientY - drag.y;
      drag.moved ||= Math.hypot(dx, dy) > 6;
      const nextYaw = drag.yaw - dx * 0.006;
      if (nextYaw !== targetYaw) {
        targetYaw = nextYaw;
        invalidate();
      }
    } else {
      const point = hit(e);
      options.onHover(point);
      canvas.style.cursor = point ? 'pointer' : 'grab';
    }
  }
  function up(e: PointerEvent) {
    if (!drag) return;
    pauseRotation();
    const click = !drag.moved;
    drag = null;
    if (canvas.hasPointerCapture(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    save();
    if (click) {
      const point = hit(e);
      if (point) options.onPoint(point);
    }
  }
  function cancel() {
    pauseRotation();
    drag = null;
    options.onHover(null);
  }
  function leave() {
    if (!drag) options.onHover(null);
  }
  function wheel(e: WheelEvent) {
    e.preventDefault();
    if (navigation?.done) return;
    navigation = null;
    targetInspectionMix = 0;
    pauseRotation();
    targetYaw += (e.deltaX || e.deltaY) * 0.0025;
    save();
    invalidate();
  }
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', cancel);
  canvas.addEventListener('pointerleave', leave);
  canvas.addEventListener('wheel', wheel, { passive: false });
  function fitInspection(model: Model) {
    const box = new THREE.Box3().setFromObject(model.root);
    box.getCenter(inspectionLocal);
    box.getSize(inspectionSize);
    model.root.worldToLocal(inspectionLocal);
    const fit = Math.max(
      inspectionSize.y,
      Math.max(inspectionSize.x, inspectionSize.z) / camera.aspect,
    );
    inspectionDistance = Math.max(
      3,
      fit / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * 0.6),
    );
  }
  function go(point: WorldPoint, done?: () => void) {
    const model = models.get(point);
    if (!model) {
      done?.();
      return;
    }
    pauseRotation();
    if (!done) {
      inspection = point;
      fitInspection(model);
      targetInspectionMix = 1;
    } else targetInspectionMix = 0;
    const p = model.root.getWorldPosition(facilityPosition),
      angle = Math.atan2(p.x, p.z) - (point === 'hq' ? 0.16 : 0),
      delta = Math.atan2(Math.sin(angle - yaw), Math.cos(angle - yaw));
    navigation = {
      point,
      start: performance.now(),
      done,
      fromYaw: yaw,
      toYaw: yaw + delta,
      duration: done ? 450 : 850,
      fromInspection: inspectionMix,
      toInspection: targetInspectionMix,
    };
    targetYaw = yaw + delta;
    if (reduced.matches) {
      yaw = targetYaw;
      inspectionMix = targetInspectionMix;
      navigation = null;
      pauseRotation();
      save();
      done?.();
    }
    invalidate();
  }
  function anchor(point: WorldPoint, object: THREE.Object3D, local: THREE.Vector3, show = true) {
    projected.copy(local);
    object.localToWorld(projected);
    const worldPoint = projected.clone();
    projected.project(camera);
    const direction = worldPoint.clone().sub(camera.position).normalize(),
      r = new THREE.Ray(camera.position, direction);
    const occlusion = r.intersectSphere(surface, intersectionPoint);
    const hidden =
      occlusion &&
      camera.position.distanceTo(intersectionPoint) < camera.position.distanceTo(worldPoint) - 0.12;
    const onScreen =
      Math.abs(projected.x) < 0.92 &&
      Math.abs(projected.y) < 0.88 &&
      projected.z < 1 &&
      projected.z > -1;
    options.onAnchor(
      point,
      (projected.x * 0.5 + 0.5) * width,
      (-projected.y * 0.5 + 0.5) * height,
      show && !hidden && onScreen,
    );
  }
  function render(now: number) {
    frame = 0;
    if (disposed) return;
    const state = options.getState(),
      still = state.quiet || reduced.matches;
    const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
    last = now;
    if (!still) time += dt;
    if (drag || state.hovered) pauseRotation(now);
    if (navigation) {
      const p = Math.min(1, (now - navigation.start) / navigation.duration),
        ease = p * p * (3 - 2 * p);
      yaw = THREE.MathUtils.lerp(navigation.fromYaw, navigation.toYaw, ease);
      inspectionMix = THREE.MathUtils.lerp(
        navigation.fromInspection,
        navigation.toInspection,
        ease,
      );
      if (navigation.fromSpin !== undefined) spin = navigation.fromSpin * (1 - ease);
      if (p >= 1) {
        const done = navigation.done;
        navigation = null;
        pauseRotation(now);
        save();
        done?.();
      }
    } else {
      yaw += (targetYaw - yaw) * (still ? 1 : 0.14);
      inspectionMix += (targetInspectionMix - inspectionMix) * (still ? 1 : 0.14);
    }
    if (loaded && !still && !drag && !state.hovered && !navigation && now >= resumeAt) {
      spin = (spin + dt * spinSpeed) % (Math.PI * 2);
    }
    world.rotation.y = spin;
    world.updateMatrixWorld(true);
    celestial.setRotation(spin);
    if (arrivalAt < 0) arrivalAt = now;
    const intro = options.arrival && !still ? Math.max(0, 1 - (now - arrivalAt) / 1800) : 0;
    const radius = distance * (1 + intro * 0.15);
    overviewPosition.set(
      Math.sin(yaw) * Math.cos(orbitPitch) * radius,
      Math.sin(orbitPitch) * radius,
      Math.cos(yaw) * Math.cos(orbitPitch) * radius,
    );
    camera.position.copy(overviewPosition);
    cameraLook.copy(look);
    if (inspection && inspectionMix > 0.0001) {
      const object = models.get(inspection)!.root;
      inspectionWorld.copy(inspectionLocal);
      object.localToWorld(inspectionWorld);
      inspectionPosition
        .set(
          Math.sin(yaw) * Math.cos(orbitPitch),
          Math.sin(orbitPitch),
          Math.cos(yaw) * Math.cos(orbitPitch),
        )
        .multiplyScalar(inspectionDistance)
        .add(inspectionWorld);
      camera.position.lerp(inspectionPosition, inspectionMix);
      cameraLook.lerp(inspectionWorld, inspectionMix);
    }
    camera.lookAt(cameraLook);
    camera.updateMatrixWorld(true);
    celestial.update(reduced.matches ? 0 : time, now);
    // Facilities keep their original materials, lighting and placement in every planet theme.
    // Illustrated destinations keep their reference detail readable during rotation.
    for (const id of ['school', 'archive', 'park', 'hq'] as const) {
      const icon = models.get(id)!.root;
      icon.getWorldPosition(facilityPosition);
      icon.rotation.y =
        Math.atan2(camera.position.x - facilityPosition.x, camera.position.z - facilityPosition.z) -
        spin +
        (id === 'park' ? 0.12 : 0);
    }
    // Keep the suspended radar readable while the user circles the planet.
    mail.root.rotation.y = yaw - spin;
    models.forEach((model, id) => {
      const h = hover.get(id) ?? 0,
        n = h + ((state.hovered === id ? 1 : 0) - h) * (still ? 1 : 0.16);
      hover.set(id, n);
      model.animate(
        reduced.matches ? 0 : time,
        n,
        id === 'mail'
          ? state.unreadCount + state.rewardCount > 0
          : id === 'archive'
            ? state.archiveNotice
            : false,
      );
    });
    reward.root.visible = state.rewardCount > 0;
    reward.gem.rotation.y = reduced.matches ? 0 : time * 0.2;
    drift.visible = state.drift;
    drift.rotation.y = reduced.matches ? 0 : Math.sin(time * 0.5) * 0.3;
    if (state.deliveryNonce !== deliverySeen) {
      deliverySeen = state.deliveryNonce;
      deliveryAt = time;
    }
    const delivery = time - deliveryAt;
    mail.courier.visible = !still && delivery < 2.2;
    if (mail.courier.visible) {
      const t = Math.min(1, delivery / 1.8),
        a = (1 - t) ** 3;
      mail.courier.position.set(-7 * a, 0.8 + 2 * a, 1.2);
      mail.courier.rotation.y = Math.PI / 2;
    }
    world.updateMatrixWorld(true);
    composer.render();
    models.forEach((model, id) => anchor(id, model.root, model.anchor));
    anchor('reward', reward.root, new THREE.Vector3(0, 0, 0.05), reward.root.visible);
    anchor('drift', drift, new THREE.Vector3(0, -0.35, 0), drift.visible);
    if (!loaded && w.pendingAssets === 0) {
      loaded = true;
      pauseRotation(now);
      options.onReady();
    }
    if (
      !document.hidden &&
      visible &&
      (!still ||
        celestial.transitioning ||
        navigation ||
        Math.abs(yaw - targetYaw) > 0.001 ||
        Math.abs(inspectionMix - targetInspectionMix) > 0.001)
    ) {
      if (touch && !navigation)
        timer = window.setTimeout(() => {
          timer = 0;
          frame = requestAnimationFrame(render);
        }, 16);
      else frame = requestAnimationFrame(render);
    }
  }
  function invalidate() {
    if (!disposed && !frame && !timer) frame = requestAnimationFrame(render);
  }
  function resize() {
    width = Math.max(1, host.clientWidth);
    height = Math.max(1, host.clientHeight);
    const aspect = width / height;
    galaxy.repeat.set(Math.min(1, aspect / 2), Math.min(1, 2 / aspect));
    galaxy.offset.set((1 - galaxy.repeat.x) / 2, (1 - galaxy.repeat.y) / 2);
    renderer.setPixelRatio(
      Math.min(2, devicePixelRatio || 1, Math.sqrt((touch ? 3200000 : 4500000) / (width * height))),
    );
    renderer.setSize(width, height, false);
    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(width, height);
    camera.aspect = aspect;
    camera.updateProjectionMatrix();
    distance = aspect < 1.05 ? 13.75 : 12.9;
    const compact = aspect < 1.05;
    const layout = compact
      ? {
          school: [-1.72, 2.42, 2.8],
          archive: [1.72, 2.38, 2.8],
          hq: [-3.2, 0.2, -3.15],
          park: [-2.08, -0.55, 3.85],
          dock: [0, -0.65, -4.55],
          supply: [3.2, 0.25, -3.15],
        }
      : positions;
    const scales = compact
      ? { school: 0.56, archive: 0.68, hq: 0.65, park: 0.54, dock: 0.76, supply: 0.62 }
      : { school: 0.68, archive: 0.88, hq: 0.94, park: 0.84, dock: 1, supply: 1 };
    WORLD_PLACES.forEach(({ id }) => {
      const model = models.get(id)!;
      const [x, y, z] = layout[id];
      model.root.position.set(x, y, z);
      model.root.userData.baseY = y;
      model.root.scale.setScalar(scales[id]);
      if (!['school', 'archive', 'park', 'hq'].includes(id))
        model.root.rotation.y = Math.atan2(x, z);
    });
    mail.root.position.set(compact ? 2.08 : 3.15, -0.45, compact ? 3.85 : 2.95);
    mail.root.scale.setScalar(compact ? 0.5 : 0.84);
    mail.root.userData.baseY = mail.root.position.y;
    if (inspection) fitInspection(models.get(inspection)!);
    invalidate();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(host);
  const io = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
    last = 0;
    if (visible) {
      pauseRotation();
      invalidate();
    }
  });
  io.observe(host);
  function visibility() {
    last = 0;
    if (!document.hidden) {
      pauseRotation();
      invalidate();
    }
  }
  document.addEventListener('visibilitychange', visibility);
  reduced.addEventListener('change', invalidate);
  function lost(e: Event) {
    e.preventDefault();
    options.onFailure();
  }
  canvas.addEventListener('webglcontextlost', lost);
  w.onAssetLoad = invalidate;
  resize();
  return {
    invalidate,
    setAppearance(appearance: WorldAppearance) {
      celestial.setAppearance(appearance, reduced.matches || options.getState().quiet);
      invalidate();
    },
    reveal: (point: WorldPoint) => go(point),
    focus: (point: WorldPoint, done: () => void) => go(point, done),
    reset() {
      pauseRotation();
      // Return the whole rotating scene and camera along their shortest arcs.
      yaw = Math.atan2(Math.sin(yaw), Math.cos(yaw));
      spin = Math.atan2(Math.sin(spin), Math.cos(spin));
      targetYaw = 0;
      targetInspectionMix = 0;
      if (reduced.matches || options.getState().quiet) {
        yaw = spin = inspectionMix = 0;
        navigation = null;
      } else {
        navigation = {
          point: null,
          start: performance.now(),
          fromYaw: yaw,
          toYaw: 0,
          fromSpin: spin,
          fromInspection: inspectionMix,
          toInspection: 0,
          duration: 850,
        };
      }
      save();
      invalidate();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      save();
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      reduced.removeEventListener('change', invalidate);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
      canvas.removeEventListener('pointercancel', cancel);
      canvas.removeEventListener('pointerleave', leave);
      canvas.removeEventListener('wheel', wheel);
      canvas.removeEventListener('webglcontextlost', lost);
      const geometries = new Set<THREE.BufferGeometry>(),
        materials = new Set<THREE.Material>();
      scene.traverse((node) => {
        if (node instanceof THREE.InstancedMesh) node.dispose();
        if (
          node instanceof THREE.Mesh ||
          node instanceof THREE.Points ||
          node instanceof THREE.Line
        ) {
          geometries.add(node.geometry);
          (Array.isArray(node.material) ? node.material : [node.material]).forEach((m) =>
            materials.add(m),
          );
        }
      });
      geometries.forEach((g) => g.dispose());
      materials.forEach((m) => m.dispose());
      w.dispose();
      environment.dispose();
      composer.passes.forEach((pass) => pass.dispose());
      composer.dispose();
      sun.shadow.dispose();
      renderer.dispose();
      canvas.remove();
    },
  };
}
