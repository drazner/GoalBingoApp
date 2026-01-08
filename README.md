# Goal Bingo
Goal Bingo is a mobile-friendly web app that turns goal-setting into a bingo game. You build a custom board, tap to complete goals, and aim for a BINGO (i.e. 5 in a row). The app is built with React + Vite, styled with CSS and persists data in browser storage with free hosting. It's packaged as a PWA so it can be installed to a phone's home screen

## UI from Laptop: 
<img width="1414" height="767" alt="image" src="https://github.com/user-attachments/assets/79b26d90-9258-4854-948a-f56b9c024650" />

## Stack
This app uses React, TypeScript, Vite and CSS. It also uses Firebase for the database in order to store anonymous user data

## How to Setup
After pulling the code, you need to follow these steps to run the app: 
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
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
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
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```


