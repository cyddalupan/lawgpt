# TempAngularApp

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.0.4.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.

## Application Structure and Navigation

This application features two distinct interfaces: the "Professional" app and the "Fast" app. Navigation between these is handled by a shared `HeaderComponent`.

### Professional App (LawGPT Core)
*   **Purpose:** Provides the full LawGPT experience, implementing the multi-phase "Legal Intelligence Loop" as described in `BLUEPRINT.md`. This is accessed via the `/` route.
*   **Header:** Displays "LawGPT Professional" with a dark background.

### Fast App
*   **Purpose:** Offers a simplified, single-turn chat experience leveraging a fast AI endpoint. This is accessed via the `/mini` route.
*   **Header:** Displays "LawGPT Fast" with a blue background.

### HeaderComponent
*   A shared standalone component (`src/app/shared/header`) responsible for consistent navigation between the Professional and Fast apps.
*   Dynamically adapts its title and background color based on inputs (`appName` and `headerBgClass`).
