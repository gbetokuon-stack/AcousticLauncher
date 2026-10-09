import React from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Showcase from './components/Showcase';
import Download from './components/Download';
import Footer from './components/Footer';
import ParticleBackground from './components/ParticleBackground';

export default function App() {
  return (
    <div className="min-h-screen bg-[#0b0c10] text-[#c5c6c7] relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none z-0" />
      
      {/* Dynamic 3D Particle Canvas */}
      <ParticleBackground />
      
      <Navbar />
      <Hero />
      <Features />
      <Showcase />
      <Download />
      <Footer />
    </div>
  );
}
