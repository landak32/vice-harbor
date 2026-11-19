// The dialogue box. Lines are queued with a speaker, revealed a character at a time, and
// advanced by the player. It reports whether it is open so the world can freeze the clock and
// the mission runner can hold its timers while somebody is talking.

import { characterFor } from './story.js';

export function createDialogueState() {
  return {
    open: false,
    lines: [],
    index: 0,
    shown: 0,
    hold: 0,
    onDone: null,
    speaker: null,
    text: '',
  };
}

/** Queue a conversation. `lines` is an array of { who, text }. */
export function say(world, lines, onDone = null) {
  if (!lines || lines.length === 0) {
    if (onDone) onDone();
    return;
  }
  const dialogue = world.dialogue;
  dialogue.lines = lines.slice();
  dialogue.index = 0;
  dialogue.shown = 0;
  dialogue.hold = 0;
  dialogue.open = true;
  dialogue.onDone = onDone;
  loadLine(dialogue);
}

function loadLine(dialogue) {
  const line = dialogue.lines[dialogue.index];
  if (!line) return;
  dialogue.speaker = characterFor(line.who);
  dialogue.text = line.text;
  dialogue.shown = 0;
  dialogue.hold = 0;
}

/** Reveal the whole line, or move to the next one, or close the box. */
export function advanceDialogue(world) {
  const dialogue = world.dialogue;
  if (!dialogue.open) return;
  if (dialogue.shown < dialogue.text.length) {
    dialogue.shown = dialogue.text.length;
    return;
  }
  dialogue.index += 1;
  if (dialogue.index >= dialogue.lines.length) {
    dialogue.open = false;
    dialogue.lines = [];
    const done = dialogue.onDone;
    dialogue.onDone = null;
    if (done) done();
    return;
  }
  loadLine(dialogue);
  world.audio?.blip();
}

export function updateDialogue(world, dt) {
  const dialogue = world.dialogue;
  if (!dialogue.open) return;
  const speed = 62;
  if (dialogue.shown < dialogue.text.length) {
    dialogue.shown = Math.min(dialogue.text.length, dialogue.shown + speed * dt);
    if (Math.floor(dialogue.shown) % 3 === 0) world.audio?.blip(0.02);
  } else {
    dialogue.hold += dt;
    // The last line of a conversation waits for the player, earlier ones move on by themselves.
    const isLast = dialogue.index >= dialogue.lines.length - 1;
    if (!isLast && dialogue.hold > 2.6) advanceDialogue(world);
  }
}

export function dialogueOpen(world) {
  return world.dialogue.open;
}

/** The portion of the current line that has been revealed so far. */
export function visibleText(world) {
  const dialogue = world.dialogue;
  if (!dialogue.open) return '';
  return dialogue.text.slice(0, Math.floor(dialogue.shown));
}

/** A one-off bark from a passer-by, shown as a speech bubble instead of a box. */
export function barks(world, who, text, seconds = 2.4) {
  world.bubbles.push({ x: 0, y: 0, who, text, life: seconds, maxLife: seconds, attached: null });
}