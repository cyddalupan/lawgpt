import { Component, signal, OnInit, SecurityContext, OnDestroy } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { CommonModule } from '@angular/common'; // Import CommonModule
import { LoadingStream } from '../loading-stream/loading-stream';
import { ChatInput } from '../chat-input/chat-input';
import { ChatHistory } from '../chat-history/chat-history';
import { ChatService } from '../chat.service';
import { retry, catchError, timer, throwError, Subscription } from 'rxjs';
import { ChatMessage } from '../shared/interfaces/chat-message.interface';
import { Header } from '../shared/header'; // Import Header component

import PROMPT_CONTENT from './prompts.json';



@Component({
  selector: 'app-main-chat-page',
  standalone: true,
  imports: [CommonModule, LoadingStream, ChatInput, ChatHistory, Header],
  templateUrl: './main-chat-page.html',
  styleUrl: './main-chat-page.css'
})
export class MainChatPageComponent implements OnInit, OnDestroy {
  protected readonly title = signal('main-chat-page'); // Renamed title
  loading = signal(false);
  statusMessage = signal('');
  chatHistory = signal<ChatMessage[]>([]); // Use ChatMessage interface
  currentPhase = signal<'intake' | 'strategy' | 'summarizer' | 'research' | 'synthesis' | 'styling' | 'validator' | 'idle'>('intake');
  tasks = signal<string[]>([]);
  researchSummary = signal<string>('');
  validatedResearchFragments = signal<any[]>([]);
  currentTaskIndex = signal<number>(0);
  researchSubPhase = signal<'idle' | 'sending_task_to_researcher' | 'awaiting_research_response' | 'sending_research_to_validator' | 'awaiting_validation_response' | 'web_searching' | 'web_search_done'>('idle');
  finalRenderedHtml = signal<string | null>(null);

  researchMode = signal<boolean>(false);
  currentResearchTaskContent = signal<string>(''); // NEW: Signal to hold the current research task content
  contentToValidate = signal<string>(''); // NEW: Signal to hold content to be validated
  synthesizedBriefContent = signal<string>(''); // NEW: Signal to hold the synthesized brief content
  readonly totalPhases = 6;

  private subscriptions = new Subscription();

  constructor(private chatService: ChatService, private sanitizer: DomSanitizer) {}

  getSafeHtml(): SafeHtml {
    // Apply final cleanup to remove any remaining action tags before displaying the HTML.
    // This handles any accidental action tags the AI might generate within the HTML content itself.
    const processedHtml = this.chatService.removeActionTags(this.processCitations(this.finalRenderedHtml() || ''));
    return this.sanitizer.bypassSecurityTrustHtml(processedHtml);
  }

  // New method to process citations and replace markers with styled HTML
  private processCitations(content: string): string {
    const citationRegex = /\[\[CITATION:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\]\]/g;
    return content.replace(citationRegex, (match, grNo, petitioner, date, division, syllabus) => {
                const processedGrNo = grNo;
                const processedPetitioner = petitioner;
                const processedDate = date;
                const processedDivision = division;
                const processedSyllabus = syllabus;
                return `
                  <div class="my-4 p-4 bg-slate-50 border-l-4 border-blue-700 rounded-r-md shadow-sm">
                    <p class="font-bold text-slate-900">${processedGrNo}</p>
                    <p class="italic text-slate-700">${processedPetitioner}</p>
                    <p class="text-sm text-slate-600">${processedDate} | ${processedDivision}</p>
                    <hr class="my-2">
                    <p class="text-slate-800 text-sm">${processedSyllabus}</p>
                  </div>
                `;    });
  }

  ngOnInit(): void {
    // Display a welcoming message to the user
    this.chatHistory.update(history => [...history, {
      role: 'assistant',
      content: 'Hello! I am LawGPT, your AI legal research assistant. Tell me what you need regarding Philippine law.',
      displayInChat: true
    }]);

    this.subscriptions.add(
      this.chatService.inResearchMode$.subscribe(mode => {
        this.researchMode.set(mode);
      })
    );

    this.subscriptions.add(
      this.chatService.currentStatusMessage$.subscribe(message => {
        this.statusMessage.set(message);
      })
    );

    this.subscriptions.add(
      this.chatService.finalHtmlOutput$.subscribe(html => {
        let finalMessageContent = html;
        if (html) {
          try {
            const responseBody = JSON.parse(html);
            if (responseBody && typeof responseBody.ai_message === 'string') {
              finalMessageContent = responseBody.ai_message;
            }
          } catch (e) {
          }
        }
        
        this.finalRenderedHtml.set(finalMessageContent);
        if (finalMessageContent) {
          this.chatHistory.update(history => [...history, {
            role: 'assistant',
            content: finalMessageContent,
            displayInChat: true,
            isFinalHtml: true
          }]);
          this.currentPhase.set('idle');
          this.loading.set(false);
          this.statusMessage.set('Research complete!');
        }
      })
    );
    this.subscriptions.add(
      this.chatService.aiError$.subscribe(error => {
        if (error) {
          console.error('AI Error detected in MainChatPageComponent:', error); // Changed log
          this.loading.set(false);
          this.statusMessage.set('🚨 AI communication failed. Please check the console for details.');
          this.currentPhase.set('idle');
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  private getPromptContent(phase: 'intake' | 'strategy' | 'summarizer' | 'research' | 'synthesis' | 'styling' | 'validator'): string {
    switch (phase) {
      case 'intake':
        return PROMPT_CONTENT.intake;
      case 'strategy':
        return PROMPT_CONTENT.strategy;
      case 'summarizer':
        return PROMPT_CONTENT.summarizer;
      case 'research':
        return PROMPT_CONTENT.research;
      case 'validator':
        return PROMPT_CONTENT.validator;
      case 'synthesis':
        return PROMPT_CONTENT.synthesis;
      case 'styling':
        return PROMPT_CONTENT.styling;
      default:
        return '';
    }
  }
            private processQueue(): void {
                            this.loading.set(true);
        // Set an initial status message immediately upon initiating a new queue process
        if (this.currentPhase() !== 'idle' && this.statusMessage() === '') {
          this.statusMessage.set('🚀 Initiating LawGPT research...');
        }
        const messagesToSend: ChatMessage[] = [];
        let systemPromptContent: string = '';

        if (this.currentPhase() === 'research') {
          if (this.researchSubPhase() === 'sending_task_to_researcher') {
            systemPromptContent = PROMPT_CONTENT.research + '\n\nResearch Task: ' + this.currentResearchTaskContent(); // Append the current task
          } else if (this.researchSubPhase() === 'sending_research_to_validator') {
            systemPromptContent = PROMPT_CONTENT.validator + '\n\nContent to Validate: ' + this.contentToValidate(); // Append content for validator
          }
        } else if (this.currentPhase() !== 'idle') {
          systemPromptContent = this.getPromptContent(this.currentPhase() as 'intake' | 'strategy' | 'summarizer' | 'research' | 'synthesis' | 'styling' | 'validator');
        }

        // --- NEW: Modify systemPromptContent for styling phase ---
        if (this.currentPhase() === 'styling' && systemPromptContent) {
            systemPromptContent = systemPromptContent + '\n\nSynthesized Legal Brief to Style:\n' + this.synthesizedBriefContent();
        }
        // --- END NEW ---

        if (systemPromptContent) { // Only push if there's actual content
            messagesToSend.push({
                role: 'system',
                content: systemPromptContent,
                displayInChat: false
            });
        }

        // Special handling for the 'styling' phase to send only the system prompt and the synthesized brief
        if (this.currentPhase() === 'styling') {
            // No conversational history is added for the styling phase
            // The synthesizedBriefContent is already part of the systemPromptContent
            // So, we just send the system message
        } else {
            // For all other phases, include the full conversational history
            let conversationalHistory: ChatMessage[] = [];
            conversationalHistory = this.chatHistory().map(msg => ({ role: msg.role, content: msg.content }));
            messagesToSend.push(...conversationalHistory);
        }
                this.chatService.sendMessage(messagesToSend).subscribe({
                                                                          next: (rawResponse) => {
                                                                            this.loading.set(false);
                                                                            console.log('MainChatPageComponent: processQueue next received rawResponse:', rawResponse);
                                                                                            const responseBody = JSON.parse(rawResponse);
                                                                                            const aiMessageContent = responseBody.ai_message;
                                                                                            console.log('MainChatPageComponent: Extracted aiMessageContent:', aiMessageContent);
                                                      
                                                                                                            const tags = this.chatService.parseActionTags(aiMessageContent);
                                                                                                            console.log('MainChatPageComponent: processQueue parsed tags:', tags);
                                                                                                            console.log('MainChatPageComponent: Current phase:', this.currentPhase());
                                                                                                            console.log('MainChatPageComponent: inResearchMode from service:', this.chatService.getInResearchMode());
                                                      
                                                                                    
                                                      
                                                                                                            switch (this.currentPhase()) {
                                                                                                              case 'intake':
                                                                                                                const cleanedIntakeContent = this.chatService.removeActionTags(aiMessageContent).replace(this.chatService.tagRegex, '').trim();
                                                                                                                  if (tags['intake_status'] === 'done') {
                                                                                                                    console.log('MainChatPageComponent: intake_status done. Transitioning to strategy.');
                                                                                                                    this.currentPhase.set('strategy');
                                                                                                                    this.userMessage('Proceed with strategy formulation.', false);
                                                                                                                  } else {
                                                                                                                    console.log('MainChatPageComponent: Still in Intake phase. Awaiting intake_status:done or user input.');
                                                                                                                    if (cleanedIntakeContent) {
                                                                                                                      this.chatHistory.update(history => [...history, { role: 'assistant', content: cleanedIntakeContent, displayInChat: true }]);
                                                                                                                    }
                                                                                                                  }
                                                                                                                  break;
                                                        case 'strategy':
                                                            console.log('MainChatPageComponent: In strategy phase. Processing tags.');
                                                            if (tags['tasks']) {
                                                                console.log('MainChatPageComponent: Strategy phase received tasks. Transitioning to summarizer.');
                                                                // Ensure receivedTasks is an array before attempting to filter
                                                                let receivedTasks: string[] = Array.isArray(tags['tasks']) ? tags['tasks'] as string[] : [];
                                                                // Filter out any malformed tasks like "[" or incomplete JSON fragments
                                                                receivedTasks = receivedTasks.filter(task => {
                                                                    if (typeof task !== 'string' || task.trim() === '[' || task.trim() === '') {
                                                                        return false; // Filter out non-strings, empty, or just "["
                                                                    }
                                                                    // For now, simple check for "[" should catch the reported bug.
                                                                    return true;
                                                                });
                                
                                                                if (receivedTasks.length > 2) {
                                                                    receivedTasks = receivedTasks.slice(0, 2);
                                                                }
                                                                
                                                                // Ensure we have at least one valid task before setting
                                                                if (receivedTasks.length > 0) {
                                                                    this.tasks.set(receivedTasks);
                                                                    this.currentPhase.set('summarizer');
                                                                    this.userMessage('Summarize the research requirements based on the generated tasks.', false);
                                                                } else {
                                                                    console.warn('MainChatPageComponent: No valid tasks received after filtering. Retrying strategy generation.');
                                                                    this.processQueue(); // Retry strategy generation if no valid tasks
                                                                }
                                                            } else {
                                                                console.log('MainChatPageComponent: Strategy phase: No tasks received. Retrying strategy generation.');
                                                                this.processQueue();
                                                            }
                                                            break;
                                                        case 'summarizer':
                                                          console.log('MainChatPageComponent: In summarizer phase. Processing tags.');
                                                          if (tags['summary_status'] === 'finalized') {
                                                            console.log('MainChatPageComponent: Summarizer phase done. Research summary finalized. Transitioning to research.');
                                                            this.currentPhase.set('research');
                                                            this.processResearchTasks();
                                                          } else {
                                                            console.log('MainChatPageComponent: Summarizer phase: Awaiting summary_status: "finalized". Retrying summarization.');
                                                            this.processQueue();
                                                          }
                                                          break;
                                                        case 'research':
                                                          console.log('MainChatPageComponent: In research phase. Calling handleResearchStep.');
                                                          this.handleResearchStep(aiMessageContent, aiMessageContent, tags);
                                                          break;
                                                        case 'synthesis':
                                                          console.log('MainChatPageComponent: In synthesis phase. Processing tags.');
                                                          if (tags['synthesis_status'] === 'done') {
                                                            console.log('MainChatPageComponent: Synthesis phase done. Transitioning to Styling.');
                                                            // Assume aiMessageContent at this point contains the synthesized brief
                                                            this.synthesizedBriefContent.set(aiMessageContent); // Store the synthesized brief
                                                            this.currentPhase.set('styling');
                                                            this.processQueue(); // Call processQueue to send the system message for styling
                                                          } else {
                                                            console.log('MainChatPageComponent: Synthesis phase: Awaiting synthesis_status: "done". Retrying synthesis.');
                                                            this.processQueue();
                                                          }
                                                          break;
                                                        case 'styling':
                                                          console.log('MainChatPageComponent: In styling phase.');
                                                          if (!tags['render_status'] || tags['render_status'] !== 'final') {
                                                            console.log('MainChatPageComponent: Styling phase: Awaiting render_status: "final". Retrying styling.');
                                                            this.processQueue();
                                                          } else {
                                                            console.log('MainChatPageComponent: Styling phase done. Render status final processed by subscription.');
                                                          }
                                                          break;
                                                      }
                                                    },
                                            error: (error) => {
                                              console.error('Unhandled error in MainChatPageComponent processQueue subscribe:', error);
                                              this.loading.set(false);
                                              this.currentPhase.set('idle');
                                            }
                    });
      }
    private processResearchTasks(): void {
      const tasks = this.tasks();
      const currentIndex = this.currentTaskIndex();
      if (currentIndex < tasks.length) {
        const currentTask = tasks[currentIndex];
        switch (this.researchSubPhase()) {
          case 'idle':
          case 'awaiting_validation_response':
            this.statusMessage.set(`🔎 Researching task ${currentIndex + 1}/${tasks.length}: ${currentTask}...`);
            if (currentTask && currentTask.trim() !== '[' && currentTask.trim() !== '') {
              this.currentResearchTaskContent.set(currentTask); // Set the signal with the current task
              this.researchSubPhase.set('sending_task_to_researcher');
              this.processQueue(); // Call processQueue to send the system message with the task
            } else {
              console.warn(`Skipping malformed or empty task: "${currentTask}"`);
              this.currentTaskIndex.update(index => index + 1);
              this.researchSubPhase.set('idle');
              this.processResearchTasks();
            }
            break;
          case 'awaiting_research_response':
            this.statusMessage.set(`⚖️ Validating research for task ${currentIndex + 1}/${tasks.length}...`);
            const researcherOutputMsg = this.chatHistory().findLast(
                (msg: ChatMessage) => msg.role === 'assistant' && msg.needsValidation && !msg.displayInChat
            );
            if (researcherOutputMsg) {
                this.contentToValidate.set(researcherOutputMsg.content); // Store content for validator
            } else {
                console.warn('No researcher output found for validation. Proceeding without specific content.');
                this.contentToValidate.set(''); // Ensure it's empty if no content found
            }
            this.researchSubPhase.set('sending_research_to_validator');
            this.processQueue();
            break;
        }
      } else {
        this.currentPhase.set('synthesis');
        // Construct a cleaner input for the synthesis prompt.
        // Provide the high-level goal and only the clean, validated results.
        const cleanFragments = this.validatedResearchFragments()
                                   .map(f => `--- Validated Data Fragment ---\n${this.chatService.removeActionTags(f.result)}`)
                                   .join('\n\n');

        const synthesisContent = `
Research Goal: ${this.researchSummary()}

Validated Data Fragments:
${cleanFragments}
`;
        this.userMessage(synthesisContent, false);
      }
    }
  private async handleResearchStep(aiMessage: string, cleanedContent: string, tags: { [key: string]: string | string[] | Record<string, any> }): Promise<void> {
    const currentIndex = this.currentTaskIndex();
    const currentTask = this.tasks()[currentIndex];
    if (tags['action'] === 'web_search' && typeof tags['query'] === 'string' && this.researchSubPhase() === 'sending_task_to_researcher') {
      const searchQuery = tags['query'];
      this.researchSubPhase.set('web_searching');
      this.statusMessage.set(`🌐 Performing simulated web search for "${searchQuery}"...`);
      await new Promise(resolve => setTimeout(resolve, 1500));
      const simulatedResults = {
        query: searchQuery,
        results: [
          { title: "Simulated Case 1: " + searchQuery, url: "http://example.com/case1", snippet: "This is a simulated snippet for case 1 related to " + searchQuery + ". Lorem ipsum dolor sit amet." },
          { title: "Simulated Case 2: " + searchQuery, url: "http://example.com/case2", snippet: "Another simulated snippet for case 2 on " + searchQuery + ". Consectetur adipiscing elit." }
        ]
      };
      const webSearchResultsContent = `[WEB_SEARCH_RESULTS: ${JSON.stringify(simulatedResults)}]`;
      this.researchSubPhase.set('web_search_done');
      this.statusMessage.set(`✅ Web search complete for "${searchQuery}". Processing results...`);
      this.userMessage(webSearchResultsContent, false);
      return;
    }
    if (this.researchSubPhase() === 'web_search_done') {
        this.chatHistory.update(history => [...history, { role: 'assistant', content: cleanedContent, needsValidation: true, displayInChat: false }]);
        this.researchSubPhase.set('awaiting_research_response');
        this.processResearchTasks();
        return;
    }
    switch (this.researchSubPhase()) {
      case 'sending_task_to_researcher':
        this.chatHistory.update(history => [...history, { role: 'assistant', content: cleanedContent, needsValidation: true, displayInChat: false }]);
        this.researchSubPhase.set('awaiting_research_response');
        this.processResearchTasks();
        break;
      case 'sending_research_to_validator':
        if (tags['validation_status'] === 'verified' || tags['validation_status'] === 'corrected') {
          const finalResearchContent = cleanedContent;
          this.chatHistory.update(history => {
            const updatedHistory = [...history];
            const researcherMessageIndex = updatedHistory.findLastIndex(
              (msg: ChatMessage) => msg.role === 'assistant' && msg.needsValidation === true && msg.displayInChat === false
            );
            if (researcherMessageIndex !== -1) {
              updatedHistory[researcherMessageIndex] = {
                role: 'assistant',
                content: finalResearchContent,
                needsValidation: false,
                validationStatus: tags['validation_status'] as 'verified' | 'corrected',
                displayInChat: false
              };
            }
            return updatedHistory;
          });
          this.validatedResearchFragments.update(fragments => [...fragments, { task: currentTask, result: finalResearchContent, validationStatus: tags['validation_status'] as 'verified' | 'corrected' }]);
          this.currentTaskIndex.update(index => index + 1);
          this.researchSubPhase.set('idle');
          this.processResearchTasks();
        } else {
          const unvalidatedResearcherOutput = this.chatHistory().findLast(
            (msg: ChatMessage) => msg.role === 'assistant' && msg.needsValidation === true && msg.displayInChat === false
          )?.content;
          if (unvalidatedResearcherOutput) {
            this.validatedResearchFragments.update(fragments => [...fragments, { task: currentTask, result: unvalidatedResearcherOutput, validationStatus: 'unverified' }]);
          }
          this.currentTaskIndex.update(index => index + 1);
          this.researchSubPhase.set('idle');
          this.processResearchTasks();
        }
        break;
      default:
        this.currentTaskIndex.update(index => index + 1);
        this.researchSubPhase.set('idle');
        this.processResearchTasks();
        break;
    }
  }
  userMessage(content: string, displayInChat: boolean = true): void {
    const newHistory = [...this.chatHistory(), { role: 'user', content: content, displayInChat: displayInChat } as ChatMessage];
    this.chatHistory.set(newHistory);
    this.processQueue();
  }

  startNewResearch(): void {
    this.chatHistory.set([]);
    this.chatHistory.update(history => [...history, {
      role: 'assistant',
      content: 'Hello! I am LawGPT, your AI legal research assistant. Tell me what you need regarding Philippine law.',
      displayInChat: true
    }]);
    this.finalRenderedHtml.set(null);
    this.currentPhase.set('intake');
    this.loading.set(false);
    this.statusMessage.set('');
    this.researchMode.set(false);
    this.tasks.set([]);
    this.currentTaskIndex.set(0);
    this.researchSubPhase.set('idle');
  }
}