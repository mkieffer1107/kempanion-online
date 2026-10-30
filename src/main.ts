import '@fontsource/dotgothic16/400.css';
import '@fontsource/pixelify-sans/400.css';
import '@fontsource/pixelify-sans/700.css';
import './styles/global.css';
import './styles/cursors.css';
import { mount } from 'svelte';
import App from './App.svelte';
import { registerSW } from './lib/pwa';

const target = document.getElementById('app')!;
// The inline boot screen in index.html covers the bundle download; the gate replaces it.
document.getElementById('boot')?.remove();

const app = mount(App, { target });

registerSW();

export default app;
