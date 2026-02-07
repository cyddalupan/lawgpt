import { Component, EventEmitter, Output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms'; // Import FormsModule for ngModel

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [FormsModule], // Add FormsModule to imports
  templateUrl: './chat-input.html',
})
export class ChatInput {
  @Output() messageSent = new EventEmitter<string>();
  userMessage = signal('');

  sendMessage(): void {
    const message = this.userMessage().trim();
    if (message) {
      this.messageSent.emit(message);
      this.userMessage.set(''); // Clear the input after sending
    }
  }
}
