// Protege las pantallas de la app. Al abrir cada una le pregunta a la
// API si la sesion sigue activa y si el rol corresponde.

import { obtenerSesion, esDocente, limpiarSesion } from "./sesionService.js";

const LOGIN = "../index.html";

// Escondo la pantalla mientras reviso, para que no se alcance a ver.
document.documentElement.style.visibility = "hidden";

const sesion = await obtenerSesion();

if (!sesion) {
    window.location.replace(LOGIN);
} else {
    const enDocentes = window.location.pathname.includes("/Docentes/");
    const enPadres = window.location.pathname.includes("/Padres/");
    const docente = esDocente(sesion.rol);

    const rolCorrecto = enDocentes ? docente : enPadres ? !docente : true;

    if (!rolCorrecto) {
        await limpiarSesion();
        window.location.replace(LOGIN);
    } else {
        document.documentElement.style.visibility = "visible";
    }
}
