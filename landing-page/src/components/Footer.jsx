import React from 'react';
import { GithubLogo, Heart } from '@phosphor-icons/react';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-black/40 py-12 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        
        {/* Left info */}
        <div className="flex items-center gap-3">
          <img src="/icon.png" alt="XForge Logo" className="w-8 h-8 object-contain" />
          <span className="font-display font-bold text-lg text-white">XForge</span>
          <span className="text-slate-500 text-xs sm:text-sm">| Minecraft Launcher thế hệ mới</span>
        </div>

        {/* Center: Author */}
        <div className="flex items-center gap-1.5 text-slate-400 text-xs sm:text-sm">
          <span>Phát triển bởi</span>
          <a 
            href="https://github.com/gbetokuon-stack" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-white hover:text-[#45f3ff] font-medium transition-colors"
          >
            Acoustic
          </a>
          <Heart size={14} className="text-red-500" weight="fill" />
        </div>

        {/* Right Links */}
        <div className="flex items-center gap-6">
          <a href="#features" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors">Tính năng</a>
          <a href="#showcase" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors">Giao diện</a>
          <a href="#download" className="text-xs sm:text-sm text-slate-400 hover:text-white transition-colors">Tải xuống</a>
          <a 
            href="https://github.com/gbetokuon-stack/AcousticLauncher" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-slate-400 hover:text-white transition-colors"
          >
            <GithubLogo size={20} weight="fill" />
          </a>
        </div>

      </div>
      
      {/* Copyright bottom text */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 text-center text-[10px] sm:text-xs text-slate-600">
        &copy; {new Date().getFullYear()} AcousticForge. Minecraft là thương hiệu của Mojang Synergies AB. Trang web này không liên kết với Mojang hoặc Microsoft.
      </div>
    </footer>
  );
}
