# Proposta di Refactoring - Components Folder

## 🎯 Obiettivo

Migliorare **organizzazione**, **riusabilità** e **manutenibilità** della cartella `components/`.

---

## 📁 Struttura Proposta

```
src/components/
├── game/                          # Game Editor (3-step workflow)
│   ├── GameEditor/
│   │   ├── GameEditor.jsx        # Main component
│   │   ├── GameEditor.module.scss
│   │   ├── hooks/                # Custom hooks
│   │   │   ├── useGameEditor.js
│   │   │   └── useQuestionDraft.js
│   │   └── README.md
│   │
│   ├── steps/                     # Step 1, 2, 3
│   │   ├── Step1GameName/
│   │   │   ├── GameNameForm.jsx
│   │   │   └── GameNameForm.module.scss
│   │   │
│   │   ├── Step2Questions/
│   │   │   ├── QuestionsList.jsx
│   │   │   ├── QuestionCard.jsx
│   │   │   ├── QuestionModal.jsx
│   │   │   └── *.module.scss
│   │   │
│   │   └── Step3Bottles/
│   │       ├── BottlesList.jsx
│   │       ├── BottleCard.jsx
│   │       ├── BottleModal.jsx
│   │       ├── BottleAnswersSelector.jsx
│   │       └── *.module.scss
│   │
│   ├── shared/                    # Shared game components
│   │   ├── GameStepsBreadcrumbs.jsx
│   │   ├── GameStepsBreadcrumbs.module.scss
│   │   ├── OnboardingModal.jsx
│   │   └── OnboardingModal.module.scss
│   │
│   ├── play/                      # Game Playback
│   │   ├── GamePlayView.jsx
│   │   ├── GamePlayView.module.scss
│   │   └── README.md
│   │
│   ├── live/                      # Live Multiplayer
│   │   ├── PlayerJoinClient.jsx
│   │   ├── PlayerLiveClient.jsx
│   │   ├── HostLiveClient.jsx
│   │   ├── components/
│   │   │   ├── LiveScoreboard.jsx
│   │   │   ├── RoundDisplay.jsx
│   │   │   └── *.module.scss
│   │   └── README.md
│   │
│   ├── utils/
│   │   ├── validations.js
│   │   ├── constants.js
│   │   └── helpers.js
│   │
│   └── README.md                  # Main documentation
│
├── common/                        # Reusable across app
│   ├── buttons/
│   │   ├── ActionButton.jsx
│   │   ├── ActionButton.module.scss
│   │   └── README.md
│   │
│   ├── forms/
│   │   ├── TextInput.jsx
│   │   ├── Select.jsx
│   │   └── *.module.scss
│   │
│   ├── modals/
│   │   ├── Modal.jsx
│   │   ├── ConfirmDialog.jsx
│   │   └── *.module.scss
│   │
│   └── loaders/
│       ├── Spinner.jsx
│       └── *.module.scss
│
└── layouts/                       # Page layouts
    ├── AuthLayout.jsx
    ├── DashboardLayout.jsx
    └── EditorLayout.jsx
```

---

## 🔧 Refactoring Dettagliato

### 1. Extract Custom Hooks from GameEditor

**File:** `components/game/GameEditor/hooks/useGameEditor.js`

```javascript
/**
 * useGameEditor - Main game editing logic
 * Extracts state/functions from GameEditor for better testability
 */
export function useGameEditor(isEditMode, initialGame) {
  const [step, setStep] = useState(1)
  const [gameName, setGameName] = useState(DEFAULT_GAME_NAME)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (isEditMode && initialGame) {
      setGameName(initialGame.name)
      setStep(2)
    }
  }, [isEditMode, initialGame])

  const goToStep = (nextStep) => {
    const safeStep = normalizeStep(String(nextStep))
    setStep(safeStep)
    // URL sync here
  }

  return {
    step,
    setStep,
    gameName,
    setGameName,
    isSaving,
    setIsSaving,
    goToStep,
  }
}
```

**Benefits:**

- Easier to test step navigation
- Can reuse in other games later
- GameEditor stays lean

### 2. Break GameEditor into Step Components

**File:** `components/game/steps/Step2Questions/QuestionsList.jsx`

Instead of rendering questions inline in GameEditor, move to dedicated step:

```javascript
export function Step2Questions({ questions, onSave, onBack }) {
  const [questionDraft, setQuestionDraft] = useState(questions)

  return (
    <div className={styles.section}>
      <QuestionsList
        questions={questionDraft}
        onEditQuestion={...}
        onNewQuestion={...}
      />
      <button onClick={() => onSave(questionDraft)}>Salva</button>
      <button onClick={onBack}>Indietro</button>
    </div>
  )
}
```

**GameEditor becomes simpler:**

```javascript
{
  step === 2 && (
    <Step2Questions
      questions={questionDraft}
      onSave={(updated) => {
        setQuestionDraft(updated)
        setTemplateQuestions(updated)
        goToStep(3)
      }}
      onBack={() => goToStep(1)}
    />
  )
}
```

### 3. Extract Live Components into Subfolder

**Current:**

```
components/game/
  ├── PlayerJoinClient.jsx
  ├── HostLiveClient.jsx
  └── ...
```

**Proposed:**

```
components/game/live/
  ├── PlayerJoinClient.jsx
  ├── PlayerLiveClient.jsx
  ├── HostLiveClient.jsx
  ├── components/
  │   ├── LiveScoreboard.jsx      # Show current scores
  │   ├── RoundDisplay.jsx         # Show current round status
  │   └── *.module.scss
  └── README.md
```

### 4. Create Common Button/Modal Components

**File:** `components/common/buttons/ActionButton.jsx`

```javascript
/**
 * Reusable action button with consistent styling
 */
export function ActionButton({
  variant = 'primary', // primary, secondary, danger
  children,
  onClick,
  disabled,
  ...props
}) {
  const className = `${styles.button} ${styles[variant]}`
  return (
    <button className={className} onClick={onClick} disabled={disabled} {...props}>
      {children}
    </button>
  )
}
```

**Usage everywhere:**

```javascript
// Instead of:
<button className="btn primary">Save</button>

// Use:
<ActionButton variant="primary">Save</ActionButton>
```

### 5. Clean Up CSS Files

**Remove compiled .map files (commit to .gitignore):**

```
# .gitignore
src/**/*.module.css
src/**/*.module.css.map
```

These are auto-generated by SCSS compilation. Keep only `.scss` files.

---

## 📊 Migration Plan

### Phase 1: Organize (No Breaking Changes)

- [ ] Create `components/game/GameEditor/` folder, move GameEditor.jsx + sass
- [ ] Create `components/game/steps/` and group Step 1/2/3
- [ ] Create `components/game/live/` subfolder
- [ ] Create `components/common/` structure

### Phase 2: Extract Hooks

- [ ] Extract `useGameEditor` hook from GameEditor
- [ ] Export from `components/game/GameEditor/hooks/index.js`
- [ ] Update GameEditor to use hook

### Phase 3: Extract Step Components

- [ ] Create Step components (Step1GameName, Step2Questions, etc.)
- [ ] Move validation per step
- [ ] Simplify main GameEditor

### Phase 4: Extract Reusable Common Components

- [ ] ActionButton, Modal, TextInput components
- [ ] Use throughout app

### Phase 5: Documentation

- [ ] Write README per major folder
- [ ] Document component props with JSDoc
- [ ] Update main components/README.md

---

## 💻 Example: Before & After

### Before (Current)

```javascript
// components/game/GameEditor.jsx - 600+ lines!
function GameEditor({ isEditMode, initialGame, ... }) {
  const [step, setStep] = useState(1)
  const [gameName, setGameName] = useState('')
  const [questions, setQuestions] = useState([])
  const [bottles, setBottles] = useState([])
  // ... 20 more state vars

  const goToStep = () => { ... }
  const handleAddQuestion = () => { ... }
  const saveQuestionnaire = () => { ... }
  // ... 15 more functions

  return (
    <div>
      {step === 1 && <div>Go to step 1</div>}
      {step === 2 && <div>Go to step 2</div>}
      {step === 3 && <div>Go to step 3</div>}
    </div>
  )
}

// dashboard/page.js
import GameEditor from '@/components/game/GameEditor' // Wait, where's GamePlayView?
```

### After (Refactored)

```javascript
// components/game/GameEditor/GameEditor.jsx - ~150 lines
import { useGameEditor } from './hooks/useGameEditor'
import Step1GameName from '@/components/game/steps/Step1GameName'
import Step2Questions from '@/components/game/steps/Step2Questions'
import Step3Bottles from '@/components/game/steps/Step3Bottles'

export function GameEditor({ isEditMode, initialGame, ... }) {
  const { step, goToStep, gameName, ... } = useGameEditor(isEditMode, initialGame)

  return (
    <div>
      <GameStepsBreadcrumbs currentStep={step} onStepClick={goToStep} />
      {step === 1 && <Step1GameName name={gameName} onNext={() => goToStep(2)} />}
      {step === 2 && <Step2Questions onNext={() => goToStep(3)} onBack={() => goToStep(1)} />}
      {step === 3 && <Step3Bottles onPublish={handlePublish} onBack={() => goToStep(2)} />}
    </div>
  )
}

// dashboard/page.js
import { GameEditor } from '@/components/game' // Clear api surface
```

---

## 🎁 Long-term Benefits

✅ **Maintainability:** Smaller files = easier to understand ✅ **Testability:** Functions are
isolated and mockable ✅ **Reusability:** ActionButton used everywhere ✅ **Scalability:** Add new
game types (not just wine) ✅ **DX:** Clear component hierarchy ✅ **Documentation:** Each component
has README

---

## 🚀 Quick Win (No Time Investment)

If you don't have time for full refactor, start here:

1. Move all 3-step logic into `components/game/steps/Step1.jsx` etc.
2. Create `components/common/ActionButton.jsx`
3. Update `.gitignore` to exclude `.css` + `.css.map` files
4. Add JSDoc comments to main components

This is 30 mins but gives 70% of the benefits!
