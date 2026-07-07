// audio.js: logica audio

/* VARIABILI GLOBALI E CONFIGURAZIONE AUDIO*/
let tracciaInRiproduzione = null;

const stazioniRadio = {
    japan_1: new Audio('audio/tunetank-japan-background-348404.mp3'),
    japan_2: new Audio('audio/hitslab-japan-japanese-music-502006.mp3')
};

stazioniRadio.japan_1.loop = true;
stazioniRadio.japan_2.loop = true;
stazioniRadio.japan_1.volume = 0.5;
stazioniRadio.japan_2.volume = 0.5;

const controlliRadio = {
    stazioneSelezionata: 'spenta'
};

const sottofondoCucina = new Audio("audio/the_sounds_of_a_Japanese_restaurant_kitchen_3_HOURS_for_study_sl.mp3"); 
sottofondoCucina.loop = true;
sottofondoCucina.volume = 0.3;

/* FUNZIONE PER ATTIVARE IL SUONO DELLA BEVANDA ACQUISTATA ALLA MACCHINETTA*/
function acquistaBevandaAzione() {
    let audioLattina = new Audio('audio/lattina.mp3'); 
    audioLattina.currentTime = 0;
    audioLattina.play().catch(e => console.log("Audio bloccato. Interagisci con la pagina."));
    audioLattina.volume = 0.7;

    const popup = document.getElementById("vending-popup"); //POPUP GRAFICO DI ACQUISTO LATTINA
    if (popup) {
        popup.classList.add("show");
        setTimeout(() => {
            popup.classList.remove("show");
        }, 3000);
    }
}
 /* FUNZIONE DI AVVIO RADIO*/
function avviaRadio(scelta) {
    if (tracciaInRiproduzione) {
        tracciaInRiproduzione.pause();
        tracciaInRiproduzione.currentTime = 0;
    }

    let titoloPlayer = document.getElementById("track-title");

    if (scelta === 'japan_1') {
        tracciaInRiproduzione = stazioniRadio.japan_1;
        tracciaInRiproduzione.play()
            .then(() => { if(titoloPlayer) titoloPlayer.innerText = "Japan Background"; })
            .catch(e => console.log("Audio bloccato:", e));
    } else if (scelta === 'japan_2') {
        tracciaInRiproduzione = stazioniRadio.japan_2;
        tracciaInRiproduzione.play()
            .then(() => { if(titoloPlayer) titoloPlayer.innerText = "Japanese Calm"; })
            .catch(e => console.log("Audio bloccato:", e));
    } else {
        tracciaInRiproduzione = null;
        if(titoloPlayer) titoloPlayer.innerText = "Radio Spenta";
    }
}