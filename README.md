<!-- Project overview, setup steps, and deployment notes for new users. -->
# Goal Bingo
Goal Bingo is a mobile-friendly web app that turns goal-setting into a bingo game. You build a custom board, tap to complete goals, and aim for a BINGO (i.e. 5 in a row). The app is built with React + Vite, styled with CSS and persists data in browser storage with free hosting via Firebase. It's packaged as a PWA so it can be installed to a phone's home screen. The app is currently hosted on GitHub Pages via a Runnable Action 

## UI from Laptop: 
<img width="1409" height="801" alt="image" src="https://github.com/user-attachments/assets/4f98ec63-2458-4614-8778-9820214a55bf" />


## Stack
This app uses React, TypeScript, Vite and CSS. It also uses Firebase for the database in order to store anonymous user data

## High‑level App Flow

The UI is a React app that runs entirely in the browser. Users create and edit goals and boards. State is stored locally and optionally synced to Firebase.

The “board” is just a JSON object (goals + completion state). The app renders it as a grid and checks for bingo lines on each update.

### Data

Firebase Firestore stores a single document per user in users/{uid} (boards, current board ID, custom goals, UI selections).
The app currently uses **anonymous auth** which creates a separate user per device/origin. That’s why laptop and phone don’t share data unless you add a real login.
Shared links create sharedBoards/{id} documents which can be read by anyone with the link.
When Firebase is configured, the app signs in anonymously and opens a Firestore realtime listener on your user doc.
Any local changes are serialized and written to Firestore. Firestore pushes updates back down to the browser. **If Firebase isn’t configured, everything stays local.**


### Run/Host

Deployed: GitHub Pages builds the static bundle and serves it over HTTPS. The PWA service worker caches assets for offline use.



Locally: npm run dev serves the app from your laptop (dev server).



## How to Setup
After pulling the code, you need to follow these steps to run the app locally: 
1. Install Node.js 22

   ```
   nvm install 22
   nvm use 22
   ```

3. Install dependencies

   `npm install`

4. Start the dev server (local testing):

   `npm run dev`

5. For mobile/PWA testing, build and preview:

   ```
   npm run build
   npm run preview -- --host
   ```

6. On your phone (same Wi-Fi only), open `http://<your-laptop-ip>:4173` and add it to your home screen (i.e. on iPhone open URL in browser and tap the Share icon and click "Add to Home Screen" 


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./config/tsconfig.node.json', './config/tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./config/tsconfig.node.json', './config/tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

