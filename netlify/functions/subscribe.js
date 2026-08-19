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
      }),
    });

    const systemeResponseText = await systemeResponse.text();

    if (!systemeResponse.ok) {
      console.error('Error de Systeme.io:', systemeResponse.status,
