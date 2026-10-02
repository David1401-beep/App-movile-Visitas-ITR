import {
  obtenerMisSolicitudes,
  actualizarSolicitud,
  aceptarSolicitud,
  posponerSolicitud,
  eliminarSolicitud,
  obtenerDocentes
} from "../Service/MisSolicitudesService.js";

const contenedor = document.getElementById("contenedor-solicitudes");

const modalConfirmarEl = document.getElementById("modal-confirmar-eliminacion");
const modalExitoEl = document.getElementById("modal-exito-eliminacion");
const btnConfirmarEliminacion = document.getElementById("btn-confirmar-eliminacion");

const modalConfirmar = modalConfirmarEl ? new bootstrap.Modal(modalConfirmarEl) : null;
const modalExito = modalExitoEl ? new bootstrap.Modal(modalExitoEl) : null;

let solicitudSeleccionada = null;

let docentesEnMemoria = [];

document.addEventListener("DOMContentLoaded", cargarSolicitudes);

async function cargarSolicitudes() {
  if (!contenedor) {
    return;
  }

  mostrarMensaje("Cargando sus solicitudes...");

  try {
    const solicitudes = await obtenerMisSolicitudes();

    if (solicitudes.length === 0) {
      mostrarMensaje("Todavía no ha enviado solicitudes.");
      return;
    }

    contenedor.innerHTML = `
      <p class="text-center text-secondary mb-2" id="subtitulo-solicitudes">
        Gestiona tus visitas programadas
      </p>
      ${solicitudes.map(construirTarjeta).join("")}
    `;
  } catch (error) {
    console.error("No fue posible cargar las solicitudes.", error);
    mostrarMensaje(error.message, true);
  }
}

function construirAcciones(solicitud) {
  if (solicitud.editable) {
    return `
      <button type="button"
              class="btn btn-solicitud btn-editar fw-semibold d-flex align-items-center gap-2 btn-editar-solicitud"
              data-id="${solicitud.idCita}">
        <i class="bi bi-pencil-fill" aria-hidden="true"></i> Editar
      </button>
      <button type="button"
              class="btn btn-solicitud btn-cancelar fw-semibold d-flex align-items-center gap-2 btn-eliminar-solicitud"
              data-id="${solicitud.idCita}">
        <i class="bi bi-trash-fill" aria-hidden="true"></i> Cancelar
      </button>
    `;
  }

  // El docente propuso una nueva fecha: el encargado puede aceptarla o
  // proponer otra, hasta que ambos queden de acuerdo.
  if (solicitud.estadoApi === "POSPUESTA") {
    return `
      <button type="button"
              class="btn btn-solicitud btn-aceptar fw-semibold d-flex align-items-center gap-2 btn-aceptar-solicitud"
              data-id="${solicitud.idCita}">
        <i class="bi bi-check-lg" aria-hidden="true"></i> Aceptar
      </button>
      <button type="button"
              class="btn btn-solicitud btn-posponer fw-semibold d-flex align-items-center gap-2 btn-posponer-solicitud"
              data-id="${solicitud.idCita}">
        <i class="bi bi-calendar2-week-fill" aria-hidden="true"></i> Posponer
      </button>
    `;
  }

  // Ya mandó su propuesta y no puede hacer nada hasta que el docente conteste.
  if (solicitud.esperandoDocente) {
    return `<span class="solicitud-dato text-secondary">
         Se envió su propuesta. Esperando la respuesta del docente.
       </span>`;
  }

  return `<span class="solicitud-dato text-secondary">
       El docente ya respondió esta solicitud.
     </span>`;
}

function construirTarjeta(solicitud) {

  const acciones = construirAcciones(solicitud);

  return `
    <article class="card solicitud-card w-100 ${claseTarjeta(solicitud.estadoApi)}" id="solicitud-${solicitud.idCita}">
      <div class="card-body">

        <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
          <h2 class="solicitud-titulo fw-bold mb-0">${escaparHtml(solicitud.asunto)}</h2>
          <span class="badge flex-shrink-0 ${claseEstado(solicitud.estadoApi)}">
            ${escaparHtml(solicitud.estado)}
          </span>
        </div>

        <p class="solicitud-dato mb-1">
          <strong>Encargado:</strong> ${escaparHtml(solicitud.encargado)}
        </p>
        <p class="solicitud-dato mb-1">
          <strong>Docente:</strong> Prof. ${escaparHtml(solicitud.docente)}
        </p>
        <p class="solicitud-dato mb-1">
          <strong>Estudiante:</strong> ${escaparHtml(solicitud.estudiante)}
        </p>
        <p class="solicitud-dato mb-1">
          <strong>Fecha:</strong> ${escaparHtml(solicitud.fechaTexto)}
          a las ${escaparHtml(solicitud.horaTexto)}
        </p>
        <p class="solicitud-dato mb-2">
          <strong>Motivo:</strong> ${escaparHtml(solicitud.motivo)}
        </p>

        <hr class="solicitud-divider my-3">

        <div class="d-flex justify-content-center gap-3 flex-wrap">${acciones}</div>

      </div>
    </article>
  `;
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

function mostrarMensaje(texto, esError = false) {
  contenedor.innerHTML = `
    <p class="text-center ${esError ? "text-danger" : "text-secondary"} py-5">
      ${escaparHtml(texto)}
    </p>
  `;
}

// Editar
async function abrirEdicion(idCita) {
  if (!window.Swal) {
    avisoError("No se pudo abrir el formulario de edición.");
    return;
  }

  const solicitudes = await obtenerMisSolicitudes();
  const solicitud = solicitudes.find(registro => Number(registro.idCita) === Number(idCita));

  if (!solicitud) {
    avisoError("No se encontró la solicitud.");
    return;
  }

  if (docentesEnMemoria.length === 0) {
    docentesEnMemoria = await obtenerDocentes();
  }

  const opcionesDocente = docentesEnMemoria
    .map(docente => {
      const seleccionado = Number(docente.idDocente) === Number(solicitud.idDocente)
        ? "selected"
        : "";
      return `<option value="${docente.idDocente}" ${seleccionado}>
                ${escaparHtml(docente.nombre)}
              </option>`;
    })
    .join("");

  const resultado = await Swal.fire({
    title: "Editar solicitud",
    html: `
      <div class="text-start">
        <label class="form-label mt-2">Docente</label>
        <select id="swalDocente" class="form-select">${opcionesDocente}</select>

        <label class="form-label mt-2">Fecha</label>
        <input type="date" id="swalFecha" class="form-control"
               value="${solicitud.fecha}" min="${fechaDeHoy()}">

        <label class="form-label mt-2">Hora</label>
        <input type="time" id="swalHora" class="form-control"
               value="${solicitud.hora || "08:00"}">

        <label class="form-label mt-2">Motivo</label>
        <textarea id="swalMotivo" class="form-control" rows="3"
                  maxlength="250">${escaparHtml(solicitud.motivo)}</textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Guardar",
    cancelButtonText: "Cancelar",
    reverseButtons: true,
    focusConfirm: false,

    preConfirm: function () {
      const valores = {
        idDocente: document.getElementById("swalDocente").value,
        fecha: document.getElementById("swalFecha").value,
        hora: document.getElementById("swalHora").value,
        motivo: document.getElementById("swalMotivo").value.trim()
      };

      if (!valores.motivo) {
        Swal.showValidationMessage("Debe indicar el motivo de la visita.");
        return false;
      }

      if (valores.motivo.length > 250) {
        Swal.showValidationMessage("El motivo no puede exceder 250 caracteres.");
        return false;
      }

      if (!valores.fecha || !valores.hora) {
        Swal.showValidationMessage("Debe indicar fecha y hora.");
        return false;
      }

      return valores;
    }
  });

  if (!resultado.isConfirmed) {
    return;
  }

  try {
    await actualizarSolicitud(idCita, resultado.value);
    await cargarSolicitudes();
    avisoExito("La solicitud se actualizó correctamente.");
  } catch (error) {
    avisoError(error.message);
  }
}

// Aceptar la fecha propuesta por el docente
async function abrirAceptar(idCita) {
  if (!window.Swal) {
    avisoError("No se pudo abrir la confirmación.");
    return;
  }

  const resultado = await Swal.fire({
    title: "¿Aceptar la nueva fecha?",
    text: "Se aceptará la fecha y hora que propuso el docente.",
    icon: "question",
    showCancelButton: true,
    confirmButtonText: "Sí, aceptar",
    cancelButtonText: "Cancelar",
    reverseButtons: true
  });

  if (!resultado.isConfirmed) {
    return;
  }

  try {
    await aceptarSolicitud(idCita);
    await cargarSolicitudes();
    avisoExito("Se aceptó la nueva fecha propuesta.");
  } catch (error) {
    avisoError(error.message);
  }
}

// Proponer otra fecha en respuesta a la del docente
async function abrirPosponer(idCita) {
  if (!window.Swal) {
    avisoError("No se pudo abrir el formulario de reprogramación.");
    return;
  }

  const resultado = await Swal.fire({
    title: "Proponer otra fecha",
    html: `
      <div class="text-start">
        <label class="form-label mt-2">Fecha</label>
        <input type="date" id="swalFechaPosponer" class="form-control" min="${fechaDeHoy()}">

        <label class="form-label mt-2">Hora</label>
        <input type="time" id="swalHoraPosponer" class="form-control" value="08:00">

        <label class="form-label mt-2">Motivo de la reprogramación</label>
        <textarea id="swalMotivoPosponer" class="form-control" rows="3" maxlength="300"></textarea>
      </div>
    `,
    showCancelButton: true,
    confirmButtonText: "Enviar propuesta",
    cancelButtonText: "Cancelar",
    reverseButtons: true,
    focusConfirm: false,

    preConfirm: function () {
      const valores = {
        fecha: document.getElementById("swalFechaPosponer").value,
        hora: document.getElementById("swalHoraPosponer").value,
        motivo: document.getElementById("swalMotivoPosponer").value.trim()
      };

      if (!valores.fecha || !valores.hora) {
        Swal.showValidationMessage("Debe indicar fecha y hora.");
        return false;
      }

      if (!valores.motivo) {
        Swal.showValidationMessage("Debe indicar el motivo de la reprogramación.");
        return false;
      }

      return valores;
    }
  });

  if (!resultado.isConfirmed) {
    return;
  }

  try {
    await posponerSolicitud(idCita, resultado.value.fecha, resultado.value.hora, resultado.value.motivo);
    await cargarSolicitudes();
    avisoExito("Se envió la nueva propuesta de fecha.");
  } catch (error) {
    avisoError(error.message);
  }
}

// Eliminar
async function abrirConfirmacionEliminar(idCita) {
  const solicitudes = await obtenerMisSolicitudes();
  const solicitud = solicitudes.find(registro => Number(registro.idCita) === Number(idCita));

  if (!solicitud) {
    return;
  }

  if (!solicitud.editable) {
    avisoError("Esta solicitud ya fue respondida por el docente y no puede eliminarse.");
    return;
  }

  solicitudSeleccionada = solicitud;

  escribirHtml("modal-encargado", `<strong>Encargado:</strong> ${escaparHtml(solicitud.encargado)}`);
  escribirHtml("modal-docente", `<strong>Docente:</strong> Prof. ${escaparHtml(solicitud.docente)}`);
  escribirHtml("modal-fecha",
    `<strong>Fecha:</strong> ${escaparHtml(solicitud.fechaTexto)} a las ${escaparHtml(solicitud.horaTexto)}`);

  modalConfirmar?.show();
}

btnConfirmarEliminacion?.addEventListener("click", async function () {
  if (!solicitudSeleccionada) {
    return;
  }

  btnConfirmarEliminacion.disabled = true;

  try {
    await eliminarSolicitud(solicitudSeleccionada.idCita);

    modalConfirmar?.hide();
    modalExito?.show();

    await cargarSolicitudes();
  } catch (error) {
    modalConfirmar?.hide();
    avisoError(error.message);
  } finally {
    btnConfirmarEliminacion.disabled = false;
    solicitudSeleccionada = null;
  }
});


// Acciones de las tarjetas
if (contenedor) {
  contenedor.addEventListener("click", function (evento) {
    const botonEditar = evento.target.closest(".btn-editar-solicitud");
    const botonEliminar = evento.target.closest(".btn-eliminar-solicitud");
    const botonAceptar = evento.target.closest(".btn-aceptar-solicitud");
    const botonPosponer = evento.target.closest(".btn-posponer-solicitud");

    if (botonEditar) {
      abrirEdicion(botonEditar.dataset.id);
    } else if (botonEliminar) {
      abrirConfirmacionEliminar(botonEliminar.dataset.id);
    } else if (botonAceptar) {
      abrirAceptar(botonAceptar.dataset.id);
    } else if (botonPosponer) {
      abrirPosponer(botonPosponer.dataset.id);
    }
  });
}


// Avisos
function avisoExito(mensaje) {
  if (window.Swal) {
    Swal.fire({
      icon: "success",
      title: "Listo",
      text: mensaje,
      timer: 1800,
      showConfirmButton: false
    });
  } else {
    alert(mensaje);
  }
}

function avisoError(mensaje) {
  if (window.Swal) {
    Swal.fire({ icon: "error", title: "Ocurrió un problema", text: mensaje });
  } else {
    alert(mensaje);
  }
}


// Apoyo
function escribirHtml(id, html) {
  const elemento = document.getElementById(id);

  if (elemento) {
    elemento.innerHTML = html;
  }
}

function fechaDeHoy() {
  const hoy = new Date();

  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}