# motivation

Pagina personal de motivacion: imagenes y clips aleatorios tipo dump, con musica de fondo.

## Agregar contenido

Copiar archivos en:

- `public/media/images/` — jpg, jpeg, png, gif, webp, avif
- `public/media/videos/` — mp4, webm, mov, m4v
- `public/media/music/` — mp3, m4a, aac, ogg, wav, flac

Subcarpetas permitidas. Commit + push; Vercel regenera `manifest.json` en cada deploy.

## Controles

| Accion | Teclado | Mouse / movil |
|---|---|---|
| Siguiente | flecha derecha/abajo, espacio | click en los 2/3 derechos, swipe izq/arriba |
| Anterior | flecha izquierda/arriba | click en el 1/3 izquierdo, swipe der/abajo |
| Pausar musica | M | boton |
| Cancion aleatoria | E o N | SKIP |
| Cancion anterior / reiniciar | Q | boton |
| Volumen | + / - | slider (click en el icono silencia) |
| Auto-avance | A | AUTO |
| Sonido de clips (baja la musica) | S | CLIP |
| Pantalla completa | F | boton |

Duracion de imagen en AUTO: `IMAGE_SECONDS` en `public/app.js`.

## Imagenes de baja resolucion

Las imagenes con lado largo < 1280 px se escalaron con Real-ESRGAN (`realesr-general-x4v3`) a 1920 px,
mezclado 60/40 con Lanczos para evitar artefactos. Para nuevas imagenes chicas, el mismo proceso
se puede repetir antes de subirlas.

## Local

```bash
npm run dev
```

## Deploy

Importar el repo en Vercel. `vercel.json` ya define build (`npm run build`) y salida (`public`).

## Limites

- GitHub rechaza archivos > 100 MB. Comprimir videos (ej. `ffmpeg -i in.mov -vcodec libx264 -crf 28 out.mp4`).
- Para muchos GB de media, usar Git LFS o Vercel Blob.
- La URL es publica para quien la conozca. `noindex` evita buscadores. Para bloquearla: Vercel Deployment Protection (Settings > Deployment Protection).
