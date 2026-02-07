// src/app/app-behavior.spec.ts
import { TestBed, ComponentFixture } from '@angular/core/testing';
import { App, ChatMessage } from './app';
import { ChatService } from './chat.service';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';

// Mock ChatService
class MockChatService {
  parseActionTags = vi.fn().mockImplementation((message: string) => {
    const tags: { [key: string]: string | string[] } = {};
    const tagRegex = /\[(\w+):\s*(.*?)\]/g;
    const matches = Array.from(message.matchAll(tagRegex));
    for (const match of matches) {
      const key = match[1];
      let rawValue = match[2].trim();
      let processedValue: string | string[] = rawValue;
      if ((rawValue.startsWith('[') && rawValue.endsWith(']')) || (rawValue.startsWith('{') && rawValue.endsWith('}'))) {
        try {
          processedValue = JSON.parse(rawValue);
        } catch (e) { processedValue = rawValue; }
      } else if ((rawValue.startsWith('"') && rawValue.endsWith('"')) || (rawValue.startsWith("'") && rawValue.endsWith("'"))) {
          processedValue = rawValue.substring(1, rawValue.length - 1);
      }
      tags[key] = processedValue;
    }
    return tags;
  });
  sendMessage = vi.fn().mockReturnValue(of({ ai_message: 'Mock AI response' }));
  tagRegex = /\[(\w+):\s*(.*?)\]/g;
}

// Mock DomSanitizer
class MockDomSanitizer {
  bypassSecurityTrustHtml(value: string): SafeHtml { return value as SafeHtml; }
  sanitize(context: any, value: string): string { return value; }
}

describe('App Intake Phase Behavior', () => {
  let fixture: ComponentFixture<App>;
  let app: App;
  let mockChatService: MockChatService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: ChatService, useClass: MockChatService },
        { provide: DomSanitizer, useClass: MockDomSanitizer }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    mockChatService = TestBed.inject(ChatService) as unknown as MockChatService;
  });

  it('should create the app', () => {
    expect(app).toBeTruthy();
  });

  // Test for the Intake Phase behavior after removing simulateUserInputForIntake
  it('should await user input if intake_status: "done" is not received', async () => {
    app.currentPhase.set('intake');
    // Set initial history to mimic ngOnInit's welcome message
    app.chatHistory.set([{ role: 'assistant', content: 'Hello! I am LawGPT...', displayInChat: true }]);
    mockChatService.sendMessage.mockClear();
    
    // AI sends a message asking for more info, without intake_status: "done"
    mockChatService.sendMessage.mockReturnValue(of({ ai_message: 'Mock AI response asking for more info' }));

    await (app as any).processQueue();

    expect(mockChatService.sendMessage).toHaveBeenCalled();
    expect(app.currentPhase()).toBe('intake'); // Should remain in intake phase
    expect(app.chatHistory()).toEqual([
      { role: 'assistant', content: 'Hello! I am LawGPT...', displayInChat: true },
      { role: 'assistant', content: 'Mock AI response asking for more info', displayInChat: true }
    ]);
    expect(app.loading()).toBe(false);
    expect(app.statusMessage()).toBe(''); // Status message should be empty if AI doesn't provide one
  });
});

describe('App Research Phase Orchestration', () => {
  let fixture: ComponentFixture<App>;
  let app: App;
  let mockChatService: MockChatService;
  let processQueueSpy: ReturnType<typeof vi.spyOn>; // Declare the spy instance

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        { provide: ChatService, useClass: MockChatService },
        { provide: DomSanitizer, useClass: MockDomSanitizer }
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(App);
    app = fixture.componentInstance;
    mockChatService = TestBed.inject(ChatService) as unknown as MockChatService;
    
    // Set up a consistent state for research phase tests
    app.currentPhase.set('research');
    app.tasks.set(['Task 1: Search for X', 'Task 2: Validate Y']);
    app.currentTaskIndex.set(0);
    app.researchSubPhase.set('idle');
    app.chatHistory.set([{ role: 'user', content: 'Start research', displayInChat: true }]);
    mockChatService.sendMessage.mockClear();
    
    // Spy on processQueue and allow its original implementation to run
    processQueueSpy = vi.spyOn(app, 'processQueue' as any);
    
    vi.spyOn(app, 'userMessage' as any); // Spy on userMessage to check internal messages
    vi.spyOn(app.validatedResearchFragments, 'update'); // Spy on this signal to check updates
    vi.spyOn(app.currentTaskIndex, 'update'); // Spy on this signal to check updates
    vi.spyOn(app.researchSubPhase, 'set'); // Spy on researchSubPhase to track state transitions
    vi.spyOn(app.statusMessage, 'set'); // Spy on statusMessage to check updates
    vi.useFakeTimers(); // For simulating delays
  });

  afterEach(() => {
    vi.useRealTimers(); // Restore real timers
    processQueueSpy.mockRestore(); // Restore the processQueue spy after each test
  });

  // Test for web search orchestration
    it('should detect web_search action, simulate search, and feed results back to AI', async () => {
      // Mock the AI's response to be a web search request
      const aiResponseWithSearchTag = '[status_message: "🔎 Preparing web search for Task 1: Search for X..."][action: "web_search", query: "Task 1: Search for X"]';
      mockChatService.sendMessage.mockReturnValue(of({ ai_message: aiResponseWithSearchTag }));
  
      // Simulate the beginning of a research task flow
      app.researchSubPhase.set('sending_task_to_researcher'); // Set state for handleResearchStep
  
  
      await (app as any).processQueue(); // Trigger the full process, which will call handleResearchStep
  
          // Assert that the web search was initiated and then progressed through
          // No assertion for intermediate status message, as it's transient  
      vi.runAllTimers(); // Fast-forward simulated delay for web search simulation AND subsequent calls
  
      // Final state after web search simulation, processing results, and triggering validation
      expect(app.researchSubPhase().valueOf()).toBe('sending_research_to_validator'); // It moves to this state
      // No assertion for intermediate status message, as it's transient
      expect(app['userMessage']).toHaveBeenCalledWith(
        expect.stringContaining('[WEB_SEARCH_RESULTS:'),
        false // Should be an internal message
      );
      expect(processQueueSpy).toHaveBeenCalledTimes(3); // Initial call + userMessage (web search) + userMessage (task 2)
    });

  // Test for AI processing web search results
  it('should process AI response after web search results are fed, and set for validation', async () => {
    // Mock the AI's response to be the findings after processing web search results
    const aiResponseWithFindings = '[status_message: "📚 Processing web search results for Task 1: Search for X..."]Found G.R. No. 123456';
    mockChatService.sendMessage.mockReturnValue(of({ ai_message: aiResponseWithFindings }));

    // Simulate the state after web search results have been fed back to AI (internal userMessage)
    // and the processQueue is called again.
    app.researchSubPhase.set('web_search_done'); // Set state for handleResearchStep


    await (app as any).processQueue(); // Trigger the full process, which will call handleResearchStep

    const lastAssistantMessage = app.chatHistory().findLast(msg => msg.role === 'assistant');
    console.log('Test: lastAssistantMessage received:', lastAssistantMessage);
    const expectedMessage = {
      role: 'assistant',
      content: 'Found G.R. No. 123456',
      needsValidation: true,
      displayInChat: false
    };
    console.log('Test: expectedMessage:', expectedMessage);
    expect(lastAssistantMessage).toEqual(expectedMessage);
    expect(app.researchSubPhase().valueOf()).toBe('awaiting_research_response');
    expect(app['processResearchTasks']).toHaveBeenCalled();
    expect(processQueueSpy).toHaveBeenCalledTimes(2); // Should be called twice due to internal userMessage call
  });

  // Test for "one strike and move on" validation logic
  it('should move to next task if validation fails for a researcher output', async () => {
    const researcherOutput = 'Raw findings from researcher';
    const validatorFailedResponse = 'Validator failed to verify'; // No validation_status tag
    mockChatService.sendMessage.mockReturnValue(of({ ai_message: validatorFailedResponse }));

    // Simulate researcher's output in chat history, ready for validation
    app.chatHistory.set([
      ...app.chatHistory(),
      { role: 'assistant', content: researcherOutput, needsValidation: true, displayInChat: false }
    ]);
    app.researchSubPhase.set('sending_research_to_validator'); // Mimic state after sending to validator
    app.validatedResearchFragments.set([]); // Ensure it's empty initially
    app.currentTaskIndex.set(0); // Current task is the first one

    vi.spyOn(app, 'processResearchTasks' as any); // Spy on it, but allow original implementation // Mock processResearchTasks to prevent its side effects after validation

    await (app as any).processQueue(); // Trigger the full process, which will call handleResearchStep

    expect(app.validatedResearchFragments()).toEqual([{
      task: 'Task 1: Search for X',
      result: researcherOutput, // The unvalidated output
      validationStatus: 'unverified'
    }]);
    expect(app.currentTaskIndex.update).toHaveBeenCalledWith(expect.any(Function)); // Check that update is called
    expect(app.currentTaskIndex()).toBe(2); // Should advance to next task (past task 1 to task 2)
    expect(app.researchSubPhase().valueOf()).toBe('sending_task_to_researcher'); // It should immediately transition to the next task's processing
    expect(app['processResearchTasks']).toHaveBeenCalled();
    console.log('Test 3: processQueueSpy calls:', processQueueSpy.mock.calls.length); // Debugging line
    expect(processQueueSpy).toHaveBeenCalledTimes(3); // Initial call + userMessage (task 1) + userMessage (task 2)
  });

  it('should mark validated output as verified and move to next task', async () => {
    const researcherOutput = 'Raw findings from researcher';
    const validatorSuccessResponse = 'Verified content [validation_status: "verified"]';
    const cleanedContent = 'Verified content';
    
    mockChatService.sendMessage.mockReturnValue(of({ ai_message: validatorSuccessResponse }));

    app.chatHistory.set([
      ...app.chatHistory(),
      { role: 'assistant', content: researcherOutput, needsValidation: true, displayInChat: false }
    ]);
    app.researchSubPhase.set('sending_research_to_validator');
    app.validatedResearchFragments.set([]);
    app.currentTaskIndex.set(0);


    vi.spyOn(app, 'processResearchTasks' as any); // Spy on it, but allow original implementation

    await (app as any).processQueue();

    expect(app.validatedResearchFragments()).toEqual([{
      task: 'Task 1: Search for X',
      result: cleanedContent,
      validationStatus: 'verified'
    }]);
    expect(app.currentTaskIndex.update).toHaveBeenCalledWith(expect.any(Function));
    expect(app.currentTaskIndex()).toBe(2);
    expect(app.researchSubPhase().valueOf()).toBe('sending_task_to_researcher');
    expect(app['processResearchTasks']).toHaveBeenCalled();
    console.log('Test 4: processQueueSpy calls:', processQueueSpy.mock.calls.length); // Debugging line
    expect(processQueueSpy).toHaveBeenCalledTimes(3);
  });
});