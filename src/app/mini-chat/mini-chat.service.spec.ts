import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { MiniChatService } from './mini-chat.service';

describe('MiniChatService', () => {
  let service: MiniChatService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [MiniChatService]
    });
    service = TestBed.inject(MiniChatService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify(); // Ensure that no outstanding requests are pending
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send a message with the fixed system prompt and user message', () => {
    const userMessage = 'What is certiorari?';
    const mockChatHistory = [{ role: 'user', content: 'hello' }];
    const mockResponse = { ai_message: 'Certiorari is a legal process...' };

    service.sendMessage(userMessage, mockChatHistory).subscribe(response => {
      expect(response).toBe(mockResponse.ai_message);
    });

    const req = httpTestingController.expectOne('https://wisdomvault.welfareph.com/ai_api/fast_ai_api/');
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(req.request.headers.get('Authorization')).toBe('Bearer YPaFH6XTJhUo0rrstAdxKrzqshCFGxlOr1YIyy2uRHZ8vJhOPilCaUFxWetlWmqz');

    // Check the structure of the messages sent
    const expectedMessages = [
      { role: 'system', content: 'you are lawGPT, helping lawyers' },
      { role: 'user', content: 'hello' }, // From mockChatHistory
      { role: 'user', content: userMessage }
    ];
    expect(req.request.body.messages).toEqual(expectedMessages);

    req.flush(JSON.stringify(mockResponse)); // Respond with mock data
  });

  it('should retry on API error (3 times) and then throw error', async () => {
    const userMessage = 'Test retry';
    const mockChatHistory: any[] = [];
    const errorMessage = 'Network error';
    const url = 'https://wisdomvault.welfareph.com/ai_api/fast_ai_api/';

    let errorCaught = false;
    service.sendMessage(userMessage, mockChatHistory).subscribe({
      next: () => fail('should have failed'),
      error: (error) => {
        expect(error.message).toBe('Mini AI communication failed');
        errorCaught = true;
      }
    });

    // Simulate 3 retries + initial attempt = 4 requests
    for (let i = 0; i < 4; i++) {
      const req = httpTestingController.expectOne(url);
      req.error(new ProgressEvent('error'), { status: 0, statusText: errorMessage });
      // Wait for a fixed amount slightly larger than the component's internal delay.
      // The component's delays are 1s, 2s, 3s. So we wait for 1.1s, 2.1s, 3.1s after each error.
      // This is a rough estimation to allow the retry to kick in.
      if (i < 3) { // Only wait for delays if there are more retries
        await new Promise(resolve => setTimeout(resolve, (i + 1) * 1000 + 100)); // (retryCount * 1000) + buffer
      }
    }

    // After all retries and delays, the error should have been caught
    expect(errorCaught).toBe(true);
  }, 10000); // Increase timeout to 10 seconds to accommodate simulated delays

  it('should extract ai_message from JSON response', () => {
    const userMessage = 'Hello';
    const mockChatHistory = [];
    const mockResponse = { ai_message: 'Hi there!' };

    service.sendMessage(userMessage, mockChatHistory).subscribe(response => {
      expect(response).toBe(mockResponse.ai_message);
    });

    const req = httpTestingController.expectOne('https://wisdomvault.welfareph.com/ai_api/fast_ai_api/');
    req.flush(JSON.stringify(mockResponse));
  });

  it('should return raw response if it is not JSON or does not contain ai_message', () => {
    const userMessage = 'Hello';
    const mockChatHistory = [];
    const rawTextResponse = 'This is a plain text response.';

    service.sendMessage(userMessage, mockChatHistory).subscribe(response => {
      expect(response).toBe(rawTextResponse);
    });

    const req = httpTestingController.expectOne('https://wisdomvault.welfareph.com/ai_api/fast_ai_api/');
    req.flush(rawTextResponse); // Simulate a non-JSON response
  });
});
