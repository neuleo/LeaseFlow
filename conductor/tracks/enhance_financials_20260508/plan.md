# Implementation Plan: Enhance Financial Projections and Dashboard Accuracy

## Phase 1: Verification and Testing
- [ ] Task: Audit existing financial logic in `App.tsx`
    - [ ] Verify tiered calculation for `calculateFinancials` matches contract exactly.
    - [ ] Check `getActualForPeriod` for edge cases (first log, zero logs).
- [ ] Task: Implement unit tests for financial utility functions
    - [ ] Write tests for `calculateFinancials`.
    - [ ] Write tests for `getActualForPeriod`.
- [ ] Task: Conductor - User Manual Verification 'Verification and Testing' (Protocol in workflow.md)

## Phase 2: Frontend Refinement
- [ ] Task: Enhance Dashboard UI for financial clarity
    - [ ] Add explicit tooltips explaining the "Prorated Allowance" calculation.
    - [ ] Improve readability of the tiered rates in the Settings view.
- [ ] Task: Optimize Chart rendering for 1D view
    - [ ] Ensure 1D view handles single-log days gracefully.
- [ ] Task: Conductor - User Manual Verification 'Frontend Refinement' (Protocol in workflow.md)
