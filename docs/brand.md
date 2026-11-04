# La Pizzara — identidad de producto

El nombre visible de la aplicación es **La Pizzara** (tal como lo indicó el
propietario). El símbolo mezcla una pizarra de trabajo con una porción de pizza,
para que la identidad sea reconocible y propia sin cambiar el carácter profesional
del portal.

## Assets

- `apps/web/public/brand-mark.svg`: fuente vectorial del isotipo.
- `apps/web/public/favicon.svg`: icono de pestaña de alta resolución.
- `apps/web/public/apple-touch-icon.png`: icono para añadir a la pantalla de inicio.
- `apps/web/public/icon-192.png` y `icon-512.png`: tamaños declarados en el web manifest.
- `apps/web/public/site.webmanifest`: nombre, alcance y color oscuro al instalar.
- `apps/web/src/components/brand/BrandLogo.tsx`: marca accesible compartida en login y sidebar.

La paleta del símbolo retoma el azul lavanda y el fondo oscuro existentes; el
amarillo aporta la referencia a la pizza y el rosa apagado distingue sus ingredientes.
No se introducen fuentes remotas ni paquetes de imágenes. La URL de API, las rutas,
identificadores técnicos, nombre de la base de datos y preferencias guardadas no
cambian con el renombrado.
