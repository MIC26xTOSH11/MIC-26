"use client";

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';

export default function BlobCanvas() {
  const canvasRef = useRef(null);
  const blobsRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Generate random blob paths
    const generateBlobPath = () => {
      const points = 8;
      const path = [];
      const angleStep = (Math.PI * 2) / points;
      
      for (let i = 0; i < points; i++) {
        const angle = angleStep * i;
        const radius = 80 + Math.random() * 40;
        path.push({
          x: Math.cos(angle) * radius,
          y: Math.sin(angle) * radius
        });
      }
      return path;
    };

    // Create blobs
    const createBlob = (x, y, color) => {
      return {
        x,
        y,
        path: generateBlobPath(),
        targetPath: generateBlobPath(),
        color,
        scale: 0,
        rotation: 0,
        morphProgress: 0,
        velocity: { x: 0, y: 0 }
      };
    };

    // Initialize blobs
    blobsRef.current = [
      createBlob(200, 200, 'rgba(236, 201, 75, 0.6)'),
      createBlob(window.innerWidth - 200, 300, 'rgba(20, 184, 166, 0.6)'),
      createBlob(window.innerWidth / 2, window.innerHeight - 200, 'rgba(56, 189, 248, 0.6)')
    ];

    // Animate blobs in
    blobsRef.current.forEach((blob, i) => {
      gsap.to(blob, {
        scale: 1,
        rotation: 360,
        duration: 1.5,
        delay: i * 0.2,
        ease: 'elastic.out(1, 0.5)'
      });
    });

    // Draw blob
    const drawBlob = (blob) => {
      ctx.save();
      ctx.translate(blob.x, blob.y);
      ctx.rotate((blob.rotation * Math.PI) / 180);
      ctx.scale(blob.scale, blob.scale);

      ctx.fillStyle = blob.color;
      ctx.beginPath();

      const path = blob.path;
      const targetPath = blob.targetPath;
      
      // Interpolate between current and target path
      const currentPath = path.map((point, i) => ({
        x: point.x + (targetPath[i].x - point.x) * blob.morphProgress,
        y: point.y + (targetPath[i].y - point.y) * blob.morphProgress
      }));

      // Draw smooth blob using quadratic curves
      ctx.moveTo(currentPath[0].x, currentPath[0].y);
      
      for (let i = 0; i < currentPath.length; i++) {
        const current = currentPath[i];
        const next = currentPath[(i + 1) % currentPath.length];
        const xc = (current.x + next.x) / 2;
        const yc = (current.y + next.y) / 2;
        ctx.quadraticCurveTo(current.x, current.y, xc, yc);
      }
      
      ctx.closePath();
      ctx.fill();
      
      ctx.restore();
    };

    // Continuous morph animation
    blobsRef.current.forEach(blob => {
      const morphBlob = () => {
        blob.targetPath = generateBlobPath();
        gsap.to(blob, {
          morphProgress: 1,
          duration: 2 + Math.random() * 2,
          ease: 'sine.inOut',
          onComplete: () => {
            blob.path = [...blob.targetPath];
            blob.morphProgress = 0;
            morphBlob();
          }
        });
      };
      morphBlob();
    });

    // Animation loop with throttling
    let animationFrame;
    let lastFrameTime = 0;
    const fps = 30; // Reduced from 60 for better performance
    const frameInterval = 1000 / fps;
    
    const animate = (currentTime) => {
      animationFrame = requestAnimationFrame(animate);
      
      const elapsed = currentTime - lastFrameTime;
      if (elapsed < frameInterval) return;
      
      lastFrameTime = currentTime - (elapsed % frameInterval);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      blobsRef.current.forEach(blob => {
        drawBlob(blob);
      });

      animationFrame = requestAnimationFrame(animate);
    };
    animate(0);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: 'screen' }}
    />
  );
}
