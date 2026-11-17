'use strict';
/* Pixel sprites drawn from character grids. Each character is a palette key; '.' is transparent. */

const PAL = {
  k: '#060908', w: '#F4F0E6', s: '#F2C09A', S: '#C98D66', h: '#6B3E1F', H: '#3B2412', g: '#2FAF5A', G: '#1C7A3C',
  b: '#5A3A1E', u: '#8A5A2B', U: '#5A3A1E', y: '#FFCC33', Y: '#C98A00', r: '#FF4D6D', R: '#B0203E', p: '#C9A2FF',
  P: '#7A4FD0', c: '#7FE6FF', C: '#3F7BE0', n: '#23235A', o: '#FF8C42', O: '#C0561A', e: '#3EE08F', E: '#157A4A',
  m: '#84928C', M: '#3B4A47', l: '#C2CCC2', a: '#A0A0B8', t: '#2B8A7A', x: '#FF9ECF', z: '#9BE34A', Z: '#4E9A1E',
  q: '#E04848', Q: '#9A2234',
};

const SPR = {
  person: [
    '................', '.....kkkkkk.....', '....khhhhhhk....', '...khhhhhhhhk...', '...khsssssshk...', '...kskssssksk...',
    '...kssssssssk...', '....ksSssSsk....', '...kkkggggkkk...', '..ksgGgyygGgsk..', '..ksgGggggGgsk..', '...kgGggggGgk...',
    '...kuuuuuuuuk...', '...kgggkkgggk...', '...kbbbk.kbbbk..', '...kkkk..kkkk...'],
  arti: [
    '................', '.......y........', '......kkkk......', '..kk.kppppk.kk..', '.kwwkppwwppkwwk.', '.kwwkpwwwwpkwwk.',
    '..kkkppwwppkkk..', '....kpppppPk....', '....kpkppkpk....', '.....kppppk..y..', '......kPPk......', '.......kk.......',
    '...y............', '................', '................', '................'],
  slime: [
    '................', '................', '................', '................', '................', '......kkkk......',
    '....kkooyokk....', '...koooyyooook..', '..koowkoowkoook.', '..kookkookkoook.', '.koooooooooooOk.', '.koooOooooooOOk.',
    '.kOooooooooOOOk.', '..kOOOOOOOOOOk..', '...kkkkkkkkkk...', '................'],
  goblin: [
    '................', '......kkkk......', '.....krrrrk.....', '....krrrrrrk....', '..kkkzzzzzzkkk..', '.kzzkzkzzkzkzzk.',
    '..kkzzzzzzzzkk..', '....kzzkkzzk....', '...kuuukkuuuk...', '..kuuOuuuuOuuk..', '..kuuuuyyuuuuk..', '...kuuuuuuuuk...',
    '....kzk..kzk....', '....kzk..kzk....', '...kkkk..kkkk...', '................'],
  bat: [
    '................', '................', '................', '.k............k.', '.kk..k....k..kk.', '.kPk.kk..kk.kPk.',
    '.kPPkkPkkPkkPPk.', '.kPPPPPPPPPPPPk.', '..kPPPrPPrPPPk..', '...kkPPPPPPkk...', '.....kPwwPk.....', '......kwkw......',
    '......kkkk......', '................', '................', '................'],
  mimic: [
    '................', '................', '...kkkkkkkkkk...', '..kuuuuuuuuuuk..', '..kuyuuuuuuyuk..', '..kkkkkkkkkkkk..',
    '..krwkwkwkwkrk..', '..krrrrrrrrrrk..', '..kwkwkwkwkwkk..', '..kuuuuyyuuuuk..', '..kuyuuyyuuyuk..', '..kuuuuuuuuuuk..',
    '..kkkkkkkkkkkk..', '................', '................', '................'],
  imp: [
    '................', '....k......k....', '....kk....kk....', '....krkkkkrk....', '...krrrrrrrrk...', '...krwkrrwkrk...',
    '...krrrrrrrrk...', '....krrwwrrk....', '..kkkkrrrrkkkk..', '.krrkrrrrrrkrrk.', '..kk.krrrrk.kk..', '.....krkkrk.....',
    '....krk..krk....', '....kk....kk....', '................', '................'],
  wisp: [
    '................', '......kkk.......', '.....kllk.......', '....kllk..kk....', '....kllkkkllk...', '...kllllllllk...',
    '..kllkllllkllk..', '..klllllllllk...', '..kllmllllmlk...', '...klmmmmmlk....', '....kllllllk....', '.....kllllk.....',
    '......klk.......', '.......kk.......', '................', '................'],
  gremlin: [
    '................', '................', '..k..........k..', '..kk..kkkk..kk..', '..ktkkttttkktk..', '...kttttttttk...',
    '...ktwkttwktk...', '...kttttttttk...', '....ktkkkktk....', '...kkttttttkk...', '..kt.kttttk.tk..', '.....ktkktk.....',
    '....ktk..ktk....', '....kk....kk....', '................', '................'],
  fairy: [
    '................', '.......y........', '......kkkk......', '..kk.kxxxxk.kk..', '.kwwkxxwwxxkwwk.', '.kwwkxwwwwxkwwk.',
    '..kkkxxwwxxkkk..', '....kxxxxxRk....', '....kxkxxkxk....', '.....kxxxxk.....', '......kRRk......', '.......kk.......',
    '................', '................', '................', '................'],
  wyrm: [
    '................', '..........kk....', '.........krrk...', '..k.....krrrrk..', '.krk...krwkrrk..', '.krrk..krrrrrkk.',
    '..krrkkrrrrkyyk.', '...krrrrrrrk.kk.', '..kkrrrRRrrk....', '.krrkrRRRRrk....', 'krrrkrrRRrrk....', 'kkkk.krrrrrrk...',
    '.....krk.krrrk..', '.....kk...kkrrk.', '............kk..', '................'],
  wraith: [
    '................', '.....kkkkkk.....', '....kllllllk....', '...kllllllllk...', '...klkkllkklk...', '...klkcllkclk...',
    '...kllllllllk...', '...klllkkllllk..', '..kllllllllllk..', '..kllllllllllk..', '..klllllllllllk.', '..kllllllllllk..',
    '..klklklklklk...', '..kk.kk.kk.kk...', '................', '................'],
  golem: [
    '................', '....kkkkkkkk....', '...kaaaaaaaak...', '...kakkaakkak...', '...kacMaacMak...', '...kaaaaaaaak...',
    '...kaMkkkkMak...', '..kkkaaaaaakkk..', '.kaaakaaaakaaak.', '.kaaakaMMakaaak.', '.kaakaaaaaakaak.', '.kkk.kaaaak.kkk.',
    '.....kaakak.....', '....kaak.kaak...', '....kkkk.kkkk...', '................'],
  house: [
    '................', '......kkkk......', '.....krrrrk.....', '....krrrrrrk....', '...krrrrrrrrk...', '..krrrrrrrrrrk..',
    '.kkkkkkkkkkkkkk.', '..kwwwwwwwwwwk..', '..kwckwwwwkcwk..', '..kwkkwwwwkkwk..', '..kwwwwkkwwwwk..', '..kwwwwkukwwwk..',
    '..kwwwwkukwwwk..', '..kkkkkkkkkkkk..', '................', '................'],
  embertree: [
    '......kkkk......', '....kkooOokk....', '...kooOooooOk...', '..koooooOoooOk..', '..kOooyooooook..', '.kooooooOoooook.',
    '.koOoooooooyOok.', '..kooooOoooook..', '...kkOoooooOkk..', '.....kkuukkk....', '......kuuk......', '......kuuk......',
    '.....kuuuuk.....', '....kkkkkkkk....', '................', '................'],
  volcano: [
    '................', '......krrk......', '.....krkkrk.....', '......kyyk......', '.....kaayak.....', '....kaaMyaak....',
    '...kaaMaayaak...', '...kaMaaaayak...', '..kaaaaMaaaaak..', '..kaMaaaaaMaak..', '.kaaaaaaMaaaaak.', '.kaaMaaaaaaaMak.',
    'kaaaaaaaaaaaaaak', 'kkkkkkkkkkkkkkkk', '................', '................'],
  deadtree: [
    '................', '....k......k....', '....kk....kk....', '.....kk..kk.....', '..k...kuuk...k..', '..kk..kuuk..kk..',
    '...kkkkuukkkk...', '......kuuk......', '......kuuk......', '......kuuk......', '.....kuuuuk.....', '...ttkkkkkktt...',
    '..ttttttttttt...', '................', '................', '................'],
  tent: [
    '................', '.......kk.......', '......krrk......', '.....krwrrk.....', '....krrwrrrk....', '...krrrwrrrrk...',
    '..krrrrwrrrrrk..', '.kkkkkkkkkkkkkk.', '..kwrwrwrwrwrk..', '..kunnnnnnnnuk..', '..kunnnyynnnuk..', '..kunnyyyynnuk..',
    '..kukkkkkkkkuk..', '..kk........kk..', '................', '................'],
  castle: [
    '................', '................', '.k.k.k....k.k.k.', '.kakak....kakak.', '.kaaak.kk.kaaak.', '.kaaakkaakkaaak.',
    '.kaMakaaaakaMak.', '.kaaaaaaaaaaaak.', '.kaaaaaaaaaaaak.', '.kaMaaakkaaaMak.', '.kaaaaknnkaaaak.', '.kaaaaknnkaaaak.',
    '.kkkkkkkkkkkkkk.', '................', '................', '................'],
  tower: [
    '.......y........', '......kyk.......', '.....kpppk......', '....kpppppk.....', '...kkkkkkkkk....', '....kaaaaak.....',
    '....kaacaak.....', '....kaaaaak.....', '....kaMaaak.....', '....kaacaak.....', '....kaaaaak.....', '....kaaMaak.....',
    '...kaaaaaaak....', '...kaaknkaak....', '...kkkkkkkkk....', '................'],
  egg: ['................', '................', '......kkkk......', '.....kwwwwk.....', '....kwwowwwk....', '....kwwwwwok....', '...kwowwwwwwk...', '...kwwwwowwwk...', '...kwwwwwwwwk...', '...kwwowwwwok...', '...kwwwwwwwwk...', '....kwwwwwwk....', '.....kkkkkk.....', '................', '................', '................'],
  hatch: ['................', '................', '................', '....k......k....', '...kok....kok...', '...koookkoook...', '...kooooooook...', '...kokwookwok...', '...koooyyoook...', '....kooooook....', '..kwkwwkwwkwk...', '..kwwwwwwwwwk...', '...kwwwwwwwk....', '....kkkkkkk.....', '................', '................'],
  kit: ['................', '................', '..k........k....', '..kok....kok....', '..kooOkkOook....', '..kooooooook....', '..kokwookwok....', '..koooyyoook....', '...kowwwwok.....', '...koowwook..kk.', '..kooowwoook.kok', '..koooooooookoyk', '..koOoooooOokok.', '...kkk.kk.kkkk..', '................', '................'],
  fox: ['................', '.k........k.....', '.kok.....kok....', '.kooOkkkOook....', '.koooooooook....', '.kokwoookwok....', '.kooooyyoook....', '..kowwwwwok.....', '..koowwwook...kk', '..kooowwoook.kyk', '.kooooowwooookok', '.koooooooooooook', '.koOooooooOookk.', '.koOoo.kooOok...', '.kkkk..kkkkk....', '................'],
  hydra: ['................', '.kk....kk....kk.', 'krrk..krrk..krrk', 'krwk..krwk..krwk', '.krk...krk...krk', '..krk..krk..krk.', '...krk.krk.krk..', '....krkrrrkrk...', '....krrrrrrrk...', '...krrRRRRRrrk..', '..krrRRyyRRRrrk.', '..krrRRRRRRRrrk.', '..krrrrrrrrrrrk.', '...krrk...krrk..', '...kkk.....kkk..', '................'],
  heart: ['.kk.kk..', 'krrkrrk.', 'krwrrrk.', 'krrrrrk.', '.krrrk..', '..krk...', '...k....', '........'],
  heartE: ['.kk.kk..', 'kMMkMMk.', 'kMMMMMk.', 'kMMMMMk.', '.kMMMk..', '..kMk...', '...k....', '........'],
  gem: ['..kkkk..', '.keecek.', 'keeeeeek', 'kEeeeeEk', '.kEeeEk.', '..kEEk..', '...kk...', '........'],
  coin: ['..kkkk..', '.kyyyyk.', 'kyywyyYk', 'kyyYyyYk', 'kyyYyyYk', 'kyyyyyYk', '.kYYYYk.', '..kkkk..'],
  flame: ['...k....', '..kok...', '.kook.k.', '.kooykok', 'kooyyook', 'koyyyyok', '.koyyok.', '..kkkk..'],
  potion: ['..kkkk..', '...kk...', '..kwwk..', '.krrrrk.', 'krrwrrrk', 'krrrrrrk', 'krrrrrrk', '.kkkkkk.'],
  ticket: ['........', 'kkkkkkkk', 'kyYyyYyk', 'kyyxxyyk', 'kyYyyYyk', 'kkkkkkkk', '........', '........'],
  star: ['...kk...', '..kyyk..', 'kkkyykkk', 'kyyyyyyk', '.kyyyyk.', '.kykkyk.', 'kyk..kyk', 'kk....kk'],
  chest: ['........', '.kkkkkk.', 'kuuyyuuk', 'kkkkkkkk', 'kuuyyuuk', 'kuuuuuuk', 'kkkkkkkk', '........'],
  chestOpen: ['.kkkkkk.', 'kyyyyyyk', 'kkkkkkkk', 'kuyeyyuk', 'kuuyyuuk', 'kuuuuuuk', 'kkkkkkkk', '........'],
  scroll: ['.kkkkkk.', 'kwwwwwwk', '.kwmmwk.', '.kwwwwk.', '.kwmmwk.', '.kwwwwk.', 'kwwwwwwk', '.kkkkkk.'],
  check: ['........', '.......k', '......ke', '.k...ke.', 'kek.ke..', '.keke...', '..kk....', '........'],
  note: ['....kkk.', '....kwwk', '....k...', '....k...', '..kkk...', '.kwwk...', '.kkk....', '........'],
  noteOff: ['k...kkk.', '.k..kmmk', '..k.k...', '...kk...', '..kkkk..', '.kmmk.k.', '.kkk...k', '........'],
  gear: ['...kk...', '.k.ww.k.', '.kwwwwk.', 'kwwkkwwk', 'kwwkkwwk', '.kwwwwk.', '.k.ww.k.', '...kk...'],
  receipt: ['.kkkkk..', '.kwwwk..', '.kwmwk..', '.kwwwk..', '.kwmwk..', '.kwwwk..', '.kwkwk..', '.k.k.k..'],
  camera: ['........', '..kkk...', 'kkkkkkkk', 'kmmwwmmk', 'kmwkkwmk', 'kmwkkwmk', 'kmmwwmmk', 'kkkkkkkk'],
  sword: ['......kk', '.....kwk', '....kwk.', '.k.kwk..', '..kwk...', '.kyk....', 'kyk.k...', 'kk......'],
  skull: ['.kkkkk..', 'kwwwwwk.', 'kwkwkwk.', 'kwwwwwk.', '.kwkwk..', '.kkkkk..', '........', '........'],
  't-hero': ['..kkkk..', '.khhhhk.', 'khhhhhhk', 'kskssksk', 'kssssssk', '.kssssk.', '..kggk..', '.kggggk.'],
  't-journal': ['kkkkkkk.', 'kuwwwwuk', 'kuwmmwuk', 'kuwwwwuk', 'kuwmmwuk', 'kuwwwwuk', 'kkkkkkkk', '........'],
  't-coin': ['..kkkk..', '.kyyyyk.', 'kyywyyYk', 'kyyYyyYk', 'kyyYyyYk', 'kyyyyyYk', '.kYYYYk.', '..kkkk..'],
  't-map': ['kkkkkkkk', 'kyygyyyk', 'kygggyrk', 'kyyyyrrk', 'kyEyyyrk', 'kyyyyyyk', 'kkkkkkkk', '........'],
  't-stats': ['........', '......e.', '...e..e.', '...e.ee.', '.e.e.ee.', '.eeeeee.', 'kkkkkkkk', '........'],
};

/* Overlays drawn on top of a person sprite: hats, hoods, beards, aprons. */
const OVER = {
  cap: { 0: '........k.......', 1: '.....kkkxkk.....', 2: '....kqqqqqqk....', 3: '...kqqqqqqqqkk..' },
  wizard: { 0: '........kk......', 1: '......kkqqk.....', 2: '.....kqqyqqk....', 3: '..kkkqqqqqqqkkk.' },
  crown: { 0: '....k..kk..k....', 1: '....kykyykyk....', 2: '....kyyryyyk....', 3: '...kkkkkkkkkk...' },
  helm: { 1: '.....kkkkkk.....', 2: '....kaaaaaak....', 3: '...kaaaaaaaak...', 4: '...kaMMMMMMak...' },
  hood: { 1: '.....kkkkkk.....', 2: '....kqqqqqqk....', 3: '...kqqqqqqqqk...', 4: '...kq......qk...', 5: '...kq......qk...', 6: '...kq......qk...', 7: '....kq....qk....' },
  straw: { 1: '....kkkkkkkk....', 2: '....kyyyyyyk....', 3: '.kkkyyyyyyyykkk.' },
  beard: { 6: '...kwwwwwwwwk...', 7: '....kwwwwwwk....', 8: '.....kwwwwk.....' },
  apron: { 9: '....kllllllk....', 10: '....kllllllk....', 11: '....kllllllk....' },
  ears: { 3: '.s............s.', 4: '..s..........s..' },
  glasses: { 4: '.....k.kk.k.....', 5: '....kck..kck....', 6: '.....k....k.....' },
  shield: { 8: 'kkk.............', 9: 'kyk.............', 10: 'kCk.............', 11: 'kCk.............', 12: '.k..............' },
  sword: { 4: '..............l.', 5: '..............l.', 6: '..............l.', 7: '..............l.', 8: '.............kyk', 9: '..............u.' },
  party: { 0: '.......k........', 1: '......kyk.......', 2: '.....kqyqk......', 3: '....kyqyqyk.....' },
  pumpkin: { 0: '.......kE.......', 1: '.....kkoEokk....', 2: '....kooOooOok...', 3: '...kooOooooOok..' },
  winter: { 0: '...........kwk..', 1: '.....kkkkkqqk...', 2: '....kqqqqqqk....', 3: '...kwwwwwwwwk...' },
  bow: { 4: '..............u.', 5: '..............wu', 6: '..............wu', 7: '..............wu', 8: '..............wu', 9: '..............wu', 10: '..............wu', 11: '..............u.' },
  staff: { 2: '..............c.', 3: '.............cec', 4: '..............c.', 5: '..............u.', 6: '..............u.', 7: '..............u.', 8: '..............u.', 9: '..............u.', 10: '..............u.', 11: '..............u.', 12: '..............u.', 13: '..............u.' },
  dagger: { 8: '..............l.', 9: '..............l.', 10: '.............kyk' },
  book: { 9: '.............kkk', 10: '.............kCk', 11: '.............kkk' },
};

const OUTFITS = {
  forest: { name: 'Forest tunic', g: '#2FAF5A', G: '#1C7A3C', cost: 0 },
  crimson: { name: 'Crimson tunic', g: '#E04848', G: '#9A2234', cost: 30 },
  midnight: { name: 'Midnight tunic', g: '#4A4AB8', G: '#2A2A78', cost: 40 },
  royal: { name: 'Royal tunic', g: '#A050E0', G: '#6A2AA0', cost: 60 },
  shadow: { name: 'Shadow tunic', g: '#3A3A4A', G: '#1E1E28', cost: 80 },
  gilded: { name: 'Gilded tunic', g: '#FFCC33', G: '#C98A00', cost: 150 },
  hydra: { name: 'Hydra-scale tunic', g: '#2BB3A3', G: '#1C6A60', cost: 0, event: 'Black Friday' },
};
const HATS = {
  none: { name: 'No hat', cost: 0 },
  cap: { name: 'Feather cap', cost: 25, q: '#E04848', Q: '#9A2234' },
  wizard: { name: 'Wizard hat', cost: 50, q: '#7A4FD0', Q: '#4A2A90' },
  helm: { name: 'Iron helm', cost: 90 },
  crown: { name: 'Crown', cost: 200 },
  party: { name: 'Party hat', cost: 0, q: '#E04848', event: 'New Year' },
  pumpkin: { name: 'Pumpkin hat', cost: 0, event: 'Halloween' },
  winter: { name: 'Winter cap', cost: 0, q: '#E04848', Q: '#9A2234', event: 'Christmas' },
};

const NPCS = {
  pip: { name: 'Elder Pip', base: 'person', pal: { h: '#F4F0E6', g: '#7A4FD0', G: '#4A2A90', u: '#C98A00' }, over: ['beard'] },
  mabel: { name: 'Mabel the Innkeeper', base: 'person', pal: { h: '#FF8C42', g: '#E04848', G: '#9A2234' }, over: ['apron'] },
  wren: { name: 'Wren the Forager', base: 'person', pal: { g: '#2B8A7A', G: '#1C5A50', q: '#1C7A3C', Q: '#0E4A22' }, over: ['hood'] },
  bram: { name: 'Bram the Smith', base: 'person', pal: { h: '#3B2412', g: '#4A4A6A', G: '#2A2A40', l: '#8A5A2B' }, over: ['apron'] },
  mags: { name: 'Old Mags', base: 'person', pal: { g: '#4A4A6A', G: '#2A2A40', q: '#5A5A7A', Q: '#3A3A50', s: '#D8B090' }, over: ['hood'] },
  grubb: { name: 'Grubb the Merchant', base: 'person', pal: { h: '#3B2412', g: '#C98A00', G: '#8A5A00', q: '#8A5A2B', Q: '#5A3A1E' }, over: ['cap'] },
  vell: { name: 'Captain Vell', base: 'person', pal: { g: '#3F7BE0', G: '#23235A' }, over: ['helm'] },
  ione: { name: 'Ione the Stargazer', base: 'person', pal: { h: '#C9A2FF', g: '#23235A', G: '#10102A', q: '#23235A', Q: '#10102A' }, over: ['wizard'] },
  odo: { name: 'Odo the Stablemaster', base: 'person', pal: { h: '#6B3E1F', g: '#8A5A2B', G: '#5A3A1E' }, over: ['straw'] },
  arti: { name: 'Arti', base: 'arti', pal: {}, over: [] },
};

const spriteCache = new Map();
function drawSprite(ctx, rows, pal, x0 = 0, y0 = 0, scale = 1) {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const col = pal[ch] || PAL[ch];
      if (!col) continue;
      ctx.fillStyle = col;
      ctx.fillRect(x0 + x * scale, y0 + y * scale, scale, scale);
    }
  });
}
function composeRows(base, overlays) {
  const rows = base.map(r => r.padEnd(16, '.').slice(0, 16));
  for (const o of overlays || []) {
    const ov = OVER[o]; if (!ov) continue;
    for (const [y, line] of Object.entries(ov)) {
      const r = rows[+y].split('');
      for (let x = 0; x < line.length; x++) if (line[x] !== '.') r[x] = line[x];
      rows[+y] = r.join('');
    }
  }
  return rows;
}
/* name: a sprite in SPR, an NPC id, or 'hero' with {outfit, hat}. Returns a data: URL. */
const HAIR = { black: ['#1C1C1C', '#0A0A0A', 'Black'], brown: ['#6B3E1F', '#3B2412', 'Brown'], blonde: ['#E8C35A', '#A8862A', 'Blonde'], red: ['#C2452D', '#7A2412', 'Red'], white: ['#E8E8E0', '#A8A8A0', 'White'] };
const CLASS_ITEMS = { ranger: ['bow'], knight: ['sword', 'shield'], monk: ['staff'], rogue: ['dagger'], sage: ['book'] };
function spriteURL(name, opts) {
  opts = opts || {};
  if (name === 'hero' && typeof heroLook === 'function') opts = Object.assign(heroLook(), opts);
  if (name === 'arti' && !opts.pal) opts = { pal: { p: '#8EE3F0', P: '#2B8A9A' } };
  const key = name + '|' + JSON.stringify(opts);
  if (spriteCache.has(key)) return spriteCache.get(key);
  let rows, pal = {};
  if (NPCS[name] && name !== 'arti') {
    const n = NPCS[name];
    rows = composeRows(SPR[n.base], n.over); pal = n.pal;
  } else if (name === 'hero') {
    const o = OUTFITS[opts.outfit] || OUTFITS.forest, h = HATS[opts.hat] || HATS.none, hair = HAIR[opts.hair] || HAIR.black;
    const layers = [opts.race === 'elf' ? 'ears' : '', opts.glasses ? 'glasses' : '', opts.hat && opts.hat !== 'none' ? opts.hat : '', ...((CLASS_ITEMS[opts.cls]) || [])].filter(Boolean);
    rows = composeRows(SPR.person, layers).map(r => r.slice(0, 16));
    pal = { g: o.g, G: o.G, q: h.q || PAL.q, Q: h.Q || PAL.Q, h: hair[0], H: hair[1], s: opts.race === 'elf' ? '#F6D6B8' : PAL.s };
  } else {
    rows = SPR[name] || SPR.skull;
    if (opts.pal) pal = opts.pal;
  }
  const w = Math.max(...rows.map(r => r.length)), hgt = rows.length;
  const c = document.createElement('canvas'); c.width = w; c.height = hgt;
  drawSprite(c.getContext('2d'), rows, pal);
  const url = c.toDataURL();
  spriteCache.set(key, url);
  return url;
}
const sprite = (name, cls = '', opts, alt = '') => `<img class="sprite ${cls}" src="${spriteURL(name, opts)}" alt="${alt}">`;
function hydrateSprites(root = document) {
  root.querySelectorAll('img[data-sprite]').forEach(i => { i.src = spriteURL(i.dataset.sprite); });
}

/* ---------- Overworld map ---------- */
const MAP_W = 20, MAP_H = 15, TILE = 16;
const REGIONS = [
  { id: 'village', name: 'Tally Village', x: 3, y: 12, icon: 'house', npc: 'pip' },
  { id: 'ember', name: 'Emberwood', x: 6, y: 9, icon: 'embertree', npc: 'wren' },
  { id: 'peaks', name: 'Cinder Peaks', x: 3, y: 4, icon: 'volcano', npc: 'bram' },
  { id: 'marsh', name: 'Mirewater Marsh', x: 9, y: 6, icon: 'deadtree', npc: 'mags' },
  { id: 'cross', name: 'Crossroads Market', x: 13, y: 9, icon: 'tent', npc: 'grubb' },
  { id: 'keep', name: 'Stormwall Keep', x: 13, y: 3, icon: 'castle', npc: 'vell' },
  { id: 'tower', name: 'Starfall Tower', x: 17, y: 2, icon: 'tower', npc: 'ione' },
];
const SIDE = [
  { id: 'stable', name: 'Odo’s Stable', x: 9, y: 12, icon: 'house', pal: { r: '#8A5A2B' }, npc: 'odo' },
  { id: 'isle', name: 'Far Isle', x: 17, y: 12, icon: 'house', pal: { r: '#3F7BE0' }, npc: 'ione' },
];
function rng(seed) { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
function buildTerrain() {
  const T = Array.from({ length: MAP_H }, () => Array(MAP_W).fill('g'));
  const r = rng(7);
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
    if (x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1) T[y][x] = 'w';
    const dLake = Math.hypot(x - 17, (y - 12) * 1.2);
    if (dLake < 3.6) T[y][x] = 'w'; else if (dLake < 4.4 && T[y][x] === 'g') T[y][x] = 's';
    if (Math.hypot(x - 3, y - 3.5) < 3.4 && T[y][x] === 'g') T[y][x] = r() < .75 ? 'm' : 'g';
    if (Math.hypot(x - 6, y - 9) < 2.9 && T[y][x] === 'g' && r() < .7) T[y][x] = 't';
    if (Math.hypot(x - 9.5, (y - 6) * 1.3) < 2.8 && T[y][x] === 'g') T[y][x] = r() < .6 ? 'h' : 'g';
    if (T[y][x] === 'g' && r() < .1) T[y][x] = 't';
  }
  T[12][17] = 's'; T[11][17] = 's'; T[12][16] = 's';
  const path = (a, b) => {
    let x = a.x, y = a.y;
    while (x !== b.x) { if (T[y][x] !== 'w') T[y][x] = 'p'; else T[y][x] = 'b'; x += Math.sign(b.x - x); }
    while (y !== b.y) { if (T[y][x] !== 'w') T[y][x] = 'p'; else T[y][x] = 'b'; y += Math.sign(b.y - y); }
  };
  for (let i = 0; i < REGIONS.length - 1; i++) path(REGIONS[i], REGIONS[i + 1]);
  path(REGIONS[0], SIDE[0]); path(SIDE[0], { x: 13, y: 12 }); path({ x: 13, y: 12 }, { x: 15, y: 12 });
  for (const p of [...REGIONS, ...SIDE]) T[p.y][p.x] = p.id === 'isle' ? 's' : 'p';
  return T;
}
let TERRAIN = null;
function drawTile(ctx, t, x, y, seed) {
  const X = x * TILE, Y = y * TILE, R = rng(seed);
  const px = (cx, cy, col, w = 1, h = 1) => { ctx.fillStyle = col; ctx.fillRect(X + cx, Y + cy, w, h); };
  const grass = () => { px(0, 0, '#2F8F3A', 16, 16); for (let i = 0; i < 6; i++) px(Math.floor(R() * 15), Math.floor(R() * 15), R() < .5 ? '#267A30' : '#4FB04A', 1, 2); };
  if (t === 'w') { px(0, 0, '#2B5FD9', 16, 16); for (let i = 0; i < 3; i++) px(Math.floor(R() * 12), Math.floor(R() * 15), '#6FA0FF', 4, 1); return; }
  if (t === 's') { px(0, 0, '#E0C27A', 16, 16); for (let i = 0; i < 6; i++) px(Math.floor(R() * 15), Math.floor(R() * 15), '#C9A45A'); return; }
  if (t === 'p') { px(0, 0, '#C9A46A', 16, 16); for (let i = 0; i < 5; i++) px(Math.floor(R() * 15), Math.floor(R() * 15), '#A88450', 2, 1); return; }
  if (t === 'b') { px(0, 0, '#2B5FD9', 16, 16); px(0, 3, '#8A5A2B', 16, 10); for (let i = 0; i < 16; i += 4) px(i, 3, '#5A3A1E', 1, 10); return; }
  if (t === 'h') { px(0, 0, '#3D5A3A', 16, 16); px(2 + Math.floor(R() * 4), 4 + Math.floor(R() * 6), '#2A4A4A', 8, 4); px(3 + Math.floor(R() * 8), 2, '#6B8A3A', 1, 5); px(11, 9, '#6B8A3A', 1, 5); return; }
  grass();
  if (t === 't') { px(4, 11, '#5A3A1E', 4, 4); px(1, 2, '#07071A', 14, 10); px(2, 1, '#1B5E28', 12, 10); px(3, 2, '#2F8F3A', 4, 3); px(9, 4, '#267A30', 3, 3); return; }
  if (t === 'm') {
    ctx.fillStyle = '#07071A'; ctx.beginPath(); ctx.moveTo(X, Y + 16); ctx.lineTo(X + 8, Y + 1); ctx.lineTo(X + 16, Y + 16); ctx.fill();
    ctx.fillStyle = '#7A7A9A'; ctx.beginPath(); ctx.moveTo(X + 2, Y + 16); ctx.lineTo(X + 8, Y + 3); ctx.lineTo(X + 14, Y + 16); ctx.fill();
    ctx.fillStyle = '#55557A'; ctx.beginPath(); ctx.moveTo(X + 8, Y + 3); ctx.lineTo(X + 14, Y + 16); ctx.lineTo(X + 9, Y + 16); ctx.fill();
    px(6, 4, '#F4F0E6', 4, 2); px(7, 3, '#F4F0E6', 2, 1);
  }
}
/* A tile is fogged unless it's near a region you've reached or a side spot. */
function isFogged(x, y, reached) {
  return !(REGIONS.slice(0, reached + 1).some(r => Math.hypot(x - r.x, y - r.y) < 4.2) || SIDE.some(s => Math.hypot(x - s.x, y - s.y) < 2.2));
}
/* reached: index of the furthest region unlocked (0-based). */
function drawMap(canvas, reached) {
  if (!TERRAIN) TERRAIN = buildTerrain();
  canvas.width = MAP_W * TILE; canvas.height = MAP_H * TILE;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) drawTile(ctx, TERRAIN[y][x], x, y, y * 97 + x * 13 + 1);
  const img = (name, x, y, opts) => new Promise(res => { const i = new Image(); i.onload = () => { ctx.drawImage(i, x * TILE + TILE / 2 - 16, y * TILE + TILE / 2 - 22, 32, 32); res(); }; i.src = spriteURL(name, opts); });
  const jobs = [...REGIONS.map(r => img(r.icon, r.x, r.y)), ...SIDE.map(s => img(s.icon, s.x, s.y, { pal: s.pal }))];
  return Promise.all(jobs).then(() => {
    // Fog over lands you haven't reached yet
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) {
      if (!isFogged(x, y, reached)) continue;
      ctx.fillStyle = 'rgba(6,9,8,.62)'; ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
      ctx.fillStyle = 'rgba(6,9,8,.35)';
      for (let i = 0; i < TILE; i += 4) for (let j = (i / 4) % 2 ? 2 : 0; j < TILE; j += 4) ctx.fillRect(x * TILE + j, y * TILE + i, 2, 2);
    }
  });
}
