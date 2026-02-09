import { Routes } from '@angular/router';
import { MainChatPageComponent } from './main-chat-page/main-chat-page'; // Import MainChatPageComponent
import { MiniChatComponent } from './mini-chat/mini-chat'; // Import the MiniChatComponent


export const routes: Routes = [
  {
    path: '',
    component: MainChatPageComponent, // Directly load MainChatPageComponent
  },
  {
    path: 'mini',
    component: MiniChatComponent,
  },
];
