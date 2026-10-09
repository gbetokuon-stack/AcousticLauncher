import React, { useState } from 'react';
import { DownloadSimple, GithubLogo, List, X } from '@phosphor-icons/react';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 w-full z-50 glass border-b border-white/5 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          <div className="flex items-center gap-3">
            <img src="/icon.png" alt="XForge Logo" className="w-10 h-10 object-contain" />
            <span className="font-display font-bold text-xl sm:text-2xl bg-gradient-to-r from-white via-slate-200 to-[#45f3ff] bg-clip-text text-transparent tracking-wide">
              XForge
            </span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-medium text-slate-300 hover:text-[#45f3ff] transition-colors">Tính năng</a>
            <a href="#showcase" className="text-sm font-medium text-slate-300 hover:text-[#45f3ff] transition-colors">Giao diện</a>
            <a href="#download" className="text-sm font-medium text-slate-300 hover:text-[#45f3ff] transition-colors">Tải xuống</a>
            <a 
              href="https://github.com/gbetokuon-stack/AcousticLauncher" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-slate-400 hover:text-[#45f3ff] transition-colors"
            >
              <GithubLogo size={24} weight="fill" />
            </a>
            <a 
              href="#download" 
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#45f3ff] to-[#00a8ff] text-[#0b0c10] font-bold text-sm hover:shadow-[0_0_20px_rgba(69,243,255,0.4)] transition-all transform hover:-translate-y-0.5"
            >
              <DownloadSimple size={18} weight="bold" />
              Tải miễn phí
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden flex items-center gap-4">
            <a 
              href="https://github.com/gbetokuon-stack/AcousticLauncher" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-slate-400 hover:text-[#45f3ff] transition-colors"
            >
              <GithubLogo size={24} weight="fill" />
            </a>
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-slate-400 hover:text-white focus:outline-none"
            >
              {isOpen ? <X size={24} /> : <List size={24} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden glass border-t border-white/5 px-4 pt-2 pb-6 space-y-3">
          <a 
            href="#features" 
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-300 hover:text-[#45f3ff] hover:bg-white/5 transition-all"
          >
            Tính năng
          </a>
          <a 
            href="#showcase" 
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-300 hover:text-[#45f3ff] hover:bg-white/5 transition-all"
          >
            Giao diện
          </a>
          <a 
            href="#download" 
            onClick={() => setIsOpen(false)}
            className="block px-3 py-2 rounded-lg text-base font-medium text-slate-300 hover:text-[#45f3ff] hover:bg-white/5 transition-all"
          >
            Tải xuống
          </a>
          <a 
            href="#download" 
            onClick={() => setIsOpen(false)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-gradient-to-r from-[#45f3ff] to-[#00a8ff] text-[#0b0c10] font-bold text-sm hover:shadow-[0_0_20px_rgba(69,243,255,0.4)] transition-all"
          >
            <DownloadSimple size={18} weight="bold" />
            Tải miễn phí
          </a>
        </div>
      )}
    </nav>
  );
}
