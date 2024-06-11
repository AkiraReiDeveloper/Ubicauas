let map;
let userLocation = { lat: 23.2319822, lng: -106.4228887 }; // Ubicación inicial predeterminada
let userMarker;
let activePolyline;
let remainingPathGlobal = []; // Ruta restante
let userToNextPointPolyline; // Línea del usuario al siguiente punto
let uasPolygon; // Polígono del campus
import { routes } from './routes.js';

const entrances = [
    { lat: 23.231975879019632, lng: -106.42292258616281, name: "Entrada 1" },
    { lat: 23.231363495545406, lng: -106.42337220653123, name: "Entrada 2" },
    { lat: 23.230448502004883, lng: -106.42674029892541, name: "Entrada 3" },
    { lat: 23.231243648265867, lng: -106.42799959886528, name: "Entrada 4" }
];

const destinations = {
    UAGYNM: { lat: 23.2313054059438, lng: -106.42617273640757, name: "UAGYNM" },
    FIMAZ: { lat: 23.231358, lng: -106.426643, name: "FIMAZ" },
    CentroIdiomas: { lat: 23.231829, lng: -106.426720, name: "Centro de Idiomas" },
    Turismo: { lat: 23.232277, lng: -106.426590, name: "Turismo" },
    Derecho: { lat: 23.232426, lng: -106.425873, name: "Derecho" },
    CienciasSociales: { lat: 23.232874, lng: -106.425827, name: "Ciencias Sociales" },
    TrabajoSocial: { lat: 23.232441, lng: -106.424774, name: "Trabajo Social" },
    Enfermeria: { lat: 23.231751, lng: -106.425453, name: "Enfermería" },
    FACEAM: { lat: 23.231878, lng: -106.424721, name: "FACEAM" },
    Arquitectura: { lat: 23.232168, lng: -106.424080, name: "Arquitectura" },
    Ingenieria: { lat: 23.232296, lng: -106.423790, name: "Ingeniería" },
    Educacion: { lat: 23.232166, lng: -106.425461, name: "Educación" }
};


let selectedDestination = null; // Variable para almacenar el destino seleccionado

function initMap() {
    const campusCenter = { lat: 23.2319822, lng: -106.425 }; // Centro aproximado del campus

    map = new google.maps.Map(document.getElementById('map'), {
        center: campusCenter,
        zoom: 17
    });

    const campusCoords = [
        { lat: 23.23125453442152, lng: -106.42803365428854 },
        { lat: 23.23387306581386, lng: -106.42616878279699 },
        { lat: 23.233473665166013, lng: -106.42486937917639 },
        { lat: 23.232318646324853, lng: -106.42304271565632 },
        { lat: 23.231332098698534, lng: -106.42282619152536 },
        { lat: 23.231481608421838, lng: -106.42504897701605 },
        { lat: 23.23134791081551, lng: -106.42565962142034 },
        { lat: 23.23107168477985, lng: -106.42597682666671 },
        { lat: 23.230564816459236, lng: -106.42637570665707 },
        { lat: 23.230460245973276, lng: -106.42673985538813 }
    ];

    uasPolygon = new google.maps.Polygon({
        paths: campusCoords,
        strokeColor: '#FF0000',
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: '#FF0000',
        fillOpacity: 0.35
    });
    uasPolygon.setMap(map);

    userMarker = new google.maps.Marker({
        position: userLocation,
        map: map,
        draggable: false, // Cambio aquí
        title: "Ubicación Actual"
    });

    google.maps.event.addListener(userMarker, 'dragend', function (evt) {
        userLocation = {
            lat: evt.latLng.lat(),
            lng: evt.latLng.lng()
        };
        updateFastestRoute(); // Llamada a la actualización de la ruta al mover el marcador
    });

    entrances.forEach((entrance) => {
        new google.maps.Marker({
            position: entrance,
            map: map,
            label: {
                text: entrance.name,
                fontWeight: 'bold',
                color: '#5491F5', // Azul cielo
                className: 'custom-marker-label'
            }
        });
    });

    Object.entries(destinations).forEach(([name, coords]) => {
        const destinationMarker = new google.maps.Marker({
            position: coords,
            map: map,
            label: {
                text: coords.name,
                fontWeight: 'bold',
                color: '#000000', // Azul cielo
                className: 'custom-marker-label'
            }
        });

        destinationMarker.addListener('click', () => {
            selectedDestination = name; // Almacenar el destino seleccionado
            updateFastestRoute(); // Llamada a la actualización de la ruta al hacer clic en el marcador de destino
        });
    });

    map.addListener('dragstart', () => {
        autoCenterEnabled = false; // Deshabilitar el centrado automático al arrastrar el mapa
    });

    trackUserLocation();
    drawStaticRoutes(); // Dibuja las rutas estáticas en verde
    displayDistances(); // Muestra las distancias de las rutas
}

function trackUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(
            function (position) {
                updateUserLocation(position.coords.latitude, position.coords.longitude);
            },
            function () {
                handleLocationError(true, map.getCenter());
            },
            {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 5000
            }
        );
    } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, map.getCenter());
    }
}

function updateUserLocation(lat, lng) {
    userLocation = {
        lat: lat,
        lng: lng
    };
    userMarker.setPosition(userLocation);
    if (autoCenterEnabled) {
        map.setCenter(userLocation);
    }
    updateFastestRoute(); // Llamar a la función para actualizar la ruta cuando la ubicación del usuario cambie
}

function drawStaticRoutes() {
    Object.values(routes).forEach(destinationRoutes => {
        destinationRoutes.forEach(path => {
            new google.maps.Polyline({
                path: path,
                geodesic: true,
                strokeColor: '#00FF00',
                strokeOpacity: 0,
                icons: [{
                    icon: {
                        path: google.maps.SymbolPath.CIRCLE,
                        scale: 4,
                        fillColor: '#00FF00',
                        fillOpacity: 0, // Relleno más claro
                        strokeColor: '#00FF00',
                        strokeWeight: 1
                    },
                    offset: '0',
                    repeat: '10px'
                }]
            }).setMap(map);
        });
    });
}

function calculateRouteDistance(route) {
    let distance = 0;
    for (let i = 0; i < route.length - 1; i++) {
        distance += google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(route[i].lat, route[i].lng),
            new google.maps.LatLng(route[i + 1].lat, route[i + 1].lng)
        );
    }
    return distance;
}

function displayDistances() {
    const distancesContainer = document.getElementById('distances');
    distancesContainer.innerHTML = ""; // Limpiar el contenedor antes de agregar nuevas distancias
    Object.entries(routes).forEach(([destination, paths], index) => {
        paths.forEach((route, routeIndex) => {
            const distance = calculateRouteDistance(route);
            const distanceElement = document.createElement('div');
            distanceElement.textContent = `${destination} Ruta ${routeIndex + 1}: ${distance.toFixed(2)} metros`;
            distancesContainer.appendChild(distanceElement);
        });
    });
}

function drawFastestRoute() {
    if (!selectedDestination || !routes[selectedDestination]) return;

    let minDistance = Infinity;
    let bestPath = null;
    let closestPointIndex = 0;

    routes[selectedDestination].forEach(path => {
        path.forEach((point, index) => {
            const distanceToPoint = google.maps.geometry.spherical.computeDistanceBetween(
                new google.maps.LatLng(userLocation.lat, userLocation.lng),
                new google.maps.LatLng(point.lat, point.lng)
            );

            if (distanceToPoint < minDistance) {
                minDistance = distanceToPoint;
                bestPath = path;
                closestPointIndex = index;
            }
        });
    });

    // Selecciona la ruta desde el punto más cercano hasta el final
    if (bestPath) {
        const remainingPath = bestPath.slice(closestPointIndex);

        if (activePolyline) {
            activePolyline.setMap(null);
        }

        activePolyline = new google.maps.Polyline({
            path: remainingPath,
            geodesic: true,
            strokeColor: '#0000FF',
            strokeOpacity: 1.0,
            strokeWeight: 2,
            icons: [{
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 7,
                    fillColor: '#0000FF',
                    fillOpacity: 0.8, // Relleno más claro
                    strokeColor: '#0000FF',
                    strokeWeight: 1
                },
                offset: '0',
                repeat: '18px'
            }]
        });
        activePolyline.setMap(map);

        // Actualiza el camino restante y la ruta desde la ubicación actual del usuario al siguiente punto
        remainingPathGlobal = remainingPath;
        updateRoute(userLocation);
    }
}

function updateFastestRoute() {
    if (!selectedDestination || !routes[selectedDestination]) return;

    if (!isUserInsideCampus(userLocation, uasPolygon)) {
        const closestEntrance = findClosestEntrance(userLocation);

        // Dibujar la ruta desde la ubicación actual del usuario a la entrada más cercana
        const pathToClosestEntrance = [
            userLocation,
            { lat: closestEntrance.lat, lng: closestEntrance.lng }
        ];

        if (userToNextPointPolyline) {
            userToNextPointPolyline.setMap(null);
        }

        userToNextPointPolyline = new google.maps.Polyline({
            path: pathToClosestEntrance,
            geodesic: true,
            strokeColor: '#FF0000', // Color diferente para indicar la redirección
            strokeOpacity: 1.0,
            strokeWeight: 2
        });
        userToNextPointPolyline.setMap(map);

        // Actualizar la ubicación del usuario a la entrada más cercana
        userLocation = { lat: closestEntrance.lat, lng: closestEntrance.lng };
    }

    drawFastestRoute(); // Actualizar la ruta más rápida hacia el destino seleccionado
}

function updateRoute(currentLocation) {
    // Eliminar la línea anterior
    if (userToNextPointPolyline) {
        userToNextPointPolyline.setMap(null);
    }

    let closestPointIndex = 0;
    let minDistanceToNextPoint = Infinity;

    // Encontrar el punto más cercano al destino final que el usuario aún no ha cruzado
    remainingPathGlobal.forEach((point, index) => {
        const distanceToNextPoint = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(currentLocation.lat, currentLocation.lng),
            new google.maps.LatLng(point.lat, point.lng)
        );

        if (distanceToNextPoint < minDistanceToNextPoint) {
            minDistanceToNextPoint = distanceToNextPoint;
            closestPointIndex = index;
        }
    });

    // Actualizar el camino restante
    remainingPathGlobal = remainingPathGlobal.slice(closestPointIndex);

    if (activePolyline) {
        activePolyline.setPath(remainingPathGlobal);
    }

    // Dibujar la línea desde el marcador del usuario al siguiente punto de la ruta
    if (remainingPathGlobal.length > 0) {
        const userToNextPointPath = [
            currentLocation,
            remainingPathGlobal[0]
        ];

        userToNextPointPolyline = new google.maps.Polyline({
            path: userToNextPointPath,
            geodesic: true,
            strokeColor: '#00FF00',
            strokeOpacity: 0,
            icons: [{
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 4,
                    fillColor: '#00FF00',
                    fillOpacity: 0, // Relleno más claro
                    strokeColor: '#00FF00',
                    strokeWeight: 1
                },
                offset: '0',
                repeat: '10px'
            }]
        });
        userToNextPointPolyline.setMap(map);
    }
}

function isUserInsideCampus(userLocation, campusPolygon) {
    return google.maps.geometry.poly.containsLocation(
        new google.maps.LatLng(userLocation.lat, userLocation.lng),
        campusPolygon
    );
}

function findClosestEntrance(userLocation) {
    let minDistance = Infinity;
    let closestEntrance = null;

    entrances.forEach(entrance => {
        const distance = google.maps.geometry.spherical.computeDistanceBetween(
            new google.maps.LatLng(userLocation.lat, userLocation.lng),
            new google.maps.LatLng(entrance.lat, entrance.lng)
        );

        if (distance < minDistance) {
            minDistance = distance;
            closestEntrance = entrance;
        }
    });

    return closestEntrance;
}

function handleLocationError(browserHasGeolocation, pos) {
    const infoWindow = new google.maps.InfoWindow({
        map: map
    });
    infoWindow.setPosition(pos);
    infoWindow.setContent(browserHasGeolocation ?
        'Error: The Geolocation service failed.' :
        'Error: Your browser doesn\'t support geolocation.');
}

window.onload = initMap;