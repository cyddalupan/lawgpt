import '../test-setup'; // Explicitly import the global test setup

import { TestBed } from '@angular/core/testing';
import { App, ChatMessage } from './app';
import { ChatService } from './chat.service';
import { DomSanitizer, SecurityContext } from '@angular/platform-browser';
import { Component, Input, signal } from '@angular/core'; // Added Component, Input
import { CommonModule } from '@angular/common'; // Added CommonModule
import { LoadingStream } from './loading-stream/loading-stream'; // Added LoadingStream
import { ChatInput } from './chat-input/chat-input'; // Added ChatInput
import { BehaviorSubject, of, Observable } from 'rxjs'; // Added Observable and of
import { Router } from '@angular/router'; // Import Router
import { RouterTestingModule } from '@angular/router/testing'; // Import RouterTestingModule
import { MiniChatComponent } from './mini-chat/mini-chat'; // Import MiniChatComponent
import { Location, APP_BASE_HREF } from '@angular/common'; // Import Location and APP_BASE_HREF

// Mock ChatService
class MockChatService {
  inResearchMode$ = new BehaviorSubject<boolean>(false);
  currentStatusMessage$ = new BehaviorSubject<string>('');
  finalHtmlOutput$ = new BehaviorSubject<string | null>(null);
  aiError$ = new BehaviorSubject<any>(null);

  parseActionTags(message: string): { [key: string]: string | string[] } {
    return {}; // Return empty tags for now
  }

  sendMessage(messages: any[]): Observable<any> { // Add sendMessage method as App uses it
    return of('mock response from chat service'); // Return an observable
  }
}

// Mock DomSanitizer
class MockDomSanitizer {
  bypassSecurityTrustHtml(value: string): string {
    return value;
  }
  sanitize(context: SecurityContext, value: any): string {
    return value;
  }
}

// Mock ChatHistory component to avoid 'marked' dependency
@Component({
  selector: 'app-chat-history',
  standalone: true,
  template: `
    <div data-testid="mock-chat-history">
      <div *ngIf="inResearchMode" data-testid="mock-research-mode-active">Research Mode Active</div>
      <div *ngIf="finalHtmlOutput" data-testid="mock-final-html-output" [innerHTML]="finalHtmlOutput"></div>
      <div *ngFor="let msg of messages" data-testid="mock-chat-message">{{ msg.content }}</div>
    </div>
  `,
  imports: [CommonModule]
})
class MockChatHistory {
  @Input() messages: ChatMessage[] = [];
  @Input() inResearchMode: boolean = false;
  @Input() finalHtmlOutput: string | null = null;
}

describe('App', () => {
  let component: App;
  let chatService: ChatService;
  let sanitizer: DomSanitizer;
  let fixture: ComponentFixture<App>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        App, // Import the standalone component
        RouterTestingModule.withRoutes([
          { path: '', component: App },
          { path: 'mini', component: MiniChatComponent }
        ])
      ], // Add RouterTestingModule with routes
      providers: [
        { provide: ChatService, useClass: MockChatService },
        { provide: DomSanitizer, useClass: MockDomSanitizer },
      ],
    }).compileComponents();

    // Override ChatHistory with the mock
    TestBed.overrideComponent(App, {
      set: {
        imports: [
          LoadingStream, // Original import from app.ts
          ChatInput,     // Original import from app.ts
          MockChatHistory // Replace ChatHistory with MockChatHistory
        ]
      }
    });

    fixture = TestBed.createComponent(App); // Removed 'const'
    component = fixture.componentInstance;
    chatService = TestBed.inject(ChatService);
    sanitizer = TestBed.inject(DomSanitizer);
  });

  it('should create the app', () => {
    expect(component).toBeTruthy();
  });

  it('should display a welcoming message on initialization', () => {
    component.ngOnInit();
    const chatHistory = component.chatHistory();
    expect(chatHistory.length).toBe(1);
    expect(chatHistory[0].role).toBe('assistant');
    expect(chatHistory[0].content).toContain('Hello! I am LawGPT, your AI legal research assistant.');
    expect(chatHistory[0].displayInChat).toBe(true);
  });

  it('should return safe HTML from getSafeHtml', () => {
    const testHtml = '<h1>Test HTML</h1>';
    component.finalRenderedHtml.set(testHtml);
    expect(component.getSafeHtml()).toBe(testHtml);
  });

  it('should process citations correctly and sanitize content', () => {
    const citationContent = `
      Some text before.
      [[CITATION: GR No. 123456 | Petitioner v. Respondent | 2023-01-01 | En Banc | Syllabus text.]]
      Some text after.
    `;
    // We need to call the private method, so we cast it to any
    const processedHtml = (component as any).processCitations(citationContent);
    expect(processedHtml).toContain('<div class="my-4 p-4 bg-slate-50 border-l-4 border-blue-700 rounded-r-md shadow-sm">');
    expect(processedHtml).toContain('<p class="font-bold text-slate-900">GR No. 123456</p>');
    expect(processedHtml).toContain('<p class="italic text-slate-700">Petitioner v. Respondent</p>');
    expect(processedHtml).toContain('<p class="text-sm text-slate-600">2023-01-01 | En Banc</p>');
    expect(processedHtml).toContain('<p class="text-slate-800 text-sm">Syllabus text.</p>');
    expect(processedHtml).not.toContain('[[CITATION'); // Ensure original citation tag is removed
  });

  it('should process and display final HTML output when chatService.finalHtmlOutput$ emits', () => {
    const finalHtml = '<div class="container"><h2 class="text-3xl">Final Brief</h2><p>This is the final content.</p></div>';
    
    // component.ngOnInit(); // Initialize subscriptions - REMOVED

    fixture.detectChanges(); // Trigger initial change detection, which calls ngOnInit

    // Simulate chatService emitting final HTML
    (chatService as MockChatService).finalHtmlOutput$.next(finalHtml);
    fixture.detectChanges(); // Trigger change detection

    // Assert component state updates
    expect(component.finalRenderedHtml()).toBe(finalHtml);
    expect(component.currentPhase()).toBe('idle');
    expect(component.loading()).toBe(false);

    // Assert chat history updated
    const chatHistory = component.chatHistory();
    expect(chatHistory.length).toBe(2); // Initial welcome + final HTML message
    expect(chatHistory[1].role).toBe('assistant');
    expect(chatHistory[1].content).toBe(finalHtml);
    expect(chatHistory[1].displayInChat).toBe(true);
    expect(chatHistory[1].isFinalHtml).toBe(true);

    // Assert DOM rendering (check the specific div in app.html)
    const finalBriefDiv: HTMLElement = fixture.nativeElement.querySelector('.final-output-container');
    expect(finalBriefDiv).toBeTruthy();
    expect(finalBriefDiv.innerHTML).toContain('Final Legal Brief'); // Check heading
    expect(finalBriefDiv.innerHTML).toContain(finalHtml); // Check content
  });
});

describe('App Routing', () => {
  let router: Router;
  let fixture: ComponentFixture<App>;
  let location: Location;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        App,
        RouterTestingModule.withRoutes([
          { path: '', component: App },
          { path: 'mini', component: MiniChatComponent }
        ])
      ],
      providers: [
        { provide: ChatService, useClass: MockChatService },
        { provide: DomSanitizer, useClass: MockDomSanitizer },
        { provide: APP_BASE_HREF, useValue: '/' }
      ],
    }).compileComponents();

    // Override ChatHistory with the mock for routing tests as well
    TestBed.overrideComponent(App, {
      set: {
        imports: [
          LoadingStream,
          ChatInput,
          MockChatHistory
        ]
      }
    });

    fixture = TestBed.createComponent(App);
    router = TestBed.inject(Router);
    location = TestBed.inject(Location);

    fixture.detectChanges(); // Initial detectChanges to trigger ngOnInit and router setup
    await fixture.whenStable(); // Wait for router to stabilize
  });

  it('should navigate to "mini" and display MiniChatComponent', async () => {
    await router.navigate(['/mini']);
    fixture.detectChanges(); // Trigger change detection after navigation

    // Wait for the navigation to complete and the component to be rendered
    await fixture.whenStable();

    // Check if the URL is '/mini'
    expect(location.path()).toBe('/mini');

    // Check if the MiniChatComponent is rendered in the DOM
    const miniChatElement = fixture.nativeElement.querySelector('app-mini-chat');
    expect(miniChatElement).toBeTruthy();
  });
});
