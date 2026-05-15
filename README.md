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

## Build de producción

```bash
npm run build
npm run preview
```
## Créditos

Logo y assets visuales: © CLAST 2026.
Inspiración 3D: ejemplo `webgl_lights_spotlight` de three.js.

<img width="1916" height="895" alt="image" src="https://github.com/user-attachments/assets/2a8b8fe3-5944-42a5-be55-b1a19d6a3e9d" />

<img width="1918" height="904" alt="image" src="https://github.com/user-attachments/assets/c75dc715-f8f4-4d01-881c-f24a6ed93572" />

<img width="1902" height="903" alt="image" src="https://github.com/user-attachments/assets/fb34b387-970c-46c7-9dc2-80fd49d3b958" />


