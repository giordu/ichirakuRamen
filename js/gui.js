// gui.js: gestione dei controlli utente

/* CONFIGURAZIONE GUI*/
let guiConfig = {
    isSmokeAnimationActive: true,      
    isLampLightOn: true,               
    animateLights: false,
    acquistaBevanda: function() { acquistaBevandaAzione(); }, 
};


function setupUIControls() {
    const gui = new dat.GUI({ name: 'Controlli Ichiraku Diorama' });

    const fxFolder = gui.addFolder('Effetti Speciali');
    fxFolder.add(guiConfig, 'isSmokeAnimationActive').name('Vapore Caldo'); 
    fxFolder.open();

    const interactionFolder = gui.addFolder('Interazioni');
    interactionFolder.add(guiConfig, 'acquistaBevanda').name('Acquista Bibita');
    interactionFolder.open();

    const utils = {
        resetCamera: function() {
            theta = -2.1;       
            phi = 1.5;         
            radius = 2.5;
            console.log("Visuale resettata!"); //visuale resettata a quella iniziale (di default)
        }
    };
    gui.add(utils, 'resetCamera').name('Resetta Visuale');
}