"use client";

import React from "react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-black text-white font-sans flex flex-col justify-between items-center p-6 sm:p-10 relative overflow-hidden select-none">
      {/* Background Radial Ambient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[550px] h-[550px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Section: School Logo (No white background, slight white/soft glow effect) */}
      <header className="w-full max-w-2xl flex flex-col items-center pt-4 z-10">
        <img
          src="/school-logo.png"
          alt="ITS Engineering College"
          className="h-14 sm:h-20 w-auto object-contain drop-shadow-[0_0_20px_rgba(255,255,255,0.45)] transition-all duration-300 hover:drop-shadow-[0_0_30px_rgba(255,255,255,0.6)]"
        />
      </header>

      {/* Main Center Content: New 3D 404 PNG Image & Error Code */}
      <main className="w-full max-w-lg my-auto flex flex-col items-center text-center space-y-6 z-10 py-6">
        {/* User Provided 3D 404 PNG Image */}
        <div className="relative">
          <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-2xl animate-pulse" />
          <img
            src="/404-illustration.png"
            alt="Page Not Found 404"
            className="w-56 sm:w-72 h-auto object-contain relative z-10 drop-shadow-[0_0_35px_rgba(59,130,246,0.35)] animate-float"
          />
        </div>

        {/* Text Details */}
        <div className="space-y-2">
          <div className="text-4xl sm:text-5xl font-black font-mono tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-300 to-red-500 drop-shadow-sm">
            ERROR 404
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white uppercase">
            PAGE NOT FOUND
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 max-w-xs mx-auto leading-relaxed font-medium">
            The page you are looking for does not exist or has been removed.
          </p>
        </div>
      </main>

      {/* Footer Section: AS Studios Logo (No white background, slight glow) & Copyright */}
      <footer className="w-full max-w-md flex flex-col items-center space-y-3 pb-4 z-10">
        {/* AS Studios Logo PNG Image */}
        <img
          src="/as-studios-logo.png"
          alt="AS STUDIOS"
          className="h-8 sm:h-10 w-auto object-contain drop-shadow-[0_0_18px_rgba(255,255,255,0.4)] transition-all duration-300 hover:drop-shadow-[0_0_25px_rgba(255,255,255,0.55)]"
        />

        {/* Copyright message */}
        <p className="text-[11px] font-mono tracking-widest text-neutral-400 uppercase font-semibold text-center drop-shadow-sm">
          © {new Date().getFullYear()} AS STUDIOS • ALL RIGHTS RESERVED
        </p>
      </footer>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
