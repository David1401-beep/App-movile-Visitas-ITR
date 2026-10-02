import { obtenerAgendaPadre } from "../Service/CitasPadreService.js";

const listaCitas = document.getElementById("lista-comunicados-padre");

document.addEventListener("DOMContentLoaded", cargarAgenda);

document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    cargarAgenda();
  }
});

async function cargarAgenda() {
  if (!listaCitas) {
    return;
  }

  try {
    const agenda = await obtenerAgendaPadre();

    if (agenda.length === 0) {
      mostrarMensaje(
        "No tiene citas registradas. Use el botón Crear Solicitud para pedir una reunión."
      );
      return;
    }

    listaCitas.innerHTML = agenda.map(construirTarjeta).join("");
  } catch (error) {
    console.error("No fue posible cargar la agenda de citas.", error);
    mostrarMensaje(error.message, true);
  }
}

function construirTarjeta(cita) {
  return `
    <article class="appointments-card card border-0 ${claseTarjeta(cita.estadoApi)}" id="cita-${cita.idCita}">
      <div class="card-body">

        <div class="d-flex justify-content-between align-items-start gap-2">
          <h2 class="appointments-card-title fw-bold mb-0">
            ${escaparHtml(cita.asunto)}
          </h2>
          <span class="badge ${claseEstado(cita.estadoApi)}">
            ${escaparHtml(cita.estado)}
          </span>
        </div>

        <p class="appointments-location mb-0">
          <i class="bi bi-person-badge appointment-pin" aria-hidden="true"></i>
          <strong>Docente:</strong> ${escaparHtml(cita.docente)}
        </p>

        <p class="appointments-location mb-0">
          <i class="bi bi-mortarboard appointment-pin" aria-hidden="true"></i>
          <strong>Estudiante:</strong> ${escaparHtml(cita.estudiante)}
        </p>

        <p class="appointments-date mb-0">
          <time datetime="${escaparHtml(cita.fechaReunion || "")}">
            ${escaparHtml(cita.fechaTexto)} - ${escaparHtml(cita.horaTexto)}
          </time>
        </p>

        <p class="appointments-location mb-0">
          <small class="text-secondary">${escaparHtml(cita.origenTexto)}</small>
        </p>

      </div>
    </article>
  `;
}

function claseEstado(estadoApi) {
  const clases = {
    PENDIENTE: "bg-warning text-dark",
    ACEPTADA: "bg-success",
    POSPUESTA: "bg-info text-dark",
    RECHAZADA: "bg-danger",
    CANCELADA: "bg-secondary",
    FINALIZADA: "bg-dark"
  };

  return clases[estadoApi] || "bg-secondary";
}

// Pinta la tarjeta completa segun el estado, como en convocatorias.
function claseTarjeta(estadoApi) {
  const clases = {
    PENDIENTE: "es-pendiente",
    ACEPTADA: "es-aceptada",
    POSPUESTA: "es-pospuesta",
    RECHAZADA: "es-rechazada",
    CANCELADA: "es-cancelada",
    FINALIZADA: "es-finalizada"
  };

  return clases[estadoApi] || "";
}

function mostrarMensaje(texto, esError = false) {
  listaCitas.innerHTML = `
    <p class="text-center ${esError ? "text-danger" : "text-secondary"} mb-0">
      ${escaparHtml(texto)}
    </p>
  `;
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}