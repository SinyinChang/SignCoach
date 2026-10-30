/**
 * Supported beginner ASL signs for the Wizard-of-Oz prototype.
 * Reference videos are embedded YouTube demos; written steps stay neutral
 * unless verified against those references.
 */

const NEUTRAL_INSTRUCTIONS = [
  'Watch the reference video carefully, paying attention to the handshape, position, movement, and palm orientation.',
  'Replay the video as needed before practicing.',
  'When you are ready, start practice and try the sign with your webcam.',
];

const ALL_COMPONENTS = {
  handshape: { type: 'reference' },
  location: { type: 'reference' },
  orientation: { type: 'reference' },
  movement: { type: 'reference' },
};

export const SIGNS = [
  {
    id: 'nice-to-meet-you',
    name: 'Nice to Meet You',
    shortDescription:
      'Watch the reference, then practice Nice to Meet You with your webcam.',
    difficulty: 'Beginner',
    handedness: 'one',
    preferredHand: 'either',
    videoSrc: null,
    youtubeVideoId: '1UpLG1Hyk3U',
    hasVerifiedVideo: true,
    captionPlaceholder:
      'Reference video for Nice to Meet You. Use captions or replay controls in the player as needed.',
    instructions: [...NEUTRAL_INSTRUCTIONS],
    requirements: { ...ALL_COMPONENTS },
  },
  {
    id: 'thank-you',
    name: 'Thank You',
    shortDescription:
      'Watch the reference, then practice Thank You with your webcam.',
    difficulty: 'Beginner',
    handedness: 'one',
    preferredHand: 'either',
    videoSrc: null,
    youtubeVideoId: 'qlWPnATjNx0',
    hasVerifiedVideo: true,
    captionPlaceholder:
      'Reference video for Thank You. Use captions or replay controls in the player as needed.',
    instructions: [...NEUTRAL_INSTRUCTIONS],
    requirements: { ...ALL_COMPONENTS },
  },
  {
    id: 'yesterday',
    name: 'Yesterday',
    shortDescription:
      'Watch the reference, then practice Yesterday with your webcam.',
    difficulty: 'Beginner',
    handedness: 'one',
    preferredHand: 'either',
    videoSrc: null,
    youtubeVideoId: 'ZgFKM8DT4zQ',
    hasVerifiedVideo: true,
    captionPlaceholder:
      'Reference video for Yesterday. Use captions or replay controls in the player as needed.',
    instructions: [...NEUTRAL_INSTRUCTIONS],
    requirements: { ...ALL_COMPONENTS },
  },
  {
    id: 'walk',
    name: 'Walk',
    shortDescription:
      'Watch the reference, then practice Walk with your webcam.',
    difficulty: 'Beginner',
    handedness: 'one',
    preferredHand: 'either',
    videoSrc: null,
    youtubeVideoId: '52wgLQGkbCA',
    hasVerifiedVideo: true,
    captionPlaceholder:
      'Reference video for Walk. Use captions or replay controls in the player as needed.',
    instructions: [...NEUTRAL_INSTRUCTIONS],
    requirements: { ...ALL_COMPONENTS },
  },
];

export function getSignById(id) {
  return SIGNS.find((sign) => sign.id === id) ?? null;
}

export function getEvaluatedComponents(sign) {
  if (!sign?.requirements) return [];
  const map = {
    handshape: 'handshape',
    location: 'position',
    orientation: 'orientation',
    movement: 'movement',
  };
  return Object.keys(sign.requirements)
    .map((key) => map[key])
    .filter(Boolean);
}
