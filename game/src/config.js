// MASQUERADE MANOR — configuration: the manor, its eight guests, the six
// clue types, the eight detective tools and the three-case campaign.
//
// THE DEDUCTION, HONESTLY BUILT. Every guest carries six traits, one per
// clue type. Three of the traits are independent bits of the guest's
// index (boot size = bit 2, silk colour = bit 1, seal mark = bit 0), so
// those three clues together always narrow the eight guests to exactly
// one — the culprit. The other three traits (perfume, key metal, haunt)
// are parity combinations of the same bits: they confirm a suspect and
// punish a hasty accusation, but never contradict the true culprit.
// A clue token always reports the CULPRIT's true trait. Collect the
// footprint, the silk and the seal and the case is provably solved;
// world.js re-verifies that uniqueness for every generated case.

export const VIEW_W = 1280;
export const VIEW_H = 720;
export const HUD_H = 46;

export const ROOMS = [
  { id: 'library',     name: 'Library',     x: 36,  y: 64,  w: 272, h: 196, floor: '#2c2138', floorAlt: '#352a44', trim: '#8a6fd0' },
  { id: 'ballroom',    name: 'Ballroom',    x: 324, y: 64,  w: 356, h: 262, floor: '#3a2430', floorAlt: '#452c3a', trim: '#e8a34d' },
  { id: 'conservatory',name: 'Conservatory',x: 696, y: 64,  w: 232, h: 196, floor: '#1d3026', floorAlt: '#24402f', trim: '#6fd08a' },
  { id: 'dining',      name: 'Dining Hall', x: 944, y: 64,  w: 300, h: 196, floor: '#33261a', floorAlt: '#3f2f20', trim: '#d0b06f' },
  { id: 'study',       name: 'Study',       x: 36,  y: 276, w: 272, h: 178, floor: '#262038', floorAlt: '#2f2846', trim: '#7a8fd0' },
  { id: 'gallery',     name: 'Gallery',     x: 324, y: 342, w: 604, h: 112, floor: '#2a2436', floorAlt: '#332c42', trim: '#b08fd0' },
  { id: 'chapel',      name: 'Chapel',      x: 944, y: 276, w: 300, h: 178, floor: '#232c3a', floorAlt: '#2b3646', trim: '#8fc4d0' },
  { id: 'music',       name: 'Music Room',  x: 696, y: 276, w: 232, h: 178, floor: '#302436', floorAlt: '#392c42', trim: '#d08fb8' },
];
export const ROOM_BY_ID = Object.fromEntries(ROOMS.map((r) => [r.id, r]));

// The eight guests. `bits` are derived from the index in world.js; the
// named fields here are the visible identity: mask, robe and the tell a
// detective reads when observing them up close.
export const GUESTS = [
  { name: 'Lady Vivienne Ash',  mask: 'Ivory Swan',    robe: '#e8e2d4', accent: '#b8912f', tell: 'Never dances. Watches the conservatory door over her glass.' },
  { name: 'Baron Tomas Rhee',   mask: 'Bronze Fox',    robe: '#a8642c', accent: '#e8c47a', tell: 'Laughs a beat too late at every joke, as if listening elsewhere.' },
  { name: 'Madame Odette Lark', mask: 'Scarlet Moth',  robe: '#a02c3a', accent: '#ffb0a8', tell: 'Fans herself when the music stops; goes still when it starts.' },
  { name: 'Count Emil Varga',   mask: 'Onyx Raven',    robe: '#2c2c38', accent: '#9aa4c8', tell: 'Counts the candles. Twice. Then counts the exits.' },
  { name: 'Miss Priya Anand',   mask: 'Jade Peacock',  robe: '#1f7a5c', accent: '#a8ffd8', tell: 'Greets every guest by name — except one she pretends not to know.' },
  { name: 'Father Luc Moreau',  mask: 'Pale Owl',      robe: '#6a6a7a', accent: '#e8e8f2', tell: 'Blesses the punch bowl hourly, and no one ever sees him drink.' },
  { name: 'Duchess Mara Ilves', mask: 'Silver Wolf',   robe: '#8a94a8', accent: '#dfe8ff', tell: 'Dances with everyone once. Her card has one name crossed out.' },
  { name: 'Signor Aldo Ferro',  mask: 'Gilded Boar',   robe: '#7a5c1f', accent: '#ffd76a', tell: 'Tells the same war story nightly, with a different ending each time.' },
];

// The six clue types. `values` are the two possible findings; the index
// into `values` for a guest comes from that guest's trait bits (world.js).
export const CLUE_TYPES = [
  { id: 'footprint', name: 'Muddy Footprint', icon: '👣', values: ['a small, neat boot print', 'a large, deep-heeled boot print'] },
  { id: 'silk',      name: 'Torn Silk',       icon: '🧵', values: ['a thread of crimson silk', 'a thread of gold silk'] },
  { id: 'seal',      name: 'Wax Seal',        icon: '🕯', values: ['a wax seal stamped with a rose', 'a wax seal stamped with a thorn'] },
  { id: 'perfume',   name: 'Perfume Vial',    icon: '🧴', values: ['an empty vial of rose water', 'an empty vial of amber musk'] },
  { id: 'key',       name: 'Scratched Key',   icon: '🗝', values: ['a scratched brass key', 'a scratched iron key'] },
  { id: 'alibi',     name: 'False Alibi',     icon: '🎭', values: ['a guest who swore they were in the Library', 'a guest who swore they were in the Conservatory'] },
];
export const CLUE_BY_ID = Object.fromEntries(CLUE_TYPES.map((c) => [c.id, c]));

// The eight detective tools — the collectible layer, drafted 1-of-3
// between cases. Every effect is wired into main.js / render.js.
export const TOOLS = [
  { id: 'lens',     name: 'Seeker Lens',    desc: '+1 extra clue token appears every round.' },
  { id: 'ledger',   name: 'Alibi Ledger',   desc: 'Case board shows each guest\'s claimed alibi beside the room they were seen in.' },
  { id: 'trumpet',  name: 'Ear Trumpet',    desc: 'The incidents feed reports one extra sighting each round, with exact rooms.' },
  { id: 'gloves',   name: 'Velvet Gloves',  desc: 'Clue tokens can be gathered from twice as far away.' },
  { id: 'lantern',  name: 'Candle Lantern', desc: 'A faint footprint trail glows near the Thorn for a few seconds each round.' },
  { id: 'notebook', name: 'Pocket Notebook',desc: 'The case board sorts suspects by suspicion, most suspect first.' },
  { id: 'mirror',   name: 'Silver Mirror',  desc: 'Observing a guest also reveals their tell in the incidents feed.' },
  { id: 'snare',    name: 'Thorn Snare',    desc: 'At each case\'s start, one provably innocent guest is crossed out for you.' },
];
export const TOOL_BY_ID = Object.fromEntries(TOOLS.map((t) => [t.id, t]));

export const ROUNDS_PER_CASE = 7;
export const CASES = [
  { n: 1, name: 'Case I — The Sealed Invitation', decoys: 0 },
  { n: 2, name: 'Case II — The Conservatory Door', decoys: 0 },
  { n: 3, name: 'Case III — The Thorn Unmasked', decoys: 2, final: true },
];

export const DIFFICULTIES = [
  { id: 'salon', name: 'Salon', roundSeconds: 50, desc: 'Long rounds, a relaxed ball.' },
  { id: 'manor', name: 'Manor', roundSeconds: 40, desc: 'The intended investigation.' },
  { id: 'thorn', name: 'Thorn', roundSeconds: 30, desc: 'Short rounds. The Thorn is patient; you may not be.' },
];

export const SCORE = {
  clue: 150,          // per clue token, multiplied by the clue chain
  observe: 40,        // per guest observed (once per guest per round)
  incident: 25,       // per incident logged in the feed
  caseBase: 6000,     // solving a case
  roundSpared: 900,   // per round left unspent when you accuse correctly
  clueUnused: 0,      // (kept explicit: unspent clues pay nothing)
  finalBonus: 4000,   // solving The Thorn Unmasked
  endlessBase: 7500,  // each endless case pays more than the last campaign case
};

export const PLAYER_SPEED = 178;
export const GUEST_SPEED = 46;
export const PICKUP_RADIUS = 26;
