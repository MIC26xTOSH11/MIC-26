"use client";

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/dist/ScrollTrigger';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

export default function HexGrid() {
  const gridRef = useRef(null);
  const hexRefs = useRef([]);

  useEffect(() => {
    if (!gridRef.current) return;

    const hexagons = gridRef.current.querySelectorAll('.hexagon');
    hexRefs.current = Array.from(hexagons);

    let ticking = false;

    // Scroll-based animations with throttling
    ScrollTrigger.create({
      trigger: gridRef.current,
      start: 'top bottom',
      end: 'bottom top',
      scrub: 3,
      onUpdate: (self) => {
        if (!ticking) {
          requestAnimationFrame(() => {
            const velocity = Math.abs(self.getVelocity() / 1000);
            
            if (velocity > 0.02) {
              hexRefs.current.forEach((hex, i) => {
                const row = Math.floor(i / 20);
                const col = i % 20;
                const distance = Math.sqrt(Math.pow(row - 10, 2) + Math.pow(col - 10, 2));
                
                gsap.to(hex, {
                  scale: 1 + velocity * 0.3,
                  rotation: self.progress * 180 + i * 3,
                  duration: 0.6,
                  ease: 'power2.out',
                  overwrite: 'auto'
                });
              });
            }
            
            ticking = false;
          });
          ticking = true;
        }
      }
    });

    // Optimized hover animations
    hexRefs.current.forEach(hex => {
      const handleMouseEnter = () => {
        gsap.to(hex, {
          scale: 1.5,
          duration: 0.4,
          ease: 'elastic.out(1, 0.3)',
          overwrite: true
        });
      };
      
      const handleMouseLeave = () => {
        gsap.to(hex, {
          scale: 1,
          duration: 0.4,
          ease: 'elastic.out(1, 0.3)',
          overwrite: true
        });
      };
      
      hex.addEventListener('mouseenter', handleMouseEnter, { passive: true });
      hex.addEventListener('mouseleave', handleMouseLeave, { passive: true });
    });

    return () => {
      ScrollTrigger.getAll().forEach(trigger => trigger.kill());
    };
  }, []);

  const generateHexColor = (i) => {
    const row = Math.floor(i / 20);
    const col = i % 20;
    const distance = Math.sqrt(Math.pow(row - 10, 2) + Math.pow(col - 10, 2));
    
    // Teal to Gold gradient based on distance from center
    const hue = 180 + (distance * 5); // Teal (180) to Gold (48)
    const saturation = 60 + Math.random() * 20;
    const lightness = 40 + Math.random() * 20;
    
    return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
  };

  return (
    <div
      ref={gridRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-20"
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(20, 1fr)',
        gridTemplateRows: 'repeat(20, 1fr)',
        gap: '2px',
        padding: '20px'
      }}
    >
      {Array.from({ length: 400 }).map((_, i) => (
        <div
          key={i}
          className="hexagon"
          style={{
            width: '100%',
            height: '100%',
            backgroundColor: generateHexColor(i),
            clipPath: 'polygon(30% 0%, 70% 0%, 100% 50%, 70% 100%, 30% 100%, 0% 50%)',
            opacity: 0.6 + Math.random() * 0.4,
            transformOrigin: 'center',
            willChange: 'transform'
          }}
        />
      ))}
    </div>
  );
}
