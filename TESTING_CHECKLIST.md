# Testing Checklist - Game Editor Refactoring

## Pre-Testing Verification

- [ ] No build errors: `npm run build`
- [ ] No lint errors: `npm run lint` (if available)
- [ ] Development server starts: `npm run dev`

---

## Step 1: Game Name

- [ ] Input field displays correctly
- [ ] Can type game name
- [ ] "Prosegui" button is enabled
- [ ] Clicking "Prosegui" goes to Step 2
- [ ] Game name is preserved when navigating back

---

## Step 2: Questionnaire (QuestionsList + QuestionModal)

### Question List Display

- [ ] Empty state message appears initially
- [ ] "Nuova Domanda" button is visible
- [ ] Header shows "Domande (0)" initially

### Creating Questions

- [ ] Click "Nuova Domanda" opens QuestionModal
- [ ] Modal title shows "Nuova Domanda"
- [ ] Question text input is empty
- [ ] Default 2 options are shown
- [ ] Can type question text
- [ ] Can type option values
- [ ] "Aggiungi Opzione" button works
- [ ] "Crea Domanda" button saves and closes modal
- [ ] New question appears in grid
- [ ] Question gets unique ID
- [ ] Status shows ⚠️ (incomplete) initially

### Question Validation

- [ ] Cannot create empty question (alert shown)
- [ ] Cannot create with empty options (alert shown)
- [ ] Cannot create with < 2 options (alert shown)
- [ ] Error messages are clear

### Question Editing

- [ ] Click question card opens QuestionModal for editing
- [ ] Modal title shows "Modifica Domanda X"
- [ ] Previous values are populated
- [ ] Can modify text and options
- [ ] "Salva Domanda" button saves and closes modal
- [ ] Changes are reflected in grid

### Question Status Indicator

- [ ] When question has text and 2+ filled options: status shows ✓
- [ ] When question is missing text or options: status shows ⚠️
- [ ] Status updates immediately after save

### Questionnaire Workflow

- [ ] Can create multiple questions
- [ ] Grid shows all questions with count
- [ ] "Salva questionario" button is disabled if no questions
- [ ] "Salva questionario" button is enabled if questions exist
- [ ] Clicking "Salva questionario" goes to Step 3
- [ ] Clicking "Indietro" goes to Step 1

---

## Step 3: Bottles (BottlesList + BottleModal)

### Bottle List Display

- [ ] Empty state message appears initially
- [ ] "Nuova Bottiglia" button is visible
- [ ] Header shows "Bottiglie (0)" initially

### Creating Bottles

- [ ] Click "Nuova Bottiglia" opens BottleModal
- [ ] Modal title shows "Nuova Bottiglia"
- [ ] Form fields are empty (name, producer, year)
- [ ] BottleAnswersSelector displays all questions
- [ ] All answer options are shown for each question

### Bottle Form Validation

- [ ] Cannot save without bottle name (alert shown)
- [ ] Cannot save without producer (alert shown)
- [ ] Cannot save without year (alert shown)
- [ ] Cannot save without all answers selected (alert shown)
- [ ] Error messages are clear

### Selecting Answers

- [ ] Can click radio buttons for each question
- [ ] Selected answer is highlighted
- [ ] Can change selection before saving
- [ ] "Salva Bottiglia" button saves and closes modal

### Bottle Display

- [ ] New bottle appears in grid
- [ ] Shows name, producer, year
- [ ] Status shows ✓ (complete)
- [ ] Can edit by clicking card

### Bottle Editing

- [ ] Click bottle card opens BottleModal for editing
- [ ] Modal title shows "Modifica Bottiglia X"
- [ ] Previous values are populated
- [ ] Previous answers are selected
- [ ] Can modify fields and answers
- [ ] "Aggiorna Bottiglia" saves changes
- [ ] Changes are reflected in grid

### Bottle Status Logic

- [ ] Incomplete status if missing any field
- [ ] Incomplete status if missing any answer
- [ ] Complete status only when all fields + answers filled

### Questionnaire Update & Answer Remapping

- [ ] Go back to Step 2 (via breadcrumb or "Indietro")
- [ ] Add new question
- [ ] Click "Salva questionario"
- [ ] Alert appears: "Questionario aggiornato..."
- [ ] Go to Step 3
- [ ] Bottles are still there
- [ ] Answer array length increased (for new question)
- [ ] Old answers preserved where possible
- [ ] New question answer is null (needs filling)

### Publication

- [ ] "Pubblica Gioco" button appears when bottles exist
- [ ] Cannot publish without game name (validation)
- [ ] Cannot publish without questions (validation)
- [ ] Cannot publish without bottles (validation)
- [ ] Cannot publish with incomplete bottles (validation)
- [ ] "Pubblica Gioco" saves to database
- [ ] After publishing, redirect to `/game`
- [ ] Success alert shown

---

## Navigation

- [ ] URL changes when moving between steps
- [ ] Can navigate via breadcrumbs
- [ ] Can navigate via "Prosegui" / "Indietro" buttons
- [ ] Browser back button works correctly
- [ ] Direct URL navigation works (e.g., `?step=2`)

---

## Modal Behavior

- [ ] Modals overlay the page
- [ ] Click outside modal closes it (if implemented)
- [ ] Close button (✕) closes modal
- [ ] "Annulla" button closes modal without saving
- [ ] Modal is keyboard accessible (Tab, Enter, Esc)

---

## Error Handling

- [ ] All validation messages are clear
- [ ] Database errors are caught and displayed
- [ ] Auth errors are handled gracefully
- [ ] No console errors during normal operation

---

## Performance

- [ ] Questions load smoothly (< 100ms)
- [ ] Bottles load smoothly (< 100ms)
- [ ] Modals open instantly (< 50ms)
- [ ] Large questionnaire (20+ questions) doesn't lag
- [ ] Large bottle list (50+ bottles) doesn't lag

---

## UI/UX

- [ ] Button text is clear and action-oriented
- [ ] Status indicators (✓ / ⚠️) are visible
- [ ] Grid layout is responsive
- [ ] Modal content is readable
- [ ] Form fields are clearly labeled
- [ ] Disabled buttons show visual feedback
- [ ] Saving state shows proper feedback

---

## Browser Compatibility

- [ ] Works in Chrome
- [ ] Works in Firefox
- [ ] Works in Safari
- [ ] Works on mobile (if applicable)

---

## Final Verification

- [ ] All validation functions work correctly
- [ ] All constants are used properly
- [ ] All components import from correct paths
- [ ] No unused imports
- [ ] All JSDoc comments are accurate
- [ ] Architecture documentation is accurate
- [ ] Ready for deprecated component deletion

---

## Sign-Off

- **Tester**: ******\_\_\_******
- **Date**: ******\_\_\_******
- **Status**: ☐ Pass ☐ Fail

### Notes:

```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## Critical Issues Found

If any critical issues found:

1. Document issue with exact reproduction steps
2. Check related code in GameEditor.jsx
3. Verify validation functions in utils/validations.js
4. Check constants in utils/constants.js
5. Create bug fix ticket with priority

---

## Post-Testing Actions

Once all tests pass:

- [ ] Delete `QuestionEditor.jsx` and `.module.scss`
- [ ] Delete `BottlesNav.jsx` and `.module.scss`
- [ ] Run `npm install` to clean up (if swiper unused)
- [ ] Final build test: `npm run build`
- [ ] Deploy to staging
- [ ] Create deployment notes
- [ ] Mark refactoring as complete in project management tool
