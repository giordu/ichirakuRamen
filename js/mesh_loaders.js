// js/mesh_loaders.js

/* VARIABILI GLOBALI */
window.shopMesh = null; window.shopVAO = null;
window.lampVAO = null; window.lampMesh = null;
window.benchVAO = null; window.benchMesh = null;
window.smokeMesh = null; window.smokeVAO = null;
window.vendingMesh = null; window.vendingVAO = null;
window.poleSignMesh = null; window.poleSignVAO = null;
window.ramenSignMesh = null; window.ramenSignVAO = null;

/* PIPELINE DI CARICAMENTO */
function loadModelPipeline(objUrl, type) {
    let realFolder = objUrl.substring(0, objUrl.lastIndexOf('/') + 1);
    
    let filename = objUrl.split('/').pop();          
    let modelName = filename.split('.')[0];         
    let textureFolder = "assets/textures/" + modelName + "/";

    fetch(objUrl)
        .then(response => { 
            if (!response.ok) throw new Error("Errore caricamento OBJ: " + objUrl); 
            return response.text(); 
        })
        .then(objData => {
            let mesh = { vert: [], normal: [], textCoords: [], face: [], groups: [], materials: [], facetnorms: [], nvert: 0, nface: 0 };
            
            let objResult = glmReadOBJ(objData, mesh);
            if (objResult && objResult.mesh) {
                mesh = objResult.mesh;
            }

            Unitize(mesh);

            assignMesh(type, mesh)

            if (objResult && objResult.fileMtl && objResult.fileMtl.trim() !== "" && objResult.fileMtl !== "None") {
                let mtlUrl = realFolder + objResult.fileMtl;
                
                fetch(mtlUrl)
                    .then(res => { 
                        if (!res.ok) throw new Error("Errore caricamento MTL: " + mtlUrl); 
                        return res.text(); 
                    })
                    .then(mtlData => {
                        glmReadMTL(mtlData, mesh);
                        
                        preloadMaterialTextures(mesh, textureFolder);
                        
                        let vao = buildGenericBuffer(mesh); //creazione del buffer nella memoria della scheda video
                        assignVao(type, vao);
                    })
                    .catch(err => {
                        console.warn("MTL non trovato o vuoto per " + type + ", procedo solo con la geometria.", err);
                        let vao = buildGenericBuffer(mesh);
                        assignVao(type, vao);
                    });
            } else {
                let vao = buildGenericBuffer(mesh);
                assignVao(type, vao);
            }
        }).catch(err => console.error(err));
}

/* FUNZIONE DI UTILITY: assegna i VAO alle variabili globali */
function assignVao(type, vao) {
    if (type === "shop") window.shopVAO = vao;
    if (type === "lamp") window.lampVAO = vao;
    if (type === "bench") window.benchVAO = vao;
    if (type === "smoke") window.smokeVAO = vao;
    if (type === "vending") window.vendingVAO = vao;
    if (type === "pole_sign") window.poleSignVAO = vao;
    if (type === "ramen_sign") window.ramenSignVAO = vao;
}

/* FUNZIONE DI UTILITY: assegna le MESH alle variabili globali */
function assignMesh(type, mesh) {
    if (type === "shop") window.shopMesh = mesh;
    if (type === "lamp") window.lampMesh = mesh;
    if (type === "bench") window.benchMesh = mesh;
    if (type === "smoke") window.smokeMesh = mesh;
    if (type === "vending") window.vendingMesh = mesh;
    if (type === "pole_sign") window.poleSignMesh = mesh;
    if (type === "ramen_sign") window.ramenSignMesh = mesh;
}

/* FUNZIONE DI UTILITY: Carica le immagini delle texture */
function preloadMaterialTextures(mesh, textureFolder) {
    if (!mesh || !mesh.materials) return;

    mesh.materials.forEach(mat => {
        if (mat.parameter && mat.parameter.has("map_Kd")) {
            let imgName = mat.parameter.get("map_Kd");
            if (!loadedTextures.has(imgName)) {
                let tex = gl.createTexture();
                gl.bindTexture(gl.TEXTURE_2D, tex);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([150, 150, 150, 255]));

                let img = new Image();
                img.onload = function() {
                    gl.bindTexture(gl.TEXTURE_2D, tex);
                    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
                    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
                    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
                    gl.generateMipmap(gl.TEXTURE_2D);
                };
                
                img.src = textureFolder + imgName; 
                
                loadedTextures.set(imgName, tex);
            }
        }
    });
}

/* FUNZIONE DI UTILITY: Costruisce i buffer WebGL (VAO)*/
function buildGenericBuffer(mesh) {
    let positions = [], normals = [], texcoords = [];
    for (let i = 1; i <= mesh.nface; i++) {
        let face = mesh.face[i];
        for (let j = 0; j < 3; j++) {
            let vIdx = face.vert[j];  //coordinate geometriche
            let nIdx = face.normalVertexIndex[j]; //coordinate normali
            let tIdx = face.textCoordsIndex[j]; //coordinate uv
            
            positions.push(mesh.vert[vIdx].x, mesh.vert[vIdx].y, mesh.vert[vIdx].z);
            if (mesh.normal[nIdx]) normals.push(mesh.normal[nIdx].i, mesh.normal[nIdx].j, mesh.normal[nIdx].k); 
            else normals.push(0, 1, 0);
            if (mesh.textCoords[tIdx]) texcoords.push(mesh.textCoords[tIdx].u, mesh.textCoords[tIdx].v); 
            else texcoords.push(0, 0);
        }
    }
    let vao = gl.createVertexArray(); 
    gl.bindVertexArray(vao);
    
    const b1 = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b1); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locations.attributes.position); gl.vertexAttribPointer(locations.attributes.position, 3, gl.FLOAT, false, 0, 0);
    
    const b2 = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b2); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locations.attributes.normal); gl.vertexAttribPointer(locations.attributes.normal, 3, gl.FLOAT, false, 0, 0);
    
    const b3 = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, b3); gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(texcoords), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(locations.attributes.texcoord); gl.vertexAttribPointer(locations.attributes.texcoord, 2, gl.FLOAT, false, 0, 0);
    
    gl.bindVertexArray(null);
    return vao;
}

/* FUNZIONE DI UTILITY: Applica i materiali prima del disegno */
function setupMaterialUniforms(mat) {
    let kd = mat.parameter.get("Kd") || [1.0, 1.0, 1.0];
    gl.uniform3f(locations.uniforms.materialColor, kd[0], kd[1], kd[2]);
    
    if (mat.parameter.has("map_Kd")) {
        let texName = mat.parameter.get("map_Kd");
        let webglTex = loadedTextures.get(texName);
        if (webglTex) {
            gl.activeTexture(gl.TEXTURE0); 
            gl.bindTexture(gl.TEXTURE_2D, webglTex);
            gl.uniform1i(locations.uniforms.useTexture, 1);
            return;
        }
    }
    gl.uniform1i(locations.uniforms.useTexture, 0);
}