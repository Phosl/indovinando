# Game Editor Components

## Architecture Overview

The game editor follows a **3-step modal-based workflow**:

1. **Step 1**: Game Name (simple text input)
2. **Step 2**: Questionnaire Management (QuestionsList + QuestionModal)
3. **Step 3**: Bottle Management (BottlesList + BottleModal) + Publish

## Component Structure

### Core Components

#### GameEditor.jsx

Main orchestrator component that manages the 3-step workflow.

**Responsibilities:**

- Step navigation and URL synchronization
- State management for game name, questions, and bottles
- Question CRUD operations
- Bottle CRUD operations
- Game publication to Supabase

**Key Functions:**

- `handleAddQuestion()` - Add or update a question
- `openQuestionModal(index)` - Open modal for editing specific question
- `selectBottle(index)` - Open modal for editing bottle
- `startNewBottle()` - Open modal for new bottle
- `concludeBottle()` - Save bottle and close modal
- `publishGame()` - Validate and save game to database

---

#### Step 2: Questionnaire

**QuestionsList.jsx**

- Displays all questions in a grid of cards
- Shows completion status (✓ complete / ⚠️ incomplete)
- Allows editing and adding new questions
- Props: `questions`, `onEditQuestion`, `onNewQuestion`

**QuestionModal.jsx**

- Modal form for creating/editing questions
- Dynamic options array with "Add Option" button
- Form validation
- Props: `isOpen`, `questionIndex`, `question`, `onSave`, `onCancel`

---

#### Step 3: Bottles

**BottlesList.jsx**

- Displays all bottles in a grid of cards
- Shows completion status
- Props: `bottles`, `questions`, `onEditBottle`, `onNewBottle`

**BottleModal.jsx**

- Modal form for creating/editing bottles
- Inline answer selection using BottleAnswersSelector
- Form validation
- Props: `isOpen`, `bottleIndex`, bottle data fields, `questions`, `currentAnswers`, change
  handlers, `onSave`, `onCancel`

---

### Supporting Components

**GameStepsBreadcrumbs.jsx**

- Displays step navigation with URL sync
- Allows jumping between steps

**BottleAnswersSelector.jsx**

- Reusable component for selecting correct answers
- Used within BottleModal

---

## Utility Files

### validations.js

Extracted validation functions for maintainability:

- `isQuestionComplete()` - Check if question has all required fields
- `isBottleComplete()` - Check if bottle has all required fields
- `validateGameName()` - Game name validation
- `validateQuestionnaire()` - Questionnaire validation
- `validateBottles()` - Bottles validation
- `validateBottleForm()` - Individual bottle form validation
- `validateQuestionForm()` - Individual question form validation

### constants.js

Centralized constants:

- `STEPS` - Array of step definitions
- `MIN_STEP`, `MAX_STEP` - Step boundaries
- `ALERT_MESSAGES` - All user-facing messages
- `MIN_OPTIONS` - Minimum options per question
- `DEFAULT_GAME_NAME` - Default game name

---

## Data Flow

### Question Management

1. User clicks "Nuova Domanda"
2. `openNewQuestionModal()` opens QuestionModal with empty state
3. User fills form and clicks "Crea Domanda"
4. `handleAddQuestion()` adds question to `questionDraft` array
5. Modal closes
6. QuestionsList re-renders with new question

### Questionnaire Propagation

When questionnaire is saved (Step 2 → Step 3):

1. `saveQuestionnaire()` is called
2. Existing bottles' answers are remapped to match new question order
3. Invalid answers are set to null
4. User is alerted about changes if bottles exist

### Bottle Management

Similar to questions, but additionally:

- Bottle answers must match all questions
- Validation occurs before save
- BottleAnswersSelector ensures all answers are selected

### Publication Flow

1. All validations run via `validateGameName()`, `validateQuestionnaire()`, `validateBottles()`
2. Supabase user is retrieved
3. Game, questions, options, bottles, and answers are inserted in sequence
4. IDs are mapped to maintain relationships
5. User is redirected to game list

---

## Code Organization

```
src/components/game/
├── GameEditor.jsx                 # Main component
├── QuestionsList.jsx              # Question grid
├── QuestionModal.jsx              # Question form modal
├── BottlesList.jsx                # Bottle grid
├── BottleModal.jsx                # Bottle form modal
├── GameStepsBreadcrumbs.jsx        # Navigation breadcrumbs
├── BottleAnswersSelector.jsx       # Answer selection reusable component
├── index.js                        # Component exports
├── utils/
│   ├── validations.js             # Validation functions
│   └── constants.js               # Constants and messages
├── GameEditor.module.scss
├── QuestionsList.module.scss
├── QuestionModal.module.scss
├── BottlesList.module.scss
└── BottleModal.module.scss
```

---

## Maintenance Notes

### Adding a New Validation

1. Add function to `utils/validations.js`
2. Add error message to `ALERT_MESSAGES` in `utils/constants.js`
3. Import and use in component

### Adding a New Step

1. Add step to `STEPS` array in `utils/constants.js`
2. Add step JSX in GameEditor return
3. Update `MAX_STEP` calculation (automatic if STEPS array updated)

### Styling

- All components use SCSS modules
- Colors and spacing use CSS variables defined in global styles
- Hover/focus states applied consistently via button utility classes

---

## Removed Components (Deprecated)

The following components are no longer used:

- **QuestionEditor.jsx** - Replaced by QuestionsList + QuestionModal pattern
- **BottlesNav.jsx** - Replaced by BottlesList component
- **QuestionEditor.module.scss** - Associated with deprecated QuestionEditor

These should be deleted in a cleanup step.

---

## Testing Checklist

- [ ] Create game with valid name
- [ ] Add questions and verify status indicators
- [ ] Edit question and verify changes
- [ ] Delete option and verify validation
- [ ] Add bottle with all answers
- [ ] Edit bottle and verify answers persist
- [ ] Update questionnaire and verify answer remapping
- [ ] Publish game and verify database entries
- [ ] Test URL navigation between steps
- [ ] Test modal open/close states
