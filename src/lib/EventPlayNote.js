export const EVENT_NAME = 'LsysPlayNote';

export default function ({ startTick, pitchIndex, duration }) {
  return new CustomEvent(EVENT_NAME, { detail: { startTick, pitchIndex, duration } });
}

