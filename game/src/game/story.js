// The writing: who lives in Vice Harbor, what they look like when they talk, and the six jobs
// that make up the story. Nothing here runs a simulation; it is a script that the mission
// runner performs.

export const CHARACTERS = {
  cass: {
    id: 'cass',
    name: 'Cass Rourke',
    role: 'wheelman',
    skin: '#d8a077',
    hair: '#2b1f18',
    shirt: '#2f3a4a',
    accent: '#f2c14e',
    hairStyle: 'short',
    jaw: 0.5,
  },
  odell: {
    id: 'odell',
    name: 'Odell Moss',
    role: 'dock fixer',
    skin: '#8a5a3c',
    hair: '#d8d4c8',
    shirt: '#6b5a3f',
    accent: '#e08b4a',
    hairStyle: 'bald',
    jaw: 0.8,
    beard: true,
  },
  nadine: {
    id: 'nadine',
    name: 'Nadine Bright',
    role: 'cab dispatcher',
    skin: '#c98a5f',
    hair: '#1c1410',
    shirt: '#f2c14e',
    accent: '#ffd97a',
    hairStyle: 'bun',
    jaw: 0.35,
  },
  pike: {
    id: 'pike',
    name: 'Cyrus Pike',
    role: 'port commissioner',
    skin: '#e8c9a8',
    hair: '#c9c4b8',
    shirt: '#1d2430',
    accent: '#8fb8d8',
    hairStyle: 'slick',
    jaw: 0.9,
    glasses: true,
  },
  hale: {
    id: 'hale',
    name: 'Sgt. Imelda Hale',
    role: 'Harbor Patrol',
    skin: '#6b4430',
    hair: '#1a1a1c',
    shirt: '#2b3a60',
    accent: '#7fa8e0',
    hairStyle: 'cap',
    jaw: 0.65,
  },
  lulu: {
    id: 'lulu',
    name: 'Lulu Tan',
    role: 'courier desk',
    skin: '#f0c8a8',
    hair: '#6a2f4a',
    shirt: '#4fbf9f',
    accent: '#8fe0c8',
    hairStyle: 'ponytail',
    jaw: 0.3,
  },
};

/**
 * The six-story chain. Each mission is a list of objectives the runner can evaluate:
 *  - goto: stand inside the marker
 *  - deliver: bring a vehicle to the marker
 *  - wreck: destroy a target vehicle
 *  - clear: put down every hostile on the job
 *  - grab: pick up the case and then reach the marker
 *  - escape: survive with the patrol on you until the clock runs out
 */
export const MISSIONS = [
  {
    id: 'cold-cargo',
    title: 'Cold Cargo',
    chapter: 1,
    giver: 'odell',
    place: 'docks',
    reward: 450,
    unlock: 'pistol',
    intro: [
      { who: 'odell', text: "You're late, Rourke. The crate's been sitting on my pier since dawn." },
      { who: 'cass', text: 'Traffic on the bridge. What is it?' },
      { who: 'odell', text: "Don't open it. Drive it to the diner on Sunset Terraces and don't stop for anybody in a uniform." },
    ],
    outro: [
      { who: 'odell', text: "See? Simple work pays. There's more where that came from." },
    ],
    steps: [
      { kind: 'goto', place: 'docks', text: 'Collect the crate at the Anchor Docks', radius: 50 },
      { kind: 'deliver', place: 'home', text: 'Drive the crate to the diner in Sunset Terraces', radius: 58, time: 150, mustDrive: true },
    ],
  },
  {
    id: 'tail-light',
    title: 'Tail Light',
    chapter: 2,
    giver: 'odell',
    place: 'docks',
    reward: 700,
    unlock: null,
    intro: [
      { who: 'odell', text: 'One of my drivers cut a corner. Took a case of goods and ran for the hills.' },
      { who: 'cass', text: 'And you want the goods or the driver?' },
      { who: 'odell', text: 'The goods. The van is a white Boxer. Put it in a wall.' },
    ],
    outro: [
      { who: 'odell', text: "Ugly. I like it. Take a cut and forget the plate number." },
    ],
    steps: [
      { kind: 'goto', place: 'cabstand', text: 'Find the runaway van near the cab stand', radius: 70 },
      { kind: 'wreck', target: 'runaway-van', text: 'Wreck the runaway van', time: 190, radius: 1500 },
    ],
  },
  {
    id: 'payday',
    title: 'Payday at the Palms',
    chapter: 3,
    giver: 'odell',
    place: 'park',
    reward: 900,
    unlock: 'smg',
    intro: [
      { who: 'odell', text: 'Four of Pike’s boys are shaking down my collectors in Palmetto Park.' },
      { who: 'cass', text: 'Pike owns the port. You want me to start a war?' },
      { who: 'odell', text: 'I want you to finish one. Here, take the compact. It speaks louder.' },
    ],
    outro: [
      { who: 'odell', text: "Pike's going to hear about this. Good. Let him come." },
    ],
    steps: [
      { kind: 'goto', place: 'park', text: 'Get to the park and find the collectors', radius: 80, spawn: 'park-thugs' },
      { kind: 'clear', text: 'Take out Pike’s crew', time: 0 },
    ],
  },
  {
    id: 'night-shift',
    title: 'Night Shift',
    chapter: 4,
    giver: 'odell',
    place: 'tower',
    reward: 1500,
    unlock: null,
    intro: [
      { who: 'odell', text: 'Kessler Mile. Top floor. A case that belongs to me, in an office that does not.' },
      { who: 'cass', text: 'Security?' },
      { who: 'odell', text: 'Two men and a very expensive door. You have until the patrol changes shift.' },
    ],
    outro: [
      { who: 'odell', text: "That case is worth more than this whole block. Do not open it, do not lose it." },
    ],
    steps: [
      { kind: 'goto', place: 'tower', text: 'Enter the Kessler Mile office', radius: 70, spawn: 'office-guards' },
      { kind: 'clear', text: 'Deal with the office security', time: 0 },
      { kind: 'grab', place: 'tower', text: 'Take the case', radius: 40 },
      { kind: 'deliver', place: 'depot', text: 'Get the case to the depot', radius: 60, time: 170, mustDrive: true },
    ],
  },
  {
    id: 'harbor-lights',
    title: 'Harbor Lights',
    chapter: 5,
    giver: 'odell',
    place: 'depot',
    reward: 1200,
    unlock: null,
    intro: [
      { who: 'hale', text: 'Rourke. The commissioner wants that case back and he is not asking nicely.' },
      { who: 'cass', text: 'You are a long way from your cruiser, sergeant.' },
      { who: 'hale', text: 'Every unit in the harbor is on the bridge. Run, and run clean.' },
    ],
    outro: [
      { who: 'odell', text: "You lost them. Now we finish this. The pier, at midnight." },
    ],
    steps: [
      { kind: 'escape', place: 'marina', text: 'Shake the patrol and reach the marina', radius: 80, time: 130, stars: 2 },
    ],
  },
  {
    id: 'high-tide',
    title: 'High Tide',
    chapter: 6,
    giver: 'pike',
    place: 'pier',
    reward: 3000,
    unlock: null,
    intro: [
      { who: 'pike', text: 'You have been a very expensive problem, Rourke.' },
      { who: 'cass', text: 'You should have paid the dock crew, Pike.' },
      { who: 'pike', text: 'I did pay them. I paid them to disappear. Put the case down and walk away.' },
    ],
    outro: [
      { who: 'cass', text: 'The harbor belongs to the people who work it. Tide is coming in.' },
      { who: 'odell', text: "Get out of there. I'll see you on the water." },
    ],
    steps: [
      { kind: 'goto', place: 'pier', text: 'Meet Pike at the pier', radius: 90, spawn: 'pier-crew' },
      { kind: 'clear', text: 'Take the pier back', time: 0 },
      { kind: 'escape', place: 'docks', text: 'Get out of the harbor alive', radius: 90, time: 120, stars: 3 },
    ],
  },
];

/** The taxi and courier side work, kept apart from the story chain. */
export const ACTIVITIES = {
  taxi: {
    id: 'taxi',
    title: 'Sunline Cab',
    dispatcher: 'nadine',
    payPerFare: [55, 120],
    intro: [
      { who: 'nadine', text: 'Cab nine, you are on the board. Pick up the fare, drop them where they ask, keep the meter honest.' },
    ],
  },
  courier: {
    id: 'courier',
    title: 'Courier Runs',
    dispatcher: 'lulu',
    payPerDelivery: [70, 140],
    intro: [
      { who: 'lulu', text: 'Three parcels, three doors, no questions. The clock starts now.' },
    ],
  },
};

/** Short lines the world fires off as toasts, so the city has a voice between missions. */
export const AMBIENT_LINES = [
  'A tram rattles past somewhere behind the warehouses.',
  'Seagulls argue over the fish market.',
  'A radio in a parked car is playing the harbor report.',
  'The tide is coming in fast tonight.',
];

export function characterFor(id) {
  return CHARACTERS[id] ?? CHARACTERS.cass;
}

export function missionById(id) {
  return MISSIONS.find((mission) => mission.id === id) ?? null;
}

/** The next job in the chain, given the set of completed ids. */
export function nextMission(completed) {
  for (const mission of MISSIONS) {
    if (!completed.has(mission.id)) return mission;
  }
  return null;
}