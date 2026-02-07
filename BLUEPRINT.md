Here is the comprehensive **BLUEPRINT.md** for your LawGPT application. This document serves as the "Master Plan" for the architecture, logic flow, and state management we have designed together.

---

# 📘 BLUEPRINT.md: LawGPT (Philippine Edition)

## 1. Project Overview

**LawGPT** is a high-orchestration legal research agent designed specifically for **Philippine Jurisprudence**. Unlike traditional chatbots, LawGPT utilizes a **"Thick Frontend" Architecture** where the Angular client acts as the "Project Manager," orchestrating a multi-step recursive research loop using **GPT-5-mini**.

The system is designed to provide **verified, citation-backed legal briefs** by forcing the AI to perform live web searches, cross-check its own findings, and auto-correct hallucinations before the user ever sees the result.

---

## 2. System Architecture

### A. The "Thick Frontend" (Angular)

* **Role:** The Brain & Orchestrator.
* **Responsibilities:**
* Manages the "State Machine" (Chat History vs. Work State).
* Parses **Action Tags** (e.g., `[status_message: "..."]`) from the AI stream.
* Executes the recursive "Research & Verify" loop.
* Renders the final HTML/Tailwind response.



### B. The "Thin Backend" (Generic Proxy)

* **Role:** The Secure Relay.
* **Responsibilities:**
* Hides the OpenAI API Key.
* Forwards the `messages[]` array to OpenAI.
* Returns the raw stream/JSON to Angular.
* *Note: Contains zero business logic.*



---

## 3. The "Legal Intelligence Loop" (The Core Logic)

The application follows a linear-then-recursive flow to ensure accuracy.

### Phase 1: Intake & Clarity (Interactive)

* **Goal:** Ensure the user's request is actionable and specifically targets Philippine law.
* **Action:** The AI asks clarification questions until it has enough facts.
* **Exit Trigger:** `[intake_status: "done"]`

### Phase 2: Strategy & Breakdown

* **Goal:** Map out a search strategy.
* **Action:** The AI generates a JSON-style array of specific research tasks (e.g., *"Search G.R. No. 12345 for doctrine X"*).
* **Exit Trigger:** `[tasks: ["Task A", "Task B", ...]]`

### Phase 3: Requirement Summary

* **Goal:** Create a "Single Source of Truth" for the research loop.
* **Action:** The AI summarizes the entire context into a "Master Research Doc."
* **Exit Trigger:** `[summary_status: "finalized"]`

### Phase 4: The Research & Verify Loop (Recursive)

* **Logic:** Angular iterates through the `tasks` array. For **EACH** task:
1. **Search (Step A):** AI searches the web for G.R. Numbers and holdings.
2. **Validate (Step B):** AI "Audits" the findings from Step A. It checks for "Overturned" status or hallucinations.
3. **Correction:** If data is wrong, the Validator replaces it in the thread.
4. **Save:** The validated result is appended to the hidden `Work State`.



### Phase 5: Synthesis (Compilation)

* **Goal:** Merge all validated fragments into one document.
* **Action:** The AI writes a cohesive legal brief using the gathered data.
* **Exit Trigger:** `[synthesis_status: "done"]`

### Phase 6: Styling (Presentation)

* **Goal:** Final Polish.
* **Action:** The AI wraps the text in Tailwind CSS/HTML (specifically formatted for Philippine Case Cards).
* **Exit Trigger:** `[render_status: "final"]`

---

## 4. State Management: The Action Tag System

Instead of complex JSON schemas, LawGPT communicates its state using **Action Tags** embedded in the text stream. The Angular service uses Regex to parse these in real-time.

### The Regex Logic

```typescript
// Captures [key: "value"] pattern
const tagRegex = /\[(\w+):\s*["']?(.*?)["']?\]/g;

```

### Key Tags & Signals

| Tag Key | Value Type | Purpose |
| --- | --- | --- |
| `status_message` | String | Updates the UI Loading Indicator (e.g., *"Searching SC E-Library..."*). |
| `intake_status` | `"done"` | Signals end of Phase 1. |
| `tasks` | Array (String) | List of tasks for the Research Loop. |
| `summary_status` | `"finalized"` | Signals the "Master Doc" is ready. |
| `validation_status` | `"verified"` / `"corrected"` | confirmation of data accuracy inside the loop. |
| `synthesis_status` | `"done"` | Signals the brief is written and ready for styling. |
| `render_status` | `"final"` | Signals the final HTML is ready to render. |

---

## 5. The "LawGPT" Persona Strategy

To ensure high-quality output, specific "Internal Personas" are assigned to each phase, though the AI always presents itself publicly as **LawGPT**.

| Phase | Internal Persona | Specialization |
| --- | --- | --- |
| **Intake** | **Gerry Spence** | Fact-finding & Interrogation. |
| **Strategy** | **Clarence Darrow** | Strategic planning & broad mapping. |
| **Research** | **Thurgood Marshall** | Deep-dive search & G.R. Number extraction. |
| **Validation** | **Ruth Bader Ginsburg** | Meticulous auditing & fact-checking. |
| **Writer** | **Oliver Wendell Holmes Jr.** | Authoritative legal synthesis. |
| **Stylist** | **Legal Clerk** | UI/UX & Tailwind Formatting. |

### The "Live-First" Rule

* **Constraint:** The AI is strictly forbidden from mentioning "knowledge cutoffs" or training data limits.
* **Enforcement:** Every prompt includes a "Context Injection" of the current date and a command to treat **Web Search** as the primary memory source.

---

## 6. Data Structures

### The Task Array (Phase 2 Output)

```json
[
  "Search for recent SC En Banc rulings on Quo Warranto (2024-2026)",
  "Verify the current standing of the 'Condonation Doctrine'",
  "Find G.R. Number for Petitioner vs. Respondent (Jan 2025)"
]

```

### The Validated Fragment (Phase 4 Output)

```markdown
**G.R. No. 265432** | *Republic v. Sereno*
* **Date:** January 15, 2025
* **Status:** Valid / Good Law
* **Holding:** The court ruled that...

```


