const path = require('path');
const fs = require('fs');
const ENGINE = 'C:/Users/guill/.claude/plugins/cache/ls-extensions/ls-clad/1.0.0/skills/build-sfx/tools';
const audio = require(ENGINE);
const PROJECT_ASSETS_SFX = 'C:/Users/guill/OneDrive/Escritorio/Proyectos/Retos/SPECS-hackathon/lens/Assets/GeneratedSFX';
fs.mkdirSync(PROJECT_ASSETS_SFX, { recursive: true });

function finish(buf, name) {
  audio.mix_bus.masterChain(buf, { normalize: 'peak' });
  audio.WavBuilder.write(buf, path.join(PROJECT_ASSETS_SFX, name + '.wav'));
}

// Right match: short, high, bright two-note "ding"
(function () {
  const a = audio.synth_voices.bell(88, 0.35, 90, 240);   // E6
  const b = audio.synth_voices.bell(95, 0.45, 90, 240);   // B6
  const out = new Float32Array(Math.floor(0.55 * audio.SAMPLE_RATE));
  audio.addInto(out, a, 0, 0.7);
  audio.addInto(out, b, Math.floor(0.07 * audio.SAMPLE_RATE), 0.6);
  audio.fadeOut(out, 0.02);
  finish(audio.mix_bus.applyFx(out, { reverb: 'smallRoom', gain: 0.8 }), 'ScrewMatchHigh');
})();

// Wrong match: short low tone
(function () {
  const b = audio.sweep(220, 150, 0.28, 'triangle', 'exponential');
  audio.adsrExp(b, 0.004, 0.08, 0.5, 0.18, 3);
  audio.fadeOut(b, 0.01);
  finish(audio.mix_bus.applyFx(b, { lpf: 1200, gain: 0.8 }), 'ScrewWrongLow');
})();

// Snap / click into place
finish(audio.sfx_presets.uiClick({ character: 'soft' }), 'ScrewSnap');

// Soft chime for off-view attention
finish(audio.sfx_presets.uiNotify(), 'ScrewChime');
