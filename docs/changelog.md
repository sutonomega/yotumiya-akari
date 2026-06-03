# Changelog

Yorumiya AI の大きな変更履歴です。
細かい作業メモではなく、設計や運用に影響する変更を中心に残します。

# Unreleased

## Planned

- ESP32 device integration
- Seasonal / weather-linked behavior improvements
- WebUI monitoring improvements

# v0.3.0 - 2026-06-03

## Added

- X auto posting support with OAuth1 client setup
- Time signal safety pipeline with danger-word detection, regeneration, random fallback, and fallback logging
- Configurable post schedule modes: `hourly`, `daily4`, and `custom`
- External config files for conversation category signals, personality rule signals, long-memory safety, and time-signal safety
- Prompt files for response pipeline base rules and personalization rules
- Time post dry-run script for local verification
- Architecture, roadmap, changelog, and ideas docs

## Changed

- Time-band handling now reuses `getCurrentState().timeText` instead of duplicating hour-based classification in scheduler-related logic
- `lifeRhythm.js` now controls eligible posting hours by settings while the scheduler still checks once per minute and fires on the configured minute, defaulting to minute 0
- Time signal generation now separates normal prompt, repair prompt, and fallback dictionary
- Config loaders now cache JSON after first read and expose reload helpers for explicit refresh
- Response pipeline prompts are now loaded from `prompts/` instead of being embedded directly in code
- `CHANGELOG.md` moved to `docs/changelog.md`

## Refactored

- X bot and Discord bot startup/posting flow separation
- Conversation category signals and instructions moved to `config/conversation_category.json`
- Personality rule signals and output rules moved to `config/personality_rules.json`
- Long-memory safety words moved to `config/long_memory_safety.json`
- Time signal safety checks moved to `functions/timeSignalSafety.js` and `config/time_signal_safety.json`

## Fixed

- Suppress accidental Analysis / Conversation Category / Mode / Relevant Memories output in generated posts
- Detect time duplication inside time signal body before posting
- Regenerate or fallback when generated time signal text mismatches the current time band
- Keep recent phrase suppression from damaging generated text
- Improve Ollama response handling and model switching stability

## Notes

- Use `postScheduleMode: "daily4"` to reduce SNS posting volume
- Use `postScheduleMode: "hourly"` for ESP32 or device-style hourly time signal output
- Time signal fallback events are recorded in `memory/time_signal_fallbacks.json`
- Cached JSON config changes require bot restart or an explicit reload helper call

# v0.2.0 - 2026-05-26

## Added

- Google Calendar provider
- ICS calendar provider
- Calendar timeout handling
- Calendar private event filtering
- X auto posting support
- dotenv support
- Runtime fallback handling
- Conversation category classification
- Recent expression suppression
- Memory retrieval system
- Memory importance management
- Nightly personality maintenance process
- Speech queue control
- Long-term memory re-summary system
- Lifestyle-based time signal system

## Changed

- Improve Japanese short phrase similarity filtering
- Improve runtime stability
- Improve repetition suppression behavior
- Improve personality drift suppression
- Improve state prompt handling
- Improve calendar provider robustness
- Improve prompt filtering behavior
- Improve response pipeline stability
- Improve 12-hour time formatting
- Improve model switching behavior

## Refactored

- LLM provider abstraction
- Multi-stage response pipeline
- Environment state integration
- Calendar provider abstraction
- State/save management cleanup
- Log system cleanup
- Personality rule distillation system
- Runtime cache management
- Calendar provider architecture

## Fixed

- finalReply generation issue
- Calendar timeout crash risk
- Invalid calendar URL handling
- Prompt filtering issue
- Runtime cache handling
- Similar phrase accumulation issue
- Personality repetition issue

## Notes

- Google Calendar / ICS integration is now supported.
- Runtime cache files are excluded from Git management.
- Long-running runtime behavior is under continuous observation.

# v0.1.0 - 2026-05-24

## Added

- UI system
- AI voice system
- Evaluation environment
- First verification run process

## Changed

- AI model configuration
- Prompt structure
- System adjustments

## Refactored

- General code refactoring
- Evaluation environment refactoring

## Fixed

- AI model switching issues
- Debugging source code
- Duplicate memory cleanup

# v0.0.0 - 2026-05-22

## Added

- Initial chat AI system
- Autonomous scheduled posting system
- Personality memory system
- Home server environment migration

## Improved

- Yorumiya personality flow
- Memory system behavior
- Personality chat flow
- Prompt optimization
- Server stability
- Ignore runtime memory files

## Refactored

- Chat architecture
- Memory architecture

## Fixed

- AI naming adjustments
- Spontaneous statement behavior
- README corrections
