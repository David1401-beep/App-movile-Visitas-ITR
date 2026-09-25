import { compararCitas } from "../../ordenCitas.js";
import { solicitarApi, obtenerDocenteActivo } from "./CrearCitaService.js";

const MARCADOR_SOLICITUD_PADRE = "[SOLICITUD_PADRE]";
const LIMITE_OBSERVACIONES = 300;

// Con estos textos sé quién mandó la última propuesta.
const PROPUESTA_ENCARGADO = "Encargado propone otra fecha:";
const PROPUESTA_DOCENTE = "Docente propone otra fecha:";

function separarFechaHora(fechaReunion) {
  const [fecha = "", horaCompleta = ""] = String(fechaReunion || "").split("T");
  return { fecha, hora: horaCompleta.slice(0, 5) };
}

export async function obtenerSolicitudesDocente() {
  const docente = await obtenerDocenteActivo();

  const citas = await solicitarApi(
    `/citas-reuniones/por-docente/${encodeURIComponent(docente.idDocente)}`
  );

  return (Array.isArray(citas) ? citas : [])
    .filter(cita =>
      // PENDIENTE: solicitud nueva. POSPUESTA: el encargado propuso otra
      // fecha y el docente debe aceptarla o volver a reprogramar.
      ["PENDIENTE", "POSPUESTA"].includes(cita.citEstado) &&
      cita.citObservaciones?.startsWith(MARCADOR_SOLICITUD_PADRE)
    )
    .map(convertirSolicitud)
    // Las más próximas primero: son las que el docente debe atender antes.
    .sort((primera, segunda) => compararCitas(primera, segunda, false));
}

export async function obtenerHistorialSolicitudes() {
  const docente = await obtenerDocenteActivo();

  const citas = await solicitarApi(
    `/citas-reuniones/por-docente/${encodeURIComponent(docente.idDocente)}`
  );

  return (Array.isArray(citas) ? citas : [])
    .filter(cita => cita.citObservaciones?.startsWith(MARCADOR_SOLICITUD_PADRE))
    .map(convertirSolicitud)
    .sort((primera, segunda) => compararCitas(primera, segunda, false));
}

export async function obtenerSolicitudPorId(idCita) {
  const cita = await solicitarApi(`/citas-reuniones/${encodeURIComponent(idCita)}`);
  return convertirSolicitud(cita);
}

export async function aceptarSolicitud(idCita) {
  const cita = await solicitarApi(`/citas-reuniones/${encodeURIComponent(idCita)}`, {
    method: "PATCH",
    body: JSON.stringify({ citEstado: "ACEPTADA" })
  });

  return convertirSolicitud(cita);
}

export async function rechazarSolicitud(idCita, motivo) {
  const cuerpo = { citEstado: "RECHAZADA" };

  if (motivo && motivo.trim()) {
    cuerpo.citObservaciones =
      `${MARCADOR_SOLICITUD_PADRE} ${motivo.trim()}`.slice(0, LIMITE_OBSERVACIONES);
  }

  const cita = await solicitarApi(`/citas-reuniones/${encodeURIComponent(idCita)}`, {
    method: "PATCH",
    body: JSON.stringify(cuerpo)
  });

  return convertirSolicitud(cita);
}

export async function posponerSolicitud(idCita, fecha, hora, justificacion) {
  if (!fecha || !hora) {
    throw new Error("Debe indicar la nueva fecha y hora.");
  }

  const motivo = (justificacion || "").trim();

  if (!motivo) {
    throw new Error("Debe explicar por qué propone otra fecha.");
  }

  // Piso el texto anterior. Si no, queda el del encargado y su propuesta
  // se sigue viendo como si fuera la de ahora.
  const cuerpo = {
    citEstado: "POSPUESTA",
    citFechaReunion: `${fecha}T${hora}:00`,
    citObservaciones:
      `${MARCADOR_SOLICITUD_PADRE} ${PROPUESTA_DOCENTE} ${motivo}`
        .slice(0, LIMITE_OBSERVACIONES)
  };

  const cita = await solicitarApi(`/citas-reuniones/${encodeURIComponent(idCita)}`, {
    method: "PATCH",
    body: JSON.stringify(cuerpo)
  });

  return convertirSolicitud(cita);
}


// Conversión
const nombresEstado = {
  PENDIENTE: "Pendiente",
  ACEPTADA: "Aceptada",
  POSPUESTA: "Pospuesta",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
  FINALIZADA: "Finalizada"
};

function convertirSolicitud(cita) {
  const fechaHora = separarFechaHora(cita.citFechaReunion);

  return {
    idCita: Number(cita.idCita),
    idDocente: Number(cita.idDocente),
    idEstudianteEncargado: Number(cita.idEstudianteEncargado),

    nombreEncargado: cita.nombreEncargado || "Encargado no disponible",
    nombreEstudiante: cita.nombreEstudiante || "Estudiante no disponible",

    motivo: cita.citMotivo || "Sin motivo",

    descripcion: quitarMarcador(cita.citObservaciones) || cita.citMotivo || "",

    fecha: fechaHora.fecha,
    hora: fechaHora.hora,
    fechaReunion: cita.citFechaReunion,
    fechaTexto: formatearFecha(fechaHora.fecha),
    horaTexto: formatearHora(fechaHora.hora),

    estado: nombresEstado[cita.citEstado] || cita.citEstado,
    estadoApi: cita.citEstado,

    // El encargado mandó otra fecha y falta que el docente conteste.
    esPropuesta: String(cita.citObservaciones || "").includes(PROPUESTA_ENCARGADO),
    motivoPropuesta: motivoDeLaPropuesta(cita.citObservaciones)
  };
}

// Me quedo solo con el motivo y le quito el texto de quién propuso.
function motivoDeLaPropuesta(observaciones) {
  const texto = String(observaciones || "");
  const posicion = texto.indexOf(PROPUESTA_ENCARGADO);

  if (posicion < 0) {
    return "";
  }

  return texto.slice(posicion + PROPUESTA_ENCARGADO.length).trim();
}

function quitarMarcador(observaciones) {
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

export { MARCADOR_SOLICITUD_PADRE };