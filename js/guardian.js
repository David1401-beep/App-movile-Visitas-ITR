// Protege las pantallas de la app. Al abrir cada una le pregunta a la
// API si la sesion sigue activa y si el rol corresponde.

import { obtenerSesion, esDocente, limpiarSesion } from "./sesionService.js";

const LOGIN = "inicioSesion.html";

// Escondo la pantalla mientras reviso, para que no se alcance a ver.
document.documentElement.style.visibility = "hidden";

const sesion = await obtenerSesion();

if (!sesion) {
    window.location.replace(LOGIN);
} else {
    // Ahora todas las pantallas estan en pages/, asi que el rol se sabe
    // por el final del nombre del archivo y ya no por la carpeta.
    const pagina = window.location.pathname.toLowerCase();
    const enDocentes = pagina.endsWith("-docente.html");
    const enPadres = pagina.endsWith("-padres.html");
    const docente = esDocente(sesion.rol);

    const rolCorrecto = enDocentes ? docente : enPadres ? !docente : true;

    if (!rolCorrecto) {
        await limpiarSesion();
        window.location.replace(LOGIN);
    } else {
        document.documentElement.style.visibility = "visible";
    }
}
