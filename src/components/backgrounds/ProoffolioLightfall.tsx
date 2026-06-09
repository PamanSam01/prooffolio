"use client";

import { useEffect, useState } from 'react';
import Lightfall from '../ReactBits/Lightfall';

export const ProoffolioLightfall = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const checkDevice = () => {
      // Threshold for mobile devices
      setIsMobile(window.innerWidth < 768);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  if (!mounted) {
    return <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, backgroundColor: '#050816' }} />;
  }

  return (
    <div style={{ width: '100%', height: '100%', position: 'absolute', inset: 0, backgroundColor: '#050816' }}>
      <Lightfall
        colors={[
          "#14f195",
          "#00c2ff",
          "#6ee7b7"
        ]}
        backgroundColor="#050816"
        speed={0.25}
        streakCount={1}
        streakWidth={isMobile ? 0.5 : 0.8}
        streakLength={1.5}
        glow={isMobile ? 0.3 : 0.5} // Extremely low glow on mobile
        density={isMobile ? 0.2 : 0.35} // Less dense rays
        twinkle={isMobile ? 0 : 0.2} // Disable twinkle completely on mobile to save calculations
        zoom={2}
        backgroundGlow={0.2}
        opacity={1}
        // Disable mouse ray interaction on mobile to avoid touch tracking overhead
        mouseInteraction={!isMobile}
        mouseStrength={0.2}
        mouseRadius={0.8}
        // The most critical optimization: run at 40% resolution on mobile, 100% on desktop.
        // WebGL at native phone resolution (3x) renders millions of pixels. 
        // 0.4x is blurry but since it's a glowing background, it looks fine and runs ice cold.
        dpr={isMobile ? 0.4 : 1} 
        className={undefined as any}
        mixBlendMode={undefined as any}
      />
    </div>
  );
};
