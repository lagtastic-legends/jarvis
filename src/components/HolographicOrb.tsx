import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { JarvisState } from '../types/jarvis';

interface HolographicOrbProps {
  state: JarvisState;
  liveCaption?: string;
  onOrbClick?: () => void;
}

export const HolographicOrb: React.FC<HolographicOrbProps> = ({
  state,
  liveCaption,
  onOrbClick,
}) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    particles: THREE.Points;
    geometry: THREE.BufferGeometry;
    positions: Float32Array;
    initialPositions: Float32Array;
    colors: Float32Array;
    targetColors: { r: number; g: number; b: number }[];
    animId: number;
    mouseX: number;
    mouseY: number;
  } | null>(null);

  // Initialize Three.js WebGL Particle Sphere
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth || 320;
    const height = container.clientHeight || 320;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 1000);
    camera.position.z = 240;

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const particleCount = 2800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const initialPositions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const targetColors: { r: number; g: number; b: number }[] = [];

    const radius = 75;

    for (let i = 0; i < particleCount; i++) {
      // Fibonacci spherical distribution
      const phi = Math.acos(-1 + (2 * i) / particleCount);
      const theta = Math.sqrt(particleCount * Math.PI) * phi;

      let r = radius;
      const layerType = Math.random();
      if (layerType < 0.15) {
        r = radius * (0.35 + Math.random() * 0.4);
      } else if (layerType > 0.88) {
        r = radius * (1.08 + Math.random() * 0.28);
      } else {
        r = radius * (0.92 + Math.random() * 0.15);
      }

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      initialPositions[i * 3] = x;
      initialPositions[i * 3 + 1] = y;
      initialPositions[i * 3 + 2] = z;

      // Initial Cyan-Violet gradient
      const c = new THREE.Color(0x38bdf8);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;

      targetColors.push({ r: c.r, g: c.g, b: c.b });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    // Circle texture for smooth particles
    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.3, 'rgba(56,189,248,0.8)');
      gradient.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(16, 16, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 3.5,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    const stateObj = {
      renderer,
      scene,
      camera,
      particles,
      geometry,
      positions,
      initialPositions,
      colors,
      targetColors,
      animId: 0,
      mouseX: 0,
      mouseY: 0,
    };
    sceneRef.current = stateObj;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const x = (e.clientX - rect.left - rect.width / 2) / (rect.width / 2);
      const y = (e.clientY - rect.top - rect.height / 2) / (rect.height / 2);
      stateObj.mouseX = x;
      stateObj.mouseY = y;
    };
    container.addEventListener('mousemove', handleMouseMove);

    // Render loop
    let clock = 0;
    const animate = () => {
      clock += 0.015;
      stateObj.animId = requestAnimationFrame(animate);

      // Base rotation
      particles.rotation.y += 0.003;
      particles.rotation.x += 0.001;

      // Mouse parallax smooth lerp
      particles.rotation.y += (stateObj.mouseX * 0.4 - particles.rotation.y) * 0.05;
      particles.rotation.x += (-stateObj.mouseY * 0.4 - particles.rotation.x) * 0.05;

      const pos = geometry.attributes.position.array as Float32Array;
      const col = geometry.attributes.color.array as Float32Array;

      // Procedural breathing and displacement based on state
      const pulseSpeed = state === 'SPEAKING' ? 3.5 : state === 'THINKING' ? 2.8 : 1.2;
      const pulseAmp = state === 'SPEAKING' ? 3.5 : state === 'THINKING' ? 2.5 : 1.0;

      for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        const ix = initialPositions[i3];
        const iy = initialPositions[i3 + 1];
        const iz = initialPositions[i3 + 2];

        const wave = Math.sin(clock * pulseSpeed + ix * 0.05 + iy * 0.05) * pulseAmp;
        pos[i3] = ix + (ix / radius) * wave;
        pos[i3 + 1] = iy + (iy / radius) * wave;
        pos[i3 + 2] = iz + (iz / radius) * wave;

        // Smooth color interpolation
        const tc = targetColors[i];
        col[i3] += (tc.r - col[i3]) * 0.08;
        col[i3 + 1] += (tc.g - col[i3 + 1]) * 0.08;
        col[i3 + 2] += (tc.b - col[i3 + 2]) * 0.08;
      }

      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      cancelAnimationFrame(stateObj.animId);
      container.removeEventListener('mousemove', handleMouseMove);
      if (renderer.domElement.parentNode) {
        renderer.domElement.parentNode.removeChild(renderer.domElement);
      }
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      texture.dispose();
    };
  }, []);

  // Update target particle colors when state changes
  useEffect(() => {
    if (!sceneRef.current) return;
    const { targetColors } = sceneRef.current;

    let c1 = new THREE.Color(0x38bdf8); // Cyan
    let c2 = new THREE.Color(0x818cf8); // Violet

    if (state === 'LISTENING') {
      c1 = new THREE.Color(0x00f2fe);
      c2 = new THREE.Color(0xffffff);
    } else if (state === 'THINKING' || state === 'PROCESSING') {
      c1 = new THREE.Color(0xf59e0b); // Amber
      c2 = new THREE.Color(0x8b5cf6); // Violet
    } else if (state === 'SPEAKING') {
      c1 = new THREE.Color(0x10b981); // Emerald
      c2 = new THREE.Color(0x38bdf8); // Cyan
    } else if (state === 'INTERRUPTED') {
      c1 = new THREE.Color(0xf59e0b);
      c2 = new THREE.Color(0xef4444);
    } else if (state === 'ERROR') {
      c1 = new THREE.Color(0xef4444); // Crimson
      c2 = new THREE.Color(0x991b1b);
    }

    for (let i = 0; i < targetColors.length; i++) {
      const mixed = new THREE.Color().lerpColors(c1, c2, Math.random());
      targetColors[i].r = mixed.r;
      targetColors[i].g = mixed.g;
      targetColors[i].b = mixed.b;
    }
  }, [state]);

  return (
    <div className="relative flex flex-col items-center justify-center w-full py-2">
      {/* Background Radial Glow Bloom */}
      <div 
        className={`absolute w-72 h-72 sm:w-80 sm:h-80 rounded-full blur-[100px] pointer-events-none transition-all duration-700 ${
          state === 'SPEAKING' ? 'bg-emerald-500/20' :
          state === 'THINKING' ? 'bg-amber-500/20' :
          state === 'LISTENING' ? 'bg-cyan-400/30' :
          state === 'ERROR' ? 'bg-red-500/30' : 'bg-cyan-500/15'
        }`}
      />

      {/* Orbiting Concentric Rings Container */}
      <div 
        onClick={onOrbClick}
        className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center cursor-pointer group"
      >
        {/* Outermost Celestial Orbital Ring */}
        <div className="absolute inset-0 rounded-full border border-cyan-500/20 pointer-events-none scale-105" />

        {/* Segmented Ring 1 (Clockwise) */}
        <div className="absolute inset-2 rounded-full border-2 border-dashed border-cyan-400/30 animate-spin-slow pointer-events-none" />

        {/* Segmented Ring 2 (Counter-Clockwise) with Degree Ticks */}
        <div className="absolute inset-6 rounded-full border border-cyan-400/40 border-t-cyan-300 border-r-transparent border-b-cyan-400/40 border-l-transparent animate-spin-reverse pointer-events-none" />

        {/* Degree Markings */}
        <span className="absolute top-1 text-[9px] font-mono text-cyan-400/60 pointer-events-none">000°</span>
        <span className="absolute bottom-1 text-[9px] font-mono text-cyan-400/60 pointer-events-none">180°</span>
        <span className="absolute left-1 text-[9px] font-mono text-cyan-400/60 pointer-events-none">270°</span>
        <span className="absolute right-1 text-[9px] font-mono text-cyan-400/60 pointer-events-none">090°</span>

        {/* Three.js Particle WebGL Canvas */}
        <div 
          ref={mountRef} 
          className="relative z-10 w-full h-full flex items-center justify-center pointer-events-auto"
        />

        {/* Center Hover Reticle */}
        <div className="absolute inset-0 rounded-full group-hover:border group-hover:border-cyan-400/40 transition-all duration-300 pointer-events-none" />
      </div>

      {/* State Badge */}
      <div className="mt-3 flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-jarvis-space/80 backdrop-blur-md">
        <span className={`w-2 h-2 rounded-full ${
          state === 'SPEAKING' ? 'bg-emerald-400 animate-pulse' :
          state === 'THINKING' ? 'bg-amber-400 animate-pulse' :
          state === 'LISTENING' ? 'bg-cyan-300 animate-ping' :
          state === 'ERROR' ? 'bg-red-400 animate-pulse' : 'bg-cyan-500'
        }`} />
        <span className="text-xs font-mono tracking-wider font-semibold text-cyan-300">
          CORE PROTOCOL: {state}
        </span>
      </div>

      {/* Live Vocal Closed-Caption Readout */}
      {liveCaption && (
        <div className="mt-2 max-w-lg px-4 py-1.5 rounded-lg border border-cyan-500/20 bg-black/60 text-center backdrop-blur-md">
          <p className="text-xs font-mono text-cyan-300/90 leading-relaxed italic">
            "{liveCaption}"
          </p>
        </div>
      )}
    </div>
  );
};
