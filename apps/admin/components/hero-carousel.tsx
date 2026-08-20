"use client";

import { useEffect, useState } from "react";

interface HeroSlide {
  // Swap in real Cloudinary URLs here when ready — everything else in
  // this component already handles that case (see the conditional render
  // below), no other changes needed.
  imageUrl: string | null;
  gradient: string;
  caption: string;
}

const heroSlides: HeroSlide[] = [
  { imageUrl: 'https://res.cloudinary.com/bq4xpoqm/image/upload/v1787151257/images.jpg', gradient: "from-node-cyan to-primary", caption: "Community meetings, organized" },
  { imageUrl: 'https://res.cloudinary.com/bq4xpoqm/image/upload/v1787229560/cloudinary.jpg', gradient: "from-node-violet to-primary", caption: "Events members actually attend" },
  { imageUrl: 'https://res.cloudinary.com/bq4xpoqm/image/upload/v1787230088/cloud.jpg', gradient: "from-node-emerald to-primary", caption: "Dues collected, automatically" },
  { imageUrl: 'https://res.cloudinary.com/bq4xpoqm/image/upload/v1787230371/imagecloud.avif', gradient: "from-node-amber to-primary", caption: "Every member, one digital card" },
];

const SLIDE_DURATION_MS = 5000;

export function HeroCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % heroSlides.length);
    }, SLIDE_DURATION_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {heroSlides.map((slide, i) => (
        <div
          key={i}
          aria-hidden={i !== activeIndex}
          className={`absolute inset-0 transition-opacity duration-1000 ${i === activeIndex ? "opacity-100" : "opacity-0"}`}
        >
          {slide.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- background carousel image, not a content image
            <img src={slide.imageUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className={`h-full w-full bg-gradient-to-br ${slide.gradient}`} />
          )}
        </div>
      ))}
      {/* Dark overlay — keeps hero text readable regardless of which
          slide (or future photo) is showing underneath it. */}
      <div className="absolute inset-0 bg-node-navy/60" />

      {/* Slide indicators */}
      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
        {heroSlides.map((slide, i) => (
          <button
            key={i}
            aria-label={`Show slide: ${slide.caption}`}
            onClick={() => setActiveIndex(i)}
            className={`h-1.5 rounded-full transition-all ${
              i === activeIndex ? "w-6 bg-white" : "w-1.5 bg-white/40 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </div>
  );
}