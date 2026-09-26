import { obtenerSolicitudesDocente } from '../Service/SolicitudDocenteService.js';

document.addEventListener('DOMContentLoaded', async () => {
  const requestList = document.getElementById('seccion-lista-solicitudes');
  if (!requestList) return;

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const formatDate = (dateValue) => {
    if (!dateValue) return 'No disponible';
    const [year, month, day] = dateValue.split('-').map(Number);
    return `${day}/${month}/${year}`;
  };

  const formatTime = (timeValue) => {
    if (!timeValue) return 'No disponible';
    const [hourValue, minutes] = timeValue.split(':');
    const hour = Number(hourValue);
    return `${hour % 12 || 12}:${minutes} ${hour >= 12 ? 'P.M' : 'A.M'}`;
  };

  // Si el encargado mandó otra fecha le pongo Propuesta, para que no se
  // confunda con una solicitud nueva.
  const claseBadgeEstado = (request) =>
    request.esPropuesta ? 'bg-info text-dark' : 'bg-warning text-dark';

  const textoBadgeEstado = (request) =>
    request.esPropuesta ? 'Propuesta' : request.estado;

  const renderRequests = (requests) => {
    requestList.innerHTML = '';

    if (requests.length === 0) {
      requestList.innerHTML = `
        <p class="text-center text-secondary py-5" id="mensaje-solicitudes-vacias">
          No hay solicitudes pendientes.
        </p>
      `;
      return;
    }

    requests.forEach((request) => {
      const reviewParameters = new URLSearchParams({
        solicitud: String(request.idCita),
        nombre: request.nombreEncargado,
        estudiante: request.nombreEstudiante,
        motivo: request.motivo,
        descripcion: request.descripcion,
        fecha: request.fecha,
        hora: request.hora
      });
      // Le mando los datos para mostrarlos en la pantalla de posponer.
      const postponeParameters = new URLSearchParams({
        solicitud: String(request.idCita),
        nombre: request.nombreEncargado,
        estudiante: request.nombreEstudiante,
        motivo: request.motivo,
        fecha: request.fecha,
        hora: request.hora,
        propuesta: request.esPropuesta ? '1' : '',
        motivoPropuesta: request.motivoPropuesta || ''
      });

      requestList.innerHTML += `
        <article class="request-summary-card" id="tarjeta-solicitud-${request.idCita}"
          data-id-cita="${request.idCita}">
          <div class="request-summary-head">
            <h2 class="request-summary-student" id="nombre-solicitante-${request.idCita}">
              ${escapeHtml(request.nombreEncargado)}
            </h2>
            <span class="badge ${claseBadgeEstado(request)}">${escapeHtml(textoBadgeEstado(request))}</span>
          </div>

          <p class="request-summary-line" id="estudiante-solicitud-${request.idCita}">
            <span>Estudiante</span> ${escapeHtml(request.nombreEstudiante)}
          </p>
          <p class="request-summary-line" id="motivo-solicitud-${request.idCita}">
            <span>Motivo</span> ${escapeHtml(request.motivo)}
          </p>
          <p class="request-summary-line" id="cuando-solicitud-${request.idCita}">
            <span>${request.esPropuesta ? 'Fecha propuesta' : 'Fecha'}</span>
            ${escapeHtml(formatDate(request.fecha))} · ${escapeHtml(formatTime(request.hora))}
          </p>
          <div class="request-summary-actions" id="acciones-solicitud-${request.idCita}">
            <a class="request-list-action request-list-review" id="btn-revisar-solicitud-${request.idCita}"
              href="revisarSolicitud-docente.html?${reviewParameters.toString()}">
              Revisar
            </a>
            <a class="request-list-action request-list-postpone" id="btn-posponer-solicitud-${request.idCita}"
              href="posponerSolicitud-docente.html?${postponeParameters.toString()}">
              Posponer
            </a>
          </div>
        </article>
      `;
    });
  };

  requestList.innerHTML = `
    <p class="text-center text-secondary py-5" id="mensaje-cargando-solicitudes">
      Cargando solicitudes...
    </p>
  `;

  try {
    renderRequests(await obtenerSolicitudesDocente());
  } catch (error) {
    requestList.innerHTML = `
      <div class="text-center py-5" id="mensaje-error-solicitudes">
        <p class="text-secondary mb-2">No se pudieron cargar las solicitudes.</p>
      </div>
    `;
  }
});
