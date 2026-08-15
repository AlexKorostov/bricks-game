// src/render/SceneManager.js
import * as THREE from 'three';

export class SceneManager {
  constructor(container) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070b14); // Deep rich background matching app theme

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

    // High angled perspective framed to position board higher in viewport, minimizing top dead space
    this.cameraTarget = new THREE.Vector3(0, -0.2, 1.6);
    this.cameraDefaultPos = new THREE.Vector3(0, 16.2, 16.8);
    this.camera.position.copy(this.cameraDefaultPos);
    this.camera.lookAt(this.cameraTarget);

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
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.18;

    this.container.appendChild(this.renderer.domElement);
  }

  setupLights() {
    // 1. Soft sky / deep navy ground hemispherical fill (preserves 3D contrast without flattening shadows)
    const hemiLight = new THREE.HemisphereLight(0xe0f2fe, 0x0f172a, 0.65);
    hemiLight.position.set(0, 20, 0);
    this.scene.add(hemiLight);

    // 2. Main Key Sun Light (Warm crisp specular highlights & rich defined shadows)
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(12, 25, 14);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 55;
    const shadowDist = 14;
    dirLight.shadow.camera.left = -shadowDist;
    dirLight.shadow.camera.right = shadowDist;
    dirLight.shadow.camera.top = shadowDist;
    dirLight.shadow.camera.bottom = -shadowDist;
    dirLight.shadow.bias = -0.0004;
    dirLight.shadow.normalBias = 0.02;
    this.scene.add(dirLight);

    // 3. Rim / Specular Accent Light (Cool cyan glint on opposite edges)
    const rimLight = new THREE.DirectionalLight(0x7dd3fc, 0.9);
    rimLight.position.set(-14, 18, -14);
    this.scene.add(rimLight);

    // 4. Center Top Fill Point Light
    const centerGlow = new THREE.PointLight(0xffffff, 0.4, 30);
    centerGlow.position.set(0, 12, 0);
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
      this.camera.lookAt(this.cameraTarget);

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

