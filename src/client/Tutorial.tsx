interface TutorialProps {
  onClose: () => void;
}

export const Tutorial = ({ onClose }: TutorialProps) => {
  return (
    <div className="tutorial-overlay">
      <div className="tutorial-modal">
        <h2 className="text-3xl font-bold mb-4">How to Play</h2>
        
        <ul className="list-disc list-inside space-y-2 text-lg">
          <li>
            <strong>Paint:</strong> Select a color from the palette at the bottom and click any pixel to paint it.
          </li>
          <li>
            <strong>Defend:</strong> The canvas is under attack! Every minute, "The Glitch" will erase random clusters of pixels.
          </li>
          <li>
            <strong>Collaborate:</strong> You and everyone else see the same canvas. Work together to create art and fight the decay!
          </li>
          <li>
            <strong>Attribution:</strong> Hover over any pixel to see who painted it last.
          </li>
        </ul>

        <button className="tutorial-button" onClick={onClose}>
          Got it!
        </button>
      </div>
    </div>
  );
};
