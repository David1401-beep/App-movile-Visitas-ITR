import {
  aceptarConvocatoria,
  obtenerConvocatoriasPadre,
  posponerConvocatoria
} from '../Service/ConvocatoriasService.js';

// Controla las convocatorias recibidas desde la API y las respuestas del encargado.
document.addEventListener('DOMContentLoaded', async () => {
  const list = document.getElementById('lista-convocatorias');
  const postponeModal = document.getElementById('modal-posponer-convocatoria');
  const resultModal = document.getElementById('modal-resultado-convocatoria');
  const postponeForm = document.getElementById('formulario-posponer-convocatoria');
  const convocationIdInput = document.getElementById('id-convocatoria-posponer');
  const dateInput = document.getElementById('nueva-fecha-convocatoria');
  const timeInput = document.getElementById('nueva-hora-convocatoria');
  const reasonInput = document.getElementById('motivo-posponer-convocatoria');
  const postponeButton = document.getElementById('btn-confirmar-posponer');
  const resultTitle = document.getElementById('titulo-resultado-convocatoria');
  const resultMessage = document.getElementById('mensaje-resultado-convocatoria');
  const liveRegion = document.getElementById('anuncios-convocatorias');

  if (!list || !postponeModal || !resultModal || !postponeForm) {
    return;
  }

  const statusLabels = {
    pendiente: 'Pendiente',
    aceptada: 'Aceptada',
    pospuesta: 'Pospuesta',
    rechazada: 'Rechazada',
    cancelada: 'Cancelada',
    finalizada: 'Finalizada',
  };

  const getCard = (convocationId) => document.getElementById(`convocatoria-${convocationId}`);

  const getToday = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDate = (dateValue) => {
    if (!dateValue) return 'Fecha no disponible';

    const date = new Date(`${dateValue}T00:00:00`);
    const weekdays = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

    return `${weekdays[date.getDay()]} ${date.getDate()} de ${months[date.getMonth()]} de ${date.getFullYear()}`;
  };

  const formatTime = (timeValue) => {
    if (!timeValue) return 'Hora no disponible';

    const [hourValue, minutes] = timeValue.split(':');
    const hour = Number(hourValue);
    const hour12 = hour % 12 || 12;
    const period = hour >= 12 ? 'P.M.' : 'A.M.';

    return `${hour12}:${minutes} ${period}`;
  };

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const renderConvocations = (convocatorias) => {
    list.innerHTML = '';

    if (convocatorias.length === 0) {
      list.innerHTML = `
        <p class="text-center text-secondary py-5" id="mensaje-convocatorias-vacias">
          No hay convocatorias para el estudiante asociado a esta cuenta.
        </p>
      `;
      return;
    }

    convocatorias.forEach((convocatoria) => {
      const id = Number(convocatoria.idCita);
      const article = document.createElement('article');
      article.className = 'convocation-card card border-0';
      article.id = `convocatoria-${id}`;
      article.dataset.convocatoriaId = String(id);
      article.dataset.estudianteId = String(convocatoria.idEstudiante || '');
      article.dataset.estudianteEncargadoId = String(convocatoria.idEstudianteEncargado || '');
      article.dataset.estado = convocatoria.estado;

      article.innerHTML = `
        <div class="card-body" id="cuerpo-convocatoria-${id}">
          <div class="convocation-card-heading" id="encabezado-convocatoria-${id}">
            <h2 class="convocation-title fw-bold" id="asunto-convocatoria-${id}"
              data-api-field="asunto">${escapeHtml(convocatoria.asunto)}</h2>
            <span class="convocation-status" id="estado-convocatoria-${id}"
              data-api-field="estado">${escapeHtml(statusLabels[convocatoria.estado] || convocatoria.estado)}</span>
          </div>

          <p class="convocation-data" id="fecha-convocatoria-${id}">
            <strong>Fecha:</strong>
            <time data-api-field="fecha" datetime="${escapeHtml(convocatoria.fecha)}">${escapeHtml(formatDate(convocatoria.fecha))}</time>
          </p>
          <p class="convocation-data" id="hora-convocatoria-${id}">
            <strong>Hora:</strong>
            <time data-api-field="hora" datetime="${escapeHtml(convocatoria.hora)}">${escapeHtml(formatTime(convocatoria.hora))}</time>
          </p>
          <p class="convocation-data" id="descripcion-convocatoria-${id}">
            <strong>Descripción:</strong>
            <span data-api-field="descripcion">${escapeHtml(convocatoria.descripcion)}</span>
          </p>
          <p class="convocation-data" id="estudiante-convocatoria-${id}">
            <strong>Estudiante convocado:</strong>
            <span data-api-field="estudianteNombre">${escapeHtml(convocatoria.estudianteNombre)}</span>
          </p>

          <hr class="convocation-divider" id="divisor-convocatoria-${id}">

          <div class="convocation-actions" id="acciones-convocatoria-${id}">
            <button class="convocation-button convocation-accept btn fw-bold"
              id="btn-aceptar-convocatoria-${id}" type="button" data-action="aceptar"
              data-convocatoria-id="${id}">
              <i class="bi bi-check-lg" aria-hidden="true"></i> Aceptar
            </button>
            <button class="convocation-button convocation-postpone btn fw-bold"
              id="btn-posponer-convocatoria-${id}" type="button" data-action="posponer"
              data-convocatoria-id="${id}">
              <i class="bi bi-calendar2-event" aria-hidden="true"></i> Posponer
            </button>
          </div>
        </div>
      `;

      list.appendChild(article);
      applyState(article, convocatoria);
    });
  };

  const openModal = (modal, elementToFocus) => {
    modal.hidden = false;
    document.body.classList.add('convocation-modal-open');
    window.setTimeout(() => elementToFocus?.focus(), 0);
  };

  const closeModal = (modal) => {
    modal.hidden = true;
    if (postponeModal.hidden && resultModal.hidden) {
      document.body.classList.remove('convocation-modal-open');
    }
  };

  const showResult = (title, message) => {
    resultTitle.textContent = title;
    resultMessage.textContent = message;
    openModal(resultModal, document.getElementById('btn-cerrar-resultado-convocatoria'));
  };

  function applyState(card, state, announce = false) {
    const status = state.estado || 'pendiente';
    const statusElement = card.querySelector('[data-api-field="estado"]');
    const buttons = card.querySelectorAll('[data-action]');

    card.dataset.estado = status;
    card.classList.toggle('is-accepted', status === 'aceptada');
    card.classList.toggle('is-postponed', status === 'pospuesta');
    statusElement.textContent = statusLabels[status] || status;

    if (state.fecha && state.hora) {
      const dateElement = card.querySelector('[data-api-field="fecha"]');
      const timeElement = card.querySelector('[data-api-field="hora"]');
      dateElement.dateTime = state.fecha;
      dateElement.textContent = formatDate(state.fecha);
      timeElement.dateTime = state.hora;
      timeElement.textContent = formatTime(state.hora);
    }

    buttons.forEach((button) => {
      button.disabled = status !== 'pendiente';
    });

    if (announce) {
      liveRegion.textContent = `La convocatoria ${card.dataset.convocatoriaId} ahora está ${statusLabels[status].toLowerCase()}.`;
    }
  }

  const setCardBusy = (card, busy) => {
    card.dataset.actualizando = busy ? 'true' : 'false';
    card.querySelectorAll('[data-action]').forEach((button) => {
      button.disabled = busy || card.dataset.estado !== 'pendiente';
    });
  };

  const validateProposedDateTime = () => {
    timeInput.setCustomValidity('');

    if (!dateInput.value || !timeInput.value) {
      return;
    }

    const proposal = new Date(`${dateInput.value}T${timeInput.value}:00`);
    if (Number.isNaN(proposal.getTime()) || proposal <= new Date()) {
      timeInput.setCustomValidity('La nueva fecha y hora deben ser futuras.');
    }
  };

  list.innerHTML = `
    <p class="text-center text-secondary py-5" id="mensaje-cargando-convocatorias">
      Cargando convocatorias...
    </p>
  `;

  try {
    renderConvocations(await obtenerConvocatoriasPadre());
  } catch (error) {
    list.innerHTML = `
      <div class="text-center py-5" id="mensaje-error-convocatorias">
        <p class="text-secondary mb-2">No se pudieron cargar las convocatorias.</p>
      </div>
    `;
    return;
  }

  dateInput.min = getToday();
  dateInput.addEventListener('input', validateProposedDateTime);
  timeInput.addEventListener('input', validateProposedDateTime);

  list.addEventListener('click', async (event) => {
    const button = event.target.closest('[data-action]');
    if (!button || button.disabled) {
      return;
    }

    const convocationId = button.dataset.convocatoriaId;
    const card = getCard(convocationId);

    if (!card) {
      return;
    }

    if (button.dataset.action === 'aceptar') {
      setCardBusy(card, true);

      try {
        const updated = await aceptarConvocatoria(convocationId);
        applyState(card, updated, true);
        showResult('Convocatoria aceptada', 'Tu aceptación fue guardada en el sistema correctamente.');
      } catch (error) {
        setCardBusy(card, false);
        showResult('No se pudo aceptar', error.message);
      }
      return;
    }

    postponeForm.reset();
    timeInput.setCustomValidity('');
    convocationIdInput.value = convocationId;
    dateInput.min = getToday();
    openModal(postponeModal, dateInput);
  });

  postponeForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    validateProposedDateTime();

    if (!postponeForm.checkValidity()) {
      postponeForm.reportValidity();
      return;
    }

    const convocationId = convocationIdInput.value;
    const card = getCard(convocationId);
    if (!card) {
      return;
    }

    postponeButton.disabled = true;
    setCardBusy(card, true);

    try {
      const updated = await posponerConvocatoria(
        convocationId,
        dateInput.value,
        timeInput.value,
        reasonInput.value
      );

      applyState(card, updated, true);
      closeModal(postponeModal);
      showResult('Propuesta enviada', 'La nueva fecha y hora fueron guardadas en el sistema.');
    } catch (error) {
      setCardBusy(card, false);
      closeModal(postponeModal);
      showResult('No se pudo posponer', error.message);
    } finally {
      postponeButton.disabled = false;
    }
  });

  document.getElementById('btn-cerrar-modal-posponer').addEventListener('click', () => {
    closeModal(postponeModal);
  });

  document.getElementById('btn-cerrar-resultado-convocatoria').addEventListener('click', () => {
    closeModal(resultModal);
  });

  document.querySelectorAll('.convocation-modal').forEach((modal) => {
    modal.addEventListener('click', (event) => {
      if (event.target === modal) {
        closeModal(modal);
      }
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      if (!postponeModal.hidden) closeModal(postponeModal);
      if (!resultModal.hidden) closeModal(resultModal);
    }
  });
});
