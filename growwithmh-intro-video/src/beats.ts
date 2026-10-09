import beats from './beats.json';

// The edit is cut to the music. 150 BPM at 30 fps: 1 beat = 12 frames, 1 bar = 48 frames,
// one 16th-note step = 3 frames. Bars and beats are 1-based, like a DAW.
export const FPB = 12;
export const BAR = 48;

/** Frame of a musical position: B(5) = bar 5 downbeat, B(5, 3) = bar 5 beat 3, B(5, 3, 2) = + two 16ths. */
export const B = (bar: number, beat = 1, sixteenths = 0) => (bar - 1) * BAR + (beat - 1) * FPB + sixteenths * 3;

export type Marker = {frame: number; time: number; bar: number; beat: number; step: number; type: string; note?: string};
export const MARKERS = beats.markers as Marker[];
