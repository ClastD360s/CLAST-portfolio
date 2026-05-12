import React from 'react';

export default function Nav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md bg-bg/60">
      <div className="max-w-[1360px] mx-auto px-6 md:px-12 h-[68px] flex items-center justify-between">
        <a href="#hero" className="flex items-center gap-2.5 text-ink" aria-label="CLAST inicio">
          <img
            src="/assets/clast-logo.png"
            alt=""
            aria-hidden="true"
            className="w-7 h-7 object-contain invert"
          />
          <span className="font-display text-[20px] font-medium tracking-tight">
            CLAST<span className="text-accent">.</span>
          </span>
        </a>
        <ul className="hidden md:flex gap-8 text-[13px] font-mono uppercase tracking-widest text-mute">
          <li><a href="#about" className="hover:text-ink transition-colors">Sobre mí</a></li>
          <li><a href="#skills" className="hover:text-ink transition-colors">Skills</a></li>
          <li><a href="#gallery" className="hover:text-ink transition-colors">Proyectos</a></li>
          <li><a href="#contact" className="hover:text-ink transition-colors">Contacto</a></li>
        </ul>
        <a
          href="#contact"
          className="text-[13px] font-mono uppercase tracking-widest border border-ink/30 rounded-full px-4 py-2 hover:bg-ink hover:text-bg transition-colors"
        >
          Hablemos →
        </a>
      </div>
    </nav>
  );
}
