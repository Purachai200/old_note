// Polyfills for legacy engines (iOS 9 Safari / iPad Mini 1st Gen)
import 'core-js/stable';
import 'regenerator-runtime/runtime';
import 'proxy-polyfill';

import { createApp } from 'vue';
import App from './App.vue';
import './assets/style.css';

createApp(App).mount('#app');
