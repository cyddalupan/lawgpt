import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChatHistory } from './chat-history';
import { DomSanitizer, SafeHtml, SecurityContext } from '@angular/platform-browser';
import { CommonModule } from '@angular/common';
import { ChatMessage } from '../app'; // Import ChatMessage interface

// Mock the global 'marked' object for testing environment
const mockMarked = {
  parse: (markdown: string) => {
    let html = markdown;
    html = html.replace(/^##\s*(.*)$/gm, '<h2>$1</h2>'); // Headings
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
    html = html.replace(/_(.*?)_/g, '<em>$1</em>'); // Italic
    html = html.split('\n').map(p => p.trim() ? `<p>${p}</p>` : '').join(''); // Basic paragraphs
    return html;
  }
};
(window as any).marked = mockMarked; // Assign to global window scope for the test

describe('ChatHistory', () => {
  let component: ChatHistory;
  let fixture: ComponentFixture<ChatHistory>;
  let sanitizer: DomSanitizer; // Keep reference to the actual sanitizer

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChatHistory, CommonModule],
      // Provide DomSanitizer if it's not automatically injected or mocked
      // In this case, it should be automatically provided by @angular/platform-browser
    }).compileComponents();

    fixture = TestBed.createComponent(ChatHistory);
    component = fixture.componentInstance;
    sanitizer = TestBed.inject(DomSanitizer); // Inject the DomSanitizer
    fixture.detectChanges(); // Initial change detection
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  // Test Case 1: Sanitizes basic malicious HTML.
  it('should sanitize basic malicious HTML in markdown content', () => {
    const maliciousMessage: ChatMessage = { role: 'assistant', content: '<script>alert("XSS")</script>Hello', displayInChat: true };
    const renderedHtml: SafeHtml = component.parseMarkdown(maliciousMessage);
    const div = document.createElement('div');
    div.innerHTML = renderedHtml.toString(); // Use toString to get the actual HTML string
    expect(div.textContent).not.toContain('alert("XSS")'); // Script tag should be removed
    expect(div.textContent).toContain('Hello');
  });

  // Test Case 2: Sanitizes attributes with malicious content.
  it('should sanitize malicious attributes in markdown content', () => {
    const maliciousMessage: ChatMessage = { role: 'assistant', content: '<img src="x" onerror="alert(1)">', displayInChat: true };
    const renderedHtml: SafeHtml = component.parseMarkdown(maliciousMessage);
    const div = document.createElement('div');
    div.innerHTML = renderedHtml.toString();
    expect(div.querySelector('img')).toBeDefined();
    expect(div.querySelector('img')?.hasAttribute('onerror')).toBeFalsy(); // onerror attribute should be removed
  });

  // Test Case 3: Allows safe HTML tags and attributes.
  it('should allow safe HTML tags and attributes in markdown content', () => {
    const safeMessage: ChatMessage = { role: 'assistant', content: '<b>Hello</b> <a href="http://safe.com">Safe Link</a>', displayInChat: true };
    const renderedHtml: SafeHtml = component.parseMarkdown(safeMessage);
    const div = document.createElement('div');
    div.innerHTML = renderedHtml.toString();
    expect(div.querySelector('b')).toBeDefined();
    expect(div.querySelector('b')?.textContent).toContain('Hello');
    expect(div.querySelector('a')).toBeDefined();
    expect(div.querySelector('a')?.getAttribute('href')).toContain('http://safe.com');
  });

  // Test Case 4: Correctly renders final HTML output (isFinalHtml = true).
  it('should render final HTML content directly without markdown processing', () => {
    const finalHtmlMessage: ChatMessage = { role: 'assistant', content: '<div class="prose"><h1>Final Output</h1><p>This is <strong>HTML</strong>.</p></div>', displayInChat: true, isFinalHtml: true };
    const renderedHtml: SafeHtml = component.parseMarkdown(finalHtmlMessage);
    const div = document.createElement('div');
    div.innerHTML = renderedHtml.toString();

    // Check if the HTML structure is preserved and not re-parsed as markdown
    expect(div.querySelector('h1')?.textContent).toContain('Final Output');
    expect(div.querySelector('strong')?.textContent).toContain('HTML');
    expect(div.textContent).not.toContain('**HTML**'); // Ensure it's not markdown
  });

  // Test Case 5: Correctly renders markdown (isFinalHtml = false).
  it('should render markdown content with markdown processing', () => {
    const markdownMessage: ChatMessage = { role: 'assistant', content: '## Markdown Heading\n**Bold** _Italic_', displayInChat: true, isFinalHtml: false };
    const renderedHtml: SafeHtml = component.parseMarkdown(markdownMessage);
    const div = document.createElement('div');
    div.innerHTML = renderedHtml.toString();

    expect(div.querySelector('h2')).toBeDefined();
    expect(div.querySelector('h2')?.textContent).toContain('Markdown Heading');
    expect(div.querySelector('strong')).toBeDefined();
    expect(div.querySelector('em')).toBeDefined();
  });

  // Test Case 6: filteredMessages should be empty when inResearchMode is true
  it('should return empty filteredMessages when inResearchMode is true', () => {
    component.inResearchMode = true;
    component.messages = [{ role: 'user', content: 'test', displayInChat: true }];
    expect(component.filteredMessages.length).toBe(0);
  });

  // Test Case 7: filteredMessages should contain displayable messages when inResearchMode is false
  it('should return displayable messages when inResearchMode is false', () => {
    component.inResearchMode = false;
    component.messages = [
      { role: 'user', content: 'test1', displayInChat: true },
      { role: 'assistant', content: 'test2', displayInChat: false } // Should be filtered out
    ];
    expect(component.filteredMessages.length).toBe(1);
    expect(component.filteredMessages[0].content).toBe('test1');
  });

  // Test Cases for TODO #16: Final HTML Rendering
  it('should display final HTML output as the sole message when available and not in research mode', async () => { // Marked as async
    const finalHtml = `<div class="prose"><h1>Research Brief</h1><p>This is a detailed brief.</p></div>`;
    component.inResearchMode = false;
    component.finalHtmlOutput = finalHtml;
    component.messages = []; // Ensure no regular messages are present for finalHtmlOutput to display
    fixture.detectChanges(); // Detect changes after setting inputs
    await fixture.whenStable(); // Wait for component to stabilize

    const compiled = fixture.nativeElement;
    let renderedContent = compiled.querySelector('div.max-w-full p');
    expect(renderedContent).not.toBeNull();
    expect(renderedContent.innerHTML).toContain('<h1>Research Brief</h1>');
    expect(renderedContent.innerHTML).toContain('<p>This is a detailed brief.</p>');
    expect(compiled.querySelectorAll('.flex').length).toBe(1); // Only one flex container for the final HTML
  });

  it('should apply Philippine Case Card styling via HTML structure (unit test verifies structure, not live CSS)', async () => { // Marked as async
    const caseCardHtml = `
      <div class="my-4 p-4 bg-slate-50 border-l-4 border-blue-700 rounded-r-md shadow-sm">
        <p class="font-bold text-slate-900">G.R. No. 123456</p>
        <p class="italic text-slate-700">Petitioner v. Respondent</p>
        <p class="text-sm text-slate-600">Date | Division/En Banc</p>
        <hr class="my-2">
        <p class="text-slate-800 text-sm">Short Syllabus/Holding...</p>
      </div>
    `;
    component.inResearchMode = false;
    component.finalHtmlOutput = caseCardHtml;
    component.messages = [];
    fixture.detectChanges(); // Detect changes after setting inputs
    await fixture.whenStable(); // Wait for component to stabilize

    const compiled = fixture.nativeElement;
    const cardDiv = compiled.querySelector('.bg-slate-50');
    expect(cardDiv).not.toBeNull();
    expect(cardDiv.classList).toContain('my-4');
    expect(cardDiv.classList).toContain('p-4');
    expect(cardDiv.classList).toContain('border-l-4');
    expect(cardDiv.classList).toContain('border-blue-700');

    expect(cardDiv.querySelector('p.font-bold')).not.toBeNull();
    expect(cardDiv.querySelector('p.font-bold')?.textContent).toContain('G.R. No. 123456');
  });

  // Font-family application is typically verified via integration tests or visual regression tests,
  // as unit tests cannot easily assert live CSS properties applied by a browser's rendering engine.
  // We'll verify that the HTML structure itself does not introduce conflicting font styles,
  // and rely on the Tailwind config verification for the default font stack.
  it('should not introduce conflicting font styles in the rendered HTML structure', async () => { // Marked as async
    const htmlWithText = `<p>Some text</p>`;
    component.inResearchMode = false;
    component.finalHtmlOutput = htmlWithText;
    component.messages = [];
    fixture.detectChanges(); // Detect changes after setting inputs
    await fixture.whenStable(); // Wait for component to stabilize

    const compiled = fixture.nativeElement;
    const pElement = compiled.querySelector('p');
    expect(pElement).not.toBeNull();
    // We cannot easily assert actual computed font-family here in a unit test
    // We'd rely on the Tailwind CSS setup (verified in TODO 14) to apply the default font.
    // This test ensures no *inline style* or *class* on the HTML directly overrides the global setup.
    expect(pElement.style.fontFamily).toBe('');
  });
});