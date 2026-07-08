// camera.js: logica della camera e input utente

/* COORDINATE SFERICHE*/
let theta = -2.3; //angolo orizzontale      
let phi = 1.5; //angolo verticale
let radius = 2.9; //raggio: distanza dalla camera al centro della camera

/* MATRICI DA INVIARE ALO SHADER PER DISEGNARE LA SCENA 3D SUL MONITOR 2D*/
let projectionMatrix; 
let viewMatrix;

let isDragging = false;
let previousMouseX = 0, previousMouseY = 0;

/* FUNZIONE PER AGGIORNARE OGNI VOLTA I PARAMETRI DELLA CAMERA*/
function updateCamera() {
    if (phi > Math.PI / 2 - 0.01) phi = Math.PI / 2 - 0.01; //impedisce alla camera di andare sotto al pavimento
    if (phi < 0.01) phi = 0.01;

    // coordinate sferiche --> coordinate cartesiane
    let eyeX = radius * Math.sin(phi) * Math.sin(theta);
    let eyeY = radius * Math.cos(phi);
    let eyeZ = radius * Math.sin(phi) * Math.cos(theta);

    let cameraMatrix = m4.lookAt([eyeX, eyeY, eyeZ], [0, 0, 0], [0, 1, 0]);
    viewMatrix = m4.inverse(cameraMatrix);

    const fieldOfView = (45 * Math.PI) / 180;
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight; //sistemo per evitare che gli oggetti appaiano schiacciatio allungati quando la finestra del browser viene ridimensionata
    projectionMatrix = m4.perspective(fieldOfView, aspect, 0.1, 100.0);
}

/* GESTIONE DEGLI INPUT*/
function setupInputs(canvas) {
    //MOUSE
    canvas.addEventListener('mousedown', (e) => { isDragging = true; previousMouseX = e.clientX; previousMouseY = e.clientY; });
    window.addEventListener('mouseup', () => { isDragging = false; });
    canvas.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        let deltaX = e.clientX - previousMouseX; let deltaY = e.clientY - previousMouseY;
        theta -= deltaX * 0.005; phi -= deltaY * 0.005;
        previousMouseX = e.clientX; previousMouseY = e.clientY;
    });
    canvas.addEventListener('wheel', (e) => { radius += e.deltaY * 0.005; if (radius < 1.0) radius = 1.0; if (radius > 10.0) radius = 10.0; }); // zoom con rotella del mouse

    //TOUCH
    canvas.addEventListener('touchstart', (e) => { if(e.touches.length === 1) { isDragging = true; previousMouseX = e.touches[0].clientX; previousMouseY = e.touches[0].clientY; } }, {passive: true});
    window.addEventListener('touchend', () => { isDragging = false; });
    canvas.addEventListener('touchmove', (e) => {
        if (!isDragging || e.touches.length !== 1) return;
        let deltaX = e.touches[0].clientX - previousMouseX; let deltaY = e.touches[0].clientY - previousMouseY;
        theta -= deltaX * 0.005; phi -= deltaY * 0.005;
        previousMouseX = e.touches[0].clientX; 
        previousMouseY = e.touches[0].clientY;
    }, {passive: true});

    //WASD
    window.addEventListener('keydown', (e) => {
        const step = 0.05;
        if (e.key === "ArrowLeft" || e.key === "a")  theta += step;  //ruota camera verso sx
        if (e.key === "ArrowRight" || e.key === "d") theta -= step;  //ruota camera verso dx
        if (e.key === "ArrowUp" || e.key === "w")    phi -= step;    //alza la camera verso alto
        if (e.key === "ArrowDown" || e.key === "s")  phi += step;    //abbassa la camera verso il suolo
    });

    //INTRO
    document.getElementById('btn-inizio').addEventListener('click', () => {
        const overlay = document.getElementById('overlay-istruzioni');
        overlay.style.display = 'none';
        
        if (typeof sottofondoCucina !== 'undefined') {
            sottofondoCucina.play().catch(err => console.log("Errore audio:", err)); //una volta che l'utente clicca 'Entra', parte il sottofondo della cucina
        }
    });
}