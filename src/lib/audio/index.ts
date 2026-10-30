// Public API of the audio module. Everything else imports audio through this file.
//   audio.init()                      — call from the first user gesture (gate screen)
//   audio.playSong(id, { fadeMs })    — BGM; same id keeps playing
//   audio.sfx(id) / audio.jingle(id)  — one-shots (jingles duck the BGM)
//   audio.blip(voice, { char, index }) + VOICE_STYLE — typewriter voices
//   audio.songPosition() / songBeat() — loop-aware song clock for rhythm games
export type { AudioApi, BlipOptions, Volumes } from './api';
export { audio } from './engine';
export { VOICE_STYLE, isSilentChar, type VoiceStyle } from './voices';
export { SFX_IDS } from './sfx';
