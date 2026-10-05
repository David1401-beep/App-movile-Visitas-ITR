import {
  obtenerComunicados,
  publicarComunicado,
  actualizarComunicado,
  retirarComunicado
} from '../Service/ComunicadosService.js';

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('formulario-comunicados');
  const messageInput = document.getElementById('mensaje-comunicado');
  const communicationsList = document.getElementById('lista-comunicados');
  const submitButton = document.getElementById('btn-enviar-comunicado');
  const filtroFecha = document.getElementById('filtro-fecha-comunicados');
  const btnLimpiarFiltro = document.getElementById('btn-limpiar-filtro-comunicados');

  if (!form || !messageInput || !communicationsList) {
    return;
  }

  const formatDateTime = (value) => {
    if (!value) return '';
    return new Intl.DateTimeFormat('es-SV', {
      dateStyle: 'medium',
      timeStyle: 'short'
    }).format(new Date(value));
  };

  const escaparHtml = (valor) => String(valor ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  
  // Avisos
  const avisoExito = (mensaje) => {
    if (window.Swal) {
      Swal.fire({
        icon: 'success',
        title: 'Listo',
        text: mensaje,
        timer: 1600,
        showConfirmButton: false
      });
    } else {
      alert(mensaje);
    }
  };

  const avisoError = (mensaje) => {
    if (window.Swal) {
      Swal.fire({ icon: 'error', title: 'Ocurrió un problema', text: mensaje });
    } else {
      alert(mensaje);
    }
  };

  // Tarjetas
  const createCard = (communication) => {
    const communicationCard = document.createElement('article');

    communicationCard.className = 'communication-card';
    communicationCard.id = `comunicado-docente-${communication.idComunicado}`;
    communicationCard.dataset.id = communication.idComunicado;

    if (!communication.activo) {
      communicationCard.style.opacity = '0.55';
    }

    const acciones = communication.activo
      ? `
        <button type="button" class="btn btn-sm btn-outline-primary btn-editar-comunicado">
          <i class="bi bi-pencil-square"></i> Editar
        </button>
        <button type="button" class="btn btn-sm btn-outline-danger btn-retirar-comunicado">
          <i class="bi bi-eye-slash"></i> Retirar
        </button>
      `
      : '<small class="text-secondary">Retirado</small>';

    communicationCard.innerHTML = `
      <p class="communication-card-text">${escaparHtml(communication.mensaje)}</p>
      <small class="communication-card-meta d-block mb-2">
        ${escaparHtml(communication.nombreEmpleado || 'Docente')} ·
        ${escaparHtml(formatDateTime(communication.fechaPublicacion))}
      </small>
      <div class="d-flex gap-2 flex-wrap">${acciones}</div>
    `;

    return communicationCard;
  };

  const renderCommunications = (communications) => {
    communicationsList.innerHTML = '';

    if (communications.length === 0) {
      communicationsList.innerHTML =
        '<p class="text-center text-secondary mb-0">No hay comunicados publicados.</p>';
      return;
    }

    communications.forEach(communication => {
      communicationsList.appendChild(createCard(communication));
    });
  };

  // Me guardo la lista completa para que el filtro trabaje sobre ella sin
  // volver a consultar la API cada vez que cambian la fecha.
  let todosLosComunicados = [];

  // fechaPublicacion viene como "2026-10-04T15:30:00": me quedo con los
  // primeros diez caracteres, que es lo mismo que da el campo de fecha.
  const diaDelComunicado = (comunicado) =>
    String(comunicado.fechaPublicacion ?? '').slice(0, 10);

  const aplicarFiltro = () => {
    const dia = filtroFecha?.value || '';

    if (!dia) {
      renderCommunications(todosLosComunicados);
      return;
    }

    const filtrados = todosLosComunicados.filter(c => diaDelComunicado(c) === dia);

    if (filtrados.length === 0) {
      communicationsList.innerHTML =
        '<p class="text-center text-secondary mb-0">No hay comunicados de esa fecha.</p>';
      return;
    }

    renderCommunications(filtrados);
  };

  const cargarComunicados = async () => {
    communicationsList.innerHTML =
      '<p class="text-center text-secondary mb-0">Cargando comunicados...</p>';

    try {
      todosLosComunicados = await obtenerComunicados();
      aplicarFiltro();
    } catch (error) {
      console.error('No fue posible cargar los comunicados.', error);
      communicationsList.innerHTML =
        `<p class="text-center text-danger mb-0">${escaparHtml(error.message)}</p>`;
    }
  };

  filtroFecha?.addEventListener('change', aplicarFiltro);
  filtroFecha?.addEventListener('input', aplicarFiltro);

  btnLimpiarFiltro?.addEventListener('click', () => {
    if (filtroFecha) filtroFecha.value = '';
    aplicarFiltro();
  });

  messageInput.addEventListener('input', () => {
    messageInput.setCustomValidity('');
  });


  // Publicar
  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const message = messageInput.value.trim();

    if (!message) {
      messageInput.setCustomValidity('Escribe un comunicado antes de enviarlo.');
      messageInput.reportValidity();
      return;
    }

    // COM_MENSAJE es VARCHAR2(500) en la base de datos.
    if (message.length > 500) {
      avisoError('El comunicado no puede exceder 500 caracteres.');
      return;
    }

    submitButton.disabled = true;

    try {
      await publicarComunicado(message);
      form.reset();
      await cargarComunicados();

      const successModalEl = document.getElementById('modal-exito-comunicado');

      if (successModalEl && typeof bootstrap !== 'undefined') {
        bootstrap.Modal.getOrCreateInstance(successModalEl).show();
      } else {
        avisoExito('El comunicado se publicó correctamente.');
      }
    } catch (error) {
      avisoError(error.message);
    } finally {
      submitButton.disabled = false;
    }
  });


  // Editar y retirar
  communicationsList.addEventListener('click', async (event) => {
    const botonEditar = event.target.closest('.btn-editar-comunicado');
    const botonRetirar = event.target.closest('.btn-retirar-comunicado');

    if (!botonEditar && !botonRetirar) {
      return;
    }

    const tarjeta = event.target.closest('.communication-card');
    const idComunicado = tarjeta?.dataset.id;

    if (!idComunicado) {
      return;
    }

    if (botonEditar) {
      await editar(idComunicado, tarjeta);
    } else {
      await retirar(idComunicado);
    }
  });

  const editar = async (idComunicado, tarjeta) => {
    const textoActual = tarjeta.querySelector('.communication-card-text')?.textContent.trim() || '';

    if (!window.Swal) {
      avisoError('No se pudo abrir el formulario de edición.');
      return;
    }

    const resultado = await Swal.fire({
      title: 'Editar comunicado',
      input: 'textarea',
      inputValue: textoActual,
      inputAttributes: { maxlength: 500 },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      reverseButtons: true,
      preConfirm: (valor) => {
        if (!valor || !valor.trim()) {
          Swal.showValidationMessage('El comunicado no puede quedar vacío.');
          return false;
        }
        return valor.trim();
      }
    });

    if (!resultado.isConfirmed) {
      return;
    }

    try {
      await actualizarComunicado(idComunicado, resultado.value);
      await cargarComunicados();
      avisoExito('El comunicado se actualizó correctamente.');
    } catch (error) {
      avisoError(error.message);
    }
  };

  const retirar = async (idComunicado) => {
    let confirmado = true;

    if (window.Swal) {
      const respuesta = await Swal.fire({
        icon: 'warning',
        title: '¿Retirar el comunicado?',
        text: 'Los encargados dejarán de verlo, pero quedará registro de que se publicó.',
        showCancelButton: true,
        confirmButtonText: 'Sí, retirar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#dc3545',
        cancelButtonColor: '#6c757d',
        reverseButtons: true
      });

      confirmado = respuesta.isConfirmed;
    } else {
      confirmado = window.confirm('¿Retirar el comunicado?');
    }

    if (!confirmado) {
      return;
    }

    try {
      await retirarComunicado(idComunicado);
      await cargarComunicados();
      avisoExito('El comunicado fue retirado.');
    } catch (error) {
      avisoError(error.message);
    }
  };

  const successModalEl = document.getElementById('modal-exito-comunicado');

  if (successModalEl) {
    successModalEl.addEventListener('hidden.bs.modal', () => {
      messageInput.focus();
    });
  }

  cargarComunicados();
});