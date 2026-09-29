// URL de la API ya desplegada. Cuando este en Heroku se pone aqui, por
// ejemplo: "https://visitas-itr-api.herokuapp.com/api/v1"
// Mientras este vacio se usa la de abajo, que sirve para trabajar en local.
const API_EN_LA_NUBE = "";

const EN_LOCAL = ["", "localhost", "127.0.0.1"].includes(window.location.hostname);
const HOST_API = EN_LOCAL ? "localhost" : window.location.hostname;

export const API_BASE_URL = API_EN_LA_NUBE
  ? API_EN_LA_NUBE
  : `http://${HOST_API}:8080/api/v1`;
