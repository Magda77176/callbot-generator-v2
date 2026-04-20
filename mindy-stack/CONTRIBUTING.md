# 🤝 Contributing to CallBot Tom

## Branch Naming Convention

**All contributions must use the `mindy/*` prefix.**

```
✅ Good branch names:
- mindy/feature/spanish-language-support
- mindy/fix/emergency-detection-bug
- mindy/docs/api-reference-update
- mindy/perf/optimize-response-time

❌ Bad branch names:
- feature/new-thing
- bugfix/something
- my-feature
- tom-improvements
```

## Development Workflow

### 1. Create Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b mindy/feature/your-feature-name
```

### 2. Code Style Guide

#### JavaScript/TypeScript
```javascript
// ✅ Good
function collectPatientInfo(firstName, lastName, phoneNumber) {
  const patient = {
    firstName: firstName.trim(),
    lastName: lastName.trim(),
    phoneNumber: formatPhoneNumber(phoneNumber)
  };
  return patient;
}

// ❌ Avoid
function collectInfo(fn, ln, ph) {
  return {f: fn, l: ln, p: ph};
}
```

**Guidelines**:
- Use `const` by default, `let` for reassignment
- Name functions with clear intent
- Keep lines under 80 characters
- Use async/await over promises
- Add JSDoc comments for public functions

#### PHP (WordPress)
```php
<?php
// ✅ Good
class CallBot_Tom_Handler {
  public function collect_patient_data( $first_name, $last_name ) {
    return [
      'first_name' => sanitize_text_field( $first_name ),
      'last_name'  => sanitize_text_field( $last_name ),
    ];
  }
}

// ❌ Avoid
class Handler {
  function getData($f,$l) {
    return array($f,$l);
  }
}
```

**Guidelines**:
- Use snake_case for functions and variables
- Sanitize all user inputs
- Use proper escaping for output
- Follow WordPress coding standards
- Document with inline comments

### 3. Testing Requirements

All contributions must include tests:

```javascript
// test/patient-collection.test.js
describe('Patient Collection', () => {
  it('should collect valid patient data', () => {
    const data = collectPatientInfo('Jean', 'Dupont', '+33612345678');
    expect(data.firstName).toBe('Jean');
    expect(data.lastName).toBe('Dupont');
  });

  it('should validate phone number format', () => {
    expect(() => {
      collectPatientInfo('Jean', 'Dupont', 'invalid');
    }).toThrow('Invalid phone format');
  });
});
```

**Test Requirements**:
- Minimum 80% code coverage
- Test happy paths and error cases
- Use Jest or PHPUnit for testing
- Run tests locally before pushing: `npm test` or `composer test`

### 4. Pull Request Process

1. **Create PR with descriptive title**:
   ```
   feat(tom): add Spanish language support
   fix(webhook): correct timezone handling
   docs: update API reference
   ```

2. **PR Description Template**:
   ```markdown
   ## Description
   Brief description of changes

   ## Type of Change
   - [ ] Feature
   - [ ] Bug fix
   - [ ] Documentation
   - [ ] Performance improvement

   ## Testing
   How was this tested?

   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Tests pass (npm test)
   - [ ] No console errors
   - [ ] Documentation updated
   ```

3. **Request Review**:
   - Assign reviewers
   - Wait for approval
   - Address feedback

4. **Merge**:
   ```bash
   git checkout main
   git pull origin main
   git merge mindy/feature/your-feature
   git push origin main
   ```

## Code Review Expectations

Reviewers will check:

- ✅ Branch naming follows `mindy/*` convention
- ✅ Code style matches guidelines
- ✅ Tests are comprehensive
- ✅ No breaking changes
- ✅ Documentation is updated
- ✅ Conversation flow still works
- ✅ No credentials in code
- ✅ Performance acceptable

## System Prompt Modifications

If modifying `system-prompt.txt`:

1. **Never break the 5-step workflow**:
   - Accueil (Welcome)
   - Triage (Emergency check)
   - Besoin (Need assessment)
   - Collecte (Data collection)
   - Confirmation (Final confirmation)

2. **Test thoroughly**:
   ```bash
   npm test system-prompt.test.js
   ```

3. **Rules that must NEVER be broken**:
   - `JAMAIS SAUTER LES ETAPES` (Never skip steps)
   - `JAMAIS COUPER SANS CONFIRMATION` (Never hang up without confirmation)
   - `JAMAIS IGNORER URGENCE` (Never ignore emergency)
   - Temporal validation (prevent past dates)

## Services Configuration

Adding new dental services:

1. Update all 4 places:
   - `system-prompt.txt`
   - `example-config.json`
   - `README.md` (services list)
   - WordPress plugin settings

2. Include:
   - Service name
   - Price (€ format)
   - Duration (minutes)
   - Description

3. Example:
   ```json
   {
     "name": "Invisalign",
     "price": 3500,
     "duration": 120,
     "description": "Traitement d'alignement dentaire invisible"
   }
   ```

## Performance Guidelines

- Response time must stay < 2s
- API calls < 100ms
- Webhook delivery within 5s
- Audio quality at 16kHz minimum

Measure with:
```bash
npm run perf-test
```

## Documentation Standards

All public functions must be documented:

```javascript
/**
 * Collects patient information through voice conversation
 *
 * @param {string} firstName - Patient's first name
 * @param {string} lastName - Patient's last name
 * @param {string} phoneNumber - Phone number in E.164 format
 * @returns {Object} Patient data object
 * @throws {Error} If phone number is invalid
 *
 * @example
 * const patient = collectPatientInfo('Jean', 'Dupont', '+33612345678');
 */
function collectPatientInfo(firstName, lastName, phoneNumber) {
  // ...
}
```

## Release Process

1. Update version in `package.json`
2. Update `CHANGELOG.md`
3. Create git tag: `git tag v1.2.0`
4. Push with tags: `git push origin main --tags`
5. Create GitHub release with notes

## Questions?

- Check existing issues/PRs
- Ask in PR comments
- Email: contribute@ottomat.ai
- Documentation: https://docs.ottomat.ai/callbot-tom

Thank you for contributing! 🚀
