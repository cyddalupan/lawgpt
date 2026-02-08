Notes:
- Prefer small code change with explaination around 3 to 9 lines, but not limitted to just preference.
- **Test Execution:** Always use non-interactive commands for running tests (e.g., `vitest run`). Never use interactive or watch modes during automated execution to prevent timeouts.

## Silent Test Execution
- Use `vitest run --silent` (or other appropriate Vitest CLI options like `--reporter=default --silent`) to run tests silently and reduce verbose output. This is crucial for efficient CI/CD and to prevent excessive log generation.


- its important we have a really interactive and beautiful loading indicator and message since requests takes time user must be able to always see a loading message properly.
- website faster load, document
	- tailwind CDN (light and cdn)
	- Alpine.js (light js)
	- use emoji for icons just make it big or something depending on the need.
	- dont install font, use `font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial;`  
	- do not use css file use inline with html, also do not add unnecessary css. utilize tailwind
	- chart.js cdn if chart is needed.
- Use TDD small steps
```
* **Modular TDD:** Test specific parts/units rather than the entire application to facilitate multi-agent collaboration.
* **The "4-Strike" Failure Rule:**
1. **Fails 1–2:** Retry the unit test immediately.
2. **Fails 3:** Simplify the logic/test and retry twice.
3. **Fails 4:** If it still fails, **remove the test** and rethink the approach.
```

- we dont save to db just to current session array

- speaking of loading we also have a list of steps most of the time we know how much we need to do so we can show progress to user, maybe a bar our maybe a list

- we should be able to re try a AI call if it failed at least 3 consecutive retries and if that happened we show an error message that AI is busy or failing at the moment.


---

**Asynchronous Data Handling in Frontend (Angular)**
- **Best Practices for API Interaction:**
    - Utilize `HttpClient` for API requests (as in `AiApiService`).
    - Implement robust error handling with `catchError` and appropriate user feedback.
    - Manage observable subscriptions effectively to prevent memory leaks (`takeUntil`, `ngOnDestroy`).
- **Reactive State Management for UI:**
    - Prefer `BehaviorSubject` or `Subject` to manage component-level asynchronous data streams.
    - Leverage the `AsyncPipe` (`| async`) in templates for automatic subscription, unsubscription, and change detection. This simplifies templates and enhances performance.
- **Reactive State Management for UI:**
    - Prefer `BehaviorSubject` or `Subject` to manage component-level asynchronous data streams.
    - Leverage the `AsyncPipe` (`| async`) in templates for automatic subscription, unsubscription, and change detection. This simplifies templates and enhances performance.

### Lessons Learned: Robust State & Parsing for Dynamic UI

This section outlines critical insights and best practices derived from recent debugging efforts, particularly concerning the handling of asynchronous AI responses and dynamic UI updates in Angular.

- **Robust Action Tag Parsing (Handling Double-Escaped JSON):**
    - **Problem:** AI responses, especially from intermediary APIs, might return `ai_message` content where values within action tags (e.g., `[status_message: "..."]`) are themselves `JSON.stringify`'d. This results in double-escaped strings like `"\ud83e\udde0 Evaluating..."` becoming `\"\\ud83e\\udde0 Evaluating...\"` in the raw string.
    - **Solution:** Implement robust parsing logic in `ChatService.parseActionTags` that can correctly unescape these values. This often involves intelligently applying `JSON.parse()` to the extracted `rawValue` from the action tag, possibly multiple times or with careful string manipulation, to resolve both literal quote (`\"`) and Unicode (`\uXXXX}`) escapes. The goal is to obtain the plain, unescaped string (e.g., `🧠 Evaluating...`).
    - **Impact:** Ensures emojis and special characters display correctly and prevents literal escape sequences from leaking into the UI.

- **Centralized Reactive State Management for Dynamic UI (e.g., Loading Messages):**
    - **Problem:** When managing dynamic UI elements like loading messages, distributing the logic across parent and child components (e.g., `app.ts` and `loading-stream.ts`) can lead to timing issues, race conditions, and unexpected transient states. A child component relying on an "empty" input state from the parent to trigger its *own* default message can fail if the parent's input is never truly empty or is updated too quickly by other asynchronous processes.
    - **Solution:** The **parent component (`app.ts`) should be the single, explicit source of truth for the content displayed in child components (`loading-stream.ts`).**
        -   When a loading state is initiated, the parent should *immediately* set its `statusMessage` signal to the desired initial loading text (e.g., `'🚀 Initiating LawGPT research...'`).
        -   The child component (`loading-stream.ts`) then simply displays *whatever* `statusMessage` input it receives, without its own internal logic for "initial" states.
        -   Subsequent dynamic AI `status_message` updates from `ChatService` will naturally flow through `app.ts` and overwrite this initial message.
    - **Impact:** Eliminates race conditions, ensures consistent display of initial messages, simplifies child components, and makes debugging state transitions much clearer.

- **Expected API Response Formats:**
    - **Final AI Response:** Should contain `ai_message` for the primary content.
        ```json
        {
            "ai_message": "..."
        }
        ```
    - **Intermediate Status Update (Optional):** Can contain `status_message` for progress updates.
        ```json
        {
            "status_message": "🧠 Evaluating your request..."
        }
        ```

---

## 7. Tech Stack & Implementation


### Frontend

* **Framework:** Angular (v17+)
* **Styling:** Tailwind CSS
* **Icons:** FontAwesome (for UI status indicators)

### Backend

* **Runtime:** Node.js (Express) or Python (FastAPI)
* **Integration:** OpenAI API (GPT-5-mini)
* **Endpoints:** `POST /api/chat`
