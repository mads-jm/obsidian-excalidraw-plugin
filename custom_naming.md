# Custom File Naming Implementation

## Completed Tasks ✅

### Settings Implementation
- [x] Added `ExcalidrawSettings` interface properties:
  ```typescript
  enableCustomFileNamePattern: boolean;
  customFileNamePattern: string;
  fileNamePlaceholders: {
    noteName: string;
    dateTime: string;
    imageName: string;
    customKey: string;
  };
  allowedPlaceholders: string[];
  safeFileNameCharacters: string;
  maxFileNameLength: number;
  fallbackFileNamePattern: string;
  hasMigratedToCustomNaming: boolean;
  ```

- [x] Implemented settings UI with:
  - Custom pattern input field
  - Placeholder documentation section
  - Individual placeholder configuration fields
  - Safe characters and max length settings
  - Fallback pattern setting

## Remaining Tasks 📝

### Core Functionality
- [ ] Implement placeholder parsing utility functions
- [ ] Update `getDrawingFilename()` to support placeholders
- [ ] Add validation for custom patterns
- [ ] Implement fallback pattern handling

### Additional Placeholders
- [ ] Implement Obsidian file property placeholders:
  - [ ] `{FILE_PATH}` - Full path of the file
  - [ ] `{FILE_NAME}` - Name without extension
  - [ ] `{FILE_EXT}` - File extension
  - [ ] `{FOLDER_PATH}` - Path of the containing folder
  - [ ] `{FOLDER_NAME}` - Name of the containing folder
  - [ ] `{TAGS}` - File tags
  - [ ] `{FRONTMATTER:key}` - Frontmatter property value
  - [ ] `{PROPERTY:key}` - File property value
  - [ ] `{CUSTOM_PROPERTY:key}` - User-defined property value

### Settings & UI
- [ ] Add pattern preview functionality
- [ ] Add validation feedback in UI
- [ ] Add migration path for existing settings
- [ ] Add settings migration function
- [ ] Add UI for configuring custom property placeholders

### Testing
- [ ] Unit tests for placeholder parsing
- [ ] Unit tests for filename generation
- [ ] Integration tests for settings UI
- [ ] Migration tests
- [ ] Edge case testing
- [ ] Tests for new placeholder types

### Documentation
- [ ] Update plugin documentation
- [ ] Add examples for common patterns
- [ ] Document migration process
- [ ] Add troubleshooting guide
- [ ] Document new placeholder types and usage

## Current Placeholder Support
- `{NOTE_NAME}` - Name of the attached note
- `{DATE:format}` - Timestamp with custom format (e.g. YYYY-MM-DD HH.mm.ss)
- `{IMAGE_NAME}` - Original image name
- `{imageNameKey}` - Custom user-defined property of the file

## Planned Placeholder Support
- `{FILE_PATH}` - Full path of the file
- `{FILE_NAME}` - Name without extension
- `{FILE_EXT}` - File extension
- `{FOLDER_PATH}` - Path of the containing folder
- `{FOLDER_NAME}` - Name of the containing folder
- `{TAGS}` - File tags
- `{FRONTMATTER:key}` - Frontmatter property value
- `{PROPERTY:key}` - File property value
- `{CUSTOM_PROPERTY:key}` - User-defined property value

## Example Patterns
```
embed_{DATE:YYYY-MM-DD_HH-mm-ss}_{NOTE_NAME}
{DATE:YYYY-MM-DD_HH-mm-ss}_{imageNameKey}
{FOLDER_NAME}/{FILE_NAME}_{DATE:YYYY-MM-DD}
{FRONTMATTER:category}/{FILE_NAME}_{TAGS}
``` 