import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ScrollControls, Scroll, useScroll, Environment, Stars } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';

import Nav from './components/Nav.jsx';
import AudioPlayer from './components/AudioPlayer.jsx';
import LiquidBackground from './components/LiquidBackground.jsx';
import HeroScene from './scenes/HeroScene.jsx';
import AboutScene from './scenes/AboutScene.jsx';
import ContactScene from './scenes/ContactScene.jsx';
import { projects } from './data/projects.js';

/**
 * Coordina las escenas con el progreso de scroll global.
 * Cada escena recibe un `scrollOffset` 0..1 propio según su tramo de páginas.
 */
function SceneStack({ onSelectProject }) {
  const scroll = useScroll();
  const [offsets, setOffsets] = React.useState({ hero: 0, about: 0, gallery: 0, contact: 0 });

  // Posicionamos cada escena en X distintos para que se vean en su "página"
  // Cada página = 1/pages del scroll total. Definimos 4 páginas = 4 secciones.
  // Cuando el scroll llega a su tramo, esa escena pasa al frente (entra en cuadro).
  // Para mantenerlo simple, todas viven en (0,0,0) y movemos la cámara con scroll.

  // Calculamos offsets en cada frame mediante useFrame del propio ScrollControls
  // ... pero como cada Scene tiene su useFrame, basta con leer scroll.offset y
  // pasarlo. Lo hacemos vía un componente hijo que lee scroll y propaga estado.

  React.useEffect(() => {
    let raf;
    const tick = () => {
      const o = scroll.offset; // 0..1
      setOffsets({
        hero: Math.max(0, Math.min(1, o * 6 - 0)),
        about: Math.max(0, Math.min(1, o * 6 - 1)),
        skills: Math.max(0, Math.min(1, o * 6 - 2)),
        gallery: Math.max(0, Math.min(1, o * 6 - 3)),
        contact: Math.max(0, Math.min(1, o * 6 - 4)),
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scroll]);

  return (
    <>
      {/* Cada escena posicionada en su "X" para que la cámara las recorra */}
      <group position={[0, 0, 0]}>
        <HeroScene scrollOffset={offsets.hero} />
      </group>
      <group position={[8, 0, 0]}>
        <AboutScene scrollOffset={offsets.about} />
      </group>
      {/* x=16 reservado para galería HTML sin 3D (cubos eliminados) */}
      <group position={[24, 0, 0]}>
        <ContactScene />
      </group>

      <CameraScroller />
    </>
  );
}

/**
 * Mueve la cámara horizontalmente con el scroll para "viajar" entre escenas.
 */
function CameraScroller() {
  const scroll = useScroll();
  const threeCam = useThree((s) => s.camera);

  React.useEffect(() => {
    let raf;
    const tick = () => {
      const o = scroll.offset;
      // Escenas en x = 0..24. La cámara llega a 24 cuando termina la sección
      // de Contacto (scroll 5/6) y se queda ahí durante el footer.
      const targetX = Math.min(o * 6 / 5, 1) * 24;
      threeCam.position.x += (targetX - threeCam.position.x) * 0.12;
      threeCam.lookAt(threeCam.position.x, 0, 0);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scroll, threeCam]);

  return null;
}

/**
 * Modo presentación: scroll automático del top al bottom con ease-in-out
 * de seno, durante TOUR_DURATION_MS. Útil para grabar un demo video.
 */
const TOUR_DURATION_MS = 90000;

function PresentationDirector({ presenting, onDone }) {
  const scroll = useScroll();
  const rafRef = useRef(null);

  useEffect(() => {
    if (!presenting || !scroll?.el) return;
    const start = performance.now();
    const max = scroll.el.scrollHeight - scroll.el.clientHeight;
    const tick = (now) => {
      const t = Math.min(1, (now - start) / TOUR_DURATION_MS);
      // Ease in/out con curva senoidal — cámara cinematográfica
      const eased = 0.5 - 0.5 * Math.cos(t * Math.PI);
      scroll.el.scrollTop = max * eased;
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        onDone?.();
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [presenting, scroll, onDone]);

  return null;
}

export default function App() {
  const [selected, setSelected] = useState(null);
  const [presenting, setPresenting] = useState(false);

  // Permite arrancar el tour vía ?present=1 en la URL (útil para grabar)
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get('present') === '1') {
      // pequeño delay para que se cargue todo antes de empezar
      const timer = setTimeout(() => setPresenting(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  return (
    <div className="relative w-screen h-screen bg-bg text-ink overflow-hidden">
      <Nav />
      <AudioPlayer src="/assets/huella.mp3" volume={0.45} />

      {/* Botón "modo presentación" — esquina inferior izquierda */}
      <button
        onClick={() => setPresenting((p) => !p)}
        title={presenting ? 'Detener presentación' : 'Reproducir presentación (90s)'}
        className="fixed bottom-6 left-6 z-[60] inline-flex items-center gap-2 pl-3 pr-4 py-2 rounded-full border border-ink/30 bg-bg/60 backdrop-blur-md hover:bg-ink hover:text-bg transition-colors text-[12px] font-mono uppercase tracking-widest"
      >
        {presenting ? (
          <>
            <span className="block w-3 h-3 bg-current" /> Stop
          </>
        ) : (
          <>
            <svg viewBox="0 0 12 12" width="12" height="12" fill="currentColor" aria-hidden="true">
              <path d="M2 1 L11 6 L2 11 Z" />
            </svg>
            Tour
          </>
        )}
      </button>

      <Canvas
        shadows
        camera={{ position: [0, 0, 5], fov: 40 }}
        gl={{ antialias: true }}
      >
        <fog attach="fog" args={['#0d0d0e', 6, 22]} />
        <LiquidBackground />
        <Stars radius={60} depth={50} count={350} factor={1.6} fade speed={0.4} />
        <Environment preset="city" />

        <Suspense fallback={null}>
          <ScrollControls pages={6} damping={0.18}>
            <PresentationDirector
              presenting={presenting}
              onDone={() => setPresenting(false)}
            />
            <SceneStack onSelectProject={setSelected} />

            {/* Capa HTML alineada al scroll */}
            <Scroll html style={{ width: '100%' }}>
              <HtmlContent
                projects={projects}
                onSelect={setSelected}
                onSendContact={() => {}}
              />
            </Scroll>
          </ScrollControls>
        </Suspense>
      </Canvas>

      {/* Modal de proyecto */}
      <AnimatePresence>
        {selected && (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-center bg-bg/80 backdrop-blur-md p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelected(null)}
          >
            <motion.div
              className="max-w-3xl w-full bg-bg border border-ink/15 rounded-2xl overflow-hidden max-h-[92vh] overflow-y-auto shadow-2xl shadow-black/50"
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 30, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              {selected.image && (
                <div className="relative w-full bg-black overflow-hidden">
                  <img
                    src={selected.image}
                    alt={selected.title}
                    className="block w-full h-auto"
                    onError={(e) => {
                      e.currentTarget.parentElement.style.display = 'none';
                    }}
                  />
                  {/* Sutil viñeta inferior con el color del proyecto para fundir con el contenido */}
                  <div
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-1/3 pointer-events-none"
                    style={{
                      background: `linear-gradient(180deg, transparent 0%, ${selected.color}40 60%, #0d0d0e 100%)`,
                    }}
                  />
                </div>
              )}

              <div className="p-8 md:p-10">
                <div className="flex items-center gap-3 mb-3">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ background: selected.color }}
                  />
                  <div className="text-mute font-mono text-[11px] tracking-widest uppercase">
                    {selected.role} · {selected.year}
                  </div>
                </div>
                <h3 className="font-display text-3xl md:text-5xl font-medium tracking-tight mb-5">
                  {selected.title}
                </h3>
                <p className="text-mute text-base md:text-lg leading-relaxed mb-8 max-w-2xl">
                  {selected.description}
                </p>
                <div className="flex gap-3 flex-wrap">
                  {selected.href && selected.href !== '#' && (
                    <a
                      href={selected.href}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block bg-ink text-bg px-6 py-3 rounded-full text-sm font-medium hover:bg-accent transition-colors"
                    >
                      Ver proyecto →
                    </a>
                  )}
                  <button
                    onClick={() => setSelected(null)}
                    className="inline-block border border-ink/30 hover:border-ink/60 px-6 py-3 rounded-full text-sm transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ---------------- HTML overlay con secciones ---------------- */

function HtmlContent({ projects, onSelect, onSendContact }) {
  return (
    <div className="w-full text-ink">
      {/* Hero — el logo 3D vive en el Canvas; aquí solo el copy */}
      <section id="hero" className="min-h-screen flex items-end pb-24 px-6 md:px-16">
        <div className="max-w-[1360px] mx-auto w-full">
          <h1 className="font-display text-[clamp(48px,10vw,160px)] leading-[0.94] tracking-tight">
            Diseño que <em className="font-serif italic font-normal">suena</em><br />
            y <em className="font-serif italic font-normal">se ve</em>.
          </h1>
          <p className="mt-8 max-w-xl text-mute text-lg leading-relaxed">
            Camilo · CLAST. Diseño web, identidad de marca y producción audiovisual desde Colombia.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="https://open.spotify.com/artist/3nOp4QFfr3XeZNTXFc5bHA"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 pl-3 pr-5 py-2 rounded-full border border-[#1DB954]/40 bg-[#1DB954]/10 hover:bg-[#1DB954]/20 hover:border-[#1DB954]/70 transition-all group"
            >
              <svg
                viewBox="0 0 168 168"
                aria-hidden="true"
                className="w-6 h-6 shrink-0"
              >
                <circle cx="84" cy="84" r="84" fill="#1DB954" />
                <path
                  fill="#000"
                  d="M119.5 121.3c-1.5 2.4-4.6 3.2-7 1.7-19.1-11.7-43.1-14.3-71.4-7.8-2.7.6-5.4-1.1-6-3.8s1.1-5.4 3.8-6c30.9-7.1 57.5-4 78.9 9 2.4 1.5 3.2 4.5 1.7 6.9zm9.5-21.2c-1.9 3-5.8 4-8.8 2.1-21.9-13.5-55.3-17.4-81.2-9.5-3.3 1-6.8-.9-7.8-4.2-1-3.3.9-6.8 4.2-7.8 29.6-9 66.4-4.7 91.5 10.7 3 1.8 3.9 5.7 2.1 8.7zm.8-22.1C103.5 62.7 60.7 60.9 35.7 68.5c-4 1.2-8.2-1-9.3-5-1.2-4 1-8.2 5-9.3 28.9-8.8 76.2-7.1 106.3 10.8 3.6 2.1 4.7 6.7 2.6 10.2-2 3.6-6.7 4.7-10.5 2.8z"
                />
              </svg>
              <span className="text-sm font-medium text-ink">
                Escuchar en <span className="text-[#1DB954]">Spotify</span>
              </span>
              <span className="text-[#1DB954] group-hover:translate-x-1 transition-transform text-base">→</span>
            </a>

            <a
              href="https://soundcloud.com/djclast"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 pl-3 pr-5 py-2 rounded-full border border-[#FF5500]/40 bg-[#FF5500]/10 hover:bg-[#FF5500]/20 hover:border-[#FF5500]/70 transition-all group"
            >
              <span className="inline-grid place-items-center w-6 h-6 rounded-full bg-[#FF5500] shrink-0">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                  className="w-[16px] h-[16px]"
                >
                  <path
                    fill="#fff"
                    d="M23.999 14.165c-.052 1.796-1.612 3.169-3.401 3.169h-8.18a.68.68 0 0 1-.671-.682V7.825a.703.703 0 0 1 .42-.682s.749-.51 2.346-.51a4.714 4.714 0 0 1 2.096.49 4.79 4.79 0 0 1 2.582 3.763 3.65 3.65 0 0 1 1.444-.292 3.473 3.473 0 0 1 3.363 3.57M11.42 8.097l-.398 8.92.396 1.962a.156.156 0 0 0 .312 0l.453-1.962-.453-9.018a.236.236 0 0 0-.234-.234.232.232 0 0 0-.075.332zM9.972 9.317l-.42 7.703.42 1.94a.156.156 0 0 0 .312 0l.475-1.94-.475-7.703a.156.156 0 0 0-.312 0zm-1.49.314l-.397 7.39.398 1.954a.156.156 0 0 0 .312 0l.453-1.954-.453-7.39a.156.156 0 0 0-.313 0zm-1.518.06l-.396 7.32.396 1.962a.156.156 0 0 0 .312 0l.453-1.962-.453-7.32a.156.156 0 0 0-.312 0zm-1.532 1.563l-.398 5.78.398 1.97a.156.156 0 0 0 .312 0l.453-1.97-.453-5.78a.156.156 0 0 0-.312 0zm-1.5.96l-.397 4.84.397 1.95a.156.156 0 0 0 .312 0l.453-1.95-.453-4.84a.156.156 0 0 0-.312 0zm-1.516.79l-.397 4.046.397 1.957a.156.156 0 0 0 .312 0l.453-1.957-.453-4.046a.156.156 0 0 0-.312 0zm-1.49 1.05l-.397 3.014.397 1.94a.156.156 0 0 0 .312 0l.453-1.94-.453-3.014a.156.156 0 0 0-.312 0zM.396 14.5L0 16.94l.396 1.99a.156.156 0 0 0 .312 0l.397-1.99-.397-2.44a.156.156 0 0 0-.312 0z"
                  />
                </svg>
              </span>
              <span className="text-sm font-medium text-ink">
                En <span className="text-[#FF5500]">SoundCloud</span>
              </span>
              <span className="text-[#FF5500] group-hover:translate-x-1 transition-transform text-base">→</span>
            </a>
          </div>

          <div className="mt-10 text-mute font-mono text-[11px] tracking-widest uppercase">
            ↓ scroll para explorar
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="min-h-screen flex items-center px-6 md:px-16">
        <div className="max-w-[1360px] mx-auto w-full grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-mute font-mono text-[11px] tracking-widest uppercase">
              Sobre mí
            </div>
            <h2 className="mt-4 font-display text-[clamp(36px,6vw,72px)] leading-tight tracking-tight">
              Mezclo pixeles, sonidos y <em className="font-serif italic font-normal">marcas que duran</em>.
            </h2>
            <p className="mt-6 text-mute leading-relaxed">
              Soy Camilo, creador detrás de CLAST. Diseño y desarrollo sitios web,
              construyo identidades visuales y produzco contenido audiovisual para
              marcas que quieren verse tan en serio como actúan. Vengo del mundo del
              DJing y la producción musical, y eso se nota: cada proyecto tiene su
              propio ritmo, su propia tipografía, su propio mood.
            </p>
            <p className="mt-4 text-mute leading-relaxed">
              Trabajo principalmente con landing pages, tiendas online y branding
              completo. Stack favorito: React, Vite, Three.js, Supabase. Cuando no
              estoy en código, estoy en una cabina.
            </p>
            <ul className="mt-8 grid grid-cols-2 gap-2 text-sm text-mute font-mono">
              <li>· Diseño web</li>
              <li>· Identidad visual</li>
              <li>· Tiendas online</li>
              <li>· Producción audiovisual</li>
              <li>· DJ sets</li>
              <li>· Motion / 3D</li>
            </ul>
          </div>
          <div /> {/* el R3F se ve a la derecha */}
        </div>
      </section>

      {/* Skills */}
      <SkillsSection />

      {/* Gallery */}
      <section id="gallery" className="min-h-screen flex flex-col justify-center px-6 md:px-16 py-24">
        <div className="max-w-[1360px] mx-auto w-full">
          <div className="text-mute font-mono text-[11px] tracking-widest uppercase">
            Proyectos · click en cualquiera
          </div>
          <h2 className="mt-4 font-display text-[clamp(36px,6vw,72px)] leading-tight tracking-tight">
            Trabajos recientes
          </h2>
          <div className="mt-10 grid md:grid-cols-3 gap-4">
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => onSelect(p)}
                className="text-left p-5 rounded-2xl border border-ink/15 hover:border-ink/40 transition-colors"
                style={{ background: `linear-gradient(180deg, ${p.color}15, transparent)` }}
              >
                <div className="text-mute font-mono text-[10px] uppercase tracking-widest">
                  {p.role} · {p.year}
                </div>
                <div className="mt-2 font-display text-2xl">{p.title}</div>
              </button>
            ))}
          </div>
          <p className="mt-10 text-mute text-sm">
            * Click en cualquier tarjeta para ver los detalles del proyecto.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="min-h-screen flex items-start px-6 md:px-16 pt-28 pb-16">
        <div className="max-w-[1360px] mx-auto w-full grid md:grid-cols-2 gap-12 items-start">
          <div>
            <div className="text-mute font-mono text-[11px] tracking-widest uppercase">
              Contacto
            </div>
            <h2 className="mt-3 font-display text-[clamp(36px,6vw,72px)] leading-tight tracking-tight">
              Empezá tu proyecto.
            </h2>
            <p className="mt-4 text-mute">djclastcol@gmail.com · WhatsApp +57 324 437 8544</p>

            <form
              className="mt-6 grid gap-3 max-w-md"
              onSubmit={(e) => {
                e.preventDefault();
                onSendContact();
                e.currentTarget.reset();
              }}
            >
              <input
                type="text"
                required
                placeholder="Tu nombre"
                className="w-full bg-transparent border-b border-ink/30 py-2.5 text-ink placeholder:text-mute focus:outline-none focus:border-ink transition-colors"
              />
              <input
                type="email"
                required
                placeholder="Tu correo"
                className="w-full bg-transparent border-b border-ink/30 py-2.5 text-ink placeholder:text-mute focus:outline-none focus:border-ink transition-colors"
              />
              <textarea
                required
                rows={2}
                placeholder="Contame del proyecto"
                className="w-full bg-transparent border-b border-ink/30 py-2.5 text-ink placeholder:text-mute focus:outline-none focus:border-ink transition-colors resize-none"
              />
              <button
                type="submit"
                className="mt-3 w-full bg-ink text-bg px-6 py-3 rounded-full text-sm font-medium hover:bg-accent transition-colors"
              >
                Enviar mensaje →
              </button>
            </form>
          </div>
          <div /> {/* la esfera 3D se ve a la derecha */}
        </div>
      </section>

      {/* ---------------- Footer ---------------- */}
      <Footer />
    </div>
  );
}

/* ---------------- Footer ---------------- */

function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative px-6 md:px-16 pt-20 pb-24 border-t border-ink/10">
      <div className="max-w-[1360px] mx-auto">
        {/* Wordmark */}
        <div className="flex items-end justify-between gap-8 flex-wrap mb-14">
          <a href="#hero" className="inline-flex items-baseline">
            <span className="font-display text-[clamp(72px,14vw,180px)] font-medium tracking-tight leading-none">
              CLAST<span className="text-accent">.</span>
            </span>
          </a>
          <p className="font-serif italic text-mute text-lg md:text-xl max-w-sm leading-snug">
            Diseño que <em className="text-ink">suena</em> y <em className="text-ink">se ve</em>.
          </p>
        </div>

        {/* Columns */}
        <div className="grid gap-10 md:grid-cols-4 mb-16">
          {/* Navegar */}
          <div>
            <div className="text-mute font-mono text-[11px] tracking-widest uppercase mb-4">
              Navegar
            </div>
            <ul className="space-y-2 text-ink/85">
              <li><a href="#hero" className="hover:text-accent transition-colors">Inicio</a></li>
              <li><a href="#about" className="hover:text-accent transition-colors">Sobre mí</a></li>
              <li><a href="#skills" className="hover:text-accent transition-colors">Skills</a></li>
              <li><a href="#gallery" className="hover:text-accent transition-colors">Proyectos</a></li>
              <li><a href="#contact" className="hover:text-accent transition-colors">Contacto</a></li>
            </ul>
          </div>

          {/* Contacto */}
          <div>
            <div className="text-mute font-mono text-[11px] tracking-widest uppercase mb-4">
              Contacto
            </div>
            <ul className="space-y-2 text-ink/85">
              <li>
                <a href="mailto:djclastcol@gmail.com" className="hover:text-accent transition-colors">
                  djclastcol@gmail.com
                </a>
              </li>
              <li>
                <a
                  href="https://wa.me/573244378544"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent transition-colors"
                >
                  WhatsApp +57 324 437 8544
                </a>
              </li>
              <li className="text-mute">Cali · Colombia</li>
            </ul>
          </div>

          {/* Música */}
          <div>
            <div className="text-mute font-mono text-[11px] tracking-widest uppercase mb-4">
              Música
            </div>
            <ul className="space-y-2 text-ink/85">
              <li>
                <a
                  href="https://open.spotify.com/artist/3nOp4QFfr3XeZNTXFc5bHA"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#1DB954] transition-colors"
                >
                  Spotify →
                </a>
              </li>
              <li>
                <a
                  href="https://soundcloud.com/djclast"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-[#FF5500] transition-colors"
                >
                  SoundCloud →
                </a>
              </li>
              <li>
                <a
                  href="https://instagram.com/clastofc"
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-accent transition-colors"
                >
                  Instagram →
                </a>
              </li>
            </ul>
          </div>

          {/* Stack */}
          <div>
            <div className="text-mute font-mono text-[11px] tracking-widest uppercase mb-4">
              Construido con
            </div>
            <ul className="space-y-2 text-ink/85 font-mono text-sm">
              <li>React + Vite</li>
              <li>Three.js · R3F · Drei</li>
              <li>Tailwind CSS</li>
              <li>Deploy en Vercel</li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 pt-8 border-t border-ink/10 text-mute font-mono text-[11px] tracking-widest uppercase">
          <div>© {year} CLAST · Camilo Echeverri</div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
              Disponible para proyectos
            </span>
          </div>
          <a href="#hero" className="hover:text-ink transition-colors">
            ↑ Volver arriba
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ---------------- Skills section (honeycomb hexagons) ---------------- */

// Iconos via simple-icons CDN para marcas no incluidas en devicon
const SI = (slug, color) => `https://cdn.simpleicons.org/${slug}/${color}`;

// Helper: convierte un SVG string en data URI (para usar como <img src>)
const svgDataUri = (svg) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

// Iconos inline para software musical que no está en CDNs públicos
const ICON_ABLETON = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <g fill="#ffffff">
    <rect x="2"   y="3"    width="3.6" height="18"/>
    <rect x="6.4" y="3"    width="3.6" height="18"/>
    <rect x="10.8" y="3"   width="3.6" height="18"/>
    <rect x="15.2" y="3"   width="3.6" height="18" opacity="0.55"/>
    <rect x="19.6" y="3"   width="3.6" height="18" opacity="0.30"/>
  </g>
</svg>`);

const ICON_FLSTUDIO = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <g fill="#ff7a1a">
    <!-- F -->
    <rect x="3"  y="4"  width="2.6" height="16"/>
    <rect x="3"  y="4"  width="7"   height="2.6"/>
    <rect x="3"  y="10.5" width="5" height="2.6"/>
    <!-- L -->
    <rect x="13" y="4"  width="2.6" height="16"/>
    <rect x="13" y="17.4" width="7" height="2.6"/>
  </g>
</svg>`);

const ICON_REKORDBOX = svgDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
  <circle cx="12" cy="12" r="10.5" fill="#ff2244"/>
  <circle cx="12" cy="12" r="7.5"  fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="0.6"/>
  <circle cx="12" cy="12" r="4.5"  fill="none" stroke="#ffffff" stroke-opacity="0.35" stroke-width="0.6"/>
  <circle cx="12" cy="12" r="1.8"  fill="#ffffff"/>
  <circle cx="12" cy="12" r="0.6"  fill="#ff2244"/>
</svg>`);

const SKILLS = [
  // — Frontend / código —
  { name: 'HTML5',      icon: 'html5/html5-original.svg' },
  { name: 'CSS3',       icon: 'css3/css3-original.svg' },
  { name: 'JavaScript', icon: 'javascript/javascript-original.svg' },
  { name: 'TypeScript', icon: 'typescript/typescript-original.svg' },
  { name: 'React',      icon: 'react/react-original.svg' },
  { name: 'Vite',       icon: 'vitejs/vitejs-original.svg' },
  // — Tooling / 3D / diseño —
  { name: 'Tailwind',   icon: 'tailwindcss/tailwindcss-original.svg' },
  { name: 'Three.js',   icon: 'threejs/threejs-original.svg' },
  { name: 'Node.js',    icon: 'nodejs/nodejs-original.svg' },
  { name: 'Git',        icon: 'git/git-original.svg' },
  { name: 'Figma',      icon: 'figma/figma-original.svg' },
  // — Producción musical / DJ — (assets locales en /public/assets/skills/)
  { name: 'Ableton Live', src: '/assets/skills/ableton.jpg' },
  { name: 'FL Studio',    src: '/assets/skills/flstudio.png' },
  { name: 'Pro Tools',    src: SI('protools', '9ec3f3') },
  { name: 'Rekordbox',    src: '/assets/skills/rekordbox.png' },
];

const HEX_CLIP = 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)';

function Hex({ skill }) {
  return (
    <div
      className="relative group w-[64px] h-[74px] md:w-[120px] md:h-[138px] transition-transform duration-300 hover:scale-[1.06]"
      title={skill.name}
    >
      {/* Halo exterior (borde de luz) */}
      <div
        className="absolute inset-0"
        style={{
          clipPath: HEX_CLIP,
          background:
            'linear-gradient(135deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.06) 45%, rgba(255,193,69,0.18) 100%)',
        }}
      />
      {/* Vidrio: superficie translúcida con blur */}
      <div
        className="absolute inset-[1px]"
        style={{
          clipPath: HEX_CLIP,
          background:
            'linear-gradient(160deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.04) 35%, rgba(13,13,14,0.55) 100%)',
          backdropFilter: 'blur(14px) saturate(140%)',
          WebkitBackdropFilter: 'blur(14px) saturate(140%)',
          boxShadow:
            'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -8px 16px rgba(0,0,0,0.35)',
        }}
      />
      {/* Highlight superior (brillo) */}
      <div
        className="absolute inset-[1px] opacity-70 mix-blend-screen pointer-events-none"
        style={{
          clipPath: HEX_CLIP,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, transparent 35%)',
        }}
      />
      {/* Icono — devicon (skill.icon) o URL directa (skill.src) */}
      <div className="absolute inset-0 grid place-items-center">
        <img
          src={
            skill.src
              ? skill.src
              : `https://cdn.jsdelivr.net/gh/devicons/devicon/icons/${skill.icon}`
          }
          alt={skill.name}
          className="w-7 h-7 md:w-12 md:h-12 transition-transform duration-300 group-hover:scale-110"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.5))' }}
          loading="lazy"
        />
      </div>
    </div>
  );
}

function SkillsSection() {
  // 15 skills repartidos en panal de 3 filas: 6 / 5 / 4
  const row1 = SKILLS.slice(0, 6);   // Frontend
  const row2 = SKILLS.slice(6, 11);  // Tooling/3D/Diseño
  const row3 = SKILLS.slice(11);     // Música / DJ

  return (
    <section
      id="skills"
      className="min-h-screen flex flex-col items-center justify-center px-6 md:px-16 py-24 relative"
    >
      <h2 className="font-display text-[clamp(56px,10vw,128px)] font-medium tracking-tight mb-16">
        Skills<span className="text-accent">.</span>
      </h2>

      <div
        className="flex flex-col items-center gap-3 md:gap-5"
        style={{ filter: 'blur(1.2px)', opacity: 0.85 }}
      >
        <div className="flex gap-2 md:gap-4">
          {row1.map((s) => (
            <Hex key={s.name} skill={s} />
          ))}
        </div>
        <div className="flex gap-2 md:gap-4 ml-[34px] md:ml-[62px]">
          {row2.map((s) => (
            <Hex key={s.name} skill={s} />
          ))}
        </div>
        <div className="flex gap-2 md:gap-4">
          {row3.map((s) => (
            <Hex key={s.name} skill={s} />
          ))}
        </div>
      </div>
    </section>
  );
}
