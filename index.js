import { registerRootComponent } from 'expo';
import './lib/geo'; // מגדיר את משימת זיהוי ההגעה ברקע — חייב לפני הכל
import App from './App';

registerRootComponent(App);
