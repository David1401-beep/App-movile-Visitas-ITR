import { posponerSolicitud } from "../Service/SolicitudDocenteService.js";

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

// Lee la solicitud desde los parámetros que envía verSolicitud.html y envía
// la propuesta de reprogramación a la API (antes solo simulaba el éxito).
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formulario-posponer-solicitud');
  const dateInput = document.getElementById('fecha-sugerida');
  const timeInput = document.getElementById('hora-sugerida');
  const reasonInput = document.getElementById('motivo-reprogramacion');
  const dateOutput = document.getElementById('fecha-exito-posponer');
  const timeOutput = document.getElementById('hora-exito-posponer');
  const submitButton = document.getElementById('btn-enviar-propuesta');

  const successModalEl = document.getElementById('modal-exito-posponer');
  const successModal = successModalEl ? createCompatibleModal(successModalEl) : null;

  if (!form || !dateInput || !timeInput) return;

  const params = new URLSearchParams(window.location.search);
  const idCita = params.get('solicitud');

  const mostrarError = (mensaje) => {
    if (window.Swal) {
      Swal.fire({ icon: 'error', title: 'Ocurrió un problema', text: mensaje });
    } else {
      alert(mensaje);
    }
  };

  if (!idCita) {
    mostrarError('No se pudo identificar la solicitud. Vuelva a la lista e inténtelo de nuevo.');
    form.querySelectorAll('input, textarea, button').forEach((campo) => { campo.disabled = true; });
    return;
  }

  // Muestra los datos del encargado, para no proponer a ciegas.
  function mostrarResumen() {
    const resumen = document.getElementById('resumen-solicitud');

    if (!resumen) return;

    const escapar = (valor) => String(valor ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');

    const fecha = params.get('fecha');
    const hora = params.get('hora');
    const esPropuesta = params.get('propuesta') === '1';
    const motivoPropuesta = params.get('motivoPropuesta');

    resumen.innerHTML = `
      <h2 class="postpone-summary-title">${escapar(params.get('nombre') || 'Encargado')}</h2>

      <p class="postpone-summary-line">
        <span>Estudiante</span> ${escapar(params.get('estudiante') || 'No disponible')}
      </p>
      <p class="postpone-summary-line">
        <span>Motivo de la visita</span> ${escapar(params.get('motivo') || 'No disponible')}
      </p>
      <p class="postpone-summary-line">
        <span>${esPropuesta ? 'Fecha que propuso' : 'Fecha solicitada'}</span>
        ${escapar(fecha ? formatDate(fecha) : 'No disponible')}
        · ${escapar(hora ? formatTime(hora) : '')}
      </p>
      ${esPropuesta && motivoPropuesta ? `
      <p class="postpone-summary-note">
        <span>No puede asistir</span> ${escapar(motivoPropuesta)}
      </p>` : ''}
    `;

    resumen.hidden = false;
  }

  const getToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const getCurrentTime = () => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  };
  const validateDateTime = () => {
    const today = getToday();
    const currentTime = getCurrentTime();
    const isToday = dateInput.value === today;
    dateInput.min = today;
    if (isToday) timeInput.min = currentTime;
    else timeInput.removeAttribute('min');
    dateInput.setCustomValidity(dateInput.value && dateInput.value < today
      ? 'La nueva fecha no puede ser anterior a hoy.' : '');
    timeInput.setCustomValidity(isToday && timeInput.value && timeInput.value < currentTime
      ? 'La nueva hora no puede ser anterior a la hora actual.' : '');
  };
  const formatDate = (value) => {
    const [year, month, day] = value.split('-');
    return `${Number(day)}/${Number(month)}/${year}`;
  };
  const formatTime = (value) => {
    const [hourValue, minutes] = value.split(':');
    const hour = Number(hourValue);
    return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'P.M.' : 'A.M.'}`;
  };

  // Va aquí porque usa formatDate y formatTime, que están más arriba.
  mostrarResumen();

  validateDateTime();
  dateInput.addEventListener('input', validateDateTime);
  dateInput.addEventListener('change', validateDateTime);
  timeInput.addEventListener('input', validateDateTime);
  timeInput.addEventListener('change', validateDateTime);
  window.setInterval(validateDateTime, 60_000);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    validateDateTime();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    submitButton.disabled = true;

    try {
      await posponerSolicitud(idCita, dateInput.value, timeInput.value, reasonInput?.value || '');

      if (dateOutput) dateOutput.textContent = formatDate(dateInput.value);
      if (timeOutput) timeOutput.textContent = formatTime(timeInput.value);

      successModal?.show();
    } catch (error) {
      mostrarError(error.message);
    } finally {
      submitButton.disabled = false;
    }
  });

  // Al cerrar la confirmación, se vuelve al listado de solicitudes.
  successModalEl?.addEventListener('hidden.bs.modal', () => {
    window.location.href = 'verSolicitud.html';
  });
});
