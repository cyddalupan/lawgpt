import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { ChatService } from './chat.service';

describe('ChatService', () => {
  let service: ChatService;
  let httpTestingController: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ChatService]
    });
    service = TestBed.inject(ChatService);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify(); // Ensure that no outstanding requests are uncaught
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should extract status_message and leave Unicode escaped characters as is', () => {
    const aiMessageWithUnicode = '[status_message: "\ud83e\udde0 Evaluating your request for legal clarity..."]';
    const parsedTags = service.parseActionTags(aiMessageWithUnicode);

    expect(parsedTags['status_message']).toBe('🧠 Evaluating your request for legal clarity...');
  });
});
