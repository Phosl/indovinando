# Cleanup Instructions

## Deprecated Components to Remove

The following components are no longer used in the new 3-step modal-based architecture and can be
safely deleted:

### Files to Delete

1. **QuestionEditor.jsx** - Replaced by QuestionsList + QuestionModal
   - Was used for Swiper carousel-based question editing
   - No longer imported anywhere

2. **QuestionEditor.module.scss** - Associated styles for QuestionEditor
   - Can be deleted with the component

3. **BottlesNav.jsx** - Replaced by BottlesList
   - Was used for bottle navigation
   - No longer imported anywhere

4. **BottlesNav.module.scss** - Associated styles for BottlesNav
   - Can be deleted with the component

### Dependencies to Verify

The Swiper library (installed for QuestionEditor) may still be used elsewhere. Before removing it:

1. Search the codebase: `grep -r "swiper" src/`
2. Check imports in other components
3. If only used in QuestionEditor, can be uninstalled: `npm uninstall swiper`

## Migration Summary

### Old Architecture (Step 4 workflow)

- Step 1: Nome Gioco
- Step 2: Questionario (with Swiper carousel + inline editing)
- Step 3: Bottiglie (with form fields)
- Step 4: Risposte Bottiglia (separate answer selection)

### New Architecture (Step 3 workflow)

- Step 1: Nome Gioco
- Step 2: Questionario (with modal-based question editing)
- Step 3: Bottiglie (with modal-based bottle editing + inline answer selection)

## Code Quality Improvements Made

1. **Extracted validation functions** → `utils/validations.js`
   - Better testability
   - Reusable validation logic
   - Centralized error handling

2. **Extracted constants** → `utils/constants.js`
   - All user messages in one place
   - Easy to maintain/update messages
   - Centralized step definitions

3. **Added JSDoc comments**
   - Improved IDE intellisense
   - Better component documentation
   - Easier for new developers

4. **Created component index** → `index.js`
   - Simplified imports: `import { GameEditor } from '@/components/game'`
   - Better organization
   - Easier to maintain exports

5. **Added architecture documentation** → `ARCHITECTURE.md`
   - Complete system overview
   - Component responsibilities
   - Data flow explanation
   - Testing checklist

## Implementation Status

✅ Code cleanup and refactoring complete ✅ Validations extracted and centralized ✅ Constants
organized in single file ✅ JSDoc comments added to all components ✅ Component index created ✅
Architecture documentation created ✅ All linting errors resolved

⚠️ Deprecated components still present (waiting for explicit removal) ⚠️ Swiper package still
installed (verify before removing)

## Next Steps

1. Run full test suite to ensure no regressions
2. Manually test game creation workflow
3. Verify all modals open/close correctly
4. Check that status indicators display properly
5. Verify answer remapping works when questionnaire changes
6. Once confirmed working, delete deprecated files:
   - `rm src/components/game/QuestionEditor.jsx`
   - `rm src/components/game/QuestionEditor.module.scss`
   - `rm src/components/game/BottlesNav.jsx`
   - `rm src/components/game/BottlesNav.module.scss`
7. If Swiper not used elsewhere: `npm uninstall swiper`
