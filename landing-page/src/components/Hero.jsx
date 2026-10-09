import React, { useRef, useState } from 'react';
import { DownloadSimple, Sparkle, ArrowRight } from '@phosphor-icons/react';

export default function Hero() {
  const containerRef = useRef(null);
  const [transformStyle, setTransformStyle] = useState('perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)');

  const handleMouseMove = (e) => {
    const el = containerRef.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Mouse coords relative to element center
    const mouseX = e.clientX - rect.left - width / 2;
    const mouseY = e.clientY - rect.top - height / 2;
    
    // Max rotation is 12 degrees
    const rX = -(mouseY / (height / 2)) * 12;
    const rY = (mouseX / (width / 2)) * 12;

    setTransformStyle(`perspective(1000px) rotateX(${rX}deg) rotateY(${rY}deg) scale(1.02)`);
  };

  const handleMouseLeave = () => {
    setTransformStyle('perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)');
  };

  return (
    <section className="relative min-h-screen pt-28 pb-16 flex items-center justify-center overflow-hidden">
      {/* Decorative Glow Blobs */}
      <div className="absolute top-1/4 left-1/10 w-72 h-72 bg-[#45f3ff]/10 rounded-full blur-[100px] pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-1/4 right-1/10 w-96 h-96 bg-[#bd00ff]/10 rounded-full blur-[120px] pointer-events-none animate-pulse-glow" style={{ animationDelay: '2s' }} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Text Column */}
          <div className="lg:col-span-5 text-center lg:text-left flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#45f3ff]/10 border border-[#45f3ff]/20 text-[#45f3ff] text-xs font-semibold uppercase tracking-wider mb-6 mx-auto lg:mx-0 w-fit backdrop-blur-md">
              <Sparkle size={14} weight="fill" className="animate-spin-slow" />
              Minecraft Client & Profile Manager
            </div>

            <h1 className="font-display font-extrabold text-4xl sm:text-5xl lg:text-6xl text-white leading-tight tracking-tight">
              Khởi chạy Minecraft 
              <span className="block mt-2 bg-gradient-to-r from-[#45f3ff] via-[#00a8ff] to-[#bd00ff] bg-clip-text text-transparent">
                Theo Cách Hiện Đại
              </span>
            </h1>

            <p className="mt-6 text-base sm:text-lg text-slate-400 max-w-lg mx-auto lg:mx-0 leading-relaxed">
              Trải nghiệm trình quản lý Minecraft tối giản, siêu mượt mà xây dựng trên Electron + React. Hỗ trợ giao diện kính mờ Glassmorphism, tự động cài Java, tải mod và tài khoản Microsoft.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <a 
                href="https://github.com/gbetokuon-stack/AcousticLauncher/releases" 
                target="_blank"
                rel="noopener noreferrer"
                className="relative group overflow-hidden flex items-center justify-center gap-2.5 w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-[#45f3ff] to-[#00a8ff] text-[#0b0c10] font-bold hover:shadow-[0_0_35px_rgba(69,243,255,0.5)] transition-all transform hover:-translate-y-0.5"
              >
                {/* Border glowing animation */}
                <span className="absolute inset-0 w-full h-full bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                <DownloadSimple size={20} weight="bold" />
                Tải về EXE Installer
              </a>
              <a 
                href="#features" 
                className="flex items-center justify-center gap-2 w-full sm:w-auto px-8 py-4 rounded-xl glass border-white/10 text-white font-semibold hover:border-[#45f3ff]/40 hover:bg-white/5 transition-all"
              >
                Khám phá tính năng
                <ArrowRight size={18} />
              </a>
            </div>

            {/* Micro details */}
            <div className="mt-8 flex items-center justify-center lg:justify-start gap-6 text-slate-500 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#27c93f]" />
                Hỗ trợ: <span className="text-slate-300 font-medium">Windows 10/11</span>
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-slate-700" />
              <div>Phiên bản: <span className="text-slate-300 font-medium">v0.1.5</span></div>
            </div>
          </div>

          {/* Right Showcase Preview (3D interactive Tilt Card) */}
          <div className="lg:col-span-7 flex justify-center items-center relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-[#45f3ff]/10 to-[#bd00ff]/10 rounded-3xl filter blur-[40px] pointer-events-none" />
            
            <div 
              ref={containerRef}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ 
                transform: transformStyle,
                transition: 'transform 0.1s ease-out, border-color 0.3s'
              }}
              className="relative w-full max-w-2xl aspect-[16/10] rounded-2xl overflow-hidden glass p-1.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] border-white/10 cursor-pointer"
            >
              {/* Top bar window simulation */}
              <div className="h-7 flex items-center justify-between px-3 border-b border-white/5 bg-black/40 rounded-t-xl select-none">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                </div>
                <span className="text-[10px] text-slate-400 font-display font-medium tracking-wide">XFORGE CLIENT MANAGER</span>
                <div className="w-12" />
              </div>
              
              {/* App Screenshot */}
              <div className="relative w-full h-[calc(100%-28px)] rounded-b-xl overflow-hidden bg-slate-950">
                <img 
                  src="/01.png" 
                  alt="XForge Launcher Giao diện chính" 
                  className="w-full h-full object-cover object-top select-none pointer-events-none"
                />
                
                {/* Floating overlay to simulate overlay/effects */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#0b0c10]/50 to-transparent pointer-events-none" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}
