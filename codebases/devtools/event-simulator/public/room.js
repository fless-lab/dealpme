/* Prototype autonome : signal synthétique, pas de microphone, ni transcription ou résumé. */
(() => {
  const consent = document.querySelector("#capture-consent"), start = document.querySelector("#start"), stop = document.querySelector("#stop"), status = document.querySelector("#status");
  let recorder, audio, oscillator, parts = [], stopped = false, startedAt, stopReason;
  const finish = (reason="operator") => { if(stopped)return;stopped = true;stopReason=reason;clearInterval(timer);if (recorder?.state === "recording") recorder.stop(); oscillator?.stop(); oscillator = null; if (audio) void audio.close(); start.disabled = true; stop.disabled = true; };
  consent.addEventListener("change", () => { start.disabled = !consent.checked || stopped; if (!consent.checked) finish("consent_revoked"); });
  start.addEventListener("click", async () => {
    if (!consent.checked) return;
    audio = new AudioContext(); const output = audio.createMediaStreamDestination();
    oscillator = audio.createOscillator(); oscillator.frequency.value = 330; oscillator.connect(output); oscillator.start();
    recorder = new MediaRecorder(output.stream); parts = [];
    recorder.ondataavailable = (event) => { if (event.data.size) parts.push(event.data); };
    recorder.onstop = async () => {
      const blob = new Blob(parts, { type: recorder.mimeType });
      document.querySelector("#playback").src = URL.createObjectURL(blob);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      globalThis.captureEvidence = { sessionId: document.querySelector("#session").dataset.session, bytes: Array.from(bytes), mimeType: blob.type, synthetic: true, startedAt, stoppedAt:Date.now(),stopReason };
      status.textContent = "Captation synthétique arrêtée ; couverture limitée à cette session.";
    };
    startedAt=Date.now();recorder.start(100); start.disabled = true; stop.disabled = false; status.textContent = "Captation synthétique en cours.";
  });
  stop.addEventListener("click", ()=>finish());
  const timer = setInterval(async () => { try { const res = await fetch(`${location.pathname}/state`, { cache: "no-store" }); if (!res.ok) { finish("admission_revoked"); status.textContent = "Admission expirée ou révoquée : captation arrêtée."; } } catch { finish("connection_lost"); } }, 1000);
})();
