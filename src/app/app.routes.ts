import { Routes } from '@angular/router';
import { App } from './app'; // Import the App component
import { MiniChatComponent } from './mini-chat/mini-chat'; // Import the MiniChatComponent

export const routes: Routes = [
  {
    path: '',
    component: App,
  },
  {
    path: 'mini',
    component: MiniChatComponent,
  },
];
