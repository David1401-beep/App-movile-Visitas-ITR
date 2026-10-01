import {
  crearCitaDocente,
  editarCitaDocente,
  obtenerDatosFormularioCita
} from '../Service/CrearCitaService.js';
import { ajustarCampoHora } from '../../horarioCitas.js';

// Crea un modal compatible: usa Bootstrap cuando está disponible y una alternativa local si el CDN falla.
function createCompatibleModal(modalElement, options = {}) {
  if (window.bootstrap?.Modal) {
    return window.bootstrap.Modal.getOrCreateInstance(modalElement, options);
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

// Formulario de convocatoria del docente. Sirve tanto para crear una cita
// nueva como para editar una ya creada (?mode=edit&solicitud=<idCita>&...),
// enlace que arma la agenda del docente.
document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('formulario-solicitud');
  const dateInput = document.getElementById('fecha-visita');
  const timeInput = document.getElementById('hora-visita');
  const modalElement = document.getElementById('modal-solicitud-exitosa');
  const subjectInput = document.getElementById('asunto-visita');
  const descriptionInput = document.getElementById('descripcion-visita');
  const studentSelect = document.getElementById('estudiante-seleccionado');
  const submitButton = document.getElementById('btn-enviar-solicitud');
  const statusMessage = document.getElementById('mensaje-estado-solicitud');
  const modalTitle = document.getElementById('titulo-modal-exito');
  const modalMessage = document.getElementById('mensaje-modal-exito');
  if (!form || !dateInput || !timeInput) return;

  // Ajusta el rango de la hora segun el dia que elija.
  ajustarCampoHora(dateInput, timeInput);

  const params = new URLSearchParams(window.location.search);
  const esEdicion = params.get('mode') === 'edit';
  const idCita = params.get('solicitud');

  if (esEdicion) {
    if (submitButton) submitButton.textContent = 'Guardar Cambios';

    document.title = 'Editar Solicitud - Visitas ITR';

    const tituloEncabezado = document.getElementById('titulo-encabezado');
    if (tituloEncabezado) tituloEncabezado.textContent = 'Editar Solicitud';
  }

  let idEmpleadoSesion = 0;

  const showStatus = (message, isError = false) => {
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.classList.toggle('text-danger', isError);
    statusMessage.classList.toggle('text-success', !isError && Boolean(message));
  };

  const loadStudents = async () => {
    studentSelect.disabled = true;
    submitButton.disabled = true;

    try {
      const datosFormulario = await obtenerDatosFormularioCita();
      idEmpleadoSesion = datosFormulario.idEmpleado;
      studentSelect.innerHTML = '<option value="">Seleccione un estudiante</option>';

      datosFormulario.relaciones.forEach((relacion) => {
        const option = document.createElement('option');
        option.value = relacion.idEstudianteEncargado;
        option.textContent = relacion.nombreEstudiante;
        option.dataset.idEstudiante = relacion.idEstudiante;
        studentSelect.appendChild(option);
      });

      if (esEdicion) {
        const idEstudianteEncargado = params.get('idEstudianteEncargado');
        if (idEstudianteEncargado) {
          studentSelect.value = idEstudianteEncargado;
        }
      }

      studentSelect.disabled = false;
      submitButton.disabled = false;
      showStatus('');
    } catch (error) {
      studentSelect.innerHTML = '<option value="">No fue posible cargar estudiantes</option>';
    }
  };

  const rellenarParaEdicion = () => {
    if (!esEdicion) return;

    if (subjectInput) subjectInput.value = params.get('asunto') || '';
    if (dateInput) dateInput.value = params.get('fecha') || '';
    if (timeInput) timeInput.value = params.get('hora') || '';
    if (descriptionInput) descriptionInput.value = params.get('descripcion') || '';
  };

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
      ? 'La fecha de la convocatoria no puede ser anterior a hoy.' : '');
    timeInput.setCustomValidity(isToday && timeInput.value && timeInput.value <= currentTime
      ? 'La hora de la convocatoria no puede ser anterior a la hora actual.' : '');
  };

  rellenarParaEdicion();
  validateDateTime();
  dateInput.addEventListener('input', validateDateTime);
  dateInput.addEventListener('change', validateDateTime);
  timeInput.addEventListener('input', validateDateTime);
  timeInput.addEventListener('change', validateDateTime);
  window.setInterval(validateDateTime, 60_000);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    validateDateTime();
    form.classList.add('was-validated');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    submitButton.disabled = true;
    showStatus(esEdicion ? 'Guardando los cambios...' : 'Guardando la cita...');

    const datosCita = {
      asunto: subjectInput.value.trim(),
      fecha: dateInput.value,
      hora: timeInput.value,
      descripcion: descriptionInput.value.trim(),
      idEstudianteEncargado: studentSelect.value
    };

    try {
      if (esEdicion) {
        await editarCitaDocente(idCita, datosCita, idEmpleadoSesion);
      } else {
        await crearCitaDocente(datosCita, idEmpleadoSesion);
      }

      showStatus('');

      if (modalElement) {
        if (esEdicion) {
          if (modalTitle) modalTitle.textContent = 'Solicitud Modificada Correctamente';
          if (modalMessage) {
            modalMessage.innerHTML = 'Los cambios en su convocatoria se han guardado con éxito.';
          }
        }

        createCompatibleModal(modalElement, {
          backdrop: 'static',
          keyboard: false
        }).show();
      }
    } catch (error) {
      showStatus(error.message, true);
    } finally {
      submitButton.disabled = false;
    }
  });

  modalElement?.addEventListener('hidden.bs.modal', () => {
    if (esEdicion) {
      window.location.href = 'agenda-docente.html';
      return;
    }

    form.reset();
    form.classList.remove('was-validated');
    validateDateTime();
  });

  await loadStudents();
});
