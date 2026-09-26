import { solicitarApi, obtenerDocenteActivo } from "./CrearCitaService.js";

const MARCADOR_SOLICITUD_PADRE = "[SOLICITUD_PADRE]";

export async function obtenerPendientes() {
  const docente = await obtenerDocenteActivo();

  const citas = await solicitarApi(
    `/citas-reuniones/por-docente/${encodeURIComponent(docente.idDocente)}`
  );

  const lista = (Array.isArray(citas) ? citas : []).map(convertirCita);
  const hoy = fechaDeHoy();
  const ahora = new Date().toISOString().slice(0, 19);

  const grupos = [];

  const solicitudes = lista.filter(cita =>
    cita.esSolicitud && ["PENDIENTE", "POSPUESTA"].includes(cita.estadoApi)
  );

  if (solicitudes.length > 0) {
    grupos.push({
      id: "solicitudes",
      titulo: "Revisar solicitudes de cita",
      icono: "bi-inbox-fill",
      color: "text-warning",
      enlace: "verSolicitud-docente.html",
      textoEnlace: "Revisar",
      items: solicitudes
    });
  }

  const sinRespuesta = lista.filter(cita =>
    !cita.esSolicitud &&
    cita.estadoApi === "PENDIENTE" &&
    cita.fechaReunion >= ahora
  );

  if (sinRespuesta.length > 0) {
    grupos.push({
      id: "sin-respuesta",
      titulo: "Convocatorias sin respuesta",
      icono: "bi-hourglass-split",
      color: "text-info",
      enlace: "agenda-docente.html",
      textoEnlace: "Ver",
      items: sinRespuesta
    });
  }

  const deHoy = lista.filter(cita =>
    cita.fecha === hoy &&
    cita.fechaReunion >= ahora &&
    ["PENDIENTE", "ACEPTADA", "POSPUESTA"].includes(cita.estadoApi)
  );

  if (deHoy.length > 0) {
    grupos.push({
      id: "hoy",
      titulo: "Reuniones de hoy",
      icono: "bi-calendar-check-fill",
      color: "text-success",
      enlace: "agenda-docente.html",
      textoEnlace: "Ver",
      items: deHoy
    });
  }

  const vencidas = lista.filter(cita =>
    cita.fechaReunion < ahora &&
    ["PENDIENTE", "ACEPTADA", "POSPUESTA"].includes(cita.estadoApi)
  );

  if (vencidas.length > 0) {
    grupos.push({
      id: "vencidas",
      titulo: "Citas sin cerrar",
      icono: "bi-exclamation-triangle-fill",
      color: "text-danger",
      enlace: "agenda-docente.html",
      textoEnlace: "Ver",
      items: vencidas
    });
  }

  return {
    grupos,
    total: grupos.reduce((suma, grupo) => suma + grupo.items.length, 0),
    nombreDocente: `${docente.docNombre || ""} ${docente.docApellido || ""}`.trim()
  };
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

function convertirCita(cita) {
  const [fecha = "", horaCompleta = ""] = String(cita.citFechaReunion || "").split("T");
  const hora = horaCompleta.slice(0, 5);

  return {
    idCita: Number(cita.idCita),
    fecha,
    hora,
    fechaReunion: cita.citFechaReunion,
    fechaTexto: formatearFechaCorta(fecha),
    horaTexto: formatearHora(hora),
    asunto: cita.citMotivo || "Sin asunto",
    estudiante: cita.nombreEstudiante || "Estudiante no disponible",
    encargado: cita.nombreEncargado || "Encargado",
    estado: nombresEstado[cita.citEstado] || cita.citEstado,
    estadoApi: cita.citEstado,
    esSolicitud: Boolean(cita.citObservaciones?.startsWith(MARCADOR_SOLICITUD_PADRE))
  };
}

function fechaDeHoy() {
  const hoy = new Date();

  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

export function formatearFechaCorta(fecha) {
  if (!fecha) {
    return "Sin fecha";
  }

  const [, mes, dia] = fecha.split("-").map(Number);

  const meses = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic"
  ];

  return `${dia} ${meses[mes - 1]}`;
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