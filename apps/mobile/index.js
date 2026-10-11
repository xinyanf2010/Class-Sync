// App entry point.
//
// This is a local entry file (instead of Expo's hoisted `expo/AppEntry.js`)
// because this project lives in an npm-workspaces monorepo: `expo` is hoisted
// to the repo root, so `expo/AppEntry.js`'s `import App from '../../App'` would
// resolve against the repo root instead of this app. A local `index.js` keeps
// the entry resolveable from `apps/mobile` and mirrors exactly what Expo's
// AppEntry does.
import { registerRootComponent } from 'expo';
import App from './App';

registerRootComponent(App);