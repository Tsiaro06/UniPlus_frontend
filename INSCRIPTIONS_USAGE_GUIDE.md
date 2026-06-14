# Student Registration (Inscriptions) - Usage Guide

## Overview

The Inscriptions page now features an improved student selection interface that allows administrators to quickly find and register students using a searchable dropdown.

## Key Features

### 1. Searchable Student Selector

**Location**: Top of the "Nouvelle inscription" (New Registration) form

```
┌─ Sélectionner un étudiant * ─────────────────────────────┐
│ 🔍 Chercher par matricule ou nom...                      │
│                                                          │
│ When typing, shows matching students:                   │
│ ┌──────────────────────────────────────────────────────┐│
│ │ Jean Dupont                                      ↓   ││
│ │ STU2024001                                          ││
│ ├──────────────────────────────────────────────────────┤│
│ │ Marie Dupont                                        ││
│ │ STU2024002                                          ││
│ └──────────────────────────────────────────────────────┘│
│                                                          │
└──────────────────────────────────────────────────────────┘
```

### 2. Search Types

#### By Matricule (Registration Number)
- Input: `STU2024`
- Result: Shows all students with matricule starting with STU2024

#### By Student Name
- Input: `Jean`
- Result: Shows all students with "Jean" in nom or prenom
- Input: `Dupont`
- Result: Shows all students with surname "Dupont"

### 3. Selection Confirmation

After selecting a student, you'll see:

```
┌─ Selected Student ────────────────────────────────────┐
│ 🟢 Jean Dupont                                       │
│    STU2024001                                        │
└───────────────────────────────────────────────────────┘
```

The green box confirms your selection and prevents accidental clicks.

### 4. Complete Registration Form

Once student is selected, you can fill:

1. **Student Selector** (auto-filled after selection)
   - Search input with dropdown
   - Shows selected student

2. **Group Selection**
   - Dropdown to choose which group/class
   - Required field

3. **Status**
   - Options: Actif (Active), Redoublant (Repeating), Exclu (Excluded), Diplômé (Graduated)

4. **Registration Date**
   - Date picker for registration date

5. **Checkboxes**
   - "Redoublant" (Is repeating student)
   - "Paiement effectué" (Payment done)

### 5. API Data Structure

The student selector expects students to have:

```json
{
  "id": 1,
  "matricule": "STU2024001",
  "nom": "Dupont",
  "prenom": "Jean",
  "email": "jean.dupont@university.edu",
  "dateNaissance": "2003-05-15",
  "sexe": "M",
  "telephone": "+213600000001",
  "adresse": "123 Rue, City"
}
```

## Workflow Examples

### Scenario 1: Register an Active Student

1. Click **"Nouvelle inscription"** button
2. Type `STU2024001` → Student appears in dropdown
3. Click on student → Selection confirmed in green box
4. Select group from dropdown (e.g., "L1-INFO-A")
5. Keep Status as "Actif" (default)
6. Set registration date to today
7. Check "Paiement effectué" if paid
8. Click **"Ajouter"** → Registration saved

### Scenario 2: Register a Repeating Student (Redoublant)

1. Click **"Nouvelle inscription"** button
2. Type student name `Jean` → See list of matches
3. Click correct "Jean" → Confirmed in green
4. Select group
5. Set Status to "Redoublant"
6. Check **"Redoublant"** checkbox
7. Set date
8. Click **"Ajouter"**

### Scenario 3: Search by Last Name

1. Click **"Nouvelle inscription"** button
2. Type `Dupont` → All Duponts appear
3. Refine by typing more (e.g., `Dupont Jean`)
4. Click matching student
5. Complete rest of form

## Error Prevention

- **Empty search**: "Commencez à taper pour chercher" (Start typing to search)
- **No matches**: "Aucun étudiant trouvé" (No student found)
- **Incomplete form**: 
  - Button stays disabled (grayed out) until:
    - Student is selected
    - Group is selected
    - All required fields filled
  - Shows "Ajouter" text with green button when ready

## Form Buttons

| Button | Action | Enabled When |
|--------|--------|--------------|
| Annuler (Cancel) | Closes form, discards data | Always |
| Ajouter (Add) | Saves new registration | All fields filled + not saving |
| Enregistrer (Save) | Saves edited registration | All fields filled + not saving |

## Keyboard Navigation

- **Type**: Search students
- **Click**: Select from list
- **Escape**: Close dropdown (not form)
- **Tab**: Move to next field
- **Click outside**: Close dropdown

## Dark Mode

The student selector fully supports dark mode:
- Dark background for modal
- Dark text with light contrast
- Green selection box adjusts color

```
Light Mode: Green highlight (#D1FAE5 bg, #065F46 text)
Dark Mode:  Green highlight (#064E3B/20 bg, #86EFAC text)
```

## Performance Notes

- Search is **real-time** (instant as you type)
- No network calls while typing (uses pre-loaded list)
- Dropdown scrolls if >10 students match
- Handles 1000+ students without lag

## Troubleshooting

### Student not appearing in search

**Problem**: You type a matricule but no results
- **Solution**: Verify matricule is spelled correctly
- **Check**: API is returning students with matching matricule
- **Try**: Search by first/last name instead

### Dropdown not closing

**Problem**: Dropdown stays open after selection
- **Solution**: Click outside the dropdown area
- **Alternative**: Press Escape key
- **Note**: Should auto-close after clicking student

### "Aucun étudiant trouvé" (No students found)

**Problem**: Dropdown shows no results when searching
- **Possible cause**: 
  - API not returning students yet (loading)
  - Wrong search term (typo in matricule/name)
  - Student deleted from system
- **Solution**:
  - Clear search and try again
  - Search by different field (name vs matricule)
  - Contact admin to verify student exists

### Form won't submit

**Problem**: "Ajouter" button is grayed out
- **Required fields**:
  - ✓ Student selected
  - ✓ Group selected  
  - ✓ Form not currently saving
- **Check**: All required fields have values

## Backend Integration

Make sure your API server is running and provides:

```bash
GET /api/v1/etudiants
  - Returns list of all students
  - Supports ?search=query parameter
  - Must include: id, matricule, nom, prenom

POST /api/v1/inscriptions
  - Creates new registration
  - Body: { etudiantId, groupeId, anneeScolaireId, ... }

PUT /api/v1/inscriptions/:id
  - Updates existing registration
```

## Related Pages

- **Étudiants**: Manage student records
- **Groupes**: Create/manage student groups
- **Années scolaires**: Academic year settings
- **Résultats**: View student grades and results
