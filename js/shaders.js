/* --- VERTEX SHADER (GLSL) --- */
const vertexShaderSource = `#version 300 es
//attributi
in vec3 a_position; //posizione nello spazio (xyz) 
in vec3 a_normal;  //normale (ijk)
in vec2 a_texcoord; //coordinate uv texture

uniform mat4 u_projection; //matrice di proiezione
uniform mat4 u_view;  //matrice di vista: sposta il mondo in base a dove si trova la camera
uniform mat4 u_model;  // matrice modello: sposta, ruota e scala l'oggetto nel mondo
uniform vec3 u_lightPosition; 
uniform vec3 u_cameraPosition; 

uniform highp float u_smokeTime;
uniform highp int u_isSmoke;

//varying
out vec3 v_position;       
out vec3 v_normal;         
out vec3 v_surfaceToLight; 
out vec3 v_surfaceToView;  
out vec2 v_texcoord;       

void main() {
    vec3 animatedPosition = a_position;

    // ANIMAZIONE VERTICALE DEL FUMO 
    if (u_isSmoke == 1) {
        float altezza = a_texcoord.y; 
        animatedPosition.x *= (1.0 + altezza * 0.4);
        animatedPosition.y += sin(u_smokeTime * 2.0 + altezza * 3.0) * 0.02 * altezza;
        animatedPosition.x += sin(u_smokeTime * 1.5 + altezza * 4.0) * 0.03 * altezza;
    } 

    vec4 worldPosition = u_model * vec4(animatedPosition, 1.0);
    gl_Position = u_projection * u_view * worldPosition;

    v_position = worldPosition.xyz; 
    v_normal = mat3(u_model) * a_normal; //normalizzazione iniziale
    v_surfaceToLight = u_lightPosition - worldPosition.xyz;
    v_surfaceToView = u_cameraPosition - worldPosition.xyz; 
    v_texcoord = a_texcoord;
}
`;

/* --- FRAGMENT SHADER (GLSL) --- */
const fragmentShaderSource = `#version 300 es
precision highp float;
precision highp int; 

//dal vertex: interpolati in fase di rasterizzazione
in vec3 v_position; 
in vec3 v_normal;
in vec3 v_surfaceToLight;
in vec3 v_surfaceToView;
in vec2 v_texcoord;

uniform sampler2D u_texture;    
uniform vec3 u_lightColor;      
uniform float u_lightIntensity; 
uniform vec3 u_materialColor;   
uniform int u_useTexture;  
 
uniform vec3 u_lampLightPosition;
uniform vec3 u_lampLightColor;

uniform highp float u_smokeTime;
uniform highp int u_isSmoke;

out vec4 outColor;              

void main() {
    vec3 normal = normalize(v_normal); //nuovamente normalizzo post interpolazione ( x PHONG SHADING)
    vec3 surfaceToViewDirection = normalize(v_surfaceToView);

    // ========================================================
    // LUCE 1: NEGOZIO DI RAMEN (Blinn-Phong)
    // ========================================================
    vec3 surfaceToLightDirection = normalize(v_surfaceToLight);
    vec3 halfVector = normalize(surfaceToLightDirection + surfaceToViewDirection);

    float diffuseLight = max(dot(normal, surfaceToLightDirection), 0.0);
    vec3 diffuse = u_lightColor * diffuseLight * u_lightIntensity;

    float specularLight = 0.0;
    if (diffuseLight > 0.0) {//il pow definisce la lucentezza
        specularLight = pow(max(dot(normal, halfVector), 0.0), 16.0); //prende l'angolo tra la normale e l'halfway vector. Più sono allineati più il riflesso acceca. 
    }
    vec3 specular = u_lightColor * specularLight * u_lightIntensity * 0.2;

    // ========================================================
    // LUCE 2: IL LAMPIONE
    // ========================================================
    vec3 surfaceToLampDir = normalize(u_lampLightPosition - v_position);
    vec3 halfVectorLamp = normalize(surfaceToLampDir + surfaceToViewDirection);

    float diffuseLightLamp = max(dot(normal, surfaceToLampDir), 0.0);
    
    float distanceToLamp = length(u_lampLightPosition - v_position);
    float attenuation = 1.0 / (1.0 + 1.5 * distanceToLamp * distanceToLamp); //essendo una luce puntiforme ha bisogno di attenuazione

    vec3 diffuseLamp = u_lampLightColor * diffuseLightLamp * attenuation * 2.5; 

    float specularLightLamp = 0.0;
    if (diffuseLightLamp > 0.0) { //il pow definisce la lucentezza
        specularLightLamp = pow(max(dot(normal, halfVectorLamp), 0.0), 8.0); //prende l'angolo tra la normale e l'halfway vector. Più sono allineati più il riflesso acceca. 
    }
    vec3 specularLamp = u_lampLightColor * specularLightLamp * attenuation * 0.1;

    // ========================================================
    // ANIMAZIONE VAPORE (coordinata UV animata)
    // ========================================================
    vec2 uv = v_texcoord;
    if (u_isSmoke == 1) {
        uv.y -= u_smokeTime * 0.3; // Velocità di salita verticale della texture
        uv.x += sin(u_smokeTime * 2.0 + uv.y * 6.0) * 0.02; // Sinuosità interna
    }

    // ========================================================
    // CAMPIONAMENTO COLORE / TEXTURE
    // ========================================================
    vec3 ambient = vec3(0.35, 0.35, 0.35);
    vec4 baseColor = vec4(u_materialColor, 1.0);
    
    if (u_useTexture == 1) {
        baseColor = texture(u_texture, uv); // Usa le UV animate!
    }

    vec3 totalDiffuse = diffuse + diffuseLamp;
    vec3 totalSpecular = specular + specularLamp;

    vec3 finalColor = (ambient + totalDiffuse) * baseColor.rgb + totalSpecular;
    float finalAlpha = baseColor.a;

    // ========================================================
    // MASCHERA DI SFUMATURA VAPORE
    // ========================================================
    if (u_isSmoke == 1) {
        if (u_useTexture == 0) {
            finalColor = vec3(0.9, 0.9, 0.9);
        }

        float edgeFadeX = sin(v_texcoord.x * 3.14159265); 
        float edgeFadeY = pow(1.0 - v_texcoord.y, 1.2) * sin(v_texcoord.y * 3.14159265);

        float textureAlpha = (u_useTexture == 1) ? baseColor.a : 0.5;
    
        float moltiplicatoreAlfa = (u_lightIntensity < 0.5) ? 0.7 : 0.4;

        //smusso matematicamente tramite i pixel dei bordi del quad
        finalAlpha = textureAlpha * edgeFadeX * edgeFadeY * moltiplicatoreAlfa;

        if (u_lightIntensity < 0.5) {
            finalColor += vec3(0.05, 0.05, 0.05); 
        }
    }

    outColor = vec4(finalColor, finalAlpha);
}
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Errore compilazione shader:", gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function initShaderProgram(gl) {
    const vs = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error("Errore linking shader:", gl.getProgramInfoLog(program));
        return null;
    }
    return program;
}