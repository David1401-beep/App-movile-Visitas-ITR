import { compararCitas } from "../../ordenCitas.js";
import {
  solicitarApi,
  obtenerSesionPadre,
  obtenerRelacionesSesion,
  MARCADOR_SOLICITUD_PADRE
} from "./ConvocatoriasService.js";

const LIMITE_MOTIVO = 250;
const LIMITE_OBSERVACIONES = 300;

// Con este texto marco la propuesta del encargado, así sé que le toca
// contestar al docente.
const PROPUESTA_ENCARGADO = "Encargado propone otra fecha:";

let solicitudesEnMemoria = [];

const nombresEstado = {
  PENDIENTE: "Pendiente",
  ACEPTADA: "Aceptada",
  POSPUESTA: "Pospuesta",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
  FINALIZADA: "Finalizada"
};

export async function obtenerMisSolicitudes() {
  const sesion = obtenerSesionPadre();

  const [relaciones, citas] = await Promise.all([
    obtenerRelacionesSesion(sesion),
    solicitarApi("/citas-reuniones")
  ]);

  const idsRelacion = new Set(
    relaciones.map(relacion => Number(relacion.idEstudianteEncargado))
  );

  solicitudesEnMemoria = (Array.isArray(citas) ? citas : [])
    // Solo las que envió el encargado: llevan el marcador.
    .filter(cita => cita.citObservaciones?.startsWith(MARCADOR_SOLICITUD_PADRE))
    .filter(cita => idsRelacion.has(Number(cita.idEstudianteEncargado)))
    .map(convertirSolicitud)
    .sort((primera, segunda) => compararCitas(primera, segunda, true));

  return solicitudesEnMemoria;
}

export async function actualizarSolicitud(idCita, datos) {
  const solicitud = solicitudesEnMemoria.find(
    registro => Number(registro.idCita) === Number(idCita)
  );

  if (!solicitud) {
    throw new Error("No se encontró la solicitud que intenta modificar.");
  }

  if (solicitud.estadoApi !== "PENDIENTE") {
    throw new Error(
      `Esta solicitud ya fue ${nombresEstado[solicitud.estadoApi]?.toLowerCase() || "respondida"} ` +
      "por el docente y ya no puede modificarse."
    );
  }

  const motivo = (datos.motivo ?? solicitud.motivo).trim();

  if (!motivo) {
    throw new Error("Debe indicar el motivo de la visita.");
  }

  const fecha = datos.fecha || solicitud.fecha;
  const hora = datos.hora || solicitud.hora || "08:00";

  const citaActualizada = await solicitarApi(`/citas-reuniones/${idCita}`, {
    method: "PUT",
    body: JSON.stringify({
      idDocente: Number(datos.idDocente ?? solicitud.idDocente),
      idEstudianteEncargado: Number(solicitud.idEstudianteEncargado),
      citMotivo: motivo.slice(0, LIMITE_MOTIVO),
      citEstado: "PENDIENTE",
      citObservaciones: `${MARCADOR_SOLICITUD_PADRE} ${motivo}`.slice(0, LIMITE_OBSERVACIONES),
      citFechaReunion: `${fecha}T${hora}:00`
    })
  });

  return reemplazarEnMemoria(citaActualizada);
}

export async function aceptarSolicitud(idCita) {
  const solicitud = solicitudesEnMemoria.find(
    registro => Number(registro.idCita) === Number(idCita)
  );

  if (!solicitud) {
    throw new Error("No se encontró la solicitud.");
  }

  if (solicitud.estadoApi !== "POSPUESTA") {
    throw new Error("Esta solicitud no tiene una propuesta de reprogramación pendiente.");
  }

  const citaActualizada = await solicitarApi(`/citas-reuniones/${idCita}`, {
    method: "PATCH",
    body: JSON.stringify({ citEstado: "ACEPTADA" })
  });

  return reemplazarEnMemoria(citaActualizada);
}

export async function posponerSolicitud(idCita, fecha, hora, justificacion) {
  const solicitud = solicitudesEnMemoria.find(
    registro => Number(registro.idCita) === Number(idCita)
  );

  if (!solicitud) {
    throw new Error("No se encontró la solicitud.");
  }

  if (solicitud.estadoApi !== "POSPUESTA") {
    throw new Error("Esta solicitud no tiene una propuesta de reprogramación pendiente.");
  }

  if (!fecha || !hora) {
    throw new Error("Debe indicar la nueva fecha y hora.");
  }

  const motivo = (justificacion || "").trim();

  if (!motivo) {
    throw new Error("Debe indicar el motivo de la reprogramación.");
  }

  // La dejo en PENDIENTE porque ahora le toca al docente contestar.
  const cuerpo = {
    citEstado: "PENDIENTE",
    citFechaReunion: `${fecha}T${hora}:00`,
    citObservaciones:
      `${MARCADOR_SOLICITUD_PADRE} ${PROPUESTA_ENCARGADO} ${motivo}`
        .slice(0, LIMITE_OBSERVACIONES)
  };

  const citaActualizada = await solicitarApi(`/citas-reuniones/${idCita}`, {
    method: "PATCH",
    body: JSON.stringify(cuerpo)
  });

  return reemplazarEnMemoria(citaActualizada);
}

export async function eliminarSolicitud(idCita) {
  const solicitud = solicitudesEnMemoria.find(
    registro => Number(registro.idCita) === Number(idCita)
  );

  if (solicitud && solicitud.estadoApi !== "PENDIENTE") {
    throw new Error(
      "Esta solicitud ya fue respondida por el docente y ya no puede eliminarse."
    );
  }

  await solicitarApi(`/citas-reuniones/${idCita}`, { method: "DELETE" });

  solicitudesEnMemoria = solicitudesEnMemoria.filter(
    registro => Number(registro.idCita) !== Number(idCita)
  );

  return true;
}

export async function obtenerDocentes() {
  const docentes = await solicitarApi("/docentes");

  return (Array.isArray(docentes) ? docentes : []).map(docente => ({
    idDocente: Number(docente.idDocente),
    nombre: `${docente.docNombre || ""} ${docente.docApellido || ""}`.trim()
  }));
}


// Conversión y formato
function reemplazarEnMemoria(cita) {
  const convertida = convertirSolicitud(cita);
  const indice = solicitudesEnMemoria.findIndex(
    registro => Number(registro.idCita) === convertida.idCita
  );

  if (indice >= 0) {
    solicitudesEnMemoria[indice] = convertida;
  }

  return convertida;
}

function convertirSolicitud(cita) {
  const [fecha = "", horaCompleta = ""] = String(cita.citFechaReunion || "").split("T");

  return {
    idCita: Number(cita.idCita),
    idDocente: Number(cita.idDocente),
    idEstudianteEncargado: Number(cita.idEstudianteEncargado),

    docente: cita.nombreDocente || "Docente no disponible",
    estudiante: cita.nombreEstudiante || "Estudiante no disponible",
    encargado: cita.nombreEncargado || "Encargado",

    // Se retira el marcador para que el encargado lea su propio texto.
    motivo: limpiarMarcador(cita.citObservaciones) || cita.citMotivo || "",
    asunto: cita.citMotivo || "",

    fecha,
    hora: horaCompleta.slice(0, 5),
    fechaReunion: cita.citFechaReunion,
    fechaTexto: formatearFecha(fecha),
    horaTexto: formatearHora(horaCompleta.slice(0, 5)),

    estado: nombresEstado[cita.citEstado] || cita.citEstado,
    estadoApi: cita.citEstado,

    // Ya mandó su propuesta, ahora espera al docente.
    esperandoDocente: esperaAlDocente(cita),

    // Solo puede editarla mientras el docente no la haya tocado.
    editable: cita.citEstado === "PENDIENTE" && !esperaAlDocente(cita)
  };
}

function esperaAlDocente(cita) {
  return cita.citEstado === "PENDIENTE" &&
    String(cita.citObservaciones || "").includes(PROPUESTA_ENCARGADO);
}

function limpiarMarcador(observaciones) {
  if (!observaciones) {
    return "";
  }

  return observaciones.startsWith(MARCADOR_SOLICITUD_PADRE)
    ? observaciones.slice(MARCADOR_SOLICITUD_PADRE.length).trim()
    : observaciones;
}

export function formatearFecha(fecha) {
  if (!fecha) {
    return "Sin fecha";
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);

  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];

  return `${dia} de ${meses[mes - 1]} de ${anio}`;
}

export function formatearHora(hora) {
  if (!hora) {
    return "";
  }

  const [horasTexto, minutos] = hora.split(":");
  let horas = Number(horasTexto);
  const periodo = horas >= 12 ? "P.M" : "A.M";

  horas = horas % 12 || 12;

  return `${horas}:${minutos} ${periodo}`;
}