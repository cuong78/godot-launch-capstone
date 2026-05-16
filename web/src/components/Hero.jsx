import React, { useState, useEffect, useRef } from "react";

export default function Hero() {
  const featured = [
    {
      id: "neon-drifter",
      title: "Neon Drifter",
      description:
        "Experience high-speed atmospheric racing through the cyberpunk ruins of Neo-Kobe. Physics-defying drifts and synthwave beats await in this critically acclaimed Godot masterpiece.",
      engine: "GODOT ENGINE",
      price: "$14.99",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuC_XjYQg-9zJrGRyB-kOfcBFsHgykYpXlgCSBeykisnHw2sU1M1iUoxyAMLsNtJife6656pATKniS_lcz_I3bfNlX3gjfsyBBJ4w_4BpEcnkoEGg2FwoAQxR68E_JQ_C7zogbQlJpFVb5c_m7A9LHhwN_TtGmJon-iLEQ1-3ECRpRn7UzRAJdiT1wz-mU6Y2jiM2X5ik3QJAV7tBilOATStPhf5iuwsb1oOUlwc2KxYBWiDTqYhprQHaF3GUplB6OhavGnJzzjeqsF_",
    },
    {
      id: "student-quest",
      title: "Student Quest",
      description:
        "Embark on an epic adventure through magical academies and enchanted dungeons. Build friendships, master spells, and uncover the secrets of the mystical realm in this indie RPG.",
      engine: "GODOT ENGINE",
      price: "$9.99",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuBGSTmdKVD8x-sX6SV8dVZvUaJocOtHq_zHG8i35o3FPWY_HLxgkFef_0HfMTJgmchlmYmHHamVleqqsYlT0VrQNhz0jeaoxEc586i7aBpVURplL8p6kmsLl-pzOEVlonfzirjP7l6RrA6ro3jQfbkJ1LyR3Hx6n_CCWoJbxsB9AN_4Gv0kMIFEs3W8-KdbQqWXgdZ4bmcHfE-qrDilzHmXFQCUzOzzFLmvu9YDXzhQkCmEpMo-Mfe58AYT7S1G0puOfNgTstKmODsn",
    },
    {
      id: "void-protocol",
      title: "Void Protocol",
      description:
        "A mind-bending puzzle platformer where reality shifts at your command. Navigate through impossible geometry and uncover the truth hidden in the void in this FREE indie masterpiece.",
      engine: "GODOT ENGINE",
      price: "FREE",
      image:
        "https://lh3.googleusercontent.com/aida-public/AB6AXuD9zbZtPP21KviTY1bLBjP_wwbpX7B5D0eDLybU0jcg6gaVIOhEHozug16y-zhl0mQc-6S0AcCMU0cD_vzDLXBMcK5j9CDXspgM3y2S2RvyD2gC96c9beIPyRI_X7KPSixsVRwpvHVAJTfNPegkZOzGApNo6wGNJy9u7UNT3hzH-lwLFSlPuBpgZuFcZoNx8-yoiEnJhSTHMltDqQOO6d-6rBFE2IWHM6vWeh0o7FyW9QAbkwq1wXFQAoNWWB2Chv2kgIJtRfydyKiL",
    },
  ];

  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startXRef = useRef(0);
  const dragStartTimeRef = useRef(0);

  // Auto-rotate carousel
  useEffect(() => {
    if (isDragging) return; // Don't auto-rotate while dragging

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % featured.length);
    }, 3000); // Change every 3 seconds

    return () => clearInterval(interval);
  }, [isDragging, featured.length]);

  const handleSwipe = (endX) => {
    const delta = startXRef.current - endX;
    const dragTime = Date.now() - dragStartTimeRef.current;
    const minDragDistance = 30; // Minimum distance to trigger swipe

    // Detect swipe by distance or velocity
    if (
      Math.abs(delta) > minDragDistance ||
      (dragTime < 300 && Math.abs(delta) > 10)
    ) {
      if (delta > 0) {
        // Swiped left - next slide
        setCurrentIndex((prev) => (prev + 1) % featured.length);
      } else {
        // Swiped right - previous slide
        setCurrentIndex(
          (prev) => (prev - 1 + featured.length) % featured.length,
        );
      }
    }
  };

  const handleMouseDown = (e) => {
    setIsDragging(true);
    startXRef.current = e.clientX;
    dragStartTimeRef.current = Date.now();
  };

  const handleMouseUp = (e) => {
    setIsDragging(false);
    handleSwipe(e.clientX);
  };

  const handleTouchStart = (e) => {
    setIsDragging(true);
    startXRef.current = e.touches[0].clientX;
    dragStartTimeRef.current = Date.now();
  };

  const handleTouchEnd = (e) => {
    setIsDragging(false);
    handleSwipe(e.changedTouches[0].clientX);
  };

  const current = featured[currentIndex];

  return (
    <section
      className="relative w-full rounded-xl overflow-hidden glass-panel border border-white/10 shadow-[0_0_30px_rgba(112,0,255,0.2)] aspect-[16/9] md:aspect-[21/9] flex items-end cursor-grab active:cursor-grabbing select-none"
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => isDragging && setIsDragging(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Background Image with Transition */}
      <img
        alt={current.title}
        className="absolute inset-0 w-full h-full object-cover z-0 transition-opacity duration-500 pointer-events-none"
        src={current.image}
        draggable="false"
      />
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-surface-container-lowest/50 to-transparent z-10"></div>
      {/* Content */}
      <div className="relative z-20 p-8 md:p-12 w-full md:w-2/3 pointer-events-none">
        <div className="flex gap-2 mb-4">
          <span className="font-label-sm text-label-sm text-surface-container-lowest bg-surface-tint px-2 py-1 rounded shadow-[0_0_10px_rgba(0,242,255,0.3)]">
            FEATURED
          </span>
          <span className="font-label-sm text-label-sm text-secondary bg-surface-container-highest px-2 py-1 rounded border border-white/10">
            {current.engine}
          </span>
        </div>
        <h1 className="font-display-lg text-headline-lg-mobile md:text-display-lg text-white mb-2 shadow-black drop-shadow-lg transition-opacity duration-300">
          {current.title}
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant mb-6 max-w-2xl drop-shadow-md transition-opacity duration-300">
          {current.description}
        </p>
        <div className="flex flex-wrap gap-4">
          <button className="bg-surface-tint text-surface-container-lowest font-label-sm text-label-sm px-6 py-3 rounded-lg hover:shadow-[0_0_20px_rgba(0,242,255,0.5)] transition-all duration-300 active:scale-95 flex items-center gap-2 relative overflow-hidden group pointer-events-auto">
            <div className="absolute inset-0 scanline-overlay opacity-50"></div>
            <span
              className="material-symbols-outlined relative z-10"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              play_arrow
            </span>
            <span className="relative z-10">PLAY NOW - {current.price}</span>
          </button>
          <button className="bg-surface-container-highest/50 backdrop-blur border border-secondary text-secondary font-label-sm text-label-sm px-6 py-3 rounded-lg hover:bg-secondary/10 hover:shadow-[0_0_15px_rgba(209,188,255,0.3)] transition-all duration-300 active:scale-95 flex items-center gap-2 pointer-events-auto">
            <span className="material-symbols-outlined">favorite</span>
            SUPPORT DEVELOPER
          </button>
        </div>
      </div>
      {/* Carousel Indicators */}
      <div className="absolute bottom-8 right-8 z-20 flex gap-2 pointer-events-auto">
        {featured.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`${
              index === currentIndex ? "w-8" : "w-4"
            } h-1 rounded transition-all duration-300 ${
              index === currentIndex
                ? "bg-surface-tint shadow-[0_0_10px_rgba(0,242,255,0.5)]"
                : "bg-white/20 hover:bg-white/50"
            }`}
          ></button>
        ))}
      </div>
    </section>
  );
}
