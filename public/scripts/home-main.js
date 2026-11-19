/* =========================================================================
   CONFIG: every parameter the panel controls. Paste "Copy settings" output here.
   Any key can also be set in the address, e.g. ?h1Size=90&speed=2
   ========================================================================= */
const CONFIG = {
  // Hero layout
  heroLayout: 'typed',      // 'stacked', 'rotating' or 'typed'
  heroAlign: 'center',      // 'left' or 'center'
  heroTitle: 'network',     // 'network' ("A New Testament Church Network" as the H1, the headline under it at H2 size) or 'multiplying' (flipped)

  // Headline
  colorDisciples: '#2F7D6D',
  colorLeaders: '#C2861A',
  colorChurches: '#3F55A8',
  colorMovements: '#B23A5B',
  colorMultiplying: '#7A7A83',
  h1Size: 64,               // px (it scales down on small screens)
  h1Weight: 600,            // weight of the colored words
  h1Leading: 1.04,
  heroWidth: 760,           // px, width of the hero text block
  heroTop: 52,              // %, vertical position of the hero text
  scrim: 0.85,              // white fade behind the hero text
  heroHeight: 100,          // vh
  heroCurve: 5,             // vw, how far the hero's bottom edge dips at the center (0 = straight, capped at 120px)
  soloSize: 92,             // px, the one-line headline in Rotating and Typed
  titleSize: 72,            // px, "A New Testament Church Network" with the Church Network title
  wordHold: 2.6,            // seconds each word stays in Rotating and Typed
  typeSpeed: 9,             // letters per second in Typed
  showWordDots: false,      // the four word dots under the headline in Rotating and Typed

  // Page
  sectionSpace: 128,        // px above and below each section
  radius: 24,               // px, corners of the video, images and cards
  contentWidth: 1180,       // px
  bodySize: 17,             // px
  smoothScroll: true,       // Lenis smooth scrolling
  scrollGlide: 0.6,         // how long scrolling glides (0 = short, 1 = long)
  showHubs: false,          // the Find a hub section (and its header link)
  hubCursor: 'circle',      // cursor over a hub: 'circle' (white), 'ring' (hub color, ringed) or 'photo'

  // Flight
  speed: 1.2,               // degrees of longitude per second
  tilt: 34,                 // how far the camera looks toward the horizon (degrees)
  zoom: 3.5,                // brings the camera closer to the ground; the horizon stays in view
  latitude: 30,             // the latitude the flight path centers on
  meander: 16,              // how far the path wanders north and south (degrees)
  bank: 0.7,                // how much the view turns to follow the path
  globeFocus: 0.66,         // where the flight centers across the hero when the text is left-aligned

  // Globe
  landOnly: false,          // place networks on land only (pairs well with showLand)
  siteSpacing: 5,           // minimum distance between networks (degrees)
  networkSize: 3.4,         // radius of a fully grown network (degrees)
  showLand: false,          // continent shapes
  showGraticule: true,
  haze: 0.8,                // white haze toward the horizon
  horizonFade: true,        // dissolve the globe's edge into the background
  fadeDepth: 0.16,          // how far the edge fade reaches, as a share of the view height
  oceanColor: '#F5F5F6',
  landColor: '#EAEAED',
  gridColor: '#E1E1E4',
  seed: 11,

  // Growth
  generations: 5,           // rounds of division: 5 gives 1 → 2 → 4 → 8 → 16 → 32
  divisionDuration: 1.6,
  restDuration: 0.7,
  revealLine: 0.1,          // how far below the horizon a site must travel before it appears (0–1)
  resetWhenPassed: true,    // networks that pass out of view regrow on the next turn

  // Shape
  spread: 0.82,
  lengthDecay: 0.94,
  jitter: 0.45,
  curvature: 0.16,

  // Motion
  easing: 'sine',
  drift: 0.6,
  swell: 0.09,

  // Look
  dotSize: 14,              // relative to branch length (92)
  sizeDecay: 0.86,
  uprightDots: 1,           // 0 = dots lie flat on the ground, 1 = dots stand upright and stay round
  ring: true,
  ringGap: 0.28,
  ringWidth: 0.26,
  lineWidth: 0.9,
  dotColor: '#B6B6BB',
  newbornColor: '#9C9CA2',
  lineColor: '#BDBDC2',
  dotColors: 'generations', // 'single' (Dot color) or 'generations': each generation takes the next headline color,
                            // Disciples → Leaders → Churches → Movements, then back to Disciples
  firstDotColor: 'movements', // the first dot with generation colors: 'movements' (so its first generation are
                            // disciples and the fifth loops back to Disciples), 'disciples' or 'gray' (Dot color)
  colorStrength: 1,         // how fully generation colors show (0 = Dot color)
  colorThreads: false,      // threads take the color of the dot they lead to

  // Pins
  showPins: true,           // photo pins on hover and at random
  pinSize: 200,             // pin width in pixels
  pauseOnHover: false,      // the flight eases to a stop while a pin is open
  pinRate: 19,              // random pins per minute (0 = only on hover)
  pinDuration: 5,           // seconds a random pin stays open
  maxPins: 3,               // most random pins open at once
  showPinAreas: false,      // draw where random pins can open, for tuning
  pinTextMode: 'behind',    // pins near the headline: 'strict', 'word' (current word only) or 'behind'
  pinTextPad: 20,           // px kept clear around the hero text
  pinEdge: 16,              // px kept clear inside the hero's edges
  pinMinLife: 2,            // shortest a random pin may stay open (s)
  favorY: 0.45,             // height of the middle favored area (share of the globe below the horizon)
  favorSpread: 0.3,         // size of the middle favored area
  lowerFavor: 1,            // strength of the favored area below the statement (0 = off)
  lowerSpread: 0.2,         // height of the favored area below the statement
  pinColor: '#D9D9D9',

  // Hero art: 'pins' (the Pins globe) or 'gallery' (the close-up gallery globe from the Gallery tab)
  heroArt: 'pins',

  /* The Gallery as hero art: the Gallery tab's settings, each prefixed `gallery` */
  // Gallery: Camera
  gallerySpin: 3.9,                // degrees the globe turns per second
  galleryZoom: 0.95,               // 1 = the globe's rim just touches the corners; higher crops in closer
  galleryDistance: 2.2,            // camera distance in globe radii: lower bends the grid more (fisheye)
  galleryTilt: 10,                 // camera looks this many degrees off straight down

  // Gallery: Globe position
  galleryOffsetX: 0,               // shifts the globe sideways, as a share of the view width (%)
  galleryOffsetY: 0,               // shifts the globe up or down, as a share of the view height (%)
  galleryLatitude: 24,             // the latitude facing the camera
  galleryRoll: -16,                // turns the whole view; sets the direction the dots travel across the screen
  galleryStartLon: 0,              // the longitude facing the camera at the start

  // Gallery: Grid
  galleryGridStep: 5.5,            // degrees between grid lines
  galleryWobble: 0.55,             // how far the lines wander from straight (hand-drawn feel)
  galleryWobbleScale: 1,           // how quickly the wander changes along a line
  galleryLineWidth: 0,             // grid line width in pixels
  galleryLineColor: '#141414',
  galleryGlobeColor: '#FFFFFF',    // fill of the globe, seen only when the rim is in view
  galleryBgColor: '#FFFFFF',

  // Gallery: Dots
  galleryLayout: 'random',         // 'random': dots at a random share of crossings; 'checker': every other crossing
  galleryDotShare: 0.26,           // share of grid crossings that carry a dot
  galleryDotSize: 0.3,             // dot radius as a share of the grid spacing
  gallerySizeVariety: 0.12,        // random variation in dot size
  galleryDotColor: '#EAEAEA',
  gallerySeed: 7,

  // Gallery: Network
  galleryConnect: 'networks',      // 'grid': the plain grid; 'networks': dots joined parent to child, generation by generation
  galleryGrowth: 'growing',        // 'grown': every network already complete; 'growing': networks grow as they turn into view
  galleryGenerations: 5,           // rounds of children from a network's first dot
  gallerySendCount: 2,             // most last-generation dots a network sends out, each skipping a spacing to start a new network
  galleryLineStyle: 'arc',         // 'arc', 'straight', 's' (S-curve) or 'grid' (along the grid, through the empty crossing)
  galleryNetLineWidth: 0.5,        // network line width in pixels (the grid has its own, lineWidth)
  galleryArch: 0.58,               // how far arched and S lines bow, as a share of their length
  gallerySentStyle: 'solid',       // 'dashed' or 'solid': the lines to a newly started network
  gallerySentArch: 0.35,           // bow of the sent-out lines
  galleryGrowStart: 'inview',      // 'edge', 'wave' or 'inview'; hero: In view fills both sides evenly behind centred text
  galleryRevealLine: 0.05,         // share of the view in from the incoming edge where growth starts
  galleryGenTime: 0.9,             // seconds one generation's lines take to draw out (growing)
  galleryGenPause: 0.35,           // seconds between generations (growing)
  galleryGridStrength: 0.18,       // the plain grid behind the networks (0 = hidden)

  // Gallery: Openings
  galleryAutoEvery: 3.5,           // seconds between automatic openings (hero: calmer than the Gallery tab)
  galleryAutoJitter: 0.4,          // randomness in that timing (0 = a steady beat)
  galleryFirstOpen: 0.6,           // seconds before the first opening
  galleryOpenFor: 2.5,             // seconds an automatic opening stays fully open
  galleryOpenTime: 0.7,            // seconds a dot takes to open or close
  galleryMaxOpen: 2,               // most automatic openings at once (hero: calmer than the Gallery tab)
  galleryAutoSize: 2.1,            // an automatic opening's size, relative to its dot
  galleryHoverSize: 2.9,           // a hovered dot's size, relative to its dot
  galleryPauseAutoOnHover: true,   // no new automatic openings while a dot is hovered
  gallerySlowOnHover: false,       // the globe eases to a stop while a dot is hovered, so it stays under the cursor
  galleryEdgeRoom: 40,             // automatic openings stay at least this many pixels inside the view

  // Gallery: quiet centre around the copy
  galleryQuietPadX: 40,             // px added left and right of the copy before the ellipse is drawn round it
  galleryQuietPadY: 32,             // px added above and below the copy
  galleryQuietDotScale: 0.15,       // dot size deep inside the quiet centre (share of normal)
  galleryQuietLineAlpha: 0,         // network line strength deep inside the quiet centre
  galleryQuietSoftness: 0.35,       // width of the soft edge just outside the ellipse, as a share of its radius
  galleryShowQuiet: false,          // draw the quiet centre's outline while tuning
  galleryHalo: true,                // automatic photos open in a ring just outside the quiet centre
  galleryHaloWidth: 260,            // px width of that ring
  galleryWordColor: true,           // a line drawing out takes the colour of the headline word
  galleryColorSettle: 2.5,          // seconds a finished line takes to ease back to the line colour
  galleryPhoneOpenings: 'around',   // phones: 'around' (above and below the text) or 'off'
};

// Set to false for embeds to hide the Adjust panel (or add ?controls=0 to the address)
const SHOW_CONTROLS = true;

const pct = v => Math.round(v * 100) + '%';
// Headline and Page controls write straight to the page's CSS variables
const PAGE_CONTROLS = [
  { group: 'Headline', items: [
    { key: 'colorDisciples', label: 'Disciples', type: 'color', css: '--c-disciples' },
    { key: 'colorLeaders', label: 'Leaders', type: 'color', css: '--c-leaders' },
    { key: 'colorChurches', label: 'Churches', type: 'color', css: '--c-churches' },
    { key: 'colorMovements', label: 'Movements', type: 'color', css: '--c-movements' },
    { key: 'colorMultiplying', label: '"Multiplying"', type: 'color', css: '--c-multiplying' },
    // Sizes whichever layout is showing: Stacked keeps its own size, Rotating and Typed share the one-line size
    { key: 'h1Size', label: 'Headline size', type: 'range', min: 40, max: 140, step: 1, fmt: v => v + 'px', css: '--h1-size', unit: 'px', proxy: c => (c.heroLayout === 'stacked' ? 'h1Size' : 'soloSize') },
    { key: 'titleSize', label: 'Title size', type: 'range', min: 40, max: 120, step: 1, fmt: v => v + 'px', css: '--title-size', unit: 'px' },
    { key: 'h1Weight', label: 'Colored word weight', type: 'range', min: 300, max: 700, step: 100, fmt: v => v, css: '--h1-weight' },
    { key: 'h1Leading', label: 'Line spacing', type: 'range', min: 0.9, max: 1.4, step: 0.01, fmt: v => v.toFixed(2), css: '--h1-leading' },
    { key: 'heroWidth', label: 'Text block width', type: 'range', min: 360, max: 1000, step: 10, fmt: v => v + 'px', css: '--hero-width', unit: 'px' },
    { key: 'heroTop', label: 'Text position', type: 'range', min: 30, max: 75, step: 1, fmt: v => v + '%', css: '--hero-top' },
    { key: 'scrim', label: 'Fade behind text', type: 'range', min: 0, max: 1, step: 0.01, fmt: pct, css: '--scrim' },
    { key: 'heroHeight', label: 'Hero height', type: 'range', min: 60, max: 100, step: 1, fmt: v => v + 'vh', css: '--hero-height', unit: 'vh' },
    { key: 'heroCurve', label: 'Bottom curve', type: 'range', min: 0, max: 10, step: 0.5, fmt: v => v + 'vw', css: '--hero-curve', unit: 'vw' },
    { key: 'wordHold', label: 'Each word stays', type: 'range', min: 1, max: 6, step: 0.1, fmt: v => v.toFixed(1) + 's', page: true },
    { key: 'typeSpeed', label: 'Typing speed', type: 'range', min: 3, max: 20, step: 1, fmt: v => v + ' letters/s', page: true },
    { key: 'showWordDots', label: 'Show word dots', type: 'check', page: true },
  ]},
  { group: 'Page', items: [
    { key: 'sectionSpace', label: 'Section spacing', type: 'range', min: 48, max: 220, step: 4, fmt: v => v + 'px', css: '--section-space', unit: 'px' },
    { key: 'radius', label: 'Corner radius', type: 'range', min: 0, max: 48, step: 1, fmt: v => v + 'px', css: '--radius', unit: 'px' },
    { key: 'contentWidth', label: 'Content width', type: 'range', min: 880, max: 1440, step: 10, fmt: v => v + 'px', css: '--content-width', unit: 'px' },
    { key: 'bodySize', label: 'Body text size', type: 'range', min: 14, max: 21, step: 0.5, fmt: v => v + 'px', css: '--body-size', unit: 'px' },
    { key: 'smoothScroll', label: 'Smooth scrolling', type: 'check', page: true },
    { key: 'scrollGlide', label: 'Scroll glide', type: 'range', min: 0, max: 1, step: 0.05, fmt: pct, page: true },
    { key: 'showHubs', label: 'Show Find a hub', type: 'check', page: true },
    { key: 'hubCursor', label: 'Hub cursor', type: 'select', options: [['circle', 'White circle'], ['ring', 'Ringed circle'], ['photo', 'Photo']], page: true },
  ]},
];

const CONTROLS = [
  ...PAGE_CONTROLS,
  { group: 'Globe: flight', art: 'pins', items: [
    { key: 'speed', label: 'Speed', type: 'range', min: 0, max: 8, step: 0.1, fmt: v => v.toFixed(1) + '°/s' },
    { key: 'tilt', label: 'Look toward horizon', type: 'range', min: 0, max: 45, step: 1, fmt: v => v + '°' },
    { key: 'zoom', label: 'Zoom', type: 'range', min: 1, max: 8, step: 0.05, fmt: v => v.toFixed(2) + '×' },
    { key: 'latitude', label: 'Flight latitude', type: 'range', min: -60, max: 60, step: 1, fmt: v => v + '°' },
    { key: 'meander', label: 'Meander', type: 'range', min: 0, max: 40, step: 1, fmt: v => v + '°' },
    { key: 'bank', label: 'Follow the turns', type: 'range', min: 0, max: 1, step: 0.05, fmt: pct },
    { key: 'globeFocus', label: 'Flight center', type: 'range', min: 0.5, max: 0.85, step: 0.01, fmt: pct },
  ]},
  { group: 'Globe: surface', art: 'pins', items: [
    { key: 'landOnly', label: 'Networks on land only', type: 'check', sites: true },
    { key: 'siteSpacing', label: 'Space between networks', type: 'range', min: 4, max: 25, step: 0.5, fmt: v => v + '°', sites: true },
    { key: 'networkSize', label: 'Network size', type: 'range', min: 1, max: 10, step: 0.1, fmt: v => v.toFixed(1) + '°', trees: true },
    { key: 'showLand', label: 'Show continents', type: 'check' },
    { key: 'showGraticule', label: 'Show grid', type: 'check' },
    { key: 'haze', label: 'Horizon haze', type: 'range', min: 0, max: 1, step: 0.01, fmt: pct },
    { key: 'horizonFade', label: 'Fade the horizon', type: 'check' },
    { key: 'fadeDepth', label: 'Fade depth', type: 'range', min: 0.02, max: 0.5, step: 0.01, fmt: pct },
    { key: 'oceanColor', label: 'Globe color', type: 'color' },
    { key: 'landColor', label: 'Land color', type: 'color' },
    { key: 'gridColor', label: 'Grid color', type: 'color' },
  ]},
  { group: 'Globe: growth', art: 'pins', items: [
    { key: 'generations', label: 'Generations', type: 'range', min: 1, max: 6, step: 1, fmt: v => v, trees: true },
    { key: 'divisionDuration', label: 'Division time', type: 'range', min: 0.4, max: 4, step: 0.1, fmt: v => v.toFixed(1) + 's' },
    { key: 'restDuration', label: 'Pause between generations', type: 'range', min: 0, max: 3, step: 0.1, fmt: v => v.toFixed(1) + 's' },
    { key: 'revealLine', label: 'Reveal distance', type: 'range', min: 0, max: 0.8, step: 0.01, fmt: pct },
    { key: 'resetWhenPassed', label: 'Regrow on the next turn', type: 'check' },
  ]},
  { group: 'Globe: shape', art: 'pins', items: [
    { key: 'spread', label: 'Pair spread', type: 'range', min: 0.3, max: 1, step: 0.01, fmt: pct, trees: true },
    { key: 'lengthDecay', label: 'Length per generation', type: 'range', min: 0.6, max: 1.25, step: 0.01, fmt: v => '×' + v.toFixed(2), trees: true },
    { key: 'jitter', label: 'Organic variation', type: 'range', min: 0, max: 1, step: 0.01, fmt: pct, trees: true },
    { key: 'curvature', label: 'Thread bow', type: 'range', min: 0, max: 0.5, step: 0.01, fmt: pct },
  ]},
  { group: 'Globe: motion', art: 'pins', items: [
    { key: 'easing', label: 'Easing', type: 'select', options: [['sine', 'Sine'], ['cubic', 'Cubic'], ['quint', 'Quint']] },
    { key: 'drift', label: 'Drift', type: 'range', min: 0, max: 2, step: 0.05, fmt: v => v.toFixed(2) },
    { key: 'swell', label: 'Swell on divide', type: 'range', min: 0, max: 0.3, step: 0.01, fmt: pct },
  ]},
  { group: 'Globe: dots', art: 'pins', items: [
    { key: 'dotSize', label: 'Dot size', type: 'range', min: 4, max: 30, step: 0.5, fmt: v => v, trees: true },
    { key: 'sizeDecay', label: 'Size per generation', type: 'range', min: 0.6, max: 1, step: 0.01, fmt: v => '×' + v.toFixed(2), trees: true },
    { key: 'uprightDots', label: 'Dots stand upright', type: 'range', min: 0, max: 1, step: 0.01, fmt: pct },
    { key: 'ring', label: 'Ring', type: 'check' },
    { key: 'ringGap', label: 'Ring gap', type: 'range', min: 0, max: 0.8, step: 0.01, fmt: pct },
    { key: 'ringWidth', label: 'Ring width', type: 'range', min: 0.05, max: 0.6, step: 0.01, fmt: pct },
    { key: 'lineWidth', label: 'Line width', type: 'range', min: 0.25, max: 3, step: 0.05, fmt: v => v.toFixed(2) + 'px' },
    { key: 'dotColor', label: 'Dot color', type: 'color' },
    { key: 'newbornColor', label: 'New dot color', type: 'color' },
    { key: 'lineColor', label: 'Line color', type: 'color' },
    { key: 'dotColors', label: 'Dot colors', type: 'select', options: [['generations', 'A headline color per generation'], ['single', 'One color']] },
    { key: 'firstDotColor', label: 'First dot', type: 'select', options: [['movements', 'Movements (generation 1 is Disciples)'], ['disciples', 'Disciples'], ['gray', 'Dot color']] },
    { key: 'colorStrength', label: 'Color strength', type: 'range', min: 0, max: 1, step: 0.01, fmt: pct },
    { key: 'colorThreads', label: 'Color the threads', type: 'check' },
  ]},
  { group: 'Globe: pins', art: 'pins', items: [
    { key: 'showPins', label: 'Show photo pins', type: 'check' },
    { key: 'pinSize', label: 'Pin size', type: 'range', min: 120, max: 360, step: 4, fmt: v => v + 'px' },
    { key: 'pauseOnHover', label: 'Pause the globe while a pin is open', type: 'check' },
    { key: 'pinRate', label: 'Random pins per minute', type: 'range', min: 0, max: 40, step: 1, fmt: v => v === 0 ? 'Off' : v },
    { key: 'pinDuration', label: 'Random pin stays open', type: 'range', min: 1.5, max: 15, step: 0.5, fmt: v => v.toFixed(1) + 's' },
    { key: 'maxPins', label: 'Most random pins at once', type: 'range', min: 1, max: 8, step: 1, fmt: v => v },
    { key: 'pinColor', label: 'Pin color', type: 'color' },
  ]},
  { group: 'Globe: pin areas', art: 'pins', items: [
    { key: 'showPinAreas', label: 'Show pin areas', type: 'check' },
    { key: 'pinTextMode', label: 'Pins near the headline', type: 'select', options: [['strict', 'Strict'], ['word', 'Current word'], ['behind', 'Behind headline']] },
    { key: 'pinTextPad', label: 'Text keep-out padding', type: 'range', min: 0, max: 80, step: 2, fmt: v => v + 'px' },
    { key: 'pinEdge', label: 'Screen margin', type: 'range', min: 0, max: 60, step: 2, fmt: v => v + 'px' },
    { key: 'pinMinLife', label: 'Minimum pin time', type: 'range', min: 1, max: 6, step: 0.5, fmt: v => v.toFixed(1) + 's' },
    { key: 'favorY', label: 'Middle area height', type: 'range', min: 0.1, max: 0.9, step: 0.01, fmt: pct },
    { key: 'favorSpread', label: 'Middle area size', type: 'range', min: 0.1, max: 0.8, step: 0.01, fmt: pct },
    { key: 'lowerFavor', label: 'Below-statement area strength', type: 'range', min: 0, max: 1, step: 0.05, fmt: pct },
    { key: 'lowerSpread', label: 'Below-statement area height', type: 'range', min: 0.05, max: 0.5, step: 0.01, fmt: pct },
  ]},
];

/* The Gallery's panel groups, made from the Gallery tab's own controls (GALLERY_CONTROLS) once its engine loads:
   keys prefixed `gallery`, the Grid group left out (grid lines are off; grid strength sits under Network), plus the
   hero's own settings. */
const galleryKey = k => 'gallery' + k[0].toUpperCase() + k.slice(1);
const HERO_GALLERY_EXTRAS = {
  Network: [
    { key: 'wordColor', label: 'Lines take the headline colour', type: 'check' },
    { key: 'colorSettle', label: 'Colour settles back over', type: 'range', min: 0.5, max: 6, step: 0.1, fmt: v => v.toFixed(1) + 's' },
  ],
  Openings: [
    { key: 'halo', label: 'Photos open around the heading', type: 'check' },
    { key: 'haloWidth', label: 'Ring width around the heading', type: 'range', min: 60, max: 500, step: 10, fmt: v => v + 'px' },
    { key: 'phoneOpenings', label: 'Openings on phones', type: 'select', options: [['around', 'Above and below the text'], ['off', 'Off']] },
  ],
};
const HERO_QUIET_CONTROLS = [
  { key: 'quietPadX', label: 'Side padding', type: 'range', min: 0, max: 300, step: 4, fmt: v => v + 'px', quiet: true },
  { key: 'quietPadY', label: 'Top and bottom padding', type: 'range', min: 0, max: 200, step: 4, fmt: v => v + 'px', quiet: true },
  { key: 'quietDotScale', label: 'Dot size inside', type: 'range', min: 0, max: 1, step: 0.01, fmt: pct },
  { key: 'quietLineAlpha', label: 'Lines inside', type: 'range', min: 0, max: 1, step: 0.01, fmt: pct },
  { key: 'quietSoftness', label: 'Soft edge', type: 'range', min: 0.05, max: 1, step: 0.01, fmt: pct },
  { key: 'showQuiet', label: 'Show quiet centre outline', type: 'check' },
];
function heroGalleryGroups(GALLERY_CONTROLS) {
  const groups = GALLERY_CONTROLS.filter(g => g.group !== 'Grid').map(g => ({
    group: 'Gallery: ' + g.group.toLowerCase(),
    items: [...g.items, ...(HERO_GALLERY_EXTRAS[g.group] || [])],
  }));
  groups.push({ group: 'Gallery: quiet centre', items: HERO_QUIET_CONTROLS });
  return groups.map(g => ({ ...g, art: 'gallery', items: g.items.map(c => ({ ...c, key: galleryKey(c.key), gallery: true })) }));
}

(() => {
  'use strict';

  const TAU = Math.PI * 2, DEG = Math.PI / 180;
  const BRANCH = 92;                 // layout units per first branch; dotSize is relative to this
  const DEFAULTS = { ...CONFIG };
  const params = new URLSearchParams(location.search);
  const cfg = { ...CONFIG };

  for (const key of Object.keys(DEFAULTS)) {
    if (!params.has(key)) continue;
    const raw = params.get(key), def = DEFAULTS[key];
    if (typeof def === 'number') { const n = parseFloat(raw); if (Number.isFinite(n)) cfg[key] = n; }
    else if (typeof def === 'boolean') cfg[key] = raw === '1' || raw === 'true';
    else cfg[key] = /^[0-9a-f]{6}$/i.test(raw) ? '#' + raw : raw;
  }
  const showControls = SHOW_CONTROLS && params.get('controls') !== '0';
  // The background the globe's haze and edge fade melt into: white, or the embedding page's ?bg=RRGGBB
  const BG = /^[0-9a-f]{6}$/i.test(params.get('bg') || '') ? '#' + params.get('bg') : '#FFFFFF';

  const PAGE_FIELDS = PAGE_CONTROLS.flatMap(g => g.items);
  function applyPage() {
    const root = document.documentElement.style;
    for (const c of PAGE_FIELDS) if (c.css) root.setProperty(c.css, cfg[c.key] + (c.unit || ''));
    root.setProperty('--solo-size', cfg.soloSize + 'px');      // set through the Headline size slider in Rotating and Typed
    document.documentElement.dataset.hubCursor = cfg.hubCursor;  // styles the hub cursor (see .hub-cursor)
    for (const el of document.querySelectorAll('#hubs, .site-nav a[href="#hubs"]')) el.hidden = !cfg.showHubs;
    if (headlineReady) syncHeadline();
    if (window.syncSmoothScroll) window.syncSmoothScroll(cfg);
  }
  applyPage();

  /* ---------- Math helpers (shared with network-multiply.html) ---------- */
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const bez = (a, c, b, t) => { const u = 1 - t; return u * u * a + 2 * u * t * c + t * t * b; };
  const bell = x => (1 - Math.cos(TAU * clamp(x))) / 2;
  const EASE = {
    sine:  x => -(Math.cos(Math.PI * x) - 1) / 2,
    cubic: x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
    quint: x => x < 0.5 ? 16 * x ** 5 : 1 - Math.pow(-2 * x + 2, 5) / 2,
  };

  function mulberry32(a) {
    return () => {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const rgbCache = new Map();
  function rgb(hex) {
    if (!rgbCache.has(hex)) {
      const h = hex.replace('#', '');
      const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16);
      rgbCache.set(hex, [(n >> 16) & 255, (n >> 8) & 255, n & 255]);
    }
    return rgbCache.get(hex);
  }
  // Colors are hex strings or [r, g, b]; blend gives [r, g, b], mix gives a CSS color
  function blend(a, b, t) {
    const A = typeof a === 'string' ? rgb(a) : a, B = typeof b === 'string' ? rgb(b) : b;
    return [lerp(A[0], B[0], t), lerp(A[1], B[1], t), lerp(A[2], B[2], t)];
  }
  function mix(a, b, t) {
    const [r, g, bl] = blend(a, b, t);
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(bl)})`;
  }

  /* Generation colors: the headline colors in order, looping. With the first dot as Movements, its first
     generation are disciples, the fourth are movements again and the fifth start over with disciples. */
  const WORD_COLORS = ['colorDisciples', 'colorLeaders', 'colorChurches', 'colorMovements'];
  function generationPalette() {
    const off = cfg.firstDotColor === 'disciples' ? 0 : -1;
    const pal = [];
    for (let g = 0; g <= cfg.generations; g++) {
      const word = cfg[WORD_COLORS[(((g + off) % 4) + 4) % 4]];
      pal.push(g === 0 && cfg.firstDotColor === 'gray' ? rgb(cfg.dotColor) : blend(cfg.dotColor, word, cfg.colorStrength));
    }
    return { rgb: pal, css: pal.map(c => mix(c, c, 0)) };
  }

  /* ---------- One network (radial tree, same model as the flat view) ---------- */
  function buildTree(seed) {
    const rng = mulberry32(seed);
    const G = cfg.generations, jit = cfg.jitter;
    const phases = () => [rng() * TAU, rng() * TAU, rng() * TAU, rng() * TAU];
    const root = { gen: 0, parent: -1, x: 0, y: 0, r: cfg.dotSize, delay: 0, bow: 0, ph: phases(), na: rng() * TAU, nw: TAU, nr: 0 };
    const nodes = [root];
    let frontier = [0];
    for (let g = 1; g <= G; g++) {
      const next = [];
      const len = BRANCH * Math.pow(cfg.lengthDecay, g - 1);
      const sp = g === 1 ? 1 : cfg.spread;
      for (const pi of frontier) {
        const p = nodes[pi];
        for (const side of [-1, 1]) {
          const r1 = rng(), r2 = rng(), r3 = rng(), r4 = rng();
          const n = {
            gen: g, parent: pi, r: cfg.dotSize * Math.pow(cfg.sizeDecay, g),
            delay: r3 * 0.25 * jit, bow: side * (1 + (r4 - 0.5) * 1.2 * jit), ph: phases(),
            na: p.na + side * (p.nw / 4) * sp, nw: p.nw / 2, nr: p.nr + len,
          };
          const a = n.na + (r1 - 0.5) * jit * (p.nw / 4) * 0.7;
          const rr = n.nr + (r2 - 0.5) * jit * 0.4 * len;
          n.x = Math.cos(a) * rr; n.y = Math.sin(a) * rr;
          next.push(nodes.length);
          nodes.push(n);
        }
      }
      frontier = next;
    }
    for (const n of nodes) { n.fq = n.ph.map(v => 0.22 + 0.28 * (v / TAU)); n.st = {}; }
    return nodes;
  }

  // Degrees of arc per layout unit, so a grown network spans `networkSize` degrees
  function degPerUnit() {
    let ext = 0;
    for (let g = 1; g <= cfg.generations; g++) ext += BRANCH * Math.pow(cfg.lengthDecay, g - 1);
    return cfg.networkSize / Math.max(1, ext);
  }

  function siteTiming() {
    const div = cfg.divisionDuration, rest = cfg.restDuration, G = cfg.generations;
    const rootIn = 1.4;
    const lead = rootIn + rest * 0.6;
    const start = g => lead + (g - 1) * (div + rest);
    return { div, rest, G, rootIn, start, growEnd: start(G) + div };
  }

  /* ---------- Globe data + sites ---------- */
  let landFeature = null;
  let sites = [];
  const graticule = d3.geoGraticule10();
  const SPHERE = { type: 'Sphere' };

  function setLocalProjection(site) {
    const k = degPerUnit();
    site.local = d3.geoAzimuthalEquidistant()
      .rotate([-site.ll[0], -site.ll[1], site.angle])
      .scale(180 / (Math.PI * k)).translate([0, 0]);
  }
  function makeTree(site) {
    site.nodes = buildTree(site.seed);
    setLocalProjection(site);
  }

  /* Where the networks sit depends only on the seed, the spacing and the land, and working it out (thousands of
     points tested against the coastline) takes most of a second, so a replay with the same settings reuses it */
  let siteLayout = null;
  function buildSites() {
    const useLand = cfg.landOnly && landFeature;
    const key = [cfg.seed, cfg.siteSpacing, !!cfg.landOnly].join();
    if (!siteLayout || siteLayout.key !== key || siteLayout.land !== useLand) {
      siteLayout = { key, land: useLand, sites: placeSites(useLand) };
    }
    sites = siteLayout.sites.map(s => ({ ...s, state: 'dormant', start: 0, out: 0, nodes: null }));
    sites.forEach(makeTree);
  }
  function placeSites(useLand) {
    const rng = mulberry32(cfg.seed);
    const sp = cfg.siteSpacing * DEG;
    const N = Math.round(clamp(4 * Math.PI / (sp * sp) * 6, 600, 4000));
    const golden = Math.PI * (3 - Math.sqrt(5));
    const cands = [];
    for (let i = 0; i < N; i++) {
      const y = 1 - (i + 0.5) * 2 / N;
      const lat = Math.asin(y) / DEG + (rng() - 0.5) * 2;
      const lon = (((i * golden) / DEG + (rng() - 0.5) * 2) % 360 + 540) % 360 - 180;
      if (Math.abs(lat) > 72) continue;
      if (useLand && !d3.geoContains(landFeature, [lon, lat])) continue;
      cands.push([lon, lat]);
    }
    for (let i = cands.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [cands[i], cands[j]] = [cands[j], cands[i]];
    }
    const picked = [];
    for (const c of cands) if (picked.every(p => d3.geoDistance(p, c) >= sp)) picked.push(c);

    return picked.map(ll => ({ ll, seed: (rng() * 1e9) | 0, angle: rng() * 360 }));
  }

  function resetSite(site) {
    site.state = 'dormant';
    site.out = 0;
    site.seed = (Math.random() * 1e9) | 0;   // a fresh shape each time it comes around
    makeTree(site);
  }

  /* ---------- Canvas + projection ---------- */
  const stage = document.getElementById('stage');
  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const layer = document.createElement('canvas');      // networks are drawn here, then laid over the globe
  const lctx = layer.getContext('2d');
  const view = { w: 0, h: 0, dpr: 1, insetR: 0, insetB: 0, horizonY: 0, ty: 0 };

  const proj = d3.geoSatellite().precision(1);
  const path = d3.geoPath(proj, ctx);
  const lpath = d3.geoPath(proj, lctx);
  const outline = d3.geoPath(proj);                    // SVG path strings, for reusable Path2D shapes

  /* Screen-space frame for a dot: columns are the screen offsets per degree east and north.
     Lying on the ground, a dot flattens into an ellipse toward the horizon. Standing upright, it
     stays round and only shrinks with distance: its radius uses the frame's larger axis (the one
     across the line of sight, which perspective doesn't squash). `uprightDots` blends the two. */
  function surfaceFrame(ll) {
    const c = proj(ll);
    if (!c || c[1] > view.h * 1.5 || c[1] < -view.h) return null;
    const e = 0.05, cl = Math.max(0.05, Math.cos(ll[1] * DEG));
    const pe = proj([ll[0] + e / cl, ll[1]]), pn = proj([ll[0], ll[1] + e]);
    const a = (pe[0] - c[0]) / e, b = (pe[1] - c[1]) / e, cc = (pn[0] - c[0]) / e, d = (pn[1] - c[1]) / e;
    const u = cfg.uprightDots;
    if (u <= 0) return [a, b, cc, d, c[0], c[1]];
    const half = (a * a + b * b + cc * cc + d * d) / 2, det = a * d - b * cc;
    const s = Math.sqrt(half + Math.sqrt(Math.max(0, half * half - det * det)));
    return [lerp(a, s, u), lerp(b, 0, u), lerp(cc, 0, u), lerp(d, s, u), c[0], c[1]];
  }

  // Zoom brings the camera closer to the ground (the framing stays put, so the horizon stays in view)
  const altitude = () => 1 + 0.22 / Math.max(0.5, cfg.zoom);

  /* The tilted camera sees the horizon ahead but not the ground behind it. d3 clips only at the
     horizon (a cap around the point beneath the camera), so ground behind the camera would wrap
     around the screen. Instead, clip to a cap shifted forward: its far edge is the horizon ahead,
     its near edge sits just behind the camera, before the wrap begins. */
  function forwardCapClip(shift, radius) {
    const clip = d3.geoClipCircle(radius * DEG);       // takes radians
    const toCap = d3.geoRotation([0, -shift]), fromCap = toCap.invert;
    const R = 180 / Math.PI;
    const relay = (s, map) => ({
      point(x, y) { const p = map([x * R, y * R]); s.point(p[0] / R, p[1] / R); },
      lineStart() { s.lineStart(); }, lineEnd() { s.lineEnd(); },
      polygonStart() { s.polygonStart(); }, polygonEnd() { s.polygonEnd(); },
      sphere() { s.sphere(); },
    });
    return stream => relay(clip(relay(stream, fromCap)), toCap);
  }

  // Frame the view so the horizon sits ~20% down and the point beneath the camera sits at the bottom edge
  function refit() {
    const alt = altitude();
    const CA = Math.acos(1 / alt) / DEG;
    const H = view.h;
    const unit = d3.geoSatellite().distance(alt).tilt(cfg.tilt).clipAngle(CA - 1e-6)
      .scale(1).translate([0, 0]).rotate([0, 0, 90]);
    const hz = -unit([CA - 0.05, 0])[1];                // horizon height above the nadir at scale 1
    // Landscape: nadir at the bottom edge. Portrait: pull back so networks still fit the width.
    const scale = Math.min(H * 0.8, Math.max(view.w * 0.75, H * 0.45)) / hz;
    view.horizonY = H * 0.2;
    view.ty = view.horizonY + hz * scale;

    // How far behind the camera the ground stays in front of the image plane
    let back = CA;
    for (let a = 0.25; a < CA; a += 0.25) {
      const beta = Math.atan2(Math.sin(a * DEG), alt - Math.cos(a * DEG)) / DEG;
      if (beta >= 90 - cfg.tilt - 4) { back = Math.max(0.5, a - 1); break; }
    }
    const radius = (CA + back) / 2, shift = (CA - back) / 2;
    proj.distance(alt).tilt(cfg.tilt).preclip(forwardCapClip(shift, radius)).scale(scale);
    view.cap = { shift, radius, CA };
  }

  function resize() {
    const r = stage.getBoundingClientRect();
    // ?dpr=1: a faint background copy (the site footer's) draws at 1x; on a Retina screen that's a quarter of the
    // pixels, and since it shares the page's main thread, that keeps the page's own scrolling smooth
    view.dpr = Math.min(+new URLSearchParams(location.search).get('dpr') || window.devicePixelRatio || 1, 2);
    view.w = r.width; view.h = r.height;
    for (const c of [canvas, layer]) {
      c.width = Math.round(r.width * view.dpr);
      c.height = Math.round(r.height * view.dpr);
    }
    refit();
  }
  new ResizeObserver(resize).observe(stage);

  /* ---------- Flight ---------- */
  const START_LON = -112;                 // begin over North America, flying east
  let t = 0, clock = 0, flightLon = START_LON, playing = true;
  let pendingPins = 0, spawnTry = 0;
  let flightClock = 0, cruise = 1;                    // cruise eases to 0 while a pin is open
  const flight = { lat: 0, center: [0, 0] };

  // The camera's pose at a point along the flight path
  function flightPose(lon, fclock) {
    const w = 0.045;                                  // meander period ≈ 140s
    const lat = cfg.latitude + cfg.meander * Math.sin(fclock * w + 0.6);
    const dLat = cfg.meander * w * Math.cos(fclock * w + 0.6);
    const dLon = Math.max(0.05, cfg.speed) * Math.cos(lat * DEG);
    const heading = Math.atan2(dLat, dLon) / DEG;     // degrees north of east
    return { lat, rotate: [-lon, -lat, 90 - heading * cfg.bank] };
  }

  function updateFlight(dt) {
    const want = hovering && cfg.pauseOnHover ? 0 : 1;
    cruise += (want - cruise) * (1 - Math.exp(-dt * 2.4));
    if (playing) { flightLon += cfg.speed * cruise * dt; flightClock += cruise * dt; }
    const pose = flightPose(flightLon, flightClock);
    flight.lat = pose.lat;
    flight.center = [flightLon, pose.lat];
    proj.rotate(pose.rotate);
    // Left-aligned, the flight centers in the open space beside the text; it eases back when centered
    const focus = cfg.heroAlign === 'left' ? cfg.globeFocus : 0.5;
    view.focus = view.focus == null ? focus : view.focus + (focus - view.focus) * (1 - Math.exp(-dt * 2));
    proj.translate([(view.w - view.insetR) * view.focus, view.ty - view.insetB * 0.35]);
  }

  /* ---------- Site lifecycle: dormant → revealed → growing → grown → reset ---------- */
  function updateSites(dt) {
    const W = view.w, H = view.h;
    const CA = Math.acos(1 / altitude()) / DEG;
    const netR = cfg.networkSize * 1.15;
    const band = view.horizonY + (H - view.horizonY) * cfg.revealLine;
    for (const s of sites) {
      const d = d3.geoDistance(s.ll, flight.center) / DEG;
      const p = proj(s.ll);
      const onScreen = d < CA - 0.4 && p && p[1] > 0 && p[1] < H + 20 && p[0] > -20 && p[0] < W + 20;
      // Judge by the whole network, not its center: up close, a network's branches stay on
      // screen long after its center has passed beneath the camera. Dots are culled one by one.
      s.drawable = d < CA + netR && p && p[1] > -H;
      s.d = d;

      if (s.state === 'dormant') {
        if (onScreen && p[1] > band) {
          s.state = 'active';
          // Networks in view at load get a head start (most already part-grown, a few still to come), so the
          // globe looks lived-in when the loading screen opens; later arrivals grow from a single dot
          s.start = !playing && reduceMotion ? -1e3
            : t < 0.5 ? (Math.random() < 0.75 ? t - (2 + Math.random() * 10) : t + Math.random() * 2.5)
            : t + Math.random() * 0.8;
          s.out = 0;
        }
        continue;
      }
      // `out` is time with no dot of this network on screen; draw() zeroes it while any dot is visible
      if (playing && t > s.start) s.out += dt;
      if (cfg.resetWhenPassed && s.out > 2.5) resetSite(s);
    }
  }

  /* ---------- Drawing ---------- */
  let shownStatus = '', populated = false;
  const statusEl = showControls ? document.getElementById('status') : null;

  function draw() {
    if (!layer.width || !layer.height) return;   // hidden (the Gallery is showing): nothing to draw on yet
    const W = view.w, H = view.h, dpr = view.dpr;
    const E = EASE[cfg.easing] || EASE.sine;
    const T = siteTiming();
    const { div, G } = T;
    const k = degPerUnit();
    const D = cfg.drift * 5;
    const stagger = 0.25 * cfg.jitter;
    const horizonRad = view.cap.CA * DEG;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    // Globe
    ctx.beginPath(); path(SPHERE);
    ctx.fillStyle = cfg.oceanColor; ctx.fill();
    if (cfg.showLand && landFeature) {
      ctx.beginPath(); path(landFeature);
      ctx.fillStyle = cfg.landColor; ctx.fill();
    }
    if (cfg.showGraticule) {
      ctx.beginPath(); path(graticule);
      ctx.lineWidth = 0.6; ctx.strokeStyle = cfg.gridColor; ctx.stroke();
    }

    // Networks
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lctx.clearRect(0, 0, W, H);
    const live = [];
    let growing = 0, dots = 0;
    hits.length = 0;

    // Nearest networks first; on very busy settings, the farthest (in the horizon fade) are left out
    const DOT_BUDGET = 1800;
    const order = sites.filter(x => x.state === 'active' && x.drawable).sort((a, b) => a.d - b.d);
    for (const site of order) {
      if (dots >= DOT_BUDGET) break;
      const ts = t - site.start;
      if (ts <= 0) continue;
      if (ts < T.growEnd) growing++;
      const inv = site.local.invert;

      for (const n of site.nodes) {
        const s = n.st;
        const tx = n.x + D * (Math.sin(clock * n.fq[0] + n.ph[0]) + 0.5 * Math.sin(clock * n.fq[1] + n.ph[1]));
        const ty = n.y + D * (Math.sin(clock * n.fq[2] + n.ph[2]) + 0.5 * Math.sin(clock * n.fq[3] + n.ph[3]));
        s.scale = n.gen < G ? 1 + cfg.swell * bell((ts - T.start(n.gen + 1)) / (div * 0.6)) : 1;

        if (n.gen === 0) {
          s.vis = true; s.x = tx; s.y = ty;
          s.size = E(clamp(ts / 1.1));
          s.ring = E(clamp((ts - 0.5) / 0.9));
          s.newborn = 1 - E(clamp((ts - 1.1) / 1.6));
        } else {
          const p = (ts - T.start(n.gen)) / div;
          s.vis = p > n.delay && site.nodes[n.parent].st.vis;
          if (!s.vis) continue;
          const pc = clamp((p - n.delay) / (1 - stagger));
          const grow = E(clamp(pc / 0.55));
          s.size = 0.3 + 0.7 * grow;
          s.ring = E(clamp((pc - 0.55) / 0.45));
          s.newborn = 1 - E(clamp((ts - T.start(n.gen) - div) / Math.max(0.8, T.rest + div * 0.6)));
          const par = site.nodes[n.parent].st;
          const dx = tx - par.x, dy = ty - par.y, kb = cfg.curvature * n.bow;
          s.x0 = par.x; s.y0 = par.y;
          s.cx = (par.x + tx) / 2 - dy * kb; s.cy = (par.y + ty) / 2 + dx * kb;
          s.tx = tx; s.ty = ty;
          s.move = E(clamp(pc / 0.9));
          s.x = bez(s.x0, s.cx, tx, s.move);
          s.y = bez(s.y0, s.cy, ty, s.move);
        }
        s.ll = inv([s.x, s.y]);
        s.rd = n.r * s.size * s.scale * k;               // dot radius in degrees
        s.dist = d3.geoDistance(s.ll, flight.center);
        s.frame = s.dist < horizonRad ? surfaceFrame(s.ll) : null;
        s.px = s.frame ? s.rd * Math.sqrt(Math.abs(s.frame[0] * s.frame[3] - s.frame[1] * s.frame[2])) : 0;   // radius on screen
        if (s.frame) {
          dots++;
          const f = s.frame, m = 60;
          if (f[4] > -m && f[4] < W + m && f[5] > -m && f[5] < H + m) {
            site.out = 0;
            // Screen radius of the dot's outer ring, for hover hit-testing
            const px = s.rd * (1 + cfg.ringGap + cfg.ringWidth) * Math.sqrt(Math.abs(f[0] * f[3] - f[1] * f[2]));
            hits.push({ x: f[4], y: f[5], r: px, site, node: n });
          }
        }
      }
      live.push(site);
    }

    // 1. Threads, sampled along the bow and laid on the sphere (clipped at the horizon)
    // Kept light for busy settings: threads off screen are skipped, short ones get fewer samples, and
    // threads well inside the horizon are projected directly instead of going through the clipping path.
    // With colored threads, each generation's threads are stroked on their own in that generation's color.
    const pal = cfg.dotColors === 'generations' ? generationPalette() : null;
    const threadGens = pal && cfg.colorThreads ? Array.from({ length: G }, (_, i) => i + 1) : [0];
    const safeRad = horizonRad - 2.5 * DEG, offX = W + 40, offY = H + 40;
    lctx.lineCap = 'round'; lctx.lineJoin = 'round';
    lctx.lineWidth = cfg.lineWidth;
    for (const gen of threadGens) {
      lctx.beginPath();
      for (const site of live) {
        const inv = site.local.invert;
        for (const n of site.nodes) {
          const s = n.st;
          if (!n.gen || !s.vis || (gen && n.gen !== gen)) continue;
          const ps = site.nodes[n.parent].st, a = s.frame, b = ps.frame;
          if (!a && !b) continue;                                          // both ends beyond the horizon
          if (a && b) {
            const ax = a[4], ay = a[5], bx = b[4], by = b[5];
            if ((ax < -40 && bx < -40) || (ax > offX && bx > offX) || (ay > offY && by > offY) || (ay < -40 && by < -40)) continue;
            const len = Math.hypot(ax - bx, ay - by);
            if (len < 1.5) continue;                                       // too small to see
            const m = Math.max(2, Math.min(14, Math.ceil(len / 9)));
            if (s.dist < safeRad && ps.dist < safeRad) {
              for (let i = 0; i <= m; i++) {
                const u = s.move * i / m;
                const q = proj(inv([bez(s.x0, s.cx, s.tx, u), bez(s.y0, s.cy, s.ty, u)]));
                i ? lctx.lineTo(q[0], q[1]) : lctx.moveTo(q[0], q[1]);
              }
              continue;
            }
          }
          const m = Math.max(3, Math.ceil(14 * s.move));
          const coords = [];
          for (let i = 0; i <= m; i++) {
            const u = s.move * i / m;
            coords.push(inv([bez(s.x0, s.cx, s.tx, u), bez(s.y0, s.cy, s.ty, u)]));
          }
          lpath({ type: 'LineString', coordinates: coords });
        }
      }
      lctx.strokeStyle = gen ? pal.css[gen] : cfg.lineColor;
      lctx.stroke();
    }

    // Dots are drawn in each one's local surface frame (degrees east/north → screen),
    // so they flatten into ellipses toward the horizon like circles painted on the ground
    const onSurface = f => lctx.setTransform(dpr * f[0], dpr * f[1], dpr * f[2], dpr * f[3], dpr * f[4], dpr * f[5]);

    // 2. Clear a halo around every dot so threads stop short of the ring
    lctx.globalCompositeOperation = 'destination-out';
    lctx.beginPath();
    for (const site of live) for (const n of site.nodes) {
      const s = n.st;
      if (!s.vis || !s.frame || s.px < 0.4) continue;
      const halo = s.rd * (1 + cfg.ringGap + (cfg.ring ? cfg.ringWidth * s.ring : 0)) * 1.04;
      onSurface(s.frame);
      lctx.moveTo(halo, 0);
      lctx.arc(0, 0, halo, 0, TAU);
    }
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    lctx.fill();
    lctx.globalCompositeOperation = 'source-over';

    // 3. Dots and rings
    for (const site of live) {
      for (let i = site.nodes.length - 1; i >= 0; i--) {
        const n = site.nodes[i], s = n.st;
        if (!s.vis || !s.frame || s.rd <= 0 || s.px < 0.4) continue;
        const pin = pinned.get(n) || 0;
        if (pal) {
          // A new dot buds out in its parent's color and settles into its own; a pinned dot deepens
          const own = pin > 0 ? blend(pal.rgb[n.gen], '#1F1F23', 0.3 * pin) : pal.rgb[n.gen];
          const from = n.gen ? pal.rgb[n.gen - 1] : cfg.newbornColor;
          lctx.fillStyle = s.newborn > 0 || pin > 0 ? mix(own, from, s.newborn) : pal.css[n.gen];
        } else {
          // A pinned dot deepens toward the new-dot color while its pin is up
          const tint = Math.max(s.newborn, pin);
          lctx.fillStyle = tint > 0 ? mix(cfg.dotColor, cfg.newbornColor, tint) : cfg.dotColor;
        }
        lctx.globalAlpha = 1;
        onSurface(s.frame);
        lctx.beginPath();
        lctx.arc(0, 0, s.rd, 0, TAU);
        lctx.fill();
        if (cfg.ring && s.ring > 0) {
          const wR = s.rd * cfg.ringWidth * s.ring;
          const mid = lerp(s.rd, s.rd * (1 + cfg.ringGap) + (s.rd * cfg.ringWidth) / 2, s.ring);
          const ro = mid + wR / 2, ri = Math.max(0, mid - wR / 2);
          lctx.globalAlpha = s.ring;
          lctx.beginPath();
          lctx.arc(0, 0, ro, 0, TAU);
          lctx.moveTo(ri, 0);
          lctx.arc(0, 0, ri, 0, TAU);
          lctx.fill('evenodd');
        }
      }
    }
    lctx.globalAlpha = 1;
    lctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(layer, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Aerial haze: distance fades softly into white
    if (cfg.haze > 0) {
      const y0 = view.horizonY - 2, y1 = view.horizonY + (H - view.horizonY) * 0.55;
      const [r, g, b] = rgb(BG);
      const grad = ctx.createLinearGradient(0, y0, 0, y1);
      grad.addColorStop(0, `rgba(${r},${g},${b},${cfg.haze})`);
      grad.addColorStop(0.45, `rgba(${r},${g},${b},${cfg.haze * 0.35})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, y0, W, y1 - y0);
    }

    const edge = new Path2D(outline(SPHERE));
    if (cfg.horizonFade) {
      // Endless horizon: stacked soft white strokes along the globe's edge build a falloff
      // that follows the curve, so the globe dissolves into the background with no hard line
      const depth = Math.max(4, cfg.fadeDepth * H), K = 22;
      const a = 1 - Math.pow(0.015, 1 / K);
      ctx.strokeStyle = BG; ctx.lineJoin = 'round'; ctx.globalAlpha = a;
      for (let i = 1; i <= K; i++) { ctx.lineWidth = 2 * depth * i / K; ctx.stroke(edge); }
      ctx.globalAlpha = 1;
    } else {
      ctx.lineWidth = 1; ctx.strokeStyle = '#DADADD'; ctx.stroke(edge);
    }

    if (!populated && sites.length && ((t > 0.8 && dots >= 35) || t > 3)) {   // enough of the globe has grown in
      populated = true;
      window.dispatchEvent(new Event('globe:populated'));   // the loading screen can open
    }
    const text = !sites.length ? 'Loading the globe'
      : `${growing} ${growing === 1 ? 'network' : 'networks'} growing, ${dots} ${dots === 1 ? 'dot' : 'dots'} in view`;
    if (statusEl && text !== shownStatus) statusEl.textContent = shownStatus = text;
  }

  /* ---------- Photo pins ----------
     Hovering a dot opens its pin; random pins also open on their own at `pinRate` per minute.
     Every pin rides along with its dot and rises from its pointer tip. */
  const hits = [];                                     // dots on screen this frame: { x, y, r, site, node }
  const pins = [];                                     // open and closing pins
  const pool = [];                                     // closed pins, kept for reuse
  const pinned = new Map();                            // node → how far its pin is open (tints the dot)
  const pinLayer = document.getElementById('pins');
  const pinTemplate = document.getElementById('pin-template');
  const PIN_TIP_X = (782 - 216) / 1168;                // the pointer's tip, as a share of the pin's width
  const PIN_ASPECT = 1080 / 1168;
  const heroCopy = document.getElementById('hero-copy');
  const textRange = document.createRange();
  // Tight boxes around the visible hero text: one per line of the headline and statement, plus the buttons
  // Width of the one-line headline ("Multiplying" + a word) at its current size and weight
  const soloMeter = document.getElementById('solo-meter');
  const lineWidthCache = new Map();
  function soloLineWidth(word) {
    const solo = heroCopy.querySelector('.solo');
    const key = getComputedStyle(solo).fontSize + '|' + cfg.h1Weight + '|' + word;
    if (!lineWidthCache.has(key)) {
      soloMeter.innerHTML = `Multiplying <span class="slot">${word}<span class="cursor"></span></span>`;
      lineWidthCache.set(key, soloMeter.scrollWidth);
    }
    return lineWidthCache.get(key);
  }
  /* Tight boxes around the visible hero text: each line of the headline and statement, the buttons and
     the header. How the headline counts depends on `pinTextMode`:
       'strict'  the one-line headline at its longest word (Typed and Rotating change the word over time)
       'word'    the one-line headline at the word showing now
       'none'    the headline doesn't count (pins may sit behind it) */
  function heroTextRects(headline = cfg.pinTextMode === 'behind' ? 'none' : cfg.pinTextMode) {
    // Embedded behind another page's hero (?embed=globe), pins keep clear of that page's text instead
    try { if (window.frameElement && window.parent.rnHeroTextRects) return window.parent.rnHeroTextRects(window.frameElement); } catch {}
    const rects = [];
    const runs = el => {                    // text runs only (a range over an element also reports its block boxes)
      const walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      for (let n = walk.nextNode(); n; n = walk.nextNode()) {
        if (!n.textContent.trim()) continue;
        textRange.selectNodeContents(n);
        rects.push(...textRange.getClientRects());
      }
    };
    runs(heroCopy.querySelector('.hero-sub'));
    for (const el of heroCopy.querySelectorAll('.hero-lead, .hero-tagline')) runs(el);   // the title (no boxes while hidden)
    const solo = heroCopy.querySelector('.solo');
    if (headline !== 'none') {
      if (cfg.heroLayout === 'stacked') runs(heroCopy.querySelector('.stacked'));
      else if (solo.offsetParent) {
        const lineW = headline === 'strict' ? Math.max(...WORDS.map(w => soloLineWidth(w.text))) : soloLineWidth(WORDS[wordIndex].text);
        const sr = solo.getBoundingClientRect(), cr = heroCopy.getBoundingClientRect();
        const left = cfg.heroAlign === 'center' ? (cr.left + cr.right - lineW) / 2 : sr.left;
        rects.push({ left, right: left + lineW, top: sr.top, bottom: sr.bottom, width: lineW, height: sr.height });
      }
    }
    for (const el of heroCopy.querySelectorAll('.hero-actions .button, .word-dots')) rects.push(el.getBoundingClientRect());
    // The header's logo and links sit over the hero too
    for (const el of document.querySelectorAll('.site-nav')) rects.push(el.getBoundingClientRect());
    return rects.filter(b => b.width > 0 && b.height > 0);
  }
  const pointer = { x: 0, y: 0, inside: false, moves: 0 };
  const track = e => {
    const b = canvas.getBoundingClientRect();         // the hero scrolls with the page
    pointer.x = e.clientX - b.left; pointer.y = e.clientY - b.top; pointer.inside = true; pointer.moves++;
  };
  let hovering = false, pinUid = 0, pinColor = '';

  canvas.addEventListener('pointermove', track);
  canvas.addEventListener('pointerdown', track);
  // On touch the pin stays up after the finger lifts; tapping empty ground closes it
  canvas.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') pointer.inside = false; });

  const photoFor = (site, node) =>
    Math.abs((site.seed ^ Math.imul(site.nodes.indexOf(node) + 1, 2654435761)) | 0) % NETWORK_GLOBE_PHOTOS.length;

  function makePin() {
    const el = pinTemplate.content.firstElementChild.cloneNode(true);
    const clipId = 'pin-clip-' + (++pinUid);           // each pin needs its own clip path id
    el.querySelector('clipPath').id = clipId;
    const photoEl = el.querySelector('.pin-photo');
    photoEl.setAttribute('clip-path', `url(#${clipId})`);
    pinLayer.appendChild(el);
    return { el, photoEl, photo: -1 };
  }

  function setPhoto(p, idx) {
    if (p.photo === idx) return;
    p.photo = idx;
    p.photoEl.classList.remove('is-loaded');
    const url = NETWORK_GLOBE_PHOTOS[idx];
    const img = new Image();
    img.onload = () => {
      if (p.photo !== idx) return;
      p.photoEl.setAttribute('href', url);
      p.photoEl.classList.add('is-loaded');
    };
    img.src = url;
  }

  function openPin(hit, kind) {
    // Reopen a pin still fading on this dot rather than stacking a second one
    let p = pins.find(q => q.node === hit.node);
    if (!p) {
      p = pool.pop() || makePin();
      Object.assign(p, { node: hit.node, shown: 0, x: hit.x, y: hit.y, gap: hit.r });
      // Skip photos already showing on another pin
      let idx = photoFor(hit.site, hit.node);
      for (let k = 0; k < NETWORK_GLOBE_PHOTOS.length && pins.some(q => q.photo === idx); k++) idx = (idx + 1) % NETWORK_GLOBE_PHOTOS.length;
      setPhoto(p, idx);
      pins.push(p);
    }
    Object.assign(p, { kind, closing: false, life: kind === 'auto' ? cfg.pinDuration : Infinity, moves: pointer.moves });
    return p;
  }

  function pickHover(hp) {
    if (!cfg.showPins || !pointer.inside) return null;
    let best = null, bestD = Infinity;
    for (const h of hits) {
      const d = Math.hypot(h.x - pointer.x, h.y - pointer.y);
      if (d < Math.max(h.r, 6) + 8 && d < bestD) { best = h; bestD = d; }
    }
    const cur = hp && hits.find(h => h.node === hp.node);
    // When the globe keeps flying, the dot slides out from under a still pointer:
    // keep its pin until the pointer moves or the dot leaves the view
    if (cur && !cfg.pauseOnHover && pointer.moves === hp.moves) return cur;
    if (best) return best;
    // Stay with the current dot while the pointer is still near it
    return cur && Math.hypot(cur.x - pointer.x, cur.y - pointer.y) < cur.r + 44 ? cur : null;
  }

  /* Random pins open only where they can stay a while. The camera's path is known, so each candidate
     dot is projected from where the camera will be over the next few seconds to find how long its pin
     would stay fully on screen. A pin gets that long (up to `pinDuration`) and never less than
     `pinMinLife`, so it closes on its own just before its dot reaches the edge. Pins stay clear of the
     hero text and favor two areas: the middle of the globe and the open globe below the statement.
     analyzePins() does the work; spawnRandomPin() picks from it, and the "Show pin areas" overlay draws it. */
  const OPEN_CLOSE = 0.9;                              // seconds spent opening and closing

  function analyzePins() {
    const open = pins.filter(p => !p.closing);
    const W = view.w - view.insetR, H = view.h - view.insetB, m = cfg.pinEdge;
    const w = cfg.pinSize, ph = w * PIN_ASPECT;
    // Keep clear of the actual text (each headline and statement line, the buttons), not the whole text block
    const cb = canvas.getBoundingClientRect(), pad = cfg.pinTextPad;
    const toBox = b => ({ l: b.left - cb.left - pad, r: b.right - cb.left + pad, t: b.top - cb.top - pad, b: b.bottom - cb.top + pad });
    const keepOut = heroTextRects().map(toBox);
    const clearOf = (boxes, x, y, r) => {
      const left = x - w * PIN_TIP_X, right = left + w, top = y - r - 6 - ph;
      return boxes.every(k => right < k.l || left > k.r || y < k.t || top > k.b);
    };
    const clearOfText = (x, y, r) => clearOf(keepOut, x, y, r);
    // Current word: a pin beside a short word must close before a longer word can reach it
    const wordMode = cfg.pinTextMode === 'word' && cfg.heroLayout !== 'stacked';
    const reach = wordMode ? heroTextRects('strict').map(toBox) : null;
    const changeIn = wordMode ? headlineChangeIn() : Infinity;
    const onScreen = (x, y, r) => x - w * PIN_TIP_X > m && x + w * (1 - PIN_TIP_X) < W - m && y - r - 6 - ph > m && y < H - m;
    const fits = (x, y, r) => onScreen(x, y, r) && clearOfText(x, y, r);

    const textL = keepOut.length ? Math.min(...keepOut.map(k => k.l)) : 0;
    const textR = keepOut.length ? Math.max(...keepOut.map(k => k.r)) : 0;
    const textB = keepOut.length ? Math.max(...keepOut.map(k => k.b)) : view.horizonY;
    // Favored areas: the middle of the globe beside the text, and the open globe below the statement
    const main = { x: Math.min(W - w / 2, (Math.max(0, textR) + W) / 2), y: view.horizonY + (H - view.horizonY) * cfg.favorY, sx: W * cfg.favorSpread, sy: H * cfg.favorSpread };
    const lower = { x: Math.max(w / 2, Math.min(W - w / 2, (textL + textR) / 2)), y: (textB + H) / 2, sx: W * 0.32, sy: H * cfg.lowerSpread };
    const favorAt = (x, y) => {
      const a = ((x - main.x) / main.sx) ** 2 + ((y - main.y) / main.sy) ** 2;
      const b = ((x - lower.x) / lower.sx) ** 2 + ((y - lower.y) / lower.sy) ** 2;
      return Math.max(Math.exp(-a), cfg.lowerFavor * Math.exp(-b));
    };

    const status = new Map(), spots = [];
    for (const h of hits) {
      if (pins.some(p => p.node === h.node)) { status.set(h.node, 'pinned'); continue; }
      if (h.r < 3 || !onScreen(h.x, h.y, h.r)) { status.set(h.node, 'noroom'); continue; }
      if (!clearOfText(h.x, h.y, h.r)) { status.set(h.node, 'text'); continue; }
      if (!open.every(p => Math.abs(p.x - h.x) > w * 1.05 || Math.abs(p.y - h.y) > ph * 1.05)) { status.set(h.node, 'noroom'); continue; }
      const cap = wordMode && !clearOf(reach, h.x, h.y, h.r) ? changeIn - 0.4 : Infinity;   // closes before the next word
      spots.push({ h, center: favorAt(h.x, h.y), lasts: Infinity, cap });
    }

    // Look ahead along the flight path: how long does each dot's pin stay fully in view?
    const want = cfg.pinDuration + OPEN_CLOSE, step = 0.5;
    if (spots.length) {
      const now = proj.rotate();
      for (let ahead = step; ahead <= want + step / 2; ahead += step) {
        proj.rotate(flightPose(flightLon + cfg.speed * ahead, flightClock + ahead).rotate);
        for (const sp of spots) {
          if (sp.lasts !== Infinity) continue;
          const q = proj(sp.h.node.st.ll);
          const grow = 1 + ahead / want;                   // dots grow as they near the camera
          if (!q || q[1] < -H || !fits(q[0], q[1], sp.h.r * grow)) sp.lasts = ahead - step;
        }
      }
      proj.rotate(now);
    }
    let total = 0;
    for (const sp of spots) {
      sp.life = Math.min(cfg.pinDuration, Math.min(sp.lasts, want) - OPEN_CLOSE, sp.cap);
      sp.weight = sp.life >= Math.min(cfg.pinMinLife, cfg.pinDuration) ? sp.center * (0.4 + sp.life / cfg.pinDuration) : 0;
      status.set(sp.h.node, sp.weight ? 'ok' : 'short');
      total += sp.weight;
    }
    return { W, H, m, ph, keepOut, reach, main, lower, spots, total, status, autoOpen: open.filter(p => p.kind === 'auto').length };
  }

  function spawnRandomPin() {
    if (cruise < 0.9) return false;                    // not while the globe is paused for a hover
    const a = analyzePins();
    if (a.autoOpen >= cfg.maxPins || !a.total) return false;
    let pick = Math.random() * a.total;
    const chosen = a.spots.find(sp => sp.weight && (pick -= sp.weight) <= 0) || a.spots.find(sp => sp.weight);
    openPin(chosen.h, 'auto').life = chosen.life;
    return true;
  }

  /* ---------- "Show pin areas": draws the rules random pins follow, for tuning ---------- */
  const areasCanvas = document.getElementById('pin-areas');
  const actx = areasCanvas.getContext('2d');
  let areas = null, areasTimer = 0;
  const AREA_COLORS = { ok: '#2F9E6E', short: '#D9A21B', text: '#C2415F', noroom: '#A1A1AA', pinned: '#3F3F46' };

  function drawPinAreas(dt) {
    const on = cfg.showPinAreas && cfg.showPins;
    areasCanvas.style.display = on ? 'block' : 'none';
    if (!on) { areas = null; return; }
    const dpr = view.dpr, cw = Math.round(view.w * dpr), ch = Math.round(view.h * dpr);
    if (areasCanvas.width !== cw || areasCanvas.height !== ch) { areasCanvas.width = cw; areasCanvas.height = ch; }
    if ((areasTimer -= dt) <= 0 || !areas) { areasTimer = 0.25; areas = analyzePins(); }
    const A = areas;
    actx.setTransform(dpr, 0, 0, dpr, 0, 0);
    actx.clearRect(0, 0, view.w, view.h);
    actx.font = '500 12px Geist, system-ui, sans-serif';
    const label = (text, x, y, color) => {
      const tw = actx.measureText(text).width;
      actx.fillStyle = 'rgba(255,255,255,.88)'; actx.fillRect(x - 4, y - 13, tw + 8, 18);
      actx.fillStyle = color; actx.fillText(text, x, y);
    };

    // Favored areas: ovals at full favor and at half reach
    const oval = (o, strength, color, name) => {
      if (strength <= 0) return;
      actx.save();
      actx.globalAlpha = 0.10 * strength;
      actx.fillStyle = color;
      actx.beginPath(); actx.ellipse(o.x, o.y, o.sx, o.sy, 0, 0, Math.PI * 2); actx.fill();
      actx.globalAlpha = Math.max(0.35, strength);
      actx.strokeStyle = color; actx.lineWidth = 1.5; actx.setLineDash([6, 5]);
      actx.beginPath(); actx.ellipse(o.x, o.y, o.sx, o.sy, 0, 0, Math.PI * 2); actx.stroke();
      actx.setLineDash([2, 5]);
      actx.beginPath(); actx.ellipse(o.x, o.y, o.sx * 1.6, o.sy * 1.6, 0, 0, Math.PI * 2); actx.stroke();
      actx.restore();
      actx.strokeStyle = color; actx.lineWidth = 1.5;
      actx.beginPath(); actx.moveTo(o.x - 7, o.y); actx.lineTo(o.x + 7, o.y); actx.moveTo(o.x, o.y - 7); actx.lineTo(o.x, o.y + 7); actx.stroke();
      label(name, o.x + 12, o.y - 10, color);
    };
    oval(A.main, 1, '#3F55A8', 'Favored: middle');
    oval(A.lower, cfg.lowerFavor, '#2F7D6D', 'Favored: below the statement');

    // Text keep-out
    actx.setLineDash([4, 4]);
    for (const k of A.keepOut) {
      actx.fillStyle = 'rgba(194,65,95,.08)'; actx.fillRect(k.l, k.t, k.r - k.l, k.b - k.t);
      actx.strokeStyle = 'rgba(194,65,95,.7)'; actx.lineWidth = 1; actx.strokeRect(k.l + .5, k.t + .5, k.r - k.l - 1, k.b - k.t - 1);
    }
    if (A.keepOut.length) label('Text keep-out', Math.min(...A.keepOut.map(k => k.l)), Math.min(...A.keepOut.map(k => k.t)) - 6, '#C2415F');
    if (A.reach) {
      const k = A.reach.reduce((a, b) => (b.r - b.l > a.r - a.l ? b : a));   // the headline at its longest
      actx.strokeStyle = 'rgba(217,162,27,.9)'; actx.setLineDash([2, 4]); actx.lineWidth = 1.5;
      actx.strokeRect(k.l + .5, k.t + .5, k.r - k.l - 1, k.b - k.t - 1);
      actx.setLineDash([]);
      label('Longer words reach here; pins inside close first', k.l, k.b + 16, '#B07F0F');
    }

    // Screen margin, and the line a dot must be below for a full pin to fit above it
    actx.strokeStyle = 'rgba(63,63,70,.45)'; actx.setLineDash([3, 6]);
    actx.strokeRect(A.m + .5, A.m + .5, A.W - 2 * A.m - 1, A.H - 2 * A.m - 1);
    const pinLine = A.m + A.ph + 6;
    actx.beginPath(); actx.moveTo(A.m, pinLine); actx.lineTo(A.W - A.m, pinLine); actx.stroke();
    actx.setLineDash([]);
    label('Pins fit below this line', A.W - A.m - 170, pinLine - 6, '#3F3F46');

    // Every dot, by what would happen if a random pin picked it
    const counts = { ok: 0, short: 0, text: 0, noroom: 0 };
    for (const h of hits) {
      const st = A.status.get(h.node);
      if (!st) continue;
      if (counts[st] !== undefined) counts[st]++;
      actx.strokeStyle = AREA_COLORS[st]; actx.lineWidth = st === 'ok' ? 2.5 : 1.5;
      actx.beginPath(); actx.arc(h.x, h.y, Math.max(6, h.r + 4), 0, Math.PI * 2); actx.stroke();
    }

    // Legend
    const rows = [['ok', 'A pin can open here'], ['short', "Can't stay open long enough"], ['text', 'Pin would cover the text'], ['noroom', 'No room on screen']];
    const lx = 16, ly = A.H - 16 - rows.length * 20 - 34;
    actx.fillStyle = 'rgba(255,255,255,.94)'; actx.strokeStyle = '#E4E4E7'; actx.lineWidth = 1;
    actx.beginPath(); actx.roundRect(lx, ly, 268, rows.length * 20 + 34, 10); actx.fill(); actx.stroke();
    actx.fillStyle = '#1F1F23'; actx.fillText(`Pin areas (${A.autoOpen} of ${cfg.maxPins} random pins open)`, lx + 12, ly + 20);
    rows.forEach(([key, text], i) => {
      const y = ly + 40 + i * 20;
      actx.strokeStyle = AREA_COLORS[key]; actx.lineWidth = 2.5;
      actx.beginPath(); actx.arc(lx + 18, y - 4, 5, 0, Math.PI * 2); actx.stroke();
      actx.fillStyle = '#3F3F46'; actx.fillText(`${text}: ${counts[key]}`, lx + 32, y);
    });
  }

  // Pin width, shrunk to fit when its dot is near the top of the view
  const pinWidth = p => Math.max(90, Math.min(cfg.pinSize, (p.y - p.gap - 16) / PIN_ASPECT));

  function renderPin(p) {
    // Rises from its tip: ease-out scale and a short lift, no overshoot
    const e = 1 - Math.pow(1 - p.shown, 3);
    const w = pinWidth(p);
    const ph = w * PIN_ASPECT, tipX = w * PIN_TIP_X;
    const st = p.el.style;
    st.width = w + 'px';
    st.height = ph + 'px';
    st.zIndex = Math.round(p.y);                               // nearer dots' pins sit in front
    st.transformOrigin = `${tipX}px ${ph}px`;
    st.transform = `translate(${p.x - tipX}px, ${p.y - p.gap - 6 - ph + (1 - e) * 10}px) scale(${0.6 + 0.4 * e})`;
    st.opacity = e;
  }

  function updatePins(dt) {
    if (pinColor !== cfg.pinColor) pinLayer.style.setProperty('--pin-frame', pinColor = cfg.pinColor);

    // Hover pin (it can take over a random pin already open on that dot)
    let hp = pins.find(p => p.kind === 'hover' && !p.closing);
    const h = pickHover(hp);
    if (h && (!hp || hp.node !== h.node)) {
      if (hp) hp.closing = true;
      hp = openPin(h, 'hover');
    } else if (!h && hp) {
      hp.closing = true;
      hp = null;
    }
    if (hp) hp.moves = pointer.moves;
    hovering = !!hp;
    canvas.style.cursor = hp ? 'pointer' : '';

    // Random pins
    if (!cfg.showPins) pins.forEach(p => { p.closing = true; });
    else if (playing && cfg.pinRate > 0) {
      // A due pin waits for a good spot instead of being dropped, so the rate you set holds.
      // At most two wait at once, and pins that open are spaced out so a backlog never bursts.
      if (Math.random() < cfg.pinRate / 60 * dt) pendingPins = Math.min(2, pendingPins + 1);
      if (pendingPins > 0 && (spawnTry -= dt) <= 0) {
        spawnTry = 0.25;
        if (spawnRandomPin()) { pendingPins--; spawnTry = Math.max(0.25, 0.4 * 60 / cfg.pinRate); }
      }
    } else pendingPins = 0;

    pinned.clear();
    for (let i = pins.length - 1; i >= 0; i--) {
      const p = pins[i];
      const hit = hits.find(x => x.node === p.node);
      if (hit) { p.x = hit.x; p.y = hit.y; p.gap = hit.r; } else p.closing = true;
      if (p.kind === 'auto' && playing && (p.life -= dt) <= 0) p.closing = true;
      if (p.kind === 'auto' && !p.closing) {
        // Safety net: a random pin fades out if it starts to leave the view, rather than being cut off
        const w = pinWidth(p), left = p.x - w * PIN_TIP_X, top = p.y - p.gap - 6 - w * PIN_ASPECT;
        if (left < 4 || left + w > view.w - view.insetR - 4 || top < 4 || p.y > view.h - view.insetB) p.closing = true;
      }
      const dir = p.closing ? -1 : 1;
      p.shown = reduceMotion ? (dir > 0 ? 1 : 0) : clamp(p.shown + dir * dt / (dir > 0 ? 0.5 : 0.4));
      if (p.closing && p.shown <= 0) {
        p.el.style.opacity = 0;
        pins.splice(i, 1);
        pool.push(p);
        continue;
      }
      pinned.set(p.node, p.shown);
      renderPin(p);
    }
  }

  // Warm the cache so pins open with their photo already in place
  setTimeout(() => NETWORK_GLOBE_PHOTOS.forEach(url => { new Image().src = url; }), 1500);

  /* ---------- Loop ---------- */
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileMq = window.matchMedia('(max-width: 640px)');
  const panel = showControls ? document.getElementById('panel') : null;
  let last = performance.now();

  let gallery = null, galleryLoading = null;     // the Gallery art, once chosen (see Hero art below)
  let heroOnScreen = true;
  new IntersectionObserver(([e]) => {
    heroOnScreen = e.isIntersecting;
    // The Gallery rests while scrolled past too (a hidden tab needs nothing: the browser stops animation frames)
    if (gallery && cfg.heroArt === 'gallery') heroOnScreen ? gallery.start() : gallery.stop();
  }).observe(document.querySelector('.hero'));

  let pinsLooping = false;                 // the Pins globe's frame loop is scheduled
  function startPins() {
    if (pinsLooping) return;
    pinsLooping = true;
    resize();                              // its canvas was hidden (0 x 0) while the Gallery showed
    requestAnimationFrame(now => { last = now; canvas.classList.add('is-ready'); frame(now); });
  }

  function frame(now) {
    if (cfg.heroArt !== 'pins') { pinsLooping = false; return; }   // the Gallery is showing; this loop stops
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    if (!heroOnScreen) { requestAnimationFrame(frame); return; }   // rest while scrolled past
    if (playing) { t += dt; clock += dt; }

    const open = panel && panel.classList.contains('is-open');
    const tR = open && !mobileMq.matches ? panel.offsetWidth : 0;
    const tB = open && mobileMq.matches ? panel.offsetHeight : 0;
    const ease = reduceMotion ? 1 : 1 - Math.exp(-dt * 3);
    view.insetR += (tR - view.insetR) * ease;
    view.insetB += (tB - view.insetB) * ease;

    updateFlight(dt);
    updateSites(dt);
    draw();
    updatePins(dt);
    drawPinAreas(dt);
    requestAnimationFrame(frame);
  }

  /* ---------- Controls ---------- */
  const inputs = {};

  function setPlaying(on) {
    playing = on;
    if (gallery) gallery.setPlaying(on);
    if (showControls) document.getElementById('play').textContent = on ? 'Pause globe' : 'Play globe';
  }
  // Holds keep the globe still; once nothing holds it, it's put back as it was before the first hold. Comment mode
  // and the Versions panel used these (they stayed behind at tag pre-astro); nothing on this site calls them now.
  const holds = new Set();
  let playingBeforeHold = null;
  const markGlobe = () => { document.documentElement.dataset.globe = playing ? 'playing' : 'paused'; };
  function hold(reason) {
    if (!holds.size) playingBeforeHold = playing;
    holds.add(reason);
    setPlaying(false);
    markGlobe();
  }
  function release(reason) {
    if (!holds.delete(reason)) return;
    if (!holds.size && playingBeforeHold !== null) setPlaying(playingBeforeHold);
    if (!holds.size) playingBeforeHold = null;
    markGlobe();
  }
  function restart() {
    if (cfg.heroArt === 'gallery') { if (gallery) gallery.restart(); setPlaying(true); return; }
    t = 0; clock = 0; flightLon = START_LON; flightClock = 0; cruise = 1;
    pins.forEach(p => { p.closing = true; });
    buildSites();
    setPlaying(true);
  }
  // Embedded (the site footer's globe): the host page replays the growth each time it scrolls back into view,
  // instead of reloading the whole page in its frame
  if (new URLSearchParams(location.search).get('embed') === 'globe') window.rnGlobe = { restart };

  function syncInput(key) {
    const el = inputs[key];
    if (!el) return;
    const v = cfg[el._proxy ? el._proxy(cfg) : key];
    if (el.type === 'checkbox') el.checked = !!v;
    else if (el.type === 'color') el.value = /^#[0-9a-f]{6}$/i.test(v) ? v : '#ffffff';
    else el.value = v;
    if (el.type === 'range') {
      el.style.setProperty('--p', ((v - el.min) / (el.max - el.min)) * 100 + '%');
      el.closest('.row').querySelector('output').textContent = el._fmt(+v);
    }
  }

  function addGroup(group) {
    {
      const host = document.getElementById('groups');
      const sec = document.createElement('section');
      sec.className = 'group';
      sec.dataset.art = group.art || '';
      sec.innerHTML = `<h2>${group.group}</h2>`;
      for (const c of group.items) {
        const row = document.createElement('div');
        row.className = 'row' + (c.type === 'check' ? ' check' : '');
        const id = 'c-' + c.key;
        let el;
        if (c.type === 'range') {
          el = document.createElement('input');
          Object.assign(el, { type: 'range', min: c.min, max: c.max, step: c.step });
          el._fmt = c.fmt;
          row.innerHTML = `<label for="${id}">${c.label}</label><output for="${id}"></output>`;
          row.appendChild(el);
        } else if (c.type === 'check') {
          el = document.createElement('input');
          el.type = 'checkbox';
          row.appendChild(el);
          row.insertAdjacentHTML('beforeend', `<label for="${id}">${c.label}</label>`);
        } else if (c.type === 'select') {
          el = document.createElement('select');
          el.innerHTML = c.options.map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
          row.innerHTML = `<label for="${id}">${c.label}</label>`;
          row.appendChild(el);
        } else {
          el = document.createElement('input');
          el.type = 'color';
          row.innerHTML = `<label for="${id}">${c.label}</label>`;
          row.appendChild(el);
        }
        el.id = id;
        el._proxy = c.proxy;
        inputs[c.key] = el;
        el.addEventListener('input', () => {
          cfg[c.proxy ? c.proxy(cfg) : c.key] = el.type === 'checkbox' ? el.checked : el.type === 'range' ? +el.value : el.value;
          syncInput(c.key);
          if (c.key === 'dotColors') markContextControls();
          if (c.css || c.page) { applyPage(); return; }
          if (c.gallery) {
            if (c.quiet) measureQuiet();
            if (!gallery) return;
            if (c.rebuild) gallery.rebuild();
            else if (c.regrow) gallery.regrow();
            gallery.refit();
            return;
          }
          if (c.sites) buildSites();
          else if (c.trees) sites.forEach(makeTree);
          refit();
        });
        sec.appendChild(row);
        syncInput(c.key);
      }
      host.appendChild(sec);
    }
  }

  function buildPanel() {
    CONTROLS.forEach(addGroup);

    const adjust = document.getElementById('adjust');
    const setOpen = open => {
      panel.classList.toggle('is-open', open);
      adjust.setAttribute('aria-expanded', String(open));
      if (open) panel.querySelector('button, input, select').focus({ preventScroll: true });
      else adjust.focus({ preventScroll: true });
    };
    adjust.addEventListener('click', () => setOpen(true));
    document.getElementById('close').addEventListener('click', () => setOpen(false));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && panel.classList.contains('is-open')) setOpen(false);
    });

    document.getElementById('play').addEventListener('click', () => setPlaying(!playing));
    document.getElementById('restart').addEventListener('click', restart);

    const copyBtn = document.getElementById('copy');
    copyBtn.addEventListener('click', async () => {
      const text = 'const CONFIG = ' + JSON.stringify(cfg, null, 2) + ';\n// public/scripts/site-footer.js DEFAULT: ' + JSON.stringify(window.rnFooter.get());
      try { await navigator.clipboard.writeText(text); }
      catch {
        const ta = Object.assign(document.createElement('textarea'), { value: text });
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
      }
      copyBtn.textContent = 'Copied';
      setTimeout(() => (copyBtn.textContent = 'Copy settings'), 1800);
    });

    document.getElementById('reset').addEventListener('click', () => {
      Object.assign(cfg, DEFAULTS);
      window.rnFooter.reset();
      Object.keys(inputs).forEach(syncInput);
      applyPage(); refit();
      if (gallery) gallery.rebuild();
      setArt(cfg.heroArt);
      restart();
    });
  }

  // Placeholder links (Visit, store buttons, directions) go nowhere for now
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[data-placeholder]');
    if (a) e.preventDefault();
  });

  /* ---------- Hero art: the Pins globe or the Gallery ----------
     Only the chosen art runs. The Gallery's engine (assets/network-gallery.js, shared with the Gallery tab) loads
     the first time it's chosen, so the Pins hero loads exactly as before. */
  const galleryStage = document.getElementById('gallery-stage');
  const galleryCanvas = document.getElementById('gallery-canvas');
  function panelInsets() {
    const open = panel && panel.classList.contains('is-open');
    return { r: open && !mobileMq.matches ? panel.offsetWidth : 0, b: open && mobileMq.matches ? panel.offsetHeight : 0 };
  }
  /* The quiet centre: an ellipse round the copy (the headline sized to its widest word, the buttons, the word dots),
     drawn through the corners of the copy's box grown by galleryQuietPad*. Re-measured at most twice a second as it's
     used, and at once when the layout changes, so it follows resizes, the loading screen and the typed slot's glide. */
  let quietCache = null, quietAt = -1e9, copyRects = [];
  function measureQuiet() {
    quietAt = performance.now();
    if (cfg.heroArt !== 'gallery') { quietCache = null; copyRects = []; return; }
    const cr = heroCopy.getBoundingClientRect(), g = galleryCanvas.getBoundingClientRect();
    copyRects = heroTextRects('strict');
    const inCopy = copyRects.filter(b => {
      const x = (b.left + b.right) / 2, y = (b.top + b.bottom) / 2;
      return x >= cr.left && x <= cr.right && y >= cr.top && y <= cr.bottom;
    });
    if (!inCopy.length) { quietCache = null; return; }
    const L = Math.min(...inCopy.map(b => b.left)), R = Math.max(...inCopy.map(b => b.right));
    const T = Math.min(...inCopy.map(b => b.top)), B = Math.max(...inCopy.map(b => b.bottom));
    // The padded box's proportions, scaled just enough to hold every line: the padding shows above, below and beside
    // the copy, and the corners of the text sit on the ellipse (an ellipse through the padded box's corners is far
    // wider than the text and leaves photos no room)
    const px = cfg.galleryQuietPadX, py = cfg.galleryQuietPadY;
    const cx = (L + R) / 2, cy = (T + B) / 2, hw = (R - L) / 2 + px, hh = (B - T) / 2 + py;
    let k = 1;
    for (const b of inCopy) for (const x of [b.left, b.right]) for (const y of [b.top, b.bottom]) k = Math.max(k, Math.hypot((x - cx) / hw, (y - cy) / hh));
    quietCache = { cx: cx - g.left, cy: cy - g.top, rx: k * hw, ry: k * hh };
  }
  const quietEllipse = () => { if (performance.now() - quietAt > 500) measureQuiet(); return quietCache; };
  window.__heroQuiet = quietEllipse;

  // Hovering or tapping the copy (or the header) never opens a dot
  function overCopy(x, y) {
    const g = galleryCanvas.getBoundingClientRect(), px = x + g.left, py = y + g.top;
    return copyRects.some(b => px >= b.left && px <= b.right && py >= b.top && py <= b.bottom);
  }

  /* The first photo waits for the first headline word to finish (its 'shown' after the loading screen opens);
     Stacked never announces a word, so it opens 2 s after the page opens. 6 s is only a safety net for Typed and
     Rotating. Nothing opens behind the loading screen. */
  let firstShown = false, openedAt = document.documentElement.classList.contains('is-loading') ? null : performance.now();
  window.addEventListener('page:revealed', () => { openedAt = performance.now(); }, { once: true });
  const autoGate = () => firstShown || (openedAt != null && performance.now() - openedAt > (cfg.heroLayout === 'stacked' ? 2000 : 6000));
  document.addEventListener('heroword', e => {
    if (e.detail.phase === 'shown' && !document.documentElement.classList.contains('is-loading')) firstShown = true;
    if (gallery) gallery.setWordColor(e.detail.color);
  });

  function ensureGallery() {
    if (!galleryLoading) galleryLoading = import('/assets/network-gallery.js').then(m => {
      gallery = m.createGallery({
        canvas: galleryCanvas,
        stage: galleryStage,
        cfg: m.prefixedConfig(cfg, 'gallery'),
        photos: NETWORK_GLOBE_PHOTOS,
        insets: panelInsets,
        quiet: quietEllipse,
        viewTop: () => {                               // below the header's logo and links
          const hd = document.querySelector('.site-header');
          return hd ? hd.getBoundingClientRect().bottom - galleryCanvas.getBoundingClientRect().top : 0;
        },
        viewBottom: () => heroEl.offsetHeight,        // the straight edge; the curve below it would clip a photo
        hoverBlocked: overCopy,
        autoGate,
        tapSlop: 8,
      });
      gallery.setPlaying(playing);
      window.__heroGallery = gallery;
      if (showControls) {
        heroGalleryGroups(m.GALLERY_CONTROLS).forEach(addGroup);
        syncArt();
      }
      return gallery;
    });
    return galleryLoading;
  }

  function syncArt() {
    heroEl.dataset.art = cfg.heroArt;
    document.querySelectorAll('#groups section.group').forEach(sec => { sec.hidden = !!sec.dataset.art && sec.dataset.art !== cfg.heroArt; });
    document.querySelectorAll('.layout-picker [data-art]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.art === cfg.heroArt)));
  }

  async function setArt(art) {
    cfg.heroArt = art === 'gallery' ? 'gallery' : 'pins';
    syncArt();
    if (cfg.heroArt === 'pins') {
      if (gallery) gallery.stop();
      startPins();
      return;
    }
    const g = await ensureGallery();
    if (cfg.heroArt !== 'gallery') return;           // switched back while the engine was loading
    g.setPlaying(playing);
    measureQuiet();
    if (heroOnScreen) g.start();
    requestAnimationFrame(() => {
      galleryCanvas.classList.add('is-ready');
      window.dispatchEvent(new Event('globe:populated'));   // the loading screen can open (the Pins globe would say so itself)
      (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => g.loadPhotos());   // after the heading's first paint
    });
  }
  document.querySelectorAll('.layout-picker [data-art]').forEach(b => b.addEventListener('click', () => setArt(b.dataset.art)));

  /* ---------- Hero headline: Stacked, Rotating or Typed ---------- */
  var headlineReady = false;                           // applyPage() runs before this section is set up
  const heroEl = document.querySelector('.hero');
  const heroTitleEl = heroEl.querySelector('.hero-title');
  const slot = document.getElementById('slot');
  const cursorEl = document.getElementById('cursor');
  const wordDots = [...document.querySelectorAll('.word-dot')];
  // The four words come from the page (src/content/pages/home.json), each in its headline color
  const WORD_VARS = ['--c-disciples', '--c-leaders', '--c-churches', '--c-movements'];
  const pageWords = [...document.querySelectorAll('.hero-title .stacked .word')].map(el => el.textContent.trim());
  const WORDS = (pageWords.length === 4 ? pageWords : ['Disciples', 'Leaders', 'Churches', 'Movements'])
    .map((text, i) => ({ text, color: WORD_VARS[i] }));
  let wordIndex = 0, headTimer = 0, mode = '', typedEl = null;
  let phase = '', phaseEnds = 0, rotateAt = 0;          // for headlineChangeIn()

  const markWord = () => wordDots.forEach((b, i) => b.setAttribute('aria-current', String(i === wordIndex)));
  const stopHeadline = () => {
    clearTimeout(headTimer);
    slot.querySelectorAll('.slot-word').forEach(n => n.remove());
    slot.style.width = '';
    cursorEl.classList.remove('blink');
    typedEl = null;
  };

  // Rotating: the new word's letters rise in while the old word lifts away
  function rotateTo(i, animate) {
    const prev = slot.querySelector('.slot-word:not(.out)');
    if (prev) {
      if (animate) { prev.classList.remove('in'); prev.classList.add('out'); setTimeout(() => prev.remove(), 1400); }
      else prev.remove();
    }
    const el = document.createElement('span');
    el.className = 'slot-word' + (animate ? ' in' : '');
    el.style.color = `var(${WORDS[i].color})`;
    [...WORDS[i].text].forEach((c, k) => {
      const ch = document.createElement('span');
      ch.className = 'ch'; ch.style.setProperty('--i', k); ch.textContent = c;
      el.appendChild(ch);
    });
    slot.insertBefore(el, cursorEl);
    slot.style.width = el.getBoundingClientRect().width + 'px';
    wordIndex = i; markWord();
    emitWord('shown');
  }
  function rotateLoop() {
    rotateAt = performance.now() + cfg.wordHold * 1000;
    headTimer = setTimeout(() => { rotateTo((wordIndex + 1) % WORDS.length, !reduceMotion); rotateLoop(); }, cfg.wordHold * 1000);
  }

  // Typed: delete the word letter by letter, then type the next one
  function setTyped(text) {
    typedEl.textContent = text;
    typedEl.style.color = cursorEl.style.background = `var(${WORDS[wordIndex].color})`;
  }
  /* Centered, the slot is sized to the whole word being typed, so each finished word sits exactly
     centered. The line moves only between words, gliding into place during the pause (the slot's
     width transition), never while letters appear. */
  function wordWidth(text) {
    const keep = typedEl.textContent;
    typedEl.textContent = text;
    const w = typedEl.getBoundingClientRect().width;
    typedEl.textContent = keep;
    const c = getComputedStyle(cursorEl);
    return Math.ceil(w + cursorEl.getBoundingClientRect().width + parseFloat(c.marginLeft)) + 1;
  }
  function fitSlot() {
    if (!typedEl) return;
    slot.style.width = cfg.heroAlign === 'center' ? wordWidth(WORDS[wordIndex].text) + 'px' : '';
  }
  function holdThen(next, ms, kind) {
    phase = kind; phaseEnds = performance.now() + ms;
    cursorEl.classList.add('blink');
    headTimer = setTimeout(() => { cursorEl.classList.remove('blink'); next(); }, ms);
  }
  const pauseMs = () => (cfg.heroAlign === 'center' ? 820 : 380);
  // Seconds until a word other than the one showing (or being typed) starts to appear
  function headlineChangeIn() {
    const now = performance.now();
    if (mode === 'rotating') return Math.max(0, (rotateAt - now) / 1000);
    if (mode !== 'typed' || !typedEl) return Infinity;
    const full = WORDS[wordIndex].text.length, len = typedEl.textContent.length;
    const del = 1 / (cfg.typeSpeed * 2.2), pause = pauseMs() / 1000, left = Math.max(0, (phaseEnds - now) / 1000);
    if (phase === 'deleting') return len * del + pause;
    if (phase === 'holding') return left + full * del + pause;
    if (phase === 'pausing') return left + full / cfg.typeSpeed + cfg.wordHold + full * del + pause;
    return (full - len) / cfg.typeSpeed + cfg.wordHold + full * del + pause;   // typing
  }
  // Tells the page (the Gallery's line colour) which word the headline is on: 'typing', 'shown' or 'deleting'
  function emitWord(phase) {
    const color = getComputedStyle(document.documentElement).getPropertyValue(WORDS[wordIndex].color).trim();
    document.dispatchEvent(new CustomEvent('heroword', { detail: { index: wordIndex, color, phase } }));
  }
  function deleteStep() {
    const s = typedEl.textContent;
    if (!s) {
      wordIndex = (wordIndex + 1) % WORDS.length; markWord(); setTyped('');
      fitSlot();                                         // glide to center the next word
      return holdThen(typeStep, pauseMs(), 'pausing');
    }
    phase = 'deleting';
    setTyped(s.slice(0, -1));
    emitWord('deleting');
    headTimer = setTimeout(deleteStep, 1000 / (cfg.typeSpeed * 2.2));
  }
  function typeStep() {
    const full = WORDS[wordIndex].text, s = typedEl.textContent;
    if (s.length >= full.length) { emitWord('shown'); return holdThen(deleteStep, cfg.wordHold * 1000, 'holding'); }
    phase = 'typing';
    setTyped(full.slice(0, s.length + 1));
    emitWord('typing');
    headTimer = setTimeout(typeStep, (1000 / cfg.typeSpeed) * (0.65 + Math.random() * 0.7));   // a human rhythm
  }
  function typedShow(i) {
    clearTimeout(headTimer);
    wordIndex = i; markWord();
    setTyped(WORDS[i].text);
    fitSlot();
    emitWord('shown');
    if (reduceMotion) { phase = 'holding'; phaseEnds = performance.now() + cfg.wordHold * 1000; headTimer = setTimeout(() => typedShow((i + 1) % WORDS.length), cfg.wordHold * 1000); return; }
    holdThen(deleteStep, cfg.wordHold * 1000, 'holding');
  }

  function startHeadline() {
    stopHeadline();
    if (mode === 'rotating') { rotateTo(wordIndex, false); rotateLoop(); }
    else if (mode === 'typed') {
      typedEl = document.createElement('span');
      typedEl.className = 'slot-word';
      slot.insertBefore(typedEl, cursorEl);
      typedShow(wordIndex);
    }
  }

  function syncHeadline() {
    heroEl.dataset.align = cfg.heroAlign;
    heroEl.dataset.title = cfg.heroTitle;
    // Under the Church Network title, the changing headline reads as a second-level heading
    if (cfg.heroTitle === 'network') heroTitleEl.setAttribute('aria-level', '2'); else heroTitleEl.removeAttribute('aria-level');
    heroEl.dataset.dots = cfg.showWordDots ? 'on' : 'off';
    if (mode !== cfg.heroLayout) {
      mode = heroEl.dataset.layout = cfg.heroLayout;
      startHeadline();
    } else if (mode === 'typed') fitSlot();
    else if (mode === 'rotating') {
      const cur = slot.querySelector('.slot-word:not(.out)');
      if (cur) slot.style.width = cur.getBoundingClientRect().width + 'px';
    }
    markContextControls();
    noteFit();
    measureQuiet();
    document.querySelectorAll('.layout-picker [data-layout]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.layout === cfg.heroLayout)));
    document.querySelectorAll('.layout-picker [data-align]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.align === cfg.heroAlign)));
    document.querySelectorAll('.layout-picker [data-title]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.title === cfg.heroTitle)));
  }

  // Controls that only apply to some layouts say so, and dim when they don't apply right now
  const ONLY = {
    h1Leading: ['stacked', 'Stacked'], heroWidth: ['stacked', 'Stacked'],
    wordHold: ['solo', 'Rotating and Typed'], showWordDots: ['solo', 'Rotating and Typed'],
    typeSpeed: ['typed', 'Typed'], globeFocus: ['left', 'Left-aligned text'],
    h1Size: ['multiplying', 'Multiplying title'], titleSize: ['network', 'Church Network title'],
    newbornColor: ['single', 'One color'], firstDotColor: ['generations', 'Headline colors'],
    colorStrength: ['generations', 'Headline colors'], colorThreads: ['generations', 'Headline colors'],
  };
  function markContextControls() {
    for (const [key, [when, note]] of Object.entries(ONLY)) {
      const el = document.getElementById('c-' + key);
      if (!el) continue;
      const row = el.closest('.row');
      if (!row.querySelector('.only')) row.querySelector('label').insertAdjacentHTML('beforeend', ` <span class="only">${note}</span>`);
      const applies = when === 'stacked' ? cfg.heroLayout === 'stacked'
        : when === 'solo' ? cfg.heroLayout !== 'stacked'
        : when === 'typed' ? cfg.heroLayout === 'typed'
        : when === 'multiplying' || when === 'network' ? cfg.heroTitle === when
        : when === 'single' || when === 'generations' ? cfg.dotColors === when
        : cfg.heroAlign === 'left';
      row.classList.toggle('is-off', !applies);
    }
  }
  // When a headline is capped to fit the window, its size readout says so
  function noteFit() {
    const el = document.getElementById('c-h1Size');
    if (!el) return;
    syncInput('h1Size');                                   // show the size for the layout that's showing
    const stacked = cfg.heroLayout === 'stacked', want = cfg[stacked ? 'h1Size' : 'soloSize'];
    if (cfg.heroTitle === 'network') { el.closest('.row').querySelector('output').textContent = `${want}px`; return; }   // fixed at H2 size there
    const shown = Math.round(parseFloat(getComputedStyle(document.querySelector(stacked ? '.hero-title' : '.solo')).fontSize));
    el.closest('.row').querySelector('output').textContent = shown < want - 0.5 ? `${want}px (fits at ${shown}px)` : `${want}px`;
  }

  wordDots.forEach((b, i) => b.addEventListener('click', () => {
    if (mode === 'rotating') { clearTimeout(headTimer); rotateTo(i, !reduceMotion); rotateLoop(); }
    else if (mode === 'typed') typedShow(i);
  }));
  document.querySelectorAll('.layout-picker [data-layout]').forEach(b => b.addEventListener('click', () => { cfg.heroLayout = b.dataset.layout; syncHeadline(); }));
  document.querySelectorAll('.layout-picker [data-align]').forEach(b => b.addEventListener('click', () => { cfg.heroAlign = b.dataset.align; syncHeadline(); }));
  document.querySelectorAll('.layout-picker [data-title]').forEach(b => b.addEventListener('click', () => { cfg.heroTitle = b.dataset.title; syncHeadline(); }));
  window.addEventListener('resize', () => syncHeadline());
  document.fonts && document.fonts.ready.then(() => syncHeadline());   // re-measure once Geist has loaded

  // As the loading screen opens, the headline starts fresh: Typed types its first word, Rotating brings it in
  window.addEventListener('page:revealed', () => {
    if (mode === 'typed' && typedEl && !reduceMotion) {
      clearTimeout(headTimer);
      wordIndex = 0; markWord(); setTyped(''); fitSlot();
      holdThen(typeStep, 650, 'pausing');
    } else if (mode === 'rotating') {
      clearTimeout(headTimer);
      rotateTo(0, !reduceMotion); rotateLoop();
    }
  }, { once: true });

  headlineReady = true;
  syncHeadline();

  /* ---------- Start ---------- */
  if (showControls) { buildPanel(); syncHeadline(); }
  else ['adjust', 'panel', 'switch'].forEach(id => document.getElementById(id)?.remove());   // the switch sits inside the panel

  resize();
  if (reduceMotion) setPlaying(false);  // a still view; whatever is in sight shows fully grown

  // Sites are placed once the land outline arrives (or everywhere, if it can't load)
  fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/land-110m.json')
    .then(r => r.json())
    .then(topo => { landFeature = topojson.feature(topo, topo.objects.land); })
    .catch(() => {})
    .finally(() => { t = 0; buildSites(); });

  setArt(cfg.heroArt);
})();
