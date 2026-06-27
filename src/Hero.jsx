import React, { useEffect, useRef, useState } from 'react';
import gsap from 'gsap';
import './Hero.css';

export default function Hero() {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const carouselRef = useRef(null);
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const autoPlayRef = useRef(null);

  const posters = [
    { id: 0, image: '/media/poster1.png', alt: 'Dnyanavishkar Poster 1' },
    { id: 1, image: '/media/poster2.png', alt: 'Dnyanavishkar Poster 2' },
    { id: 2, image: '/media/poster3.png', alt: 'Dnyanavishkar Poster 3' }
  ];

  // Auto-play logic (5 seconds interval)
  useEffect(() => {
    const startAutoPlay = () => {
      autoPlayRef.current = setInterval(() => {
        setCurrentIndex((prev) => (prev + 1) % posters.length);
      }, 5000);
    };

    startAutoPlay();

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [posters.length]);

  // Restart auto-play timer on manual navigation
  const resetAutoPlay = () => {
    if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    autoPlayRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posters.length);
    }, 5000);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev - 1 + posters.length) % posters.length);
    resetAutoPlay();
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % posters.length);
    resetAutoPlay();
  };

  const handleDotClick = (index) => {
    setCurrentIndex(index);
    resetAutoPlay();
  };

  // GSAP Slide transition animation
  useEffect(() => {
    const slides = gsap.utils.toArray('.carousel-slide');
    
    // Hide inactive slides
    slides.forEach((slide, index) => {
      if (index !== currentIndex) {
        gsap.to(slide, {
          opacity: 0,
          scale: 1.02,
          duration: 0.8,
          ease: 'power2.inOut',
          pointerEvents: 'none'
        });
      }
    });

    // Animate in the active slide
    const activeSlide = slides[currentIndex];
    if (activeSlide) {
      gsap.to(activeSlide, {
        opacity: 1,
        scale: 1,
        duration: 0.8,
        ease: 'power2.inOut',
        pointerEvents: 'auto'
      });
      
      // Subtle zoom effect on slide change
      const img = activeSlide.querySelector('.slide-img-full');
      const imgBlur = activeSlide.querySelector('.slide-img-blur');
      if (img) {
        gsap.fromTo(img, 
          { scale: 1.08 },
          { scale: 1, duration: 1.6, ease: 'power2.out' }
        );
      }
      if (imgBlur) {
        gsap.fromTo(imgBlur, 
          { scale: 1.15 },
          { scale: 1.05, duration: 1.6, ease: 'power2.out' }
        );
      }
    }

    // Progress bar fill animation for dot indicators
    const fills = gsap.utils.toArray('.dot-progress-fill');
    gsap.killTweensOf(fills);
    gsap.set(fills, { width: '0%' });

    const activeFill = fills[currentIndex];
    if (activeFill) {
      gsap.to(activeFill, {
        width: '100%',
        duration: 5.0,
        ease: 'none'
      });
    }
  }, [currentIndex]);

  // 1. Particle Canvas Overlay Background Animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize);

    // Track mouse position on canvas
    const mouse = { x: null, y: null, active: false };
    const handleMouseMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
      mouse.active = true;
    };
    const handleMouseLeave = () => {
      mouse.active = false;
    };

    const parent = canvas.parentElement;
    if (parent) {
      parent.addEventListener('mousemove', handleMouseMove);
      parent.addEventListener('mouseleave', handleMouseLeave);
    }

    // Generate Particles
    const particleCount = Math.min(Math.floor(width / 25), 45);
    const particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 1.5 + 0.6,
        opacity: Math.random() * 0.3 + 0.1,
        color: Math.random() > 0.75 ? '#ff6f00' : Math.random() > 0.5 ? '#fbbf24' : '#1565c0'
      });
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw and update particles
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        if (mouse.active) {
          const dx = mouse.x - p.x;
          const dy = mouse.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 160) {
            const force = (160 - dist) / 160;
            p.x += (dx / dist) * force * 0.18;
            p.y += (dy / dist) * force * 0.18;
          }
        }

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fill();
      });

      // Draw connection lines
      ctx.globalAlpha = 1;
      for (let i = 0; i < particleCount; i++) {
        for (let j = i + 1; j < particleCount; j++) {
          const p1 = particles[i];
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            const alpha = 0.05 * (1 - dist / 110);
            ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      if (parent) {
        parent.removeEventListener('mousemove', handleMouseMove);
        parent.removeEventListener('mouseleave', handleMouseLeave);
      }
    };
  }, []);

  return (
    <section className="premium-hero full-viewport-hero" id="hero" ref={containerRef}>
      {/* Layered Background Canvas */}
      <canvas className="hero-particle-canvas overlay-particles" ref={canvasRef} />

      {/* Full Viewport Carousel Container */}
      <div className="hero-carousel-wrapper full-screen-carousel" ref={carouselRef}>
        <div className="hero-carousel-slides">
          {posters.map((poster, index) => (
            <div
              key={poster.id}
              className={`carousel-slide ${index === currentIndex ? 'slide-active' : ''}`}
              style={{
                opacity: index === 0 ? 1 : 0
              }}
            >
              {/* Blurred Background for Premium Look */}
              <img src={poster.image} alt="" className="slide-img-blur" />
              {/* Foreground Image */}
              <img src={poster.image} alt={poster.alt} className="slide-img-full" />
              <div className="slide-glass-overlay" />
            </div>
          ))}
        </div>

        {/* Navigation Arrows */}
        <button className="carousel-nav-btn btn-prev" onClick={handlePrev} aria-label="Previous Poster">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6"/>
          </svg>
        </button>
        <button className="carousel-nav-btn btn-next" onClick={handleNext} aria-label="Next Poster">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </button>

        {/* Bottom Dot Progress Navigation */}
        <div className="carousel-dots-container">
          {posters.map((_, index) => (
            <button
              key={index}
              className={`carousel-dot-indicator ${index === currentIndex ? 'dot-active' : ''}`}
              onClick={() => handleDotClick(index)}
              aria-label={`Go to slide ${index + 1}`}
            >
              <span className="dot-progress-bg">
                <span className="dot-progress-fill" />
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
