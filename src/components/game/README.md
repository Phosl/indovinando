# Game Editor Components

This directory contains all components for the **Game Editor** - the current modal-based workflow for
creating wine tasting games.

## Quick Start

```jsx
import {GameEditor} from '@/components/game'

// or individual imports:
import {GameEditor, QuestionsList, BottlesList} from '@/components/game'
```

## Architecture

The game editor currently follows a **4-screen workflow**:

| Step | Component                     | Purpose                                            |
| ---- | ----------------------------- | -------------------------------------------------- |
| 1    | Simple Input                  | Enter game name                                    |
| 2    | QuestionsList + QuestionModal | Create/edit questions                              |
| 3    | Bridge screen                 | Add bottles or save a printable card               |
| 4    | BottlesList + BottleModal     | Create/edit bottles & publish                      |

Note: this may return to a 3-step workflow later. The source of truth is
`GAME_EDITOR_DICTIONARY.steps` in `src/lib/i18n/dictionaries.js` plus the step rendering in
`GameEditor/index.jsx`.

## Core Components

### GameEditor

Main orchestrator managing the entire workflow.

**Key Features:**

- Step navigation with URL sync
- Question CRUD operations
- Bottle CRUD operations
- Game publication to Supabase
- Answer remapping on questionnaire updates

### Step 2: Questionnaire

- **QuestionsList** - Grid of question cards
- **QuestionModal** - Form for creating/editing questions

### Step 4: Bottles

- **BottlesList** - Grid of bottle cards
- **BottleModal** - Form for creating/editing bottles with inline answer selection
- **BottleAnswersSelector** - Answer selection component

### Supporting

- **GameStepsBreadcrumbs** - Step navigation with URL sync

## Utilities

### validations.js

Reusable validation functions:

- `isQuestionComplete(question)`
- `isBottleComplete(bottle, questionsLength)`
- `validateGameName(name)`
- `validateQuestionnaire(questions)`
- `validateBottles(bottles, questions)`
- `validateBottleForm(bottleName, producer, year, currentAnswers, questionsLength)`
- `validateQuestionForm(questionText, options)`

### constants.js

Centralized configuration:

- `STEPS` - Step definitions
- `ALERT_MESSAGES` - All user messages
- `MIN_OPTIONS` - Minimum options per question (default: 2)
- `DEFAULT_GAME_NAME` - Default game name

## Data Structure

### Question

```javascript
{
  id: string (UUID),
  text: string,
  options: string[]
}
```

### Bottle

```javascript
{
  id?: string (assigned by Supabase),
  name: string,
  producer: string,
  year: string,
  answers: number[] // index into question.options
}
```

## Key Patterns

### Validation

Use validation functions from `utils/validations.js`:

```javascript
try {
  validateQuestionForm(questionText, options)
  // Valid!
} catch (error) {
  alert(error.message)
}
```

### Messages

Reference messages from `utils/constants.js`:

```javascript
import {ALERT_MESSAGES} from './utils/constants'

alert(ALERT_MESSAGES.QUESTIONNAIRE_UPDATED)
```

### Modal Pattern

```javascript
const [isModalOpen, setIsModalOpen] = useState(false)
const [editingIndex, setEditingIndex] = useState(null)

// Open for new
function openNew() {
  setEditingIndex(null)
  setIsModalOpen(true)
}

// Open for edit
function openEdit(index) {
  setEditingIndex(index)
  setIsModalOpen(true)
}

// Close
function closeModal() {
  setIsModalOpen(false)
  setEditingIndex(null)
}
```

## Styling

All components use SCSS modules with:

- CSS variables for colors/spacing
- Duolingo-inspired design
- Consistent button styles
- Status indicator colors (green ✓ / orange ⚠️)

## Testing

See `TESTING_CHECKLIST.md` in root directory for comprehensive test plan.

## Documentation

- **ARCHITECTURE.md** - System design and data flow
- **CLEANUP.md** - Deprecated components
- **REFACTORING_SUMMARY.md** - Detailed changelog
- **TESTING_CHECKLIST.md** - Test plan

## Deprecated Components

The following components are no longer used and can be safely deleted:

- `QuestionEditor.jsx` (replaced by QuestionsList + QuestionModal)
- `BottlesNav.jsx` (replaced by BottlesList)

See `CLEANUP.md` for removal instructions.

## For New Developers

1. Read `ARCHITECTURE.md` for system overview
2. Check JSDoc comments in components
3. Use validation functions from `utils/validations.js`
4. Reference messages from `utils/constants.js`
5. Follow existing patterns for new features

## FAQ

**Q: How do I add a validation?** A: Add function to `utils/validations.js`, add message to
`ALERT_MESSAGES` in `utils/constants.js`

**Q: How do I change an error message?** A: Edit `ALERT_MESSAGES` in `utils/constants.js` - it's
used everywhere

**Q: How do I add a new step?** A: Add to `STEPS` array in `utils/constants.js`, add step JSX in
GameEditor

**Q: Can I use these components elsewhere?** A: Yes! They're designed to be reusable. Import from
`@/components/game`

---

**Last Updated**: March 4, 2026 **Status**: ✅ Refactored & Documented
