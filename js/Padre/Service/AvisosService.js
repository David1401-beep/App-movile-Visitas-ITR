import { API_BASE_URL } from "../../config.js";

async function solicitarApi(ruta) {
  let respuesta;

  try {
    respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
      credentials: "include",
      headers: { Accept: "application/json" }
    });
  } catch (error) {
    throw new Error(
      "No se pudo conectar con la API. Compruebe que esté ejecutándose en el puerto 8080."
    );
  }

  const tipoContenido = respuesta.headers.get("content-type") || "";
  const contenido = tipoContenido.includes("json")
    ? await respuesta.json()
    : null;

  if (!respuesta.ok) {
    throw new Error(
      contenido?.message || contenido?.detail || "No fue posible obtener los avisos."
    );
  }

  return contenido && Object.prototype.hasOwnProperty.call(contenido, "data")
    ? contenido.data
    : contenido;
}

// Trae los avisos del más nuevo al más viejo. El limite es cuántos quiero;
// pasando null los trae todos, que es lo que usa la pantalla completa.
// La API solo manda los activos, así que los que el docente retiró no llegan.
export async function obtenerAvisos(limite = 3) {
  const comunicados = await solicitarApi("/comunicados");
  const lista = Array.isArray(comunicados) ? comunicados : [];

  return (limite ? lista.slice(0, limite) : lista)
    .map(comunicado => ({
      idComunicado: comunicado.idComunicado,
      mensaje: comunicado.comMensaje,
      docente: comunicado.nombreDocente || "Docente",
      fecha: comunicado.comFecha,
      // El dia suelto, para comparar contra el campo de fecha del filtro.
      dia: String(comunicado.comFecha ?? "").slice(0, 10),
      fechaTexto: formatearFecha(comunicado.comFecha)
    }));
}

function formatearFecha(fecha) {
  if (!fecha) {
    return "";
  }

  try {
    return new Intl.DateTimeFormat("es-SV", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(new Date(fecha));
  } catch (error) {
    return "";
  }
}
