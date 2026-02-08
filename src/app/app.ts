import { Component, signal, OnInit, SecurityContext, OnDestroy } from '@angular/core'; // Added OnDestroy
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { RouterOutlet } from '@angular/router';
// import { AiTestComponent } from './ai-test/ai-test'; // Removed AiTestComponent as it is not used
import { LoadingStream } from './loading-stream/loading-stream';
import { ChatInput } from './chat-input/chat-input';
import { ChatHistory } from './chat-history/chat-history';
import { ChatService } from './chat.service';
import { retry, catchError, timer, throwError, Subscription } from 'rxjs'; // Added Subscription

// Define a ChatMessage interface for better type safety
export interface ChatMessage {
  role: 'user' | 'system' | 'assistant';
  content: string;
  needsValidation?: boolean;
  validationStatus?: 'verified' | 'corrected';
  isValidatorResponse?: boolean; // Added for debugging, might not be needed in final version
  displayInChat?: boolean; // New property
  isFinalHtml?: boolean; // Added for final HTML output
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [LoadingStream, ChatInput, ChatHistory], // Removed AiTestComponent from imports
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit, OnDestroy { // Added OnDestroy
  protected readonly title = signal('temp-angular-app');
  loading = signal(false);
  statusMessage = signal('');
  chatHistory = signal<ChatMessage[]>([]); // Use ChatMessage interface
  currentPhase = signal<'intake' | 'strategy' | 'summarizer' | 'research' | 'synthesis' | 'styling' | 'validator' | 'idle'>('intake'); // Added 'validator' and 'idle'
  tasks = signal<string[]>([]);
  researchSummary = signal<string>('');
  validatedResearchFragments = signal<any[]>([]);
  currentTaskIndex = signal<number>(0);
  researchSubPhase = signal<'idle' | 'sending_task_to_researcher' | 'awaiting_research_response' | 'sending_research_to_validator' | 'awaiting_validation_response' | 'web_searching' | 'web_search_done'>('idle');
  finalRenderedHtml = signal<string | null>(null); // Changed to null

  researchMode = signal<boolean>(false); // NEW: To track research mode
  readonly totalPhases = 6; // NEW: Total number of main research phases

  private subscriptions = new Subscription(); // To manage subscriptions

  constructor(private chatService: ChatService, private sanitizer: DomSanitizer) {}

  getSafeHtml(): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.finalRenderedHtml() || '');
  }

  // New method to process citations and replace markers with styled HTML
  private processCitations(content: string): string {
    const citationRegex = /\[\[CITATION:\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*(.+?)\]\]/g;
    return content.replace(citationRegex, (match, grNo, petitioner, date, division, syllabus) => {
                // We assume content from AI for citation components is trusted to avoid over-sanitization.
                // Angular's default HTML sanitization for [innerHTML] will still apply to the overall generated HTML.
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
        // Chat history is no longer cleared here; it will be hidden by app.html conditional rendering.
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
        if (html) { // Only attempt to parse if html is not null
          try {
            const responseBody = JSON.parse(html);
            if (responseBody && typeof responseBody.ai_message === 'string') {
              finalMessageContent = responseBody.ai_message;
            }
          } catch (e) {
            // console.warn('App: Could not parse finalHtmlOutput as JSON. Treating as plain message.', e); // Removed debug log
          }
        }
        
        this.finalRenderedHtml.set(finalMessageContent);
                    if (finalMessageContent) {
                      this.currentPhase.set('idle'); // Research is done
                      this.loading.set(false); // Stop loading
                      this.statusMessage.set('Research complete!'); // Final status message
                    }
                  })
                );
            this.subscriptions.add(
      this.chatService.aiError$.subscribe(error => {
        if (error) { // Only process if there's an actual error
          console.error('AI Error detected in app.component:', error);
          this.loading.set(false);
          this.statusMessage.set('🚨 AI communication failed. Please check the console for details.');
          this.currentPhase.set('idle'); // Reset phase on critical error
        }
      })
    );
    // The actual system prompt for the AI will be dynamically added when processQueue is called.
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
  private getPromptContent(phase: 'intake' | 'strategy' | 'summarizer' | 'research' | 'synthesis' | 'styling' | 'validator'): string { // Added 'validator'
    switch (phase) {
      case 'intake':
        return `
**Internal Persona:** Gerry Spence | **Public Identity:** LawGPT

> **System Message:** You are **LawGPT**, a Senior Legal Intake Specialist for Philippine Law, and a supportive guide for students.
> **Instructions:**
> * You have **live, unrestricted access to the web**. Do not mention knowledge cutoffs. If a query requires the most recent data, use your search tool immediately.
> * Evaluate the student's request for Philippine Jurisdiction, specific legal questions, and key facts.
> * **Tone:** Adopt an encouraging, clear, and supportive tone suitable for a student researcher. Think of yourself as a helpful "study buddy."
> * If major info is missing, ask 1-3 concise questions. Frame them simply and clearly. For example, instead of "Provide further details for disambiguation," use "To help me find exactly what you need, could you share a bit more about...?" or "What specific area of law are you exploring?"
> * **Output Format:**
> * Always start with \`[status_message: "🧠 Evaluating your request for legal clarity in Philippine Jurisprudence..."]\`
> * When ready to proceed meaning we got major information usually one chat exchange, include \`[intake_status: "done"]\`
        `;
      case 'strategy':
        return `
**Internal Persona:** Clarence Darrow | **Public Identity:** LawGPT

> **System Message:** You are **LawGPT**, the Master Strategist for Philippine Supreme Court litigation.
> **Instructions:**
> * Map out a research plan. You **must** prioritize web searching for the most recent decisions, circulars, or resolutions available up to the current date.
> * Return a JSON-style array of tasks.
> * **Constraint:** Generate strictly **2 concise research tasks** to optimize processing time.
> * **Output Format:**
> * Always start with \`[status_message: "🗺️ Mapping out the research strategy for Philippine SC dependencies..."]\`
> * Wrap the tasks: \`[tasks: ["Task A", "Task B", ...]]\`
        `;
      case 'summarizer':
        return `
**Internal Persona:** The Architect | **Public Identity:** LawGPT

> **System Message:** You are **LawGPT**, the Architect.
> **Instructions:**
> * Review the initial intake and the generated strategy.
> * **Objective:** Summarize the conversation into a "Full Research Requirements" document. This document must serve as the "Single Source of Truth" for the subsequent research loop.
> * **Output Format:**
> * Always start with \`[status_message: "📋 Summarizing full research requirements and legal scope..."]\`
> * Provide the summary then end with \`[summary_status: "finalized"]\`
        `;
      case 'research':
        // Prompt 3: The Researcher
        return `
**Internal Persona:** Thurgood Marshall | **Public Identity:** LawGPT

> **System Message:** You are **LawGPT**, the Deep-Dive Researcher.
> **Instructions:**
> * You will be given **one specific task** from the research requirements (e.g., "Search for X").
> * **Phase 1: Web Search Query Generation:** Your primary action is to generate a **web search query**.
>   * **Output Format (Phase 1):**
>     * Always start with \`[status_message: "🔎 Preparing web search query for task: {TaskName}..."]\`
>     * Immediately follow with the action tag: \`[action: "web_search", query: "Your precise search query here"]\`
> * **Phase 2: Process Web Search Results:** After emitting a web search query, you will receive results in the format \`[WEB_SEARCH_RESULTS: "..." ]\`.
>   * **Your task in Phase 2:** Analyze the provided \`WEB_SEARCH_RESULTS\` and extract the most relevant G.R. Numbers, Case Captions, Dates of Decision, and key findings.
>   * **Output Format (Phase 2):**
>     * Always start with \`[status_message: "📚 Analyzing web search results for task: {TaskName} and extracting key findings..."]\`
>     * Provide the raw findings/citations based on the \`WEB_SEARCH_RESULTS\`. Be concise and direct.
> * **Strict Constraint:** NEVER mention or ask about "web access", "browser", "live search capabilities", or "external tools". Assume these are handled by the system after you emit the action tag.
> * **Strict Constraint:** DO NOT provide findings or citations in Phase 1. Only emit the web search action tag. DO NOT emit web search action tags in Phase 2.
        `;
      case 'validator':
        // Prompt 4: The Validator
        return `
**Internal Persona:** Ruth Bader Ginsburg | **Public Identity:** LawGPT

> **System Message:** You are **LawGPT**, the Meticulous Auditor.
> **Instructions:**
> * Review the research findings just provided.
> * **Search Priority:** Cross-check the G.R. No. and Case Caption against the Philippine SC E-Library or official news.
> * **Correction Logic:** If any data is hallucinated or outdated, **replace it immediately** with the correct data.
> * **Output Format:**
> * Always start with \`[status_message: "⚖️ Auditing research findings for accuracy and correcting discrepancies..."]\`
> * If correct: \`[status_message: "✅ Research findings verified for accuracy."]\` then \`[validation_status: "verified"]\` followed by the clean data.
> * If corrected: \`[status_message: "🔄 Discrepancies found and corrected in research findings."]\` then \`[validation_status: "corrected"]\` followed by the updated/fixed data.
        `;
      case 'synthesis':
        // Prompt 5: The Master Compiler (The Writer)
        return `
**Internal Persona:** Oliver Wendell Holmes Jr. | **Public Identity:** LawGPT

> **System Message:** You are **LawGPT**, the Lead Attorney.
> **Instructions:**
> * You will be provided with the "Full Research Requirements" summary and the collection of **validated/corrected research fragments** from the search loop.
> * **Objective:** Synthesize all these separate findings into one cohesive, comprehensive Professional Legal Brief.
> * Ensure the legal theory flows logically and that all G.R. Numbers are integrated into the narrative.
> * **Constraint:** Maintain high authority. Do not mention "research steps" or the "loop process."
> * **Output Format:**
> * Always start with \`[status_message: "🖋️ Compiling and synthesizing all validated research into a final legal brief..."]\`
> * Provide the complete Markdown text.
> * End with \`[synthesis_status: "done"]\`
        `;
      case 'styling':
        // Prompt 6: The Clerk (The Stylist)
        return `
**Internal Persona:** Legal Clerk | **Public Identity:** LawGPT

> **System Message:** You are **LawGPT**, a Legal Clerk and UI Designer.
> **Instructions:**
> * Transform the provided legal brief into a professional web document.
> * **Mandatory Constraint:** Your response must contain **ONLY** the semantically structured content. Do not include introductory text, explanations, or concluding remarks. If it is not part of the content structure, do not output it.
> * **Prioritization:** Content integrity is paramount. Ensure the full legal brief content is returned.
> * **Styling Guidance:**
>   * Use standard Markdown or minimal, semantic HTML tags (e.g., \`<h2>\`, \`<p>\`, \`<ul>\`, \`<strong>\`, \`<em>\`) for content structure.
>   * **DO NOT apply any Tailwind CSS classes for styling within the brief. The application provides its own base styles for semantic HTML elements.**
>   * **Citations:** Identify Philippine Citations using a clear, consistent, and easily parsable textual marker. Format them as: \`[[CITATION: G.R. No. 123456 | Petitioner v. Respondent | Date | Division/En Banc | Short Syllabus/Holding...]]\`
>   * **Emoji Icons:** For headings or key points, use relevant emojis and make them visually prominent. E.g., \`<h2>🏛️ Heading One</h2>\`. (Remove the \`text-2xl\` Tailwind class example as it won't be used by the AI).
> * **Strict Constraint (Regex Leak Prevention):** Strictly avoid generating any unmatched square brackets (\`[\` or \`]\`) within the content. Ensure the output is valid, well-formed HTML/Markdown.
> * **Output Format:**
> * Start with \`[status_message: "✨ Applying professional styling and formatting for the final review..."]\`
> * Immediately follow with the semantically structured content in **valid HTML fragment format (do NOT include \`<!DOCTYPE>\`, \`<html>\`, \`<head>\`, or \`<body>\` tags).**
> * End with \`[render_status: "final"]\`
        `;
      default:
        return '';
    }
  }



            private processQueue(): void {



                            this.loading.set(true);



              



                            const messagesToSend: ChatMessage[] = [];



    



        // 1. Always prepend the system message for the current phase to the AI request



        if (this.currentPhase() !== 'idle') {



          messagesToSend.push({



            role: 'system',



            content: this.getPromptContent(this.currentPhase() as 'intake' | 'strategy' | 'summarizer' | 'research' | 'synthesis' | 'styling' | 'validator'),



            displayInChat: false // This message is internal for the AI, not for user display



          });



        }



    



                // 2. Add conversational history based on the current phase and sub-phase



    



                let conversationalHistory: ChatMessage[] = [];



    



        



    



                // For all phases, include all messages from chatHistory.



    



                // The AI needs the full context, regardless of whether it's displayed to the user.



    



                conversationalHistory = this.chatHistory().map(msg => ({ role: msg.role, content: msg.content }));



    



        
                // Special handling for research phase when sending researcher's output to validator



                // This is a specific scenario where a previous AI response (researcher's output)



                // needs to be presented as a 'user' message to the validator AI.



                // We ensure it's not duplicated if already in chatHistory.



                if (this.currentPhase() === 'research' && this.researchSubPhase() === 'sending_research_to_validator') {



                    const researcherOutputMsg = this.chatHistory().findLast(



                        (msg: ChatMessage) => msg.role === 'assistant' && msg.needsValidation && !msg.displayInChat



                    );



                    if (researcherOutputMsg) {



                        // Ensure this specific message is at the end of the history as the 'user' input for the validator



                        // and avoid duplication if it's already there from a previous iteration.



                        conversationalHistory = conversationalHistory.filter(msg => msg.content !== researcherOutputMsg.content);



                        conversationalHistory.push({ role: 'user', content: researcherOutputMsg.content });



                    } else {



                        // console.error("Error: No researcher output found to send to validator. Aborting AI request."); // Removed console.error



                        this.loading.set(false);



                        return;



                    }



                }



    



        
                messagesToSend.push(...conversationalHistory);



    



        // console.log('Messages being sent to AI:', messagesToSend); // Removed console.log



    



                this.chatService.sendMessage(messagesToSend).subscribe({



    



                                                                          next: (rawResponse) => { // response is now rawResponse string



    



                                                                            this.loading.set(false); // Hide main loading overlay once any response is received



    



                                                                            console.log('App: processQueue next received rawResponse:', rawResponse);



    



                                                                                                            const responseBody = JSON.parse(rawResponse); // Parse the rawResponse string into a JSON object



    



                                                                                                            const aiMessageContent = responseBody.ai_message; // Extract the actual ai_message content



    



                                                                                                            console.log('App: Extracted aiMessageContent:', aiMessageContent);



    



                                                      



    



                                                                                                            const tags = this.chatService.parseActionTags(aiMessageContent);



    



                                                                                                            console.log('App: processQueue parsed tags:', tags);



    



                                                                                                            console.log('App: Current phase:', this.currentPhase());



    



                                                                                                            console.log('App: inResearchMode from service:', this.chatService.getInResearchMode()); // Check service state



    



                                                      



    



                                                                                    



    



                                                      



    



                                                                                                            // --- Phase Transition Logic ---



    



                                                      



    



                                                                                                            switch (this.currentPhase()) {



    



                                                                                                              case 'intake':



    



                                                                                                                // Clean the raw response text before displaying, ensuring only conversational content



    



                                                                                                                const cleanedIntakeContent = this.chatService.removeActionTags(aiMessageContent).replace(this.chatService.tagRegex, '').trim();



    



                                                        



    



                                                                                                                  if (tags['intake_status'] === 'done') {



    



                                                                                                                    console.log('App: intake_status done. Transitioning to strategy.');



    



                                                                                                                    this.currentPhase.set('strategy');



    



                                                                                                                    this.userMessage('Proceed with strategy formulation.', false); // internal message



    



                                                                                                                  } else {



    



                                                                                                                    console.log('App: Still in Intake phase. Awaiting intake_status:done or user input.');



    



                                                                                                                    // If AI provides content (clarifying questions) and not yet done, add to history



    



                                                                                                                    if (cleanedIntakeContent) {



    



                                                                                                                      this.chatHistory.update(history => [...history, { role: 'assistant', content: cleanedIntakeContent, displayInChat: true }]);



    



                                                                                                                    }



    



                                                                                                                  }



    



                                                                                                                  break;



    



                                                        case 'strategy':



    



                                                            console.log('App: In strategy phase. Processing tags.');



    



                                                            if (tags['tasks']) {



    



                                                                console.log('App: Strategy phase received tasks. Transitioning to summarizer.');



    



                                                                let receivedTasks = tags['tasks'] as string[];



    



                                                                if (receivedTasks.length > 2) {



    



                                                                    receivedTasks = receivedTasks.slice(0, 2);



    



                                                                }



    



                                                                this.tasks.set(receivedTasks);



    



                                                                this.currentPhase.set('summarizer');



    



                                                                this.userMessage('Summarize the research requirements based on the generated tasks.', false); // internal message



    



                                                            } else {



    



                                                                console.log('App: Strategy phase: No tasks received. Retrying strategy generation.');



    



                                                                this.processQueue(); // Retry strategy generation if no tasks



    



                                                            }



    



                                                            break;



    



                                                        case 'summarizer':



    



                                                          console.log('App: In summarizer phase. Processing tags.');



    



                                                          if (tags['summary_status'] === 'finalized') {



    



                                                            console.log('App: Summarizer phase done. Research summary finalized. Transitioning to research.');



    



                                                            // Note: The actual summary content is now managed internally by chatService history or buffered.



    



                                                            // We don't explicitly set researchSummary = newContent here from rawResponse.



    



                                                            this.currentPhase.set('research');



    



                                                            this.processResearchTasks(); // Start the research loop



    



                                                          } else {



    



                                                            console.log('App: Summarizer phase: Awaiting summary_status: "finalized". Retrying summarization.');



    



                                                            this.processQueue(); // Retry summarization



    



                                                          }



    



                                                          break;



    



                                                        case 'research':



    



                                                          console.log('App: In research phase. Calling handleResearchStep.');



    



                                                          this.handleResearchStep(aiMessageContent, aiMessageContent, tags); // Pass aiMessageContent twice



    



                                                          break;



    



                                                        case 'synthesis':



    



                                                          console.log('App: In synthesis phase. Processing tags.');



    



                                                          if (tags['synthesis_status'] === 'done') {



    



                                                            console.log('App: Synthesis phase done. Transitioning to Styling.');



    



                                                            this.currentPhase.set('styling');



    



                                                            this.userMessage('Proceed to styling using the compiled legal brief.', false); // internal message



    



                                                          } else {



    



                                                            console.log('App: Synthesis phase: Awaiting synthesis_status: "done". Retrying synthesis.');



    



                                                            this.processQueue();



    



                                                          }



    



                                                          break;



    



                                                        case 'styling':



    



                                                          console.log('App: In styling phase.');



    



                                                          // The final HTML is handled by chatService.finalHtmlOutput$ subscription in ngOnInit



    



                                                          // This case should ideally not perform direct chatHistory updates or finalRenderedHtml.set()



    



                                                          // as it's handled by the subscription.



    



                                                          // The AI will emit [render_status: "final"] which chatService will catch and then emit to finalHtmlOutput$.



    



                                                          // The app.ts subscription will then update finalRenderedHtml.



    



                                                          // So if we reach here, it means [render_status: "final"] wasn't emitted yet.



    



                                                          // If the AI did not return render_status: "final", we retry the styling prompt.



    



                                                          if (!tags['render_status'] || tags['render_status'] !== 'final') {



    



                                                            console.log('App: Styling phase: Awaiting render_status: "final". Retrying styling.');



    



                                                            this.processQueue(); // Retry styling until final



    



                                                          } else {



    



                                                            console.log('App: Styling phase done. Render status final processed by subscription.');



    



                                                            // No explicit phase transition here; subscription to finalHtmlOutput$ handles idle transition.



    



                                                          }



    



                                                          break;



    



                                                      }



    



                                                    },



                                            error: (error) => {



                                              // This error block will catch errors re-thrown by ChatService or other unhandled errors.



                                              // The primary error display is handled by the aiError$ subscription in ngOnInit.



                                              // This is a fallback to ensure loading state is reset and any unhandled errors are logged.



                                              console.error('Unhandled error in App component processQueue subscribe:', error);



                                              this.loading.set(false); // Ensure loading is off



                                              // The status message will be set by aiError$ subscription or already be set



                                              this.currentPhase.set('idle'); // Reset phase



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
          case 'awaiting_validation_response': // After a task is validated, move to next task
            this.statusMessage.set(`🔎 Researching task ${currentIndex + 1}/${tasks.length}: ${currentTask}...`);
            // Prepare chat history for Researcher (Prompt 3)
            // Construct messages for the researcher. The last user message will be the task itself.
                      // The system message and user message for the researcher will be constructed by processQueue.
                      // This method only needs to set the state and trigger the queue.
                      this.userMessage(currentTask, false); // Internal user message, not displayed.
                      this.researchSubPhase.set('sending_task_to_researcher');            break;
  
          case 'awaiting_research_response':
            // This state is set from handleResearchStep after receiving researcher's response.
            // It implies we need to send the researcher's response to the validator.
            // The current `chatHistory` already contains the researcher's response as an assistant message.
            // We need to change the system prompt to the validator's.
            this.statusMessage.set(`⚖️ Validating research for task ${currentIndex + 1}/${tasks.length}...`);
            
            // The system message for the validator will be constructed by processQueue.
            // The researcher's output will be dynamically picked up by processQueue as the 'user' message for the validator.
            this.researchSubPhase.set('sending_research_to_validator');
            this.processQueue(); // Trigger AI with validator prompt
            break;
          // The `sending_task_to_researcher` and `sending_research_to_validator` states
          // are intermediary and will be handled by `handleResearchStep` when the AI responds.
        }
      } else {
        // console.log('All research tasks completed. Transitioning to Synthesis.'); // Removed console.log
        this.currentPhase.set('synthesis');
        // Prepare content for the synthesis prompt
        const synthesisContent = `
Here is the full research requirements summary:
${this.researchSummary()}

Here are the validated research fragments:
${this.validatedResearchFragments().map(f => `Task: ${f.task}\nResult: ${f.result}\nStatus: ${f.validationStatus}`).join('\n\n')}
`;
        this.userMessage(synthesisContent, false); // Trigger AI for synthesis with internal user message.
      }
    }  
  // New method to handle responses during the research phase
  private async handleResearchStep(aiMessage: string, cleanedContent: string, tags: { [key: string]: string | string[] }): Promise<void> {
    const currentIndex = this.currentTaskIndex();
    const currentTask = this.tasks()[currentIndex];

    // --- NEW LOGIC: Check for web_search action tag FIRST ---
    // This state means the AI (Researcher) has just provided an AI message in response to a task
    // and we expect it to contain an [action: "web_search"] tag.
    if (tags['action'] === 'web_search' && typeof tags['query'] === 'string' && this.researchSubPhase() === 'sending_task_to_researcher') {
      const searchQuery = tags['query'];
      // console.log(`Web search requested by AI for task ${currentIndex + 1}: "${searchQuery}"`); // Removed console.log

      this.researchSubPhase.set('web_searching');
      this.statusMessage.set(`🌐 Performing simulated web search for "${searchQuery}"...`);

      // Simulate asynchronous web search
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call delay

      const simulatedResults = {
        query: searchQuery,
        results: [
          { title: "Simulated Case 1: " + searchQuery, url: "http://example.com/case1", snippet: "This is a simulated snippet for case 1 related to " + searchQuery + ". Lorem ipsum dolor sit amet." },
          { title: "Simulated Case 2: " + searchQuery, url: "http://example.com/case2", snippet: "Another simulated snippet for case 2 on " + searchQuery + ". Consectetur adipiscing elit." }
        ]
      };

      // console.log('Simulated web search results:', simulatedResults); // Removed console.log

      // Now, feed these results back to the AI for it to process
      // We send it as an internal user message, representing the output of the tool.
      // The AI's next turn will be based on this "WEB_SEARCH_RESULTS" input.
      const webSearchResultsContent = `[WEB_SEARCH_RESULTS: ${JSON.stringify(simulatedResults)}]`;

      // Update state to reflect search is done and results are ready to be sent to AI
      this.researchSubPhase.set('web_search_done');
      this.statusMessage.set(`✅ Web search complete for "${searchQuery}". Processing results...`);

      // Trigger the queue again, the AI will receive this as its "user" input in its next turn.
      // The currentPhase is still 'research'.
      // The AI needs to know to interpret [WEB_SEARCH_RESULTS: ...] and then produce its findings.
      this.userMessage(webSearchResultsContent, false); // Internal user message with results
      return; // Exit handleResearchStep after initiating web search and feeding back
    } // End of web search action handling if block

    // --- LOGIC FOR AI RESPONSE *AFTER* WEB SEARCH RESULTS ARE FED (Researcher's turn to process results) ---
    // This state means the AI has just received web search results from the frontend
    // and its current response should be the actual raw findings/citations (Prompt 3's ultimate goal).
    if (this.researchSubPhase() === 'web_search_done') {
        // console.log('handleResearchStep: before chatHistory.update, displayInChat will be:', false); // Removed console.log
        this.chatHistory.update(history => [...history, { role: 'assistant', content: cleanedContent, needsValidation: true, displayInChat: false }]);
        this.researchSubPhase.set('awaiting_research_response'); // Ready for validation
        this.processResearchTasks();
        return;
    }

    switch (this.researchSubPhase()) {
      case 'sending_task_to_researcher': // Received response from Researcher (Prompt 3)
        // Add Researcher's raw response to chat history, with a flag indicating it needs validation.
        this.chatHistory.update(history => [...history, { role: 'assistant', content: cleanedContent, needsValidation: true, displayInChat: false }]);
        this.researchSubPhase.set('awaiting_research_response'); // State indicates we received research, now need to validate
        this.processResearchTasks(); // Immediately trigger sending to validator (via next call to processQueue)
        break;

      case 'sending_research_to_validator': // Received response from Validator (Prompt 4)
        // This is the validator's output, it needs to be processed to potentially correct researcher's output.
        // We do NOT add validator's raw message to chat history as a final message.
        // Its purpose is to check and modify the previous researcher's entry.

        if (tags['validation_status'] === 'verified' || tags['validation_status'] === 'corrected') {
          // console.log(`Task ${currentIndex + 1} validated: ${tags['validation_status']}`); // Removed console.log
          
          const finalResearchContent = cleanedContent; // This is the verified/corrected content from validator

          // Find the Researcher's message in chatHistory that needs validation and update it
          this.chatHistory.update(history => {
            const updatedHistory = [...history];
            // Look for the last assistant message that needs validation (this should be the researcher's output)
            const researcherMessageIndex = updatedHistory.findLastIndex(
              (msg: ChatMessage) => msg.role === 'assistant' && msg.needsValidation === true && msg.displayInChat === false
            );

            if (researcherMessageIndex !== -1) {
              updatedHistory[researcherMessageIndex] = { 
                role: 'assistant', 
                content: finalResearchContent, 
                needsValidation: false, // Mark as validated
                validationStatus: tags['validation_status'] as 'verified' | 'corrected', // Store validation status
                displayInChat: false // Ensure it remains hidden
              };
              // console.log(`Researcher's output for task ${currentIndex + 1} updated with validation status: ${tags['validation_status']}`); // Removed console.log
            }
            return updatedHistory;
          });

          this.validatedResearchFragments.update(fragments => [...fragments, { task: currentTask, result: finalResearchContent, validationStatus: tags['validation_status'] as 'verified' | 'corrected' }]);
          this.currentTaskIndex.update(index => index + 1); // Move to next task
          this.researchSubPhase.set('idle'); // Reset for next task, it will become 'awaiting_validation_response' in processResearchTasks
          this.processResearchTasks(); // Move to next task or synthesis
        } else {
          // --- NEW LOGIC: One strike and move on for validation ---
          // console.warn(`Validation failed for task ${currentIndex + 1}. Moving to next task.`); // Removed console.warn
          // Accept the unvalidated researcher's output and move on.
          // This ensures progress and token saving.
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
        // console.warn('Unknown research sub-phase or unexpected AI response:', this.researchSubPhase()); // Removed console.warn
        // Should not happen if state machine is well-managed.
        this.currentTaskIndex.update(index => index + 1); // Advance to prevent infinite loop
        this.researchSubPhase.set('idle');
        this.processResearchTasks();
        break;
    }
  }
  


  userMessage(content: string, displayInChat: boolean = true): void {
    const newHistory = [...this.chatHistory(), { role: 'user', content: content, displayInChat: displayInChat } as ChatMessage]; // Explicitly cast
    this.chatHistory.set(newHistory);
    this.processQueue();
  }

  // New method to start a new research session
  startNewResearch(): void {
    this.chatHistory.set([]); // Clear existing history
    this.chatHistory.update(history => [...history, {
      role: 'assistant',
      content: 'Hello! I am LawGPT, your AI legal research assistant. Tell me what you need regarding Philippine law.',
      displayInChat: true
    }]);
    this.finalRenderedHtml.set(null); // Clear final output
    this.currentPhase.set('intake'); // Reset phase
    this.loading.set(false); // Ensure loading is off
    this.statusMessage.set(''); // Reset status message
    this.researchMode.set(false); // Exit research mode
    // Reset other research-related signals if necessary, e.g., tasks, currentTaskIndex
    this.tasks.set([]);
    this.currentTaskIndex.set(0);
    this.researchSubPhase.set('idle');
  }
}