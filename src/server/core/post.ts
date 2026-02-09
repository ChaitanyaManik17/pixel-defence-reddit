import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  return await reddit.submitCustomPost({
    splash: {
      appIconUri: 'icon.png',
      backgroundUri: 'splash_screen.jpeg',

      appDisplayName: 'Pixel Canvas Defense',
      heading: 'Pixel Canvas Defense',
      description: 'Join the fight! Defend the community canvas from the glitch.',
      buttonLabel: 'Tap to Play!',
    },
    postData: {
      gameState: 'initial',
      score: 0,
    },
    subredditName: subredditName,
    title: 'Pixel Canvas Defense: Defend the Community Art!',
  });
};
