import {
  cargarOpcionesSolicitud,
  crearSolicitudPadre
} from '../Service/SolicitudPadreService.js';
import { horarioDeLaFecha } from '../../horarioCitas.js';

// Controla la validación y el modal de confirmación del formulario de solicitudes.
document.addEventListener('DOMContentLoaded', () => {
  const requestForm = document.querySelector('.request-form');
  const modalElement = document.getElementById('requestSuccessModal');
  const submitBtn = document.getElementById('submit-btn');

  // Verificar si venimos en modo edición desde la URL
  const urlParams = new URLSearchParams(window.location.search);
  const mode = urlParams.get('mode');

  if (mode === 'edit') {
    if (submitBtn) {
      submitBtn.textContent = 'Guardar Cambios';
    }

    const encargado = urlParams.get('encargado');
    const docente = urlParams.get('docente');
    const fecha = urlParams.get('fecha');
    const motivo = urlParams.get('motivo');

    const guardianSelect = document.getElementById('guardian');
    const teacherSelect = document.getElementById('teacher');
    const dateInput = document.getElementById('visit-date');
    const reasonTextarea = document.getElementById('visit-reason');

    if (guardianSelect && encargado) {
      for (let option of guardianSelect.options) {
        if (option.text.toLowerCase() === encargado.toLowerCase() || option.value.toLowerCase() === encargado.toLowerCase()) {
          option.selected = true;
          break;
        }
      }
    }

    if (teacherSelect && docente) {
      for (let option of teacherSelect.options) {
        if (option.text.toLowerCase() === docente.toLowerCase() || option.value.toLowerCase() === docente.toLowerCase()) {
          option.selected = true;
          break;
        }
      }
    }

    if (dateInput && fecha) {
      // Intenta convertir texto de fecha (ej. "Jueves 10 de Abril...") o yyyy-mm-dd
      if (fecha.includes('2026') || fecha.includes('2025')) {
        const match = fecha.match(/(\d{1,2})[^\d]+(\d{1,2}|\w+)[^\d]+(\d{4})/);
        if (match) {
          const day = match[1].padStart(2, '0');
          // Mapeo simple de meses si viene en español
          const mesTexto = fecha.toLowerCase();
          let month = '04'; // Abril por defecto
          if (mesTexto.includes('enero')) month = '01';
          if (mesTexto.includes('febrero')) month = '02';
          if (mesTexto.includes('marzo')) month = '03';
          if (mesTexto.includes('abril')) month = '04';
          if (mesTexto.includes('mayo')) month = '05';
          if (mesTexto.includes('junio')) month = '06';
          if (mesTexto.includes('julio')) month = '07';
          if (mesTexto.includes('agosto')) month = '08';
          if (mesTexto.includes('septiembre')) month = '09';
          if (mesTexto.includes('octubre')) month = '10';
          if (mesTexto.includes('noviembre')) month = '11';
          if (mesTexto.includes('diciembre')) month = '12';

          const year = match[3];
          dateInput.value = `${year}-${month}-${day}`;
        } else {
          dateInput.value = '2026-06-10';
        }
      } else {
        dateInput.value = '2026-06-10';
      }
    }

    if (reasonTextarea && motivo) {
      reasonTextarea.value = motivo;
    }
  }

  // Finaliza silenciosamente si este script se carga en una página sin el formulario.
  if (!requestForm || !modalElement || typeof bootstrap === 'undefined') {
    return;
  }

  const successModal = bootstrap.Modal.getOrCreateInstance(modalElement, {
    backdrop: 'static',
    keyboard: false
  });

  requestForm.addEventListener('submit', (event) => {
    event.preventDefault();
    event.stopPropagation();
    requestForm.classList.add('was-validated');

    // El modal sólo se muestra cuando todos los campos obligatorios son válidos.
    if (!requestForm.checkValidity()) {
      return;
    }

    // Si estábamos en modo edición, se actualiza el título del modal de éxito
    const modalTitle = document.getElementById('request-success-title');
    const modalMsg = document.querySelector('.request-success-message');
    if (mode === 'edit' && modalTitle && modalMsg) {
      modalTitle.textContent = 'Solicitud Modificada Correctamente';
      modalMsg.textContent = 'Los cambios en su solicitud se han guardado con éxito.';
    }

    successModal.show();
  });

  // Después de cerrar la confirmación, redirige o prepara el formulario.
  modalElement.addEventListener('hidden.bs.modal', () => {
    if (mode === 'edit') {
      const id = urlParams.get('id') || '1';
      const guardianSelect = document.getElementById('guardian');
      const teacherSelect = document.getElementById('teacher');
      const dateInput = document.getElementById('visit-date');
      const reasonTextarea = document.getElementById('visit-reason');

      const encargado = guardianSelect ? (guardianSelect.options[guardianSelect.selectedIndex]?.text || guardianSelect.value) : '';
      const docente = teacherSelect ? (teacherSelect.options[teacherSelect.selectedIndex]?.text || teacherSelect.value) : '';
      
      // Dar formato legible a la fecha elegida
      let fechaFormatted = dateInput ? dateInput.value : '';
      if (fechaFormatted && fechaFormatted.includes('-')) {
        const parts = fechaFormatted.split('-');
        if (parts.length === 3) {
          const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
          const mesNombre = meses[parseInt(parts[1], 10) - 1] || 'Abril';
          fechaFormatted = `Fecha: ${parts[2]} de ${mesNombre} de ${parts[0]}`;
        }
      }

      const motivo = reasonTextarea ? reasonTextarea.value : '';

      const redirectParams = new URLSearchParams({
        edited: 'true',
        id,
        encargado,
        docente,
        fecha: fechaFormatted,
        motivo
      });

      window.location.href = `solicitudes-padres.html?${redirectParams.toString()}`;
    } else {
      requestForm.reset();
      requestForm.classList.remove('was-validated');
    }
  });
});

// Validación del formulario actual de padres.
document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('formulario-solicitud');
  const dateInput = document.getElementById('fecha-visita');
  const modalElement = document.getElementById('modal-solicitud-exitosa');
  const guardianSelect = document.getElementById('encargado');
  const teacherSelect = document.getElementById('docente');
  const reasonTextarea = document.getElementById('motivo-visita');
  const submitButton = document.getElementById('btn-enviar-solicitud');
  const errorMessage = document.getElementById('mensaje-error-solicitud');
  if (!form || !dateInput) return;

  const getToday = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  };
  const validateDate = () => {
    const today = getToday();
    dateInput.min = today;

    if (dateInput.value && dateInput.value < today) {
      dateInput.setCustomValidity('La fecha de la visita no puede ser anterior a hoy.');
      return;
    }

    // Aqui solo se elige el dia; la hora la asigna el sistema dentro del
    // horario. Lo unico que hay que impedir es que caiga en domingo.
    const horario = horarioDeLaFecha(dateInput.value);
    dateInput.setCustomValidity(horario.abierto ? '' : horario.mensaje);
  };

  validateDate();
  dateInput.addEventListener('input', validateDate);
  dateInput.addEventListener('change', validateDate);

  try {
    const opciones = await cargarOpcionesSolicitud();

    guardianSelect.innerHTML = '<option value="">Seleccione un encargado</option>';
    opciones.relaciones.forEach((relacion) => {
      guardianSelect.innerHTML += `
        <option value="${relacion.idEstudianteEncargado}">
          ${relacion.nombreEncargado} — ${relacion.nombreEstudiante}
        </option>
      `;
    });

    teacherSelect.innerHTML = '<option value="">Seleccione un docente</option>';
    opciones.docentes.forEach((docente) => {
      teacherSelect.innerHTML += `
        <option value="${docente.idEmpleado}">Prof. ${docente.nombre}</option>
      `;
    });

    guardianSelect.disabled = false;
    teacherSelect.disabled = false;
    submitButton.disabled = false;
  } catch (error) {
    // Retirado por petición del usuario
    // if (errorMessage) errorMessage.textContent = error.message;
  }

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    validateDate();
    form.classList.add('was-validated');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    if (errorMessage) errorMessage.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Enviando...';

    try {
      await crearSolicitudPadre({
        idEstudianteEncargado: guardianSelect.value,
        idEmpleado: teacherSelect.value,
        fecha: dateInput.value,
        motivo: reasonTextarea.value
      });

      if (modalElement && window.bootstrap?.Modal) {
        bootstrap.Modal.getOrCreateInstance(modalElement).show();
      }
    } catch (error) {
      if (errorMessage) errorMessage.textContent = error.message;
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Enviar solicitud';
    }
  });
  modalElement?.addEventListener('hidden.bs.modal', () => {
    form.reset();
    form.classList.remove('was-validated');
    validateDate();
  });
});
