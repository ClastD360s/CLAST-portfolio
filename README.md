# CLAST — Portafolio 3D

Portafolio personal de Camilo (CLAST) construido con **React + Vite + React Three Fiber + Drei + Tailwind**.

## Stack

- **Framework**: Vite + React 18
- **3D**: `@react-three/fiber`, `@react-three/drei`, `three`
- **Estilos**: Tailwind CSS
- **Animación HTML**: framer-motion

## Estructura

```
src/
├── App.jsx                Canvas global + ScrollControls + secciones HTML
├── main.jsx               Bootstrap React
├── index.css              Tailwind + base styles
├── components/
│   └── Nav.jsx            Barra fija superior
├── scenes/
│   ├── HeroScene.jsx      Icosaedro distorsionado + SpotLight mouse-tracking
│   ├── AboutScene.jsx     TorusKnot metálico flotante
│   ├── GalleryScene.jsx   Cubos-proyecto interactivos (hover + click)
│   └── ContactScene.jsx   Esfera pulsante que reacciona al submit
└── data/
    └── projects.js        Lista de proyectos (placeholder)
```

## Interactividades (3, más del mínimo pedido)

1. **Seguimiento del mouse** → el spotlight del hero persigue al cursor + sutil parallax.
2. **Hover sobre proyectos** → cubos en la galería escalan + emisivo cambia (`onPointerOver` / `onPointerOut`).
3. **Click de selección** → click en un cubo abre modal con detalles del proyecto.
4. **Scroll-linked animation** → la cámara viaja horizontalmente entre las 4 escenas mientras hacés scroll vertical en el HTML, vía `<ScrollControls>` de Drei.

## Correr en local

```bash
npm install
npm run dev
```

Abre [http://localhost:5173](http://localhost:5173).

## Build de producción

```bash
npm run build
npm run preview
```

## Despliegue en Vercel

1. Subí este repo a GitHub.
2. En [vercel.com](https://vercel.com) → New Project → import del repo.
3. Vercel detecta Vite automáticamente. Build command: `npm run build`. Output: `dist`.
4. Deploy.

## Assets optimizados

Todo el contenido pesado está pre-comprimido para Vercel:

| Archivo | Formato | Tamaño |
|---|---|---|
| `public/models/base.glb` | GLB + Draco | 872 KB |
| `public/models/contact.glb` | GLB + Draco | 1.2 MB |
| `public/assets/huella.mp3` | MP3 192 kbps | 6.9 MB |
| `public/assets/profile.jpg` | JPG q4 | 28 KB |
| `public/assets/clast-logo.svg` | SVGO multipass | 4 KB |

Si reemplazás algún asset:

- **OBJ → GLB+Draco**: `npx obj2gltf -i in.obj -o tmp.glb --binary && npx gltf-pipeline -i tmp.glb -o out.glb --draco.compressionLevel=10`
- **WAV → MP3**: `ffmpeg -i in.wav -b:a 192k out.mp3`
- **PNG → JPG**: `ffmpeg -i in.png -q:v 4 out.jpg`
- **SVG**: `npx svgo file.svg --multipass`

## TODO

- [ ] Cambiar imágenes/colores de `src/data/projects.js` por los proyectos reales.
- [ ] Refinar bio en `src/App.jsx` (sección "Sobre mí").
- [ ] Agregar capturas al README.

## Créditos

Logo y assets visuales: © CLAST 2026.
Inspiración 3D: ejemplo `webgl_lights_spotlight` de three.js.
