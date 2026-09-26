import { aceptarSolicitud, rechazarSolicitud } from "../Service/SolicitudDocenteService.js";

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

function mostrarError(mensaje) {
    if (window.Swal) {
        Swal.fire({ icon: 'error', title: 'Ocurrió un problema', text: mensaje });
    } else {
        alert(mensaje);
    }
}

// Lee la solicitud desde los parámetros que envía verSolicitud.html y conecta
// los botones Aceptar/Rechazar a la API (antes solo mostraban un modal falso).
document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const idCita = params.get('solicitud');
    const nombre = params.get('nombre') || 'Encargado';
    const motivo = params.get('motivo') || '';
    const descripcion = params.get('descripcion') || '';

    const elemNombre = document.getElementById('nombre-solicitante-revision');
    const elemMotivo = document.getElementById('motivo-solicitud');
    const elemDescripcion = document.getElementById('descripcion-solicitud');

    if (elemNombre) elemNombre.textContent = nombre;
    if (elemMotivo) elemMotivo.textContent = motivo;
    if (elemDescripcion) elemDescripcion.textContent = descripcion;

    const textoAceptar = document.getElementById('texto-solicitante-aceptar');
    if (textoAceptar) textoAceptar.textContent = nombre;

    const textoRechazar = document.getElementById('texto-solicitante-rechazar-nombre');
    if (textoRechazar) textoRechazar.textContent = nombre;

    const comentarios = document.getElementById('comentarios-revision');

    const btnAceptar = document.getElementById('btn-aceptar-solicitud');
    const acceptModalEl = document.getElementById('modal-exito-aceptar');
    const acceptModal = acceptModalEl ? createCompatibleModal(acceptModalEl) : null;

    const btnRechazar = document.getElementById('btn-rechazar-solicitud');
    const rejectModalEl = document.getElementById('modal-exito-rechazar');
    const rejectModal = rejectModalEl ? createCompatibleModal(rejectModalEl) : null;

    if (!idCita) {
        mostrarError('No se pudo identificar la solicitud. Vuelva a la lista e inténtelo de nuevo.');
        if (btnAceptar) btnAceptar.disabled = true;
        if (btnRechazar) btnRechazar.disabled = true;
        return;
    }

    btnAceptar?.addEventListener('click', async () => {
        btnAceptar.disabled = true;

        try {
            await aceptarSolicitud(idCita);
            acceptModal?.show();
        } catch (error) {
            mostrarError(error.message);
        } finally {
            btnAceptar.disabled = false;
        }
    });

    btnRechazar?.addEventListener('click', async () => {
        btnRechazar.disabled = true;

        try {
            await rechazarSolicitud(idCita, comentarios?.value || '');
            rejectModal?.show();
        } catch (error) {
            mostrarError(error.message);
        } finally {
            btnRechazar.disabled = false;
        }
    });

    acceptModalEl?.addEventListener('hidden.bs.modal', () => {
        window.location.href = 'verSolicitud-docente.html';
    });

    rejectModalEl?.addEventListener('hidden.bs.modal', () => {
        window.location.href = 'verSolicitud-docente.html';
    });
});
