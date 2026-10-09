import React from 'react';
import { DownloadSimple, Laptop, CheckCircle, ShieldCheck } from '@phosphor-icons/react';

export default function Download() {
  return (
    <section id="download" className="py-28 relative overflow-hidden">
      {/* Decorative gradients */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-gradient-to-r from-[#45f3ff]/10 to-[#bd00ff]/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Single Massive Call-to-Action Card */}
        <div className="relative glass p-8 sm:p-14 rounded-3xl border-white/10 text-center overflow-hidden shadow-2xl hover:border-[#45f3ff]/30 transition-all duration-500 group">
          {/* Animated gradient border glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-[#45f3ff]/5 via-transparent to-[#bd00ff]/5 opacity-50 pointer-events-none" />
          
          <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center">
            
            {/* Small icon badge */}
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#45f3ff]/10 to-[#00a8ff]/10 border border-[#45f3ff]/20 flex items-center justify-center text-[#45f3ff] mb-8 animate-float">
              <Laptop size={32} weight="duotone" />
            </div>

            <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
              Tải XForge Launcher Ngay
            </h2>
            
            <p className="mt-4 text-slate-400 text-base sm:text-lg max-w-xl leading-relaxed">
              Bắt đầu hành trình Minecraft của bạn với trình khởi chạy tối giản, an toàn và tối tân nhất hiện nay.
            </p>

            {/* Downloader CTA Block */}
            <div className="mt-10 w-full max-w-md">
              <a 
                href="https://github.com/gbetokuon-stack/AcousticLauncher/releases" 
                target="_blank"
                rel="noopener noreferrer"
                className="relative group overflow-hidden flex items-center justify-center gap-3 w-full py-4.5 rounded-2xl bg-gradient-to-r from-[#45f3ff] via-[#00a8ff] to-[#bd00ff] text-[#0b0c10] font-extrabold text-base hover:shadow-[0_0_40px_rgba(69,243,255,0.6)] transition-all transform hover:-translate-y-1"
              >
                <span className="absolute inset-0 w-full h-full bg-white/10 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
                <DownloadSimple size={22} weight="bold" />
                Tải về Windows Installer (.exe)
              </a>
              
              <div className="mt-4 flex items-center justify-center gap-2 text-slate-500 text-xs">
                <ShieldCheck size={16} className="text-[#27c93f]" weight="fill" />
                <span>Bản phát hành chính thức từ GitHub Releases</span>
              </div>
            </div>

            {/* Technical checklist */}
            <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full border-t border-white/5 pt-8 text-left text-sm text-slate-300">
              <div className="flex items-center gap-3">
                <CheckCircle size={18} className="text-[#45f3ff] shrink-0" weight="fill" />
                <span>Hệ điều hành Windows 10/11</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle size={18} className="text-[#45f3ff] shrink-0" weight="fill" />
                <span>Hỗ trợ tự động cập nhật</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle size={18} className="text-[#45f3ff] shrink-0" weight="fill" />
                <span>An toàn & Không quảng cáo</span>
              </div>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
