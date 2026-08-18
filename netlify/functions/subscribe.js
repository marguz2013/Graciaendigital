// netlify/functions/subscribe.js
//
// Recibe { nombre, correo } desde la app y crea (o actualiza) el contacto
// en Systeme.io usando la API Key guardada como variable de entorno en
// Netlify (SYSTEME_API_KEY). La API Key nunca se expone en el navegador.
//
// Documentación: https://developer.systeme.io/reference

export default async (req) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Método no permitido' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const apiKey = process.env.SYSTEME_API_KEY;
  if (!apiKey) {
    console.error('Falta la variable de entorno SYSTEME_API_KEY en Netlify');
    return new Response(JSON.stringify({ error: 'Configuración incompleta del servidor' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'JSON inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const nombre = (body.nombre || '').toString().trim();
  const correo = (body.correo || '').toString().trim();

  if (!nombre || !correo) {
    return new Response(JSON.stringify({ error: 'Nombre y correo son obligatorios' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validación simple de formato de correo antes de llamar a la API
  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
  if (!emailValido) {
    return new Response(JSON.stringify({ error: 'Correo inválido' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const systemeResponse = await fetch('https://api.systeme.io/api/contacts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey,
      },
      body: JSON.stringify({
        email: correo,
        firstName: nombre,
        locale: 'es',
        // Tag "promesa-app": dispara la regla de automatización que envía
        // el PDF de las 7 Promesas + el separador por correo.
        tags: [2133269],
      }),
    });

    // Systeme.io responde 422 si el contacto ya existe con ese correo;
    // en ese caso lo tratamos como éxito (la persona ya está en la lista).
    if (!systemeResponse.ok && systemeResponse.status !== 422) {
      const detalle = await systemeResponse.text();
      console.error('Error de Systeme.io:', systemeResponse.status, detalle);
      return new Response(JSON.stringify({ error: 'No se pudo registrar el contacto' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error llamando a Systeme.io:', err);
    return new Response(JSON.stringify({ error: 'Error de conexión con Systeme.io' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
