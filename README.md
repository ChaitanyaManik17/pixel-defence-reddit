🎨 Pixel Canvas Defense
Work together to paint a real-time canvas, but defend it from a persistent "glitch" decay!

This app is a community-driven, interactive pixel-art game built on Devvit Web for the Reddit Community Games Challenge. It's a collaborative canvas where users must unite to create art and defend it from an automated "glitch" that constantly erases their work.

✨ Features

Real-Time Collaborative Canvas: See pixels appear from other users instantly without a page refresh, powered by Devvit Realtime.
Persistent Grid: All artwork is saved in Devvit's built-in Redis. Your community's creation survives server restarts and app refreshes.
The Glitch (Decay Mechanic): A server-side process periodically "glitches" (erases) random clusters of pixels, creating a shared community goal of defense and maintenance.
Moderator-Led Templates: Moderators can start a new game by clicking a menu item and can paste a JSON of any image, which is then processed on the client and displayed as a faded template guide for the community to build.
Fully Responsive: The grid dynamically resizes to fit any viewport, from the tallest mobile phone to the widest desktop monitor, using a ResizeObserver to calculate the perfect pixel size.
Server-Side Cooldowns: A 10-second cooldown is enforced by the server (using Redis expire) to ensure fair play.
Delightful UX:
Sound Feedback: A retro "blip" sound plays on every successful pixel place.
Visual Feedback: Pixels flash when placed, and the entire canvas "shakes" when the glitch attacks.
User Attribution: Hovering over any pixel shows the username of the person who last colored it.
Full Game UI: Includes a tutorial, live-updating leaderboards, player "presence" (Active Defenders), and a complete game HUD with stats.

🕹️ How to Play (as a User)

Find the game post and click the "Tap to Play!" button.
A tutorial will explain the rules.
Select a color from the palette at the bottom.
Click any pixel on the grid to paint it.
Watch the "Glitch In" timer! When it hits zero, the glitch will attack and erase pixels. Work with others to repaint the damage.
After painting, you must wait for the 10-second cooldown to finish.

🛠️ How to Use (as a Moderator)

Install the "Pixel Canvas Defense" app on your subreddit.
Go to your subreddit and open the "..." menu (Mod Tools).
Click "Create a new game post".
(Optional) Paste a JSON of an image into the text field. This image will be used as the template guide for the canvas.

💻 Tech Stack & Architecture

Frontend: React, TypeScript, Tailwind CSS
Platform: Devvit Web
Backend: Devvit Server (Node.js/Express-like)
Real-Time: Devvit Realtime Service (connectRealtime)
Database: Devvit Redis
canvas:main (Hash): Stores the entire 50x50 grid state.
cooldown:[username] (Key): Stores a user's cooldown timestamp.
nextGlitchTime (Key): A global timestamp for the next decay event.
(And more for stats, presence, etc.)
How it Works
State Management: App.tsx is the "brain." It manages the single connectRealtime connection and holds all app state (canvas, user, stats). PixelGrid.tsx is a "dumb" component that just renders props, updating in reaction to state changes from App.tsx.
No-Scroll Layout: The app uses a ResizeObserver in App.tsx to measure the available height/width of the main content area. It then calculates the largest possible integer pixelSize that allows the 50x50 grid (plus its attribution text) to fit perfectly in the viewport without scrolling.
Serverless Decay: The "glitch" mechanic is designed for a serverless environment. There is no global setInterval. Instead, a checkAndRunDecay function is triggered inside any user API call (/api/init or /api/paint). This ensures the decay logic only runs within a valid request context.
Post-Specific Templates: The mod-uploaded image JSON is not a global setting. It's saved in the postData of the specific post being created. The /api/init handler reads from context.postData.referenceImageUrl to fetch the correct template for that specific game instance.

🚀 How to Run Locally

Make sure you have npm and the devvit CLI installed.
Clone the repository.
Run npm install to install all dependencies.
Run npm run dev to start the local playpen server.
Open the playpen URL (e.g., https://www.reddit.com/r/pixel-defense_dev?playtest=pixel-defense) provided in your terminal.

📄 License

This project is open-source and licensed under the BSD 3-Clause "New" or "Revised" License. The full license text is available in the LICENSE file in this repository.
