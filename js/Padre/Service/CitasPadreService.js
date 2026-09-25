import { compararCitas } from "../../ordenCitas.js";
import {
  solicitarApi,
  obtenerSesionPadre,
  obtenerRelacionesSesion,
  MARCADOR_SOLICITUD_PADRE
} from "./ConvocatoriasService.js";

const nombresEstado = {
  PENDIENTE: "Pendiente",
  ACEPTADA: "Aceptada",
  POSPUESTA: "Pospuesta",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
  FINALIZADA: "Finalizada"
};

export async function obtenerAgendaPadre() {
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
    .filter(cita => idsRelacion.has(Number(cita.idEstudianteEncargado)))
    .map(convertirCita)
    // Las más próximas primero: es lo que el encargado necesita ver.
    .sort((primera, segunda) => compararCitas(primera, segunda, false));
}


export async function obtenerProximasCitas() {
  const agenda = await obtenerAgendaPadre();
  const ahora = new Date().toISOString().slice(0, 19);

  return agenda.filter(cita =>
    cita.fechaReunion >= ahora &&
    !["RECHAZADA", "CANCELADA", "FINALIZADA"].includes(cita.estadoApi)
  );
}

function convertirCita(cita) {
  const [fecha = "", horaCompleta = ""] = String(cita.citFechaReunion || "").split("T");
  const hora = horaCompleta.slice(0, 5);

  const esSolicitud = cita.citObservaciones?.startsWith(MARCADOR_SOLICITUD_PADRE);

  return {
    idCita: Number(cita.idCita),
    idDocente: Number(cita.idDocente),
    idEstudianteEncargado: Number(cita.idEstudianteEncargado),

    docente: cita.nombreDocente || "Docente no disponible",
    estudiante: cita.nombreEstudiante || "Estudiante no disponible",

    asunto: cita.citMotivo || "Sin asunto",
    descripcion: limpiarMarcador(cita.citObservaciones),

    fecha,
    hora,
    fechaReunion: cita.citFechaReunion,
    fechaTexto: formatearFecha(fecha),
    horaTexto: formatearHora(hora),

    estado: nombresEstado[cita.citEstado] || cita.citEstado,
    estadoApi: cita.citEstado,

    // "solicitud" la envió el encargado; "convocatoria" la creó el docente.
    origen: esSolicitud ? "solicitud" : "convocatoria",
    origenTexto: esSolicitud ? "Solicitada por usted" : "Convocada por el docente"
  };
}

function limpiarMarcador(observaciones) {
  if (!observaciones) {
    return "Sin descripción.";
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