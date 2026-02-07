# AI API Instructions for Angular Developers

This document guides Angular developers on how to integrate and utilize the `/ai_api/` endpoint.

## Overview

The `/ai_api/` endpoint provides a secure and controlled interface to the OpenAI Chat Completion API, specifically configured to use the `gpt-5-mini` model. Your Angular application can send chat messages to this endpoint and receive AI-generated responses.

## Base URL

Your application should make POST requests to: `https://wisdomvault.welfareph.com/ai_api/`

## Authentication

All requests to the `/ai_api/` endpoint must include a Bearer Token in the `Authorization` header.

**Security Token:** `YPaFH6XTJhUo0rrstAdxKrzqshCFGxlOr1YIyy2uRHZ8vJhOPilCaUFxWetlWmqz`

### How to include the token in Angular (Example using `HttpClient`)

```typescript
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
```

## Request Body Format

The request body should be a JSON object with a single key: `messages`. The value associated with `messages` must be an array of message objects, each containing `role` (e.g., "system", "user", "assistant") and `content`.

```json
{
  "messages": [
    {
      "role": "system",
      "content": "Your system persona or instructions here."
    },
    {
      "role": "user",
      "content": "The user's query here."
    }
  ]
}
```

## Response Format

The endpoint will return the raw JSON response from the OpenAI API. You will typically be interested in `response.choices[0].message.content` to get the AI's textual reply.

### Example of accessing the content in Angular

```typescript
this.aiApiService.getAiResponse(chatMessages).subscribe(
  response => {
    if (response && response.choices && response.choices.length > 0) {
      const aiContent = response.choices[0].message.content;
      console.log('Parsed AI Content:', aiContent);
      // Update your UI with aiContent
    } else {
      console.warn('Unexpected AI response format:', response);
    }
  },
  error => {
    console.error('Error getting AI response:', error);
  }
);
```

## Error Handling

Your Angular application should be prepared to handle various HTTP error codes:

*   **401 Unauthorized:** The authentication token is missing or invalid. Ensure the `authToken` in your service is correct and sent with every request.
*   **400 Bad Request:** This usually means the `messages` array in your request body was empty or malformed.
*   **405 Method Not Allowed:** (Unlikely if you are always using POST, but good to be aware of).
*   **500 Internal Server Error:** A problem occurred on the server side or with the OpenAI API itself. You should log these errors and provide a user-friendly message.

Make sure your Angular application's network requests are configured to handle these scenarios gracefully.