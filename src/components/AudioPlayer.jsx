import React, { useEffect, useRef, useState } from 'react';

/**
 * AudioPlayer — música de fondo en loop con botón flotante para
 * pausar / reanudar y control de volumen.
 *
 * Los navegadores modernos bloquean autoplay con sonido hasta que el
 * usuario interactúa con la página. Estrategia:
 *  1. Cargar el audio en mute con autoplay.
 *  2. En la PRIMERA interacción (click / touch / tecla), desmutear y
 *     subir el volumen.
 *  3. El usuario puede pausar/reanudar con el botón flotante.
 */
export default function AudioPlayer({ src = '/assets/huella.wav', volume = 0.45 }) {
  const audioRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(false);
  const armed = useRef(false);

  // Intento inicial de play (silencioso para no romper la política de autoplay)
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = 0;
    audio.muted = true;
    audio.play()
      .then(() => setPlaying(true))
      .catch(() => setPlaying(false));
  }, []);

  // Al primer gesto del usuario, desmuteamos y subimos el volumen
  useEffect(() => {
    if (armed.current) return;

    const arm = () => {
      if (armed.current) return;
      armed.current = true;
      const audio = audioRef.current;
      if (!audio) return;
      audio.muted = false;
      audio.volume = volume;
      audio.play().then(() => {
        setMuted(false);
        setPlaying(true);
      }).catch(() => {});
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
      window.removeEventListener('touchstart', arm);
      window.removeEventListener('wheel', arm);
    };

    window.addEventListener('pointerdown', arm, { once: false });
    window.addEventListener('keydown', arm, { once: false });
    window.addEventListener('touchstart', arm, { once: false });
    window.addEventListener('wheel', arm, { once: false, passive: true });
    return () => {
      window.removeEventListener('pointerdown', arm);
      window.removeEventListener('keydown', arm);
      window.removeEventListener('touchstart', arm);
      window.removeEventListener('wheel', arm);
    };
  }, [volume]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.muted = false;
      audio.volume = volume;
      audio.play().then(() => {
        setMuted(false);
        setPlaying(true);
      });
    } else {
      // En vez de pause, mute → mantenemos la sincronía del loop
      audio.muted = !audio.muted;
      setMuted(audio.muted);
    }
  };

  return (
    <>
      <audio ref={audioRef} src={src} loop preload="auto" playsInline />
      <button
        onClick={toggle}
        aria-label={muted ? 'Activar sonido' : 'Silenciar'}
        title={muted ? 'Activar sonido' : 'Silenciar'}
        className="fixed bottom-6 right-6 z-[60] w-12 h-12 grid place-items-center rounded-full border border-ink/30 bg-bg/60 backdrop-blur-md hover:bg-ink hover:text-bg transition-colors group"
      >
        {muted ? (
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M11 5L6 9H2v6h4l5 4V5z" />
            <line x1="23" y1="9" x2="17" y2="15" />
            <line x1="17" y1="9" x2="23" y2="15" />
          </svg>
        ) : (
          <span className="flex items-end gap-[3px] h-5">
            <span className="w-[3px] bg-current rounded-full animate-[eqA_0.9s_ease-in-out_infinite] h-2" />
            <span className="w-[3px] bg-current rounded-full animate-[eqB_1.1s_ease-in-out_infinite] h-3" />
            <span className="w-[3px] bg-current rounded-full animate-[eqC_0.7s_ease-in-out_infinite] h-4" />
            <span className="w-[3px] bg-current rounded-full animate-[eqB_1.3s_ease-in-out_infinite] h-3" />
          </span>
        )}
      </button>
      <style>{`
        @keyframes eqA { 0%, 100% { height: 6px; } 50% { height: 14px; } }
        @keyframes eqB { 0%, 100% { height: 10px; } 50% { height: 18px; } }
        @keyframes eqC { 0%, 100% { height: 12px; } 50% { height: 20px; } }
      `}</style>
    </>
  );
}
