import { Routes } from '@angular/router';
import { MainChatPageComponent } from './main-chat-page/main-chat-page'; // Import MainChatPageComponent
import { MiniChatComponent } from './mini-chat/mini-chat'; // Import the MiniChatComponent
import { BaseChatComponent } from './base-chat/base-chat'; // Import the BaseChatComponent


export const routes: Routes = [
  {
    path: '',
    redirectTo: '/base',
    pathMatch: 'full',
  },
  {
    path: 'pro',
    component: MainChatPageComponent,
  },
  {
    path: 'mini',
    component: MiniChatComponent,
  },
  {
    path: 'base',
    component: BaseChatComponent,
  },
];
