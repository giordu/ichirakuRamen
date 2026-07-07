// main.js: inizializza motore WEBGL, imposta le connesioni tra CPU e GPU e render()

/* VARIABILI GLOBALI*/
let gl; //contesto webgl
let shaderProgram; //vertex + fragment shader

let smokeTimer = 0; //timer x animazione vapore
//importante perché è possibile che due oggetti utilizzino --> usata direttamente per la texture del fumo (no mtl) e in setupMaterialUniforms() per gli oggetti con mtl in mesh_loader.js
let loadedTextures = new Map(); //usata per associare i nomi dei file delle textures con quelle già caricate in memoria dalla GPU

//dallo shader
let locations = {
    attributes: {},
    uniforms: {}
};

/* INIZIALIZZAZIONE DEL MOTORE GRAFICO */
//funzione eseguita all'avvio della pagina(window.onload)
function initWebGL() {
    //preparazione canvas
    const canvas = document.getElementById("webgl-canvas");
    canvas.width = window.innerWidth; //copre intero schermo
    canvas.height = window.innerHeight; //copre intero schermo

    gl = canvas.getContext("webgl2", { antialias: true, powerPreference: "high-performance" });
    if (!gl) {
        alert("WebGL2 non supportato!");
        return;
    }

    gl.clearColor(0.02, 0.02, 0.04, 1.0); //colore di sfondo inziale
    gl.enable(gl.DEPTH_TEST); //attiva lo Z-buffer --> senza questo gli oggetti verrebbero disegnati a caso probabilmente finendo uno sopra l'altro

    shaderProgram = initShaderProgram(gl); // compila e collega vertex e fragment shader
    if (!shaderProgram) return; 

    //recupero attributi geometrici dagli shaders e salvo in locations 
    locations.attributes.position = gl.getAttribLocation(shaderProgram, "a_position");
    locations.attributes.normal = gl.getAttribLocation(shaderProgram, "a_normal");
    locations.attributes.texcoord = gl.getAttribLocation(shaderProgram, "a_texcoord");

    //meccanismo di sicurezza per le variabili geometriche degli shader
    // if (locations.attributes.position < 0) locations.attributes.position = 0;
    // if (locations.attributes.normal < 0) locations.attributes.normal = 1;
    // if (locations.attributes.texcoord < 0) locations.attributes.texcoord = 2;

    //recupero uniforms dagli shaders e salvo in locations
    locations.uniforms.projection = gl.getUniformLocation(shaderProgram, "u_projection");
    locations.uniforms.view = gl.getUniformLocation(shaderProgram, "u_view");
    locations.uniforms.model = gl.getUniformLocation(shaderProgram, "u_model");
    locations.uniforms.lightPosition = gl.getUniformLocation(shaderProgram, "u_lightPosition");
    locations.uniforms.lightColor = gl.getUniformLocation(shaderProgram, "u_lightColor");
    locations.uniforms.lightIntensity = gl.getUniformLocation(shaderProgram, "u_lightIntensity");
    locations.uniforms.cameraPosition = gl.getUniformLocation(shaderProgram, "u_cameraPosition");
    locations.uniforms.materialColor = gl.getUniformLocation(shaderProgram, "u_materialColor");
    locations.uniforms.useTexture = gl.getUniformLocation(shaderProgram, "u_useTexture");
    locations.uniforms.lampLightPosition = gl.getUniformLocation(shaderProgram, "u_lampLightPosition");
    locations.uniforms.lampLightColor = gl.getUniformLocation(shaderProgram, "u_lampLightColor");
    locations.uniforms.smokeTime = gl.getUniformLocation(shaderProgram, "u_smokeTime");
    locations.uniforms.isSmoke = gl.getUniformLocation(shaderProgram, "u_isSmoke");
    
    //caricamenti degli oggetti 3D (definiti in mesh_loaders.js)
    loadModelPipeline("assets/models/vapore.obj", "smoke");
    loadModelPipeline("assets/models/ramen_shop.obj", "shop");
    loadModelPipeline("assets/models/street_lamp.obj", "lamp");
    loadModelPipeline("assets/models/bench.obj", "bench");
    loadModelPipeline("assets/models/vending_machine.obj", "vending");
    loadModelPipeline("assets/models/pole_sign.obj", "pole_sign");
    loadModelPipeline("assets/models/ramen_sign.obj", "ramen_sign");

    //caricamento texture del fumo
    let smokeTex = gl.createTexture();
    let smokeImg = new Image();
    smokeImg.src = "assets/textures/vapore/fumo.png"; 
    smokeImg.onload = function() {
        gl.bindTexture(gl.TEXTURE_2D, smokeTex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); //per la gestione dell'origine
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, smokeImg);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); //gestisce il rimpicciolimento
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); //gestisce l'ingrandimento
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); //sull'asse orizzontale l'img non si ripete
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT); //sull'asse verticale l'img si ripete all'infinito, quando esce dal bordo superiore rientra dal bordo inferiore
        gl.generateMipmap(gl.TEXTURE_2D);
        loadedTextures.set("fumo.png", smokeTex);
    }; 

    setupInputs(canvas);   // da camera.js: inizializza controlli scena
    setupUIControls();     // da gui.js: inzializza controlli gui
    render(); // fa partire l'animazione
}

/* RENDERING */
function render() {
    let time = performance.now() * 0.001;
    smokeTimer += 0.005; 

    // gestione ciclo giorno notte
    guiConfig.oraDelGiorno = (time * 0.5) % 24; 
    let ora = guiConfig.oraDelGiorno;
    let intensitaSole = 1.0;
    let coloreSole = [1.0, 1.0, 1.0];     
    let coloreCielo = [0.5, 0.7, 0.9];    
    let lampioneAccesoAdesso = guiConfig.isLampLightOn;

    // fase 1: NOTTE
    if (ora >= 20.0 || ora <= 5.0) {
        intensitaSole = 0.15;               
        coloreSole = [0.15, 0.15, 0.3];     
        coloreCielo = [0.01, 0.01, 0.04];  
        lampioneAccesoAdesso = true;    
    //fase 2: TRAMONTO
    } else if (ora > 17.0 && ora < 20.0) {
        let t = (ora - 17.0) / 3.0; 
        intensitaSole = 1.8 * (1.0 - t) + 0.15 * t; 
        coloreSole = [1.0, 0.4 * (1.0 - t) + 0.15 * t, 0.15 * (1.0 - t) + 0.3 * t]; 
        coloreCielo = [0.5 * (1.0 - t) + 0.01 * t, 0.7 * (1.0 - t) + 0.01 * t, 0.9 * (1.0 - t) + 0.04 * t]; 
        if (t > 0.6) lampioneAccesoAdesso = true; 
    // fase 3: ALBA
    } else if (ora > 5.0 && ora < 8.0) {
        let t = (ora - 5.0) / 3.0;
        intensitaSole = 0.15 * (1.0 - t) + 1.8 * t; 
        coloreSole = [1.0, 0.3 * (1.0 - t) + 1.0 * t, 0.2 * (1.0 - t) + 1.0 * t]; 
        coloreCielo = [0.01 * (1.0 - t) + 0.5 * t, 0.01 * (1.0 - t) + 0.7 * t, 0.04 * (1.0 - t) + 0.9 * t];
        if (t > 0.4) lampioneAccesoAdesso = false; 
    // fase 4: GIORNO
    } else {
        intensitaSole = 2.0;
        coloreSole = [1.0, 0.95, 0.9];
        coloreCielo = [0.4, 0.6, 0.85];
        lampioneAccesoAdesso = false;   
    }
    
    // gestione pulsante lampione nella gui
    guiConfig.isLampLightOn = lampioneAccesoAdesso;

    gl.clearColor(coloreCielo[0], coloreCielo[1], coloreCielo[2], 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (!gl || !shaderProgram || (shopVAO === null && lampVAO === null && benchVAO === null)) {
        requestAnimationFrame(render);
        return;
    }

    /* INVIO DEI DATI GLOBALI ALLO SHADER*/
    updateCamera(); // da camera.js
    gl.useProgram(shaderProgram);

    gl.uniformMatrix4fv(locations.uniforms.projection, false, projectionMatrix);
    gl.uniformMatrix4fv(locations.uniforms.view, false, viewMatrix);

    gl.uniform3f(locations.uniforms.lightPosition, 0.0, 3.0, 1.5);
    gl.uniform1f(locations.uniforms.lightIntensity, intensitaSole);
    gl.uniform3f(locations.uniforms.lightColor, coloreSole[0], coloreSole[1], coloreSole[2]);

    if (locations.uniforms.lampLightPosition) gl.uniform3f(locations.uniforms.lampLightPosition, 0.9, 0.6, 0.9);
    if (locations.uniforms.lampLightColor) {
        if (lampioneAccesoAdesso) gl.uniform3f(locations.uniforms.lampLightColor, 1.0, 0.65, 0.3); 
        else gl.uniform3f(locations.uniforms.lampLightColor, 0.0, 0.0, 0.0); 
    }
    
    let eyeX = radius * Math.sin(phi) * Math.sin(theta);
    let eyeY = radius * Math.cos(phi);
    let eyeZ = radius * Math.sin(phi) * Math.cos(theta);
    gl.uniform3f(locations.uniforms.cameraPosition, eyeX, eyeY, eyeZ);

    /* RENDERING DEGLI OGGETTI SOLIDI*/
    //NEGOZIO DI RAMEN
    if (shopVAO !== null && shopMesh !== null) {
        gl.bindVertexArray(shopVAO); //dico alla gpu di prendere dalla memoria i triangoli di questo modello
        gl.uniform1i(locations.uniforms.isSmoke, 0); 
        gl.uniform1f(locations.uniforms.smokeTime, time);

        shopMesh.groups.forEach(group => {
            if (group.triangles.length > 0) {
                let face = shopMesh.face[group.triangles[0]];
                let mat = shopMesh.materials[face.material];
                let shopMatrix = m4.identity(); //costruzione della matrice modello
                if (mat) {
                    setupMaterialUniforms(mat); //lettura materiale e invio allo shader
                    if (mat.name === "aiStandardSurface2") { //textures di cui fanno parte le lanterne
                        shopMatrix[4] = Math.sin(time * 1.2) * 0.07; //animazione lampade ramen shop
                    }
                }
                gl.uniformMatrix4fv(locations.uniforms.model, false, shopMatrix);
                group.triangles.forEach(tIdx => gl.drawArrays(gl.TRIANGLES, (tIdx - 1) * 3, 3)); //disegno dell'oggetto vero e proprio
            }
        });
    }

    if (lampVAO !== null && lampMesh !== null) {
        gl.bindVertexArray(lampVAO);
        lampMesh.groups.forEach(group => {
            if (group.triangles.length > 0) {
                let face = lampMesh.face[group.triangles[0]];
                let mat = lampMesh.materials[face.material];
                let lampMatrix = m4.identity();
                lampMatrix = m4.translate(lampMatrix, 0.9, -0.15, 0.9); 
                lampMatrix = m4.scale(lampMatrix, 0.5, 0.5, 0.5); 
                if (mat) setupMaterialUniforms(mat);
                gl.uniformMatrix4fv(locations.uniforms.model, false, lampMatrix);
                group.triangles.forEach(tIdx => gl.drawArrays(gl.TRIANGLES, (tIdx - 1) * 3, 3));
            }
        });
    }

    if (benchVAO !== null && benchMesh !== null) {
        gl.bindVertexArray(benchVAO);
        benchMesh.groups.forEach(group => {
            if (group.triangles.length > 0) {
                let face = benchMesh.face[group.triangles[0]];
                let mat = benchMesh.materials[face.material];
                let benchMatrix = m4.identity();
                benchMatrix = m4.translate(benchMatrix, 0.6, -0.57, 0.9); 
                benchMatrix = m4.yRotate(benchMatrix, Math.PI);
                benchMatrix = m4.scale(benchMatrix, 0.25, 0.25, 0.25); 
                if (mat) setupMaterialUniforms(mat);
                gl.uniformMatrix4fv(locations.uniforms.model, false, benchMatrix);
                group.triangles.forEach(tIdx => gl.drawArrays(gl.TRIANGLES, (tIdx - 1) * 3, 3));
            }
        });
    }

    if (poleSignVAO !== null && poleSignMesh !== null) {
        gl.bindVertexArray(poleSignVAO);
        poleSignMesh.groups.forEach(group => {
            if (group.triangles.length > 0) {
                let face = poleSignMesh.face[group.triangles[0]];
                let mat = poleSignMesh.materials[face.material];
                let poleMatrix = m4.identity();
                poleMatrix = m4.translate(poleMatrix, 0.5, -0.4, 0.5);
                poleMatrix = m4.scale(poleMatrix, 0.3, 0.3, 0.3); 
                if (mat) setupMaterialUniforms(mat);
                gl.uniformMatrix4fv(locations.uniforms.model, false, poleMatrix);
                group.triangles.forEach(tIdx => gl.drawArrays(gl.TRIANGLES, (tIdx - 1) * 3, 3));
            }
        });
    }

    if (ramenSignVAO !== null && ramenSignMesh !== null) {
        gl.bindVertexArray(ramenSignVAO);
        let oscillazione = Math.sin(time * 1.7) * 0.02;
        ramenSignMesh.groups.forEach(group => {
            if (group.triangles.length > 0) {
                let face = ramenSignMesh.face[group.triangles[0]];
                let mat = ramenSignMesh.materials[face.material];
                let ramenMatrix = m4.identity();
                ramenMatrix = m4.translate(ramenMatrix, 0.52, -0.2, 0.57);
                ramenMatrix = m4.yRotate(ramenMatrix, oscillazione);
                ramenMatrix = m4.scale(ramenMatrix, 0.08, 0.08, 0.08); 
                if (mat) setupMaterialUniforms(mat);
                gl.uniformMatrix4fv(locations.uniforms.model, false, ramenMatrix);
                group.triangles.forEach(tIdx => gl.drawArrays(gl.TRIANGLES, (tIdx - 1) * 3, 3));
            }
        });
    }

    if (vendingVAO !== null && vendingMesh !== null) {
        gl.bindVertexArray(vendingVAO);
        vendingMesh.groups.forEach(group => {
            let face = vendingMesh.face[group.triangles[0]];
            let mat = vendingMesh.materials[face.material];
            let vendingMatrix = m4.identity();
            vendingMatrix = m4.translate(vendingMatrix, -0.86, -0.40, 0.93); 
            vendingMatrix = m4.scale(vendingMatrix, 0.23, 0.23, 0.23); 
            if (mat) setupMaterialUniforms(mat);
            gl.uniformMatrix4fv(locations.uniforms.model, false, vendingMatrix);
            group.triangles.forEach(tIdx => gl.drawArrays(gl.TRIANGLES, (tIdx - 1) * 3, 3));
        });
    }

    // TRANSPARENT GEOMETRY (SMOKE)
    if (guiConfig.isSmokeAnimationActive && smokeVAO !== null && smokeMesh !== null) {
        gl.enable(gl.BLEND); 
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false); //disattivo lo z-buffer
        gl.bindVertexArray(smokeVAO);
        gl.uniform1i(locations.uniforms.isSmoke, 1);

        smokeMesh.groups.forEach(group => {
            if (group.triangles.length > 0) {
                let smokeTex = loadedTextures.get("fumo.png");
                if (smokeTex) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, smokeTex); gl.uniform1i(locations.uniforms.useTexture, 1); }
                let fumoOpacita = (ora >= 19.0 || ora <= 5.0) ? 0.2 : 0.05;                
                gl.uniform3f(locations.uniforms.materialColor, fumoOpacita, fumoOpacita, fumoOpacita);

                let smokeMatrix = m4.identity();
                smokeMatrix = m4.translate(smokeMatrix, 0.29, -0.2, 0.39); 
                //BILLBOARDING SFERICO: permette ad un elemendo 2D (in questo caso il mio vapore) di simulare un volume 3D
                //si fa così in modo tale che girando la telecamera il fumo continui ad apparire ancora 3d ad ogni movimento
                smokeMatrix[0] = viewMatrix[0]; smokeMatrix[1] = viewMatrix[4]; smokeMatrix[2] = viewMatrix[8]; 
                smokeMatrix[4] = viewMatrix[1]; smokeMatrix[5] = viewMatrix[5]; smokeMatrix[6] = viewMatrix[9]; 
                smokeMatrix[8] = viewMatrix[2]; smokeMatrix[9] = viewMatrix[6]; smokeMatrix[10] = viewMatrix[10]; 
                smokeMatrix = m4.scale(smokeMatrix, 0.15, 0.2, 0.25);

                gl.uniformMatrix4fv(locations.uniforms.model, false, smokeMatrix);
                group.triangles.forEach(tIdx => gl.drawArrays(gl.TRIANGLES, (tIdx - 1) * 3, 3));
            }
        });
        gl.depthMask(true); //riattivo lo z-buffer
        gl.disable(gl.BLEND); 
        gl.uniform1i(locations.uniforms.isSmoke, 0);
    }
    
    gl.bindVertexArray(null); //asincronia delle chiamate 
    requestAnimationFrame(render); //scheduling del fotogramma successivo
}

window.onload = initWebGL;