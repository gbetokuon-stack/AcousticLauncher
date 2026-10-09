import React, { useState } from 'react';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

const screenshots = [
  {
    src: '/01.png',
    title: 'Khởi chạy & Trang chủ',
    description: 'Giao diện chính với nền video động, tích hợp nút Play và hiển thị tài khoản Microsoft.'
  },
  {
    src: '/02.png',
    title: 'Quản lý Profile',
    description: 'Dễ dàng tạo, chỉnh sửa các phiên bản game Minecraft độc lập với các thư mục chuyên biệt.'
  },
  {
    src: '/03.png',
    title: 'Khám phá & Cài Mods',
    description: 'Tìm kiếm và tải trực tiếp mod, modpack, resource pack từ Modrinth / CurseForge.'
  },
  {
    src: '/04.png',
    title: 'Tài khoản & Skin 3D',
    description: 'Quản lý tài khoản, thay đổi skin với giao diện mô phỏng nhân vật 3D tương tác sinh động.'
  },
  {
    src: '/05.png',
    title: 'Cài đặt hệ thống',
    description: 'Cấu hình RAM, thư mục game, và tự động quét chọn phiên bản JRE phù hợp nhất.'
  },
  {
    src: '/06.png',
    title: 'Quản lý Mods Chi tiết',
    description: 'Bật, tắt nhanh các mod đã cài đặt, xem phiên bản và mô tả chi tiết của từng mod.'
  }
];

export default function Showcase() {
  const [activeIndex, setActiveIndex] = useState(0);

  const nextSlide = () => {
    setActiveIndex((prev) => (prev + 1) % screenshots.length);
  };

  const prevSlide = () => {
    setActiveIndex((prev) => (prev - 1 + screenshots.length) % screenshots.length);
  };

  return (
    <section id="showcase" className="py-24 relative overflow-hidden bg-black/40">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#bd00ff]/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h2 className="font-display font-extrabold text-3xl sm:text-4xl lg:text-5xl text-white tracking-tight">
            Hình ảnh thực tế từ 
            <span className="block mt-2 bg-gradient-to-r from-[#45f3ff] via-[#00a8ff] to-[#bd00ff] bg-clip-text text-transparent">
              Ứng dụng XForge
            </span>
          </h2>
          <p className="mt-4 text-slate-400">
            Xem qua giao diện người dùng bóng bẩy, mượt mà và trực quan được chăm chút tỉ mỉ từng pixel.
          </p>
        </div>

        {/* Dynamic Showcase Slider */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left: Desktop screenshot view */}
          <div className="lg:col-span-8 flex flex-col items-center">
            <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden glass p-1 shadow-2xl border-white/10 group">
              {/* Window Bar */}
              <div className="h-6 flex items-center gap-1.5 px-3 border-b border-white/5 bg-black/30 rounded-t-xl">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
                <span className="text-[10px] text-slate-500 font-mono ml-4 select-none">
                  XForge - {screenshots[activeIndex].title}
                </span>
              </div>

              {/* Main Image */}
              <div className="relative w-full h-[calc(100%-24px)] rounded-b-xl overflow-hidden bg-slate-900">
                <img 
                  key={activeIndex}
                  src={screenshots[activeIndex].src} 
                  alt={screenshots[activeIndex].title} 
                  className="w-full h-full object-cover object-top animate-scale-up-fade"
                />
              </div>

              {/* Arrow Controls */}
              <button 
                onClick={prevSlide}
                className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 border border-white/10 text-white hover:bg-[#45f3ff] hover:text-[#0b0c10] opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-md"
              >
                <CaretLeft size={20} weight="bold" />
              </button>
              <button 
                onClick={nextSlide}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/60 border border-white/10 text-white hover:bg-[#45f3ff] hover:text-[#0b0c10] opacity-0 group-hover:opacity-100 transition-all cursor-pointer backdrop-blur-md"
              >
                <CaretRight size={20} weight="bold" />
              </button>
            </div>
          </div>

          {/* Right: Selectors list */}
          <div className="lg:col-span-4 flex flex-col gap-3">
            {screenshots.map((screen, idx) => (
              <button
                key={idx}
                onClick={() => setActiveIndex(idx)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-300 border flex flex-col ${
                  activeIndex === idx 
                    ? 'bg-gradient-to-r from-white/5 to-[#45f3ff]/5 border-[#45f3ff]/30 shadow-lg' 
                    : 'bg-transparent border-transparent hover:bg-white/5 hover:border-white/5'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className={`font-display font-semibold text-sm sm:text-base ${activeIndex === idx ? 'text-[#45f3ff]' : 'text-white'}`}>
                    {screen.title}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500">0{idx + 1}</span>
                </div>
                {activeIndex === idx && (
                  <p className="mt-2 text-xs sm:text-sm text-slate-400 leading-relaxed transition-all">
                    {screen.description}
                  </p>
                )}
              </button>
            ))}
          </div>

        </div>

      </div>
    </section>
  );
}
