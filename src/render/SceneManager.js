// src/render/SceneManager.js
import * as THREE from 'three';

export class SceneManager {
  constructor(container) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0f1d); // Deep slate midnight

    // Subtle fog for depth
    this.scene.fog = new THREE.FogExp2(0x0a0f1d, 0.025);

    this.setupCamera();
    this.setupRenderer();
    this.setupLights();

    this.clock = new THREE.Clock();
    this.updateCallbacks = [];
    this.isLoopRunning = false;
    this.animationFrameId = null;

    window.addEventListener('resize', this.onResize.bind(this));
  }

  setupCamera() {
    const aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 100);

    // Isometric-like high angled perspective
    // Looking down at center from a slightly tilted elevated diagonal
    this.cameraDefaultPos = new THREE.Vector3(0, 16.5, 15.5);
    this.camera.position.copy(this.cameraDefaultPos);
    this.camera.lookAt(0, -0.2, 0);

    this.shakeIntensity = 0;
  }

  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;

    this.container.appendChild(this.renderer.domElement);
  }

  setupLights() {
    // 1. Soft Ambient Fill
    const ambientLight = new THREE.AmbientLight(0xdce7f9, 0.75);
    this.scene.add(ambientLight);

    // 2. Main Key Sun Light (Warm crisp specular & soft shadows)
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.25);
    dirLight.position.set(12, 22, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    const shadowDist = 14;
    dirLight.shadow.camera.left = -shadowDist;
    dirLight.shadow.camera.right = shadowDist;
    dirLight.shadow.camera.top = shadowDist;
    dirLight.shadow.camera.bottom = -shadowDist;
    dirLight.shadow.bias = -0.0005;
    this.scene.add(dirLight);

    // 3. Rim / Edge Accent Light (Cool cyan rim from opposite corner)
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 0.6);
    rimLight.position.set(-14, 12, -14);
    this.scene.add(rimLight);

    // 4. Subtle center point glow
    const centerGlow = new THREE.PointLight(0x6366f1, 0.4, 25);
    centerGlow.position.set(0, 3, 0);
    this.scene.add(centerGlow);
  }

  addUpdateCallback(cb) {
    this.updateCallbacks.push(cb);
  }

  triggerCameraShake(intensity = 0.2) {
    this.shakeIntensity = intensity;
  }

  onResize() {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  startRenderLoop() {
    if (this.isLoopRunning) return;
    this.isLoopRunning = true;
    this.clock.start();

    const animate = () => {
      if (!this.isLoopRunning) return;
      this.animationFrameId = requestAnimationFrame(animate);

      const dt = Math.min(this.clock.getDelta(), 0.1);

      // Handle camera shake decay
      if (this.shakeIntensity > 0) {
        const shakeX = (Math.random() - 0.5) * this.shakeIntensity;
        const shakeY = (Math.random() - 0.5) * this.shakeIntensity;
        const shakeZ = (Math.random() - 0.5) * this.shakeIntensity;
        this.camera.position.set(
          this.cameraDefaultPos.x + shakeX,
          this.cameraDefaultPos.y + shakeY,
          this.cameraDefaultPos.z + shakeZ
        );
        this.shakeIntensity = Math.max(0, this.shakeIntensity - dt * 1.5);
      } else {
        this.camera.position.copy(this.cameraDefaultPos);
      }
      this.camera.lookAt(0, -0.2, 0);

      // Call registered systems
      for (const cb of this.updateCallbacks) {
        cb(dt);
      }

      this.renderer.render(this.scene, this.camera);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  stopRenderLoop() {
    this.isLoopRunning = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

