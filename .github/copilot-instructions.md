# Copilot Instructions for Directional Skills Educational Game

<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

## Project Context
This is an educational web game project designed to teach directional key controls to college students with physical and learning difficulties. The project prioritizes accessibility, educational value, and inclusive design above all other considerations.

## Core Development Principles

### Accessibility First
- Every feature must be accessible via keyboard, switch control, and eye-gaze
- WCAG 2.1 AA compliance is mandatory, not optional
- Screen reader compatibility required for all interface elements
- Test with real assistive technology, not just automated tools

### Educational Focus
- The game is a learning tool, not entertainment software
- Positive reinforcement and encouragement are essential
- Progressive difficulty must support diverse learning needs
- Student confidence building is as important as skill development

### Technical Constraints
- Browser-based deployment (no installation required)
- Must work on older college computers
- GitHub Pages hosting only
- No external dependencies or databases
- GDPR-compliant local storage only

## Key Reference Files
Always refer to these instruction files when working on any component:

1. **copilot-instructions/project-context.md** - Overall project goals and user needs
2. **copilot-instructions/accessibility-requirements.md** - Accessibility standards and implementation
3. **copilot-instructions/game-mechanics.md** - Educational game design principles
4. **copilot-instructions/input-handling.md** - Multi-input system specifications
5. **copilot-instructions/testing-guidelines.md** - Comprehensive testing procedures

## Code Generation Guidelines

### HTML Structure
- Use semantic HTML elements (`<main>`, `<section>`, `<button>`)
- Include proper ARIA labels and roles
- Ensure logical heading hierarchy (h1, h2, h3)
- Provide skip links for keyboard navigation

### CSS Approach
- Mobile-first responsive design
- CSS custom properties for theming
- High contrast mode support
- Reduced motion preferences
- Minimum 44px touch targets

### JavaScript Standards
- Vanilla JavaScript only (no frameworks)
- Progressive enhancement approach
- Comprehensive error handling
- Input method abstraction
- Performance optimization focus

### Accessibility Implementation
- Always include ARIA live regions for dynamic content
- Implement proper focus management
- Provide visual and audio feedback options
- Support multiple input methods simultaneously
- Test keyboard navigation in every feature

## Input Handling Priority
1. **Keyboard**: Arrow keys and WASD (primary input method)
2. **Switch Control**: Single and dual switch with scanning
3. **Eye-Gaze**: Dwell time activation with visual feedback
4. **Touch**: Large targets for tablet compatibility

## Testing Requirements
- Include accessibility tests with every feature
- Test on actual assistive technology
- Validate performance on older hardware
- Cross-browser compatibility verification
- User testing with target students

## File Organization
- Keep related functionality in focused modules
- Comment code extensively for educational clarity
- Include JSDoc documentation for all functions
- Maintain clean separation between game logic and accessibility features

## Emergency Accessibility Features
Always implement these escape mechanisms:
- ESC key returns to safe state
- Alt+M provides emergency menu access
- Ctrl+H offers context-sensitive help
- Clear visual and audio indicators for all states

## Performance Standards
- Maintain 60 FPS minimum
- Input latency under 16ms
- Load time under 2 seconds
- Smooth animations with reduced motion options
- Efficient memory usage patterns

When generating code, prioritize student needs and learning outcomes. Every line of code should contribute to creating an inclusive, educational experience that builds confidence and independence in digital navigation skills.
