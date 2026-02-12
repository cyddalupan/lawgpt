import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AiApiService } from './ai-api';
import { HttpErrorResponse } from '@angular/common/http';

// Need to import expectAsync from a test framework that supports it, e.g., Jest or Vitest
// Vitest supports expect.rejects and expect.toThrow for promises
// For an observable that errors, you can convert it to a promise for testing
// Note: Vitest's expect.rejects/toThrow might be slightly different syntax than Jest's expect(promise).rejects

describe('AiApiService', () => {
  let service: AiApiService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.resetTestingModule(); // Explicitly reset the testing module
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [AiApiService]
    });
    service = TestBed.inject(AiApiService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify(); // Ensure that no outstanding requests are uncaught
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should send a POST request and return the AI response', async () => {
    const mockMessages = [{ role: 'user', content: 'Hello' }];
    const mockResponse = { choices: [{ message: { content: 'Hi there!' } }] };

    const promise = service.getAiResponse(mockMessages).toPromise(); // Convert Observable to Promise

    const req = httpTestingController.expectOne(service['apiUrl']);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(req.request.headers.get('Authorization')).toContain('Bearer ');
    req.flush(mockResponse);

    await expect(promise).resolves.toEqual(mockResponse);
  });

  it('should handle client-side HTTP errors gracefully', async () => {
    const mockMessages = [{ role: 'user', content: 'Client error test' }];
    const clientError = new ErrorEvent('error', {
      message: 'Simulated client-side network error'
    });

    // Convert observable to a promise for testing errors
    const promise = service.getAiResponse(mockMessages).toPromise();

    const req = httpTestingController.expectOne(service['apiUrl']);
    req.error(clientError); // Simulate a network error

    await expect(promise).rejects.toThrow('Client Error: Simulated client-side network error');
  });

  it('should handle server-side HTTP errors gracefully', async () => {
    const mockMessages = [{ role: 'user', content: 'Server error test' }];
    const mockErrorResponse = new HttpErrorResponse({
      error: 'test 500 error',
      status: 500,
      statusText: 'Internal Server Error',
      url: service['apiUrl']
    });

    const promise = service.getAiResponse(mockMessages).toPromise();

    const req = httpTestingController.expectOne(service['apiUrl']);
    req.flush('Server error', mockErrorResponse);

    await expect(promise).rejects.toThrow(
      `Server Error: 500 - Http failure response for ${service['apiUrl']}: 500 Internal Server Error`
    );
  });

  it('should send a POST request for sendSimpleChat to the specified API URL and return string response', async () => {
    const testMessage = 'Simple chat message';
    const testApiUrl = 'https://some.new.fast.ai/endpoint'; // Placeholder for the actual fast AI endpoint
    const mockResponse = 'AI Simple Response';

    const promise = service.sendSimpleChat(testMessage, testApiUrl).toPromise();

    const req = httpTestingController.expectOne(testApiUrl);
    expect(req.request.method).toBe('POST');
    expect(req.request.headers.get('Content-Type')).toBe('application/json');
    expect(req.request.headers.get('Authorization')).toContain('Bearer ');
    expect(req.request.body).toEqual({ messages: [{ role: 'user', content: testMessage }] });
    req.flush(mockResponse);

    await expect(promise).resolves.toEqual(mockResponse);
  });
});