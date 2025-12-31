"use client";

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { gsap } from 'gsap';

export default function WebGLOrbs({ isMenuOpen, onOrbsReady }) {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const orbsRef = useRef([]);
  const rendererRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.z = 50;

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Create orbs
    const orbs = [];
    const geometry = new THREE.SphereGeometry(0.5, 16, 16);

    for (let i = 0; i < 50; i++) {
      const hue = 60 + Math.random() * 240; // Gold to Purple
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(`hsl(${hue}, 70%, 60%)`),
        transparent: true,
        opacity: 0.8
      });

      const orb = new THREE.Mesh(geometry, material);
      
      // Random initial positions
      orb.position.x = (Math.random() - 0.5) * 80;
      orb.position.y = (Math.random() - 0.5) * 60;
      orb.position.z = (Math.random() - 0.5) * 40;

      orb.userData.originalPos = orb.position.clone();
      orb.userData.velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.1,
        (Math.random() - 0.5) * 0.05
      );
      orb.userData.pulsePhase = Math.random() * Math.PI * 2;

      scene.add(orb);
      orbs.push(orb);
    }

    orbsRef.current = orbs;
    if (onOrbsReady) onOrbsReady(orbs);

    // Animation loop
    let animationId;
    const clock = new THREE.Clock();
    let lastFrameTime = 0;
    const fps = 30; // Reduced for better performance
    const frameInterval = 1000 / fps;

    const animate = (currentTime) => {
      animationId = requestAnimationFrame(animate);
      
      const elapsed = currentTime - lastFrameTime;
      if (elapsed < frameInterval) return;
      
      lastFrameTime = currentTime - (elapsed % frameInterval);
      
      const time = clock.getElapsedTime();

      orbs.forEach((orb, i) => {
        // Pulse animation - reduced intensity
        const pulse = Math.sin(time * 1.5 + orb.userData.pulsePhase) * 0.2 + 1;
        orb.scale.set(pulse, pulse, pulse);

        // Gentle floating
        if (!isMenuOpen) {
          orb.position.x += orb.userData.velocity.x;
          orb.position.y += orb.userData.velocity.y;
          orb.position.z += orb.userData.velocity.z;

          // Bounce back to bounds
          if (Math.abs(orb.position.x) > 40) orb.userData.velocity.x *= -1;
          if (Math.abs(orb.position.y) > 30) orb.userData.velocity.y *= -1;
          if (Math.abs(orb.position.z) > 20) orb.userData.velocity.z *= -1;
        }
      });

      renderer.render(scene, camera);
    };
    animate(0);

    // Handle resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      renderer.dispose();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Burst animation when menu opens
  useEffect(() => {
    if (!orbsRef.current.length) return;

    if (isMenuOpen) {
      // Burst into orbit
      orbsRef.current.forEach((orb, i) => {
        const angle = (i / orbsRef.current.length) * Math.PI * 2;
        const radius = 30;
        
        gsap.to(orb.position, {
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius,
          z: 0,
          duration: 1.5,
          delay: i * 0.02,
          ease: 'elastic.out(1, 0.5)'
        });
      });
    } else {
      // Return to original positions
      orbsRef.current.forEach((orb, i) => {
        gsap.to(orb.position, {
          x: orb.userData.originalPos.x,
          y: orb.userData.originalPos.y,
          z: orb.userData.originalPos.z,
          duration: 1,
          delay: i * 0.01,
          ease: 'power2.inOut'
        });
      });
    }
  }, [isMenuOpen]);

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 pointer-events-none z-10"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
