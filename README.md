# Gracia en Digital — App "Un momento con Dios"

Esta carpeta contiene la app lista para publicar en Netlify, con el formulario
de nombre/correo conectado a Systeme.io a través de una función serverless
(para no exponer tu API Key en el navegador).

## Contenido

- `index.html` — la app (idéntica a la de artifacts, con el envío a Systeme.io ya conectado).
- `netlify/functions/subscribe.js` — función que recibe el nombre/correo y crea el contacto en Systeme.io.
- `netlify.toml` — configuración de Netlify (dónde están el sitio y las funciones).

## Importante: cómo publicar (con funciones, no sirve "arrastrar y soltar")

Como esta app usa una función serverless, **no puedes usar Netlify Drop**
(arrastrar la carpeta a app.netlify.com/drop) — ese método solo sirve para
sitios 100% estáticos. Necesitas conectar un repositorio de GitHub. Pasos:

1. **Sube esta carpeta a un repositorio de GitHub** (puede ser privado).
   - Si no usas GitHub todavía, la forma más simple es crear un repo nuevo en
     github.com, y subir estos archivos desde la interfaz web ("Add file" →
     "Upload files").
2. **En Netlify:** "Add new site" → "Import an existing project" → conecta tu
   cuenta de GitHub → selecciona el repositorio.
3. Deja el "Build command" vacío y "Publish directory" como `.` (ya viene
   configurado en `netlify.toml`, Netlify lo debería detectar solo).
4. **Antes de desplegar (o justo después), agrega tu API Key como variable de entorno:**
   - En el sitio dentro de Netlify: "Site configuration" → "Environment variables" → "Add a variable".
   - Nombre: `SYSTEME_API_KEY`
   - Valor: tu API Key de Systeme.io (la que ya generaste).
   - Guarda y vuelve a desplegar el sitio (Netlify no aplica variables nuevas a un deploy ya hecho).
5. Netlify te dará una URL pública tipo `tu-app.netlify.app`. Puedes
   renombrar el subdominio en "Site configuration" → "Domain management", o
   conectar tu propio dominio ahí mismo.

## Qué pasa cuando alguien completa el formulario

1. La app llama a `/.netlify/functions/subscribe` con `{ nombre, correo }`.
2. La función valida los datos y llama a la API de Systeme.io
   (`POST https://api.systeme.io/api/contacts`) usando tu `SYSTEME_API_KEY`.
3. Si el contacto se crea (o ya existía), la app avanza a la pantalla de
   confirmación. Si algo falla, muestra un mensaje cálido pidiendo
   reintentar, sin perder los datos que la persona ya escribió.

## Siguientes pasos opcionales

- **Etiquetar automáticamente estos leads:** en Systeme.io, crea un tag (por
  ejemplo "promesa-app"), consigue su ID numérico, y agrégalo en
  `netlify/functions/subscribe.js` donde dice `// tags: [ID_DEL_TAG]`.
- **Entregar el PDF real:** hoy el botón solo confirma el registro. Si
  quieres que Systeme.io dispare automáticamente el correo con el PDF y el
  separador, puedes crear una regla de automatización en Systeme.io que se
  active cuando se cree un contacto nuevo (o cuando se le asigne el tag
  anterior).
