import React, { useEffect, useState } from 'react';

const DynamicBackground = ({ hour }: { hour: number }) => {
  let timeOfDay = 'night';
  if (hour >= 5 && hour < 12) timeOfDay = 'morning';
  else if (hour >= 12 && hour < 17) timeOfDay = 'afternoon';
  else if (hour >= 17 && hour < 19) timeOfDay = 'evening';

  const gradients = {
    morning: 'from-[#ff9966] via-[#ffb347] to-[#87CEEB]',
    afternoon: 'from-[#4facfe] via-[#00f2fe] to-[#87CEEB]',
    evening: 'from-[#ff7b00] via-[#ff0040] to-[#2b00ff]',
    night: 'from-[#0b0f19] via-[#1a1b41] to-[#000000]'
  };

  const sunMoonClass = {
    morning: 'bg-gradient-to-tr from-yellow-200 to-yellow-400 shadow-[0_0_150px_rgba(253,224,71,1)] w-40 h-40 bottom-[30%] left-[20%]',
    afternoon: 'bg-gradient-to-tr from-yellow-100 to-yellow-200 shadow-[0_0_200px_rgba(254,240,138,1)] w-48 h-48 top-[15%] left-[50%] -translate-x-1/2',
    evening: 'bg-gradient-to-tr from-orange-500 to-red-500 shadow-[0_0_150px_rgba(249,115,22,1)] w-48 h-48 bottom-[25%] right-[20%]',
    night: 'bg-gradient-to-tr from-slate-100 to-slate-300 shadow-[0_0_100px_rgba(241,245,249,0.9)] w-28 h-28 top-[20%] right-[25%]'
  };

  // Generate random static values on mount to prevent hydration mismatch/flickering
  const [stars, setStars] = useState<any[]>([]);
  const [clouds, setClouds] = useState<any[]>([]);
  const [fireflies, setFireflies] = useState<any[]>([]);
  
  useEffect(() => {
    setStars(Array.from({ length: 150 }).map(() => ({
      top: `${Math.random() * 80}%`,
      left: `${Math.random() * 100}%`,
      size: `${Math.random() * 3 + 1}px`,
      duration: `${Math.random() * 3 + 1}s`,
      delay: `${Math.random() * 5}s`
    })));

    setClouds(Array.from({ length: 6 }).map(() => ({
      top: `${Math.random() * 30 + 5}%`,
      delay: `${Math.random() * -60}s`,
      duration: `${Math.random() * 40 + 60}s`,
      scale: Math.random() * 0.5 + 0.5,
      opacity: Math.random() * 0.4 + 0.4
    })));

    setFireflies(Array.from({ length: 30 }).map(() => ({
      bottom: `${Math.random() * 30}%`,
      left: `${Math.random() * 100}%`,
      duration: `${Math.random() * 4 + 3}s`,
      delay: `${Math.random() * 5}s`,
      xMove: `${Math.random() * 100 - 50}px`,
      yMove: `${Math.random() * -100 - 50}px`
    })));
  }, []);

  return (
    <div className={`fixed inset-0 z-0 bg-gradient-to-br ${gradients[timeOfDay as keyof typeof gradients]} transition-all duration-[4000ms] overflow-hidden`}>
      <style>{`
        @keyframes drift {
          0% { transform: translateX(-20vw) scale(var(--scale)); }
          100% { transform: translateX(120vw) scale(var(--scale)); }
        }
        @keyframes shooting-star {
          0% { transform: translateX(0) translateY(0) rotate(45deg); opacity: 1; height: 100px; }
          100% { transform: translateX(-150vw) translateY(150vh) rotate(45deg); opacity: 0; height: 0; }
        }
        @keyframes fly {
          0% { transform: translate(-10vw, 20vh) scale(0.3); }
          100% { transform: translate(110vw, -10vh) scale(0.6); }
        }
        @keyframes firefly {
          0%, 100% { transform: translate(0, 0); opacity: 0; }
          50% { transform: translate(var(--x-move), var(--y-move)); opacity: 1; }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      {/* Sun/Moon */}
      <div className={`absolute rounded-full transition-all duration-[4000ms] ${sunMoonClass[timeOfDay as keyof typeof sunMoonClass]} before:content-[''] before:absolute before:inset-0 before:rounded-full before:animate-ping before:opacity-30 before:bg-inherit`} />
      
      {/* Stars and Shooting Star for Night/Evening */}
      <div className={`absolute inset-0 transition-opacity duration-[4000ms] ${(timeOfDay === 'night' || timeOfDay === 'evening') ? 'opacity-100' : 'opacity-0'}`}>
        {stars.map((star, i) => (
          <div 
            key={i} 
            className="absolute bg-white rounded-full"
            style={{
              top: star.top,
              left: star.left,
              width: star.size,
              height: star.size,
              animation: `twinkle ${star.duration} infinite ease-in-out ${star.delay}`
            }}
          />
        ))}
        {/* Shooting Star */}
        {timeOfDay === 'night' && (
          <div className="absolute top-0 right-1/4 w-1 bg-gradient-to-b from-white to-transparent rounded-full shadow-[0_0_20px_white]"
               style={{ animation: 'shooting-star 6s infinite linear 2s' }} />
        )}
      </div>

      {/* Clouds for Morning/Afternoon */}
      <div className={`absolute inset-0 transition-opacity duration-[4000ms] ${(timeOfDay === 'morning' || timeOfDay === 'afternoon') ? 'opacity-100' : 'opacity-0'}`}>
        {clouds.map((cloud, i) => (
          <div 
            key={i}
            className="absolute"
            style={{
              top: cloud.top,
              '--scale': cloud.scale,
              opacity: cloud.opacity,
              animation: `drift ${cloud.duration} infinite linear ${cloud.delay}`
            } as any}
          >
            {/* SVG Cloud Shape */}
            <svg width="150" height="150" viewBox="0 0 24 24" fill="white" className="drop-shadow-lg opacity-80">
               <path d="M17.5 19c2.485 0 4.5-2.015 4.5-4.5 0-2.434-1.928-4.417-4.34-4.495C17.067 6.643 14.157 4 10.5 4 6.358 4 3 7.358 3 11.5c0 4.142 3.358 7.5 7.5 7.5h7z"/>
            </svg>
          </div>
        ))}
        {/* Birds (only morning/afternoon) */}
        {(timeOfDay === 'morning' || timeOfDay === 'afternoon') && (
          <div className="absolute opacity-50" style={{ animation: 'fly 15s infinite linear 0s' }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black/70 drop-shadow-sm">
              <path d="M2 12c3-2 6-4 10 0 4-4 7-2 10 0" />
            </svg>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-black/70 drop-shadow-sm absolute top-4 left-6">
              <path d="M2 12c3-2 6-4 10 0 4-4 7-2 10 0" />
            </svg>
          </div>
        )}
      </div>

      {/* Fireflies for Evening */}
      <div className={`absolute inset-0 transition-opacity duration-[4000ms] ${timeOfDay === 'evening' ? 'opacity-100' : 'opacity-0'}`}>
        {fireflies.map((ff, i) => (
          <div
            key={i}
            className="absolute w-2 h-2 bg-yellow-300 rounded-full shadow-[0_0_15px_rgba(253,224,71,1)]"
            style={{
              bottom: ff.bottom,
              left: ff.left,
              '--x-move': ff.xMove,
              '--y-move': ff.yMove,
              animation: `firefly ${ff.duration} infinite ease-in-out ${ff.delay}`
            } as any}
          />
        ))}
      </div>
      
      {/* Layered Mountains/Silhouettes */}
      <div className="absolute inset-0 pointer-events-none">
        {/* Distant Mountains */}
        <svg className="absolute bottom-0 w-full h-[40vh] transition-colors duration-[4000ms] fill-current text-slate-800/40 dark:text-black/30" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path d="M0,160L48,138.7C96,117,192,75,288,96C384,117,480,203,576,224C672,245,768,203,864,181.3C960,160,1056,160,1152,170.7C1248,181,1344,203,1392,213.3L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"></path>
        </svg>
        
        {/* Mid-range Mountains */}
        <svg className="absolute bottom-0 w-full h-[30vh] transition-colors duration-[4000ms] fill-current text-slate-900/60 dark:text-black/60" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path d="M0,224L60,213.3C120,203,240,181,360,186.7C480,192,600,224,720,229.3C840,235,960,213,1080,192C1200,171,1320,149,1380,138.7L1440,128L1440,320L1380,320C1320,320,1200,320,1080,320C960,320,840,320,720,320C600,320,480,320,360,320C240,320,120,320,60,320L0,320Z"></path>
        </svg>
        
        {/* Foreground */}
        <svg className="absolute bottom-0 w-full h-[20vh] transition-colors duration-[4000ms] fill-current text-slate-950 dark:text-black" viewBox="0 0 1440 320" preserveAspectRatio="none">
          <path d="M0,288L80,266.7C160,245,320,203,480,197.3C640,192,800,224,960,240C1120,256,1280,256,1360,256L1440,256L1440,320L1360,320C1280,320,1120,320,960,320C800,320,640,320,480,320C320,320,160,320,80,320L0,320Z"></path>
        </svg>
        <div className="absolute bottom-0 w-full h-8 bg-slate-950 dark:bg-black" />
      </div>
    </div>
  );
};

export default DynamicBackground;
