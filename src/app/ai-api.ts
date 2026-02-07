import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';


@Injectable({
  providedIn: 'root'
})
export class AiApiService {
  private apiUrl = 'https://wisdomvault.welfareph.com/ai_api/'; // Adjust if your Angular app is served from a different base path
  private authToken = 'YPaFH6XTJhUo0rrstAdxKrzqshCFGxlOr1YIyy2uRHZ8vJhOPilCaUFxWetlWmqz';

  constructor(private http: HttpClient) { }

  /**
   * Sends messages to the AI API and gets a chat completion response.
   * @param messages An array of chat messages in OpenAI format.
   * @returns An Observable with the AI's response.
   */
  getAiResponse(messages: any[]): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.authToken}`
    });

    const body = { messages: messages };

    return this.http.post<any>(this.apiUrl, body, { headers });
  }

  // Example usage in an Angular component:
  // constructor(private aiApiService: AiApiService) {}
  //
  // sendMessageToAi() {
  //   const chatMessages = [
  //     { role: 'system', content: 'You are a helpful assistant.' },
  //     { role: 'user', content: 'Hello, how are you?' }
  //   ];
  //
  //   this.aiApiService.getAiResponse(chatMessages).subscribe(
  //     response => {
  //       console.log('AI Response:', response);
  //       // Process the response, e.g., display it in the UI
  //     },
  //     error => {
  //       console.error('Error getting AI response:', error);
  //       // Handle errors, e.g., show an error message to the user
  //     }
  //   );
  // }
}