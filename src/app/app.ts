import { Component, signal } from '@angular/core';


import { RouterOutlet } from '@angular/router';
// import { AiTestComponent } from './ai-test/ai-test'; // Removed AiTestComponent as it is not used






@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('temp-angular-app');















  


  





}