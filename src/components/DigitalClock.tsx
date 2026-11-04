import React, { useState, useEffect } from 'react';

const DigitalClock = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Format time in Asia/Colombo timezone
  const timeString = time.toLocaleTimeString('en-US', {
    timeZone: 'Asia/Colombo',
    hour12: true,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
  
  const dateString = time.toLocaleDateString('en-US', {
    timeZone: 'Asia/Colombo',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="flex flex-col items-center justify-center p-4 backdrop-blur-sm bg-black/20 rounded-2xl border border-white/10 shadow-2xl transition-all hover:bg-black/30 group">
      <div className="text-4xl md:text-5xl lg:text-6xl font-mono font-black text-white drop-shadow-[0_2px_10px_rgba(255,255,255,0.3)] tracking-wider">
        {timeString.split(' ')[0]} 
        <span className="text-2xl md:text-3xl ml-2 text-[#FA8072] font-bold">
          {timeString.split(' ')[1]}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <span className="text-sm md:text-base font-medium text-gray-200 uppercase tracking-widest bg-white/10 px-3 py-1 rounded-full">
          Sri Lanka Time (SLST)
        </span>
      </div>
      <div className="text-sm md:text-base font-medium text-gray-300 mt-2 opacity-80 group-hover:opacity-100 transition-opacity">
        {dateString}
      </div>
    </div>
  );
};

export default DigitalClock;
