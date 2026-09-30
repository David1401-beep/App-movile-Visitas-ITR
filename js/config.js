// La API desplegada en Heroku. Es la que usa la app ya empaquetada.
const API_EN_LA_NUBE = "https://gestor-de-visitas-itr-53fe7294e1e4.herokuapp.com/api/v1";

// Abriendo la app desde XAMPP se usa la API local, para poder seguir
// trabajando sin tocar la que esta publicada.
const EN_LOCAL = ["", "localhost", "127.0.0.1"].includes(window.location.hostname);
const API_LOCAL = "http://localhost:8080/api/v1";

export const API_BASE_URL = EN_LOCAL ? API_LOCAL : API_EN_LA_NUBE;
