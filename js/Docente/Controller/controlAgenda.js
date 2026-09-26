import { obtenerResumenAgenda, obtenerAgendaDocente } from "../Service/agendaService.js";
import { eliminarCitaDocente } from "../Service/CrearCitaService.js";

const resumenAgenda = document.getElementById("resumen-agenda");
const listaAgenda = document.getElementById("lista-agenda");

const CONTADORES = [
  { clave: "hoy", etiqueta: "Hoy" },
  { clave: "semana", etiqueta: "Esta semana" },
  { clave: "solicitudes", etiqueta: "Solicitudes" }
];

const CLASES_ESTADO = {
  PENDIENTE: "bg-warning text-dark",
  ACEPTADA: "bg-success",
  POSPUESTA: "bg-info text-dark",
  RECHAZADA: "bg-danger",
  CANCELADA: "bg-secondary",
  FINALIZADA: "bg-dark"
};

// Crea un modal compatible: usa Bootstrap cuando está disponible y una alternativa local si el CDN falla.
function createCompatibleModal(modalElement) {
  if (window.bootstrap?.Modal) {
    return window.bootstrap.Modal.getOrCreateInstance(modalElement);
  }

  const backdropId = `fallback-backdrop-${modalElement.id}`;

  const hide = () => {
    modalElement.classList.remove('show');
    modalElement.style.display = 'none';
    modalElement.setAttribute('aria-hidden', 'true');
    modalElement.removeAttribute('aria-modal');
    document.getElementById(backdropId)?.remove();
    document.body.classList.remove('modal-open');
    modalElement.dispatchEvent(new Event('hidden.bs.modal'));
  };

  modalElement.querySelectorAll('[data-bs-dismiss="modal"]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      hide();
    });
  });

  return {
    show() {
      if (!document.getElementById(backdropId)) {
        const backdrop = document.createElement('div');
        backdrop.id = backdropId;
        backdrop.className = 'modal-backdrop fade show';
        backdrop.addEventListener('click', hide);
        document.body.appendChild(backdrop);
      }

      modalElement.style.display = 'block';
      modalElement.classList.add('show');
      modalElement.removeAttribute('aria-hidden');
      modalElement.setAttribute('aria-modal', 'true');
      document.body.classList.add('modal-open');
      modalElement.querySelector('button, textarea, input, select, a')?.focus();
    },
    hide
  };
}

const modalConfirmarEl = document.getElementById("modal-confirmar-cancelacion");
const modalExitoEl = document.getElementById("modal-exito-cancelacion");
const btnConfirmarCancelacion = document.getElementById("btn-confirmar-cancelacion");

const modalConfirmar = modalConfirmarEl ? createCompatibleModal(modalConfirmarEl) : null;
const modalExito = modalExitoEl ? createCompatibleModal(modalExitoEl) : null;

let citaSeleccionada = null;

document.addEventListener("DOMContentLoaded", cargarAgenda);

document.addEventListener("visibilitychange", function () {
  if (!document.hidden) {
    cargarAgenda();
  }
});

async function cargarAgenda() {
  await Promise.all([cargarResumen(), cargarLista()]);
}

async function cargarResumen() {
  if (!resumenAgenda) {
    return;
  }

  try {
    const resumen = await obtenerResumenAgenda();

    resumenAgenda.innerHTML = CONTADORES
      .map(contador => construirContador(contador, resumen[contador.clave]))
      .join("");
  } catch (error) {
    console.error("No fue posible cargar el resumen de la agenda.", error);

    resumenAgenda.innerHTML =
      '<p class="agenda-resumen-error">No fue posible cargar su agenda.</p>';
  }
}

async function cargarLista() {
  if (!listaAgenda) {
    return;
  }

  try {
    const dias = await obtenerAgendaDocente();

    if (dias.length === 0) {
      listaAgenda.innerHTML =
        '<p class="text-center text-secondary py-4" id="mensaje-agenda-vacia">No tiene citas próximas.</p>';
      return;
    }

    listaAgenda.innerHTML = dias.map(construirTarjetaDia).join("");
  } catch (error) {
    console.error("No fue posible cargar las citas de la agenda.", error);
    listaAgenda.innerHTML =
      '<p class="text-center text-danger py-4" id="mensaje-agenda-error">No fue posible cargar sus citas.</p>';
  }
}

function construirTarjetaDia(dia) {
  return `
    <article class="agenda-card card" id="agenda-dia-${escaparHtml(dia.fecha)}">
      <div class="card-body">
        <p class="agenda-date fw-bold mb-2">${escaparHtml(dia.fechaTexto)}${dia.esHoy ? " · Hoy" : ""}</p>
        ${dia.citas.map(cita => construirEvento(cita, dia.fechaTexto)).join("")}
      </div>
    </article>
  `;
}

function construirEvento(cita, fechaTexto) {
  const claseEstado = CLASES_ESTADO[cita.estadoApi] || "bg-secondary";
  const conQuien = cita.esSolicitud
    ? `Solicitud de ${escaparHtml(cita.encargado)}`
    : `Convocatoria a ${escaparHtml(cita.encargado)}`;

  const acciones = cita.editable
    ? `
      <div class="d-flex gap-2 mt-2" id="acciones-evento-${cita.idCita}">
        <a class="btn btn-solicitud btn-editar btn-sm fw-semibold" href="crearSolicitud-docente.html?${enlaceEdicion(cita)}">
          <i class="bi bi-pencil-fill" aria-hidden="true"></i> Editar
        </a>
        <button type="button" class="btn btn-solicitud btn-cancelar btn-sm fw-semibold btn-cancelar-cita"
                data-id="${cita.idCita}" data-asunto="${escaparHtml(cita.asunto)}"
                data-fecha="${escaparHtml(`${fechaTexto} a las ${cita.horaTexto}`)}">
          <i class="bi bi-trash-fill" aria-hidden="true"></i> Cancelar
        </button>
      </div>
    `
    : "";

  return `
    <div class="agenda-event" id="evento-${cita.idCita}">
      <div class="d-flex justify-content-between align-items-start gap-2">
        <div>
          <strong>${escaparHtml(cita.horaTexto)}</strong> — ${escaparHtml(cita.asunto)}
          <div class="text-secondary small">${conQuien}</div>
        </div>
        <span class="badge ${claseEstado}">${escaparHtml(cita.estado)}</span>
      </div>
      ${acciones}
    </div>
  `;
}

function enlaceEdicion(cita) {
  const parametros = new URLSearchParams({
    mode: "edit",
    solicitud: String(cita.idCita),
    asunto: cita.asunto,
    fecha: cita.fecha,
    hora: cita.hora,
    descripcion: cita.descripcion,
    idEstudianteEncargado: String(cita.idEstudianteEncargado)
  });

  return parametros.toString();
}

// Acciones de cancelación
if (listaAgenda) {
  listaAgenda.addEventListener("click", function (evento) {
    const boton = evento.target.closest(".btn-cancelar-cita");

    if (!boton) {
      return;
    }

    citaSeleccionada = {
      idCita: boton.dataset.id,
      asunto: boton.dataset.asunto,
      fecha: boton.dataset.fecha
    };

    escribirTexto("modal-cancelacion-asunto", `<strong>Asunto:</strong> ${escaparHtml(citaSeleccionada.asunto)}`);
    escribirTexto("modal-cancelacion-fecha", `<strong>Fecha:</strong> ${escaparHtml(citaSeleccionada.fecha)}`);

    modalConfirmar?.show();
  });
}

btnConfirmarCancelacion?.addEventListener("click", async function () {
  if (!citaSeleccionada) {
    return;
  }

  btnConfirmarCancelacion.disabled = true;

  try {
    await eliminarCitaDocente(citaSeleccionada.idCita);

    modalConfirmar?.hide();
    modalExito?.show();

    await cargarAgenda();
  } catch (error) {
    modalConfirmar?.hide();

    if (window.Swal) {
      Swal.fire({ icon: "error", title: "Ocurrió un problema", text: error.message });
    } else {
      alert(error.message);
    }
  } finally {
    btnConfirmarCancelacion.disabled = false;
    citaSeleccionada = null;
  }
});

// Apoyo
function construirContador(contador, cantidad) {
  const valor = Number(cantidad) || 0;
  const claseNumero = valor > 0
    ? "agenda-contador-numero"
    : "agenda-contador-numero vacio";

  return `
    <div class="agenda-contador" id="contador-${contador.clave}">
      <span class="${claseNumero}">${valor}</span>
      <span class="agenda-contador-etiqueta">${escaparHtml(contador.etiqueta)}</span>
    </div>
  `;
}

function escribirTexto(id, html) {
  const elemento = document.getElementById(id);

  if (elemento) {
    elemento.innerHTML = html;
  }
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
