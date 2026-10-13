# Copilot Rules for ISSA Corrective Exercise Specialist App

## Project Objective
- Build an application for managing, assessing, and tracking corrective exercise programs.
- Enable the addition of questionnaires, assessments, exercises, and clinical cases for professionals.

## Core Features
- Load, display, and manage questionnaires, assessments, and exercises.
- Enable efficient navigation and search of relevant information.
- Record and display assessment results and progress.
- Maintain data integrity and consistency.

## Adding Questionnaires, Assessments, and Exercises
- Questionnaires and assessments must be defined in separate JSON files.
- Exercises must be organized and referenced by categories and goals.
- All loading, validation, and presentation logic must be decoupled from the view.
- Patterns must reference exercises via `exercise_ids` (do not use legacy `correctives`).

## Development Best Practices
- Avoid defining business elements directly in the view (HTML/CSS/UI JS).
- Keep business logic in reusable modules or services.
- The view should only render data and capture user interactions.
- Use clear comments and documentation to support maintenance.

## Recommended Structure
- Separate data, business logic, and presentation into distinct files and folders.
- Use descriptive names for files, functions, and variables.
- Maintain scalability and ease of updates.

## Example Workflow
- To add a new questionnaire, create a JSON file in the appropriate folder and update the data loader.
- For new assessments or exercises, follow the same modular approach.

---

These rules should be followed by any agent or developer working on this project to maintain consistency and code quality.
