import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MainChatPageComponent } from './main-chat-page';
import { ChatService } from '../chat.service';
import { DomSanitizer } from '@angular/platform-browser';
import { BehaviorSubject, of } from 'rxjs';
import { RouterTestingModule } from '@angular/router/testing';
import { Header } from '../shared/header';
import { CommonModule } from '@angular/common';
import { LoadingStream } from '../loading-stream/loading-stream';
import { ChatInput } from '../chat-input/chat-input';


// Mock the prompts.txt?raw import - required by MainChatPageComponent
vi.mock('./prompts.json', () => ({
  default: JSON.stringify({
    intake: "", strategy: "", summarizer: "", research: "", validator: "", synthesis: "", styling: "",
  }),
}));

// Minimal mocks needed for creation
class MockChatService {
  inResearchMode$ = new BehaviorSubject<boolean>(false);
  currentStatusMessage$ = new BehaviorSubject<string>('');
  finalHtmlOutput$ = new BehaviorSubject<string | null>(null);
  aiError$ = new BehaviorSubject<any>(null);
  sendMessage = vi.fn().mockReturnValue(of(''));
  parseActionTags = vi.fn().mockReturnValue({});
  removeActionTags = vi.fn((text: string) => text);
  getInResearchMode = vi.fn().mockReturnValue(false);
}

class MockDomSanitizer {
  bypassSecurityTrustHtml = vi.fn((value: string) => value);
  sanitize = vi.fn((context: any, value: any) => value);
}

describe('MainChatPageComponent', () => {
  let component: MainChatPageComponent;
  let fixture: ComponentFixture<MainChatPageComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MainChatPageComponent, RouterTestingModule],
      providers: [
        { provide: ChatService, useClass: MockChatService },
        { provide: DomSanitizer, useClass: MockDomSanitizer },
      ],
    })
    .overrideComponent(MainChatPageComponent, {
        set: {
            imports: [CommonModule, LoadingStream, ChatInput, Header, RouterTestingModule] // Simplified imports
        }
    })
    .compileComponents();

    fixture = TestBed.createComponent(MainChatPageComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });
});