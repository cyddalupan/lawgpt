import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MainChatPageComponent } from './main-chat-page';
import { ChatService } from '../chat.service';
import { DomSanitizer } from '@angular/platform-browser';
import { BehaviorSubject, of } from 'rxjs';

// Mock ChatService
class MockChatService {
  inResearchMode$ = new BehaviorSubject<boolean>(false);
  currentStatusMessage$ = new BehaviorSubject<string>('');
  finalHtmlOutput$ = new BehaviorSubject<string | null>(null);
  aiError$ = new BehaviorSubject<any>(null);

  parseActionTags = vi.fn().mockReturnValue({});
  sendMessage = vi.fn().mockReturnValue(of('mock response'));
  removeActionTags = vi.fn((text: string) => text);
  getInResearchMode = vi.fn().mockReturnValue(false);
}

// Mock DomSanitizer
class MockDomSanitizer {
  bypassSecurityTrustHtml = vi.fn((value: string) => value);
  sanitize = vi.fn((context: any, value: any) => value);
}

describe.skip('MainChatPageComponent', () => {
  let component: MainChatPageComponent;
  let fixture: ComponentFixture<MainChatPageComponent>;
  let mockChatService: MockChatService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainChatPageComponent],
      providers: [
        { provide: ChatService, useClass: MockChatService },
        { provide: DomSanitizer, useClass: MockDomSanitizer },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MainChatPageComponent);
    component = fixture.componentInstance;
    mockChatService = TestBed.inject(ChatService) as unknown as MockChatService;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  it('should display a welcoming message on initialization', () => {
    const chatHistory = component.chatHistory();
    expect(chatHistory.length).toBe(1);
    expect(chatHistory[0].role).toBe('assistant');
    expect(chatHistory[0].content).toContain('Hello! I am LawGPT, your AI legal research assistant.');
  });

  it('should process and display final HTML output when chatService.finalHtmlOutput$ emits', async () => {
    const finalHtml = '<div class="container"><h2 class="text-3xl">Final Brief</h2><p>This is the final content.</p></div>';
    mockChatService.finalHtmlOutput$.next(finalHtml);
    fixture.detectChanges();

    expect(component.finalRenderedHtml()).toBe(finalHtml);
    expect(component.currentPhase()).toBe('idle');
    expect(component.loading()).toBe(false);

    const chatHistory = component.chatHistory();
    expect(chatHistory.length).toBe(2);
    expect(chatHistory[1].content).toBe(finalHtml);

    const finalBriefDiv: HTMLElement = fixture.nativeElement.querySelector('.final-output-container');
    expect(finalBriefDiv).toBeTruthy();
    expect(finalBriefDiv.innerHTML).toContain('Final Legal Brief');
    expect(finalBriefDiv.innerHTML).toContain(finalHtml);
  });

  it('should call sendMessage on chatService when userMessage is called', () => {
    const testMessage = 'User question';
    component.userMessage(testMessage);
    expect(mockChatService.sendMessage).toHaveBeenCalled();
  });

  it('should reset state on startNewResearch', () => {
    component.chatHistory.set([{ role: 'user', content: 'test' }]);
    component.finalRenderedHtml.set('html');
    component.currentPhase.set('strategy');
    component.loading.set(true);
    component.statusMessage.set('status');

    component.startNewResearch();

    expect(component.chatHistory().length).toBe(1); // Only welcome message
    expect(component.finalRenderedHtml()).toBeNull();
    expect(component.currentPhase()).toBe('intake');
    expect(component.loading()).toBe(false);
    expect(component.statusMessage()).toBe('');
  });
});
