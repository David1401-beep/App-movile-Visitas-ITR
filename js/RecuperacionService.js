import { API_BASE_URL } from "./config.js";

const RECUPERACION_URL = `${API_BASE_URL}/auth/recuperacion`;

// Rutas publicas: quien las usa todavia no puede iniciar sesion.
async function pedir(ruta, cuerpo) {
  let respuesta;

  try {
    respuesta = await fetch(`${RECUPERACION_URL}${ruta}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(cuerpo)
    });
  } catch (error) {
    return {
      exito: false,
      mensaje: "No se pudo conectar con el servidor. Compruebe que la API esté ejecutándose."
    };
  }

  const contenido = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    return { exito: false, mensaje: primerError(contenido) };
  }

  return { exito: true, mensaje: contenido?.message };
}

// Cuando falla una validacion, la API manda los errores dentro de "data".
function primerError(contenido) {
  const detalles = contenido?.data;

  if (detalles && typeof detalles === "object") {
    const primero = Object.values(detalles)[0];

    if (primero) {
      return primero;
    }
  }

  return contenido?.mensaje || contenido?.message || "No fue posible completar la solicitud.";
}

export function solicitarCodigo(correo) {
  return pedir("/solicitar", { email: correo });
}

export function verificarCodigo(correo, codigo) {
  return pedir("/verificar", { email: correo, codigo });
}

export function cambiarPassword(correo, codigo, passwordNueva) {
  return pedir("/cambiar", { email: correo, codigo, passwordNueva });
}
