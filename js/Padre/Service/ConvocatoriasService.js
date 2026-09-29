import { API_BASE_URL } from "../../config.js";
import { compararCitas } from "../../ordenCitas.js";
const CLAVE_DATOS_SESION = "visitasITR.sesionPadre";
const MARCADOR_SOLICITUD_PADRE = "[SOLICITUD_PADRE]";
const LIMITE_OBSERVACIONES = 300;

// Uso estos textos para saber cuál de los dos mandó la última propuesta.
const PROPUESTA_ENCARGADO = "Encargado propone otra fecha:";
const PROPUESTA_DOCENTE = "Docente propone otra fecha:";

async function solicitarApi(ruta, opciones = {}) {
  const configuracion = {
    credentials: "include",
    ...opciones,
    headers: {
      Accept: "application/json",
      ...(opciones.body ? { "Content-Type": "application/json" } : {}),
      ...opciones.headers
    }
  };

  let respuesta;

  try {
    respuesta = await fetch(`${API_BASE_URL}${ruta}`, configuracion);
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
      contenido?.message ||
      contenido?.detail ||
      contenido?.error ||
      `La API respondió con el estado ${respuesta.status}.`
    );
  }

  return contenido && Object.prototype.hasOwnProperty.call(contenido, "data")
    ? contenido.data
    : contenido;
}

export function obtenerSesionPadre() {
  let sesion;

  try {
    sesion = JSON.parse(localStorage.getItem(CLAVE_DATOS_SESION) || "null");
  } catch (error) {
    sesion = null;
  }

  const idsEstudiante = (sesion?.idsEstudiante || [])
    .map(id => Number(id))
    .filter(id => Number.isInteger(id) && id > 0);

  if (!sesion || idsEstudiante.length === 0) {
    throw new Error("La sesión no es válida. Vuelva a iniciar sesión.");
  }

  return {
    ...sesion,
    idsEstudiante: [...new Set(idsEstudiante)]
  };
}

export async function obtenerRelacionesSesion(sesion) {
  const relaciones = await solicitarApi("/estudiante-encargados");

  return (Array.isArray(relaciones) ? relaciones : [])
    .filter(relacion => sesion.idsEstudiante.includes(Number(relacion.idEstudiante)));
}

function separarFechaHora(fechaReunion) {
  if (!fechaReunion) {
    return { fecha: "", hora: "" };
  }

  const [fecha = "", horaCompleta = ""] = String(fechaReunion).split("T");

  return { fecha, hora: horaCompleta.slice(0, 5) };
}

function normalizarEstado(estado) {
  const estados = {
    PENDIENTE: "pendiente",
    ACEPTADA: "aceptada",
    POSPUESTA: "pospuesta",
    RECHAZADA: "rechazada",
    CANCELADA: "cancelada",
    FINALIZADA: "finalizada"
  };

  return estados[estado] || estado?.toLowerCase() || "pendiente";
}

export function convertirConvocatoria(cita) {
  const fechaHora = separarFechaHora(cita.citFechaReunion);

  return {
    idCita: Number(cita.idCita),
    idDocente: Number(cita.idDocente),
    idEstudianteEncargado: Number(cita.idEstudianteEncargado),
    asunto: cita.citMotivo || "Sin asunto",
    descripcion: cita.citObservaciones || "Sin descripción.",
    fecha: fechaHora.fecha,
    hora: fechaHora.hora,
    fechaReunion: cita.citFechaReunion,
    estudianteNombre: cita.nombreEstudiante || "Estudiante no disponible",
    docenteNombre: cita.nombreDocente || "Docente no disponible",
    estado: normalizarEstado(cita.citEstado),
    estadoApi: cita.citEstado,
    // Para saber a quién le toca contestar.
    propuestaDe: quienPropuso(cita.citObservaciones),
    motivoPropuesta: motivoDeLaPropuesta(cita.citObservaciones)
  };
}

// Me dice quién propuso la fecha: el encargado, el docente, o nadie.
function quienPropuso(observaciones) {
  const texto = String(observaciones || "");

  if (texto.includes(PROPUESTA_ENCARGADO)) {
    return "ENCARGADO";
  }

  if (texto.includes(PROPUESTA_DOCENTE)) {
    return "DOCENTE";
  }

  return "";
}

// Me quedo solo con el motivo y le quito el texto de quién propuso.
function motivoDeLaPropuesta(observaciones) {
  const texto = String(observaciones || "");
  const marcador = texto.includes(PROPUESTA_ENCARGADO)
    ? PROPUESTA_ENCARGADO
    : texto.includes(PROPUESTA_DOCENTE) ? PROPUESTA_DOCENTE : "";

  if (!marcador) {
    return "";
  }

  return texto.slice(texto.indexOf(marcador) + marcador.length).trim();
}

export async function obtenerConvocatoriasPadre() {
  const sesion = obtenerSesionPadre();

  const [relaciones, citas] = await Promise.all([
    obtenerRelacionesSesion(sesion),
    solicitarApi("/citas-reuniones")
  ]);

  const idsRelacion = new Set(
    relaciones.map(relacion => Number(relacion.idEstudianteEncargado))
  );

  if (idsRelacion.size === 0) {
    return [];
  }

  return (Array.isArray(citas) ? citas : [])
    // Solo las que creó el docente: las del encargado llevan marcador.
    .filter(cita => !cita.citObservaciones?.startsWith(MARCADOR_SOLICITUD_PADRE))
    .filter(cita => idsRelacion.has(Number(cita.idEstudianteEncargado)))
    .map(convertirConvocatoria)
    .sort((primera, segunda) => compararCitas(primera, segunda, true));
}


export async function aceptarConvocatoria(idCita) {
  const citaActualizada = await solicitarApi(
    `/citas-reuniones/${encodeURIComponent(idCita)}`,
    {
      method: "PATCH",
      body: JSON.stringify({ citEstado: "ACEPTADA" })
    }
  );

  return convertirConvocatoria(citaActualizada);
}

export async function rechazarConvocatoria(idCita, motivo) {
  const cuerpo = { citEstado: "RECHAZADA" };

  if (motivo && motivo.trim()) {
    cuerpo.citObservaciones = `Encargado: ${motivo.trim()}`.slice(0, LIMITE_OBSERVACIONES);
  }

  const citaActualizada = await solicitarApi(
    `/citas-reuniones/${encodeURIComponent(idCita)}`,
    { method: "PATCH", body: JSON.stringify(cuerpo) }
  );

  return convertirConvocatoria(citaActualizada);
}

export async function posponerConvocatoria(idCita, nuevaFecha, nuevaHora, motivoReprogramacion) {
  if (!nuevaFecha || !nuevaHora) {
    throw new Error("Debe indicar la nueva fecha y hora.");
  }

  // Pido el motivo sí o sí, porque es lo que el docente lee para decidir.
  if (!motivoReprogramacion || !motivoReprogramacion.trim()) {
    throw new Error("Debe explicar por qué no puede asistir.");
  }

  const cuerpo = {
    citEstado: "POSPUESTA",
    citFechaReunion: `${nuevaFecha}T${nuevaHora}:00`,
    citObservaciones:
      `${PROPUESTA_ENCARGADO} ${motivoReprogramacion.trim()}`.slice(0, LIMITE_OBSERVACIONES)
  };

  const citaActualizada = await solicitarApi(
    `/citas-reuniones/${encodeURIComponent(idCita)}`,
    { method: "PATCH", body: JSON.stringify(cuerpo) }
  );

  return convertirConvocatoria(citaActualizada);
}

export { MARCADOR_SOLICITUD_PADRE, solicitarApi };
