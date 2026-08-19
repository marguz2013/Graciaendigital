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

    // Si el correo ya existe, Systeme.io responde 422 con este mensaje
    // específico. Para la persona esto NO es un error real (ya está en
    // nuestra lista), así que lo tratamos como éxito en vez de mostrarle
    // una alerta de "algo salió mal".
    const esCorreoDuplicado =
      systemeResponse.status === 422 &&
      /ya se ha utilizado/i.test(systemeResponseText);

    if (!systemeResponse.ok && !esCorreoDuplicado) {
      console.error('Error de Systeme.io:', systemeResponse.status, systemeResponseText);
      return new Response(
        JSON.stringify({ error: 'No se pudo registrar el contacto', detalle: systemeResponseText }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (esCorreoDuplicado) {
      // La persona ya estaba registrada de antes (probablemente ya tiene
      // la etiqueta también). No hay una forma confiable en la API actual
      // de Systeme.io para buscar su ID por correo y reasignarle la
      // etiqueta aquí, así que lo dejamos así y seguimos sin error.
      console.log('Correo ya registrado previamente, se trata como éxito:', correo);
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Contacto creado en Systeme.io:', systemeResponseText);

    // Paso 2: asignar la etiqueta "conexión Netlify y systeme..." (ID 2133269)
    // en una llamada aparte, ya que la API no la acepta al crear el contacto.
    let contactId;
    try {
      contactId = JSON.parse(systemeResponseText).id;
    } catch {
      contactId = null;
    }

    if (contactId) {
      const tagResponse = await fetch(`https://api.systeme.io/api/contacts/${contactId}/tags`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({ tagId: 2133269 }),
      });

      if (!tagResponse.ok) {
        const tagDetalle = await tagResponse.text();
        // No hacemos fallar todo el registro por esto: el contacto ya
        // quedó creado, pero dejamos el detalle en los logs para revisar.
        console.error('Error al asignar la etiqueta:', tagResponse.status, tagDetalle);
      } else {
        console.log('Etiqueta asignada correctamente al contacto', contactId);
      }
    } else {
      console.error('No se pudo leer el ID del contacto para asignar la etiqueta');
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
