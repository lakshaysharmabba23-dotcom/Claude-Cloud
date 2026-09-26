# Voice model

## Built only from the user's own writing

There is no "imitate a public figure" mode anywhere in this codebase - structurally, not just by policy. `analyzeVoice()` (`src/lib/voice/analyze.ts`) takes only `{ content, source }` samples the user pasted or uploaded; its system prompt states the constraint explicitly (*"You are not describing a public figure, a brand, or a generic 'LinkedIn voice' - only the specific writing given to you"*), and there is no code path anywhere that accepts a person's name, handle, or public profile as generation input for voice.

## The profile schema

`voiceProfileSchema` (`src/lib/types/schemas.ts`) covers every axis the spec asks for:

- `tone` (free-text tags, e.g. `["direct", "candid", "dry-humored"]`)
- `sentence_length` - average words + variance (low/medium/high)
- `paragraph_length` - average sentences + style (single_line/short/medium/long)
- `vocabulary` - complexity, jargon level, signature words
- `formality` (casual -> formal)
- `humor_level`, `storytelling_level`
- `formatting_style` - line breaks, bullets, bold, emoji, numbers/data, whether it asks questions, and a free-text description of CTA style
- `things_to_avoid` - explicit negative space (e.g. "corporate jargon", "unearned superlatives")
- `sample_count` - always populated, so the UI can show *how much* writing the profile is based on

Every field is validated by Zod before it's stored or used - a model response missing a required field, or using an out-of-enum value, is rejected and retried once (see `src/lib/ai/structured.ts`) rather than silently accepted.

## Adding samples and analyzing (`/voice`)

The Voice Lab UI (`src/app/voice/voice-lab.tsx`) lets you paste multiple writing samples into a queue, then "Analyze voice" in one call. `POST /api/voice/analyze`:

1. Loads any existing stored voice examples for the profile.
2. Combines them with the newly-submitted samples (so the profile reflects *all* writing so far, not just the latest batch).
3. Calls `analyzeVoice()` to produce a fresh structured profile.
4. Upserts the profile (`saveVoiceProfile`) and stores the new raw examples (`addVoiceExamples`) for future retrieval and re-analysis.

This means the profile is always a function of the full accumulated sample set, and re-running analysis after adding more samples refines rather than replaces prior signal.

## Where voice feeds into generation

`summarizeVoiceProfile()` turns the structured profile into one prompt-ready sentence (tone, formality, sentence/paragraph shape, vocabulary, humor, storytelling, formatting habits, CTA style) that both the generator and the critic use - so "does this match the target voice" is judged against the same description in both places. Separately, `runStudioPipeline()` retrieves a handful of the most topic-relevant stored voice examples (via `src/lib/embeddings/retrieval.ts`) and includes their *style*, explicitly instructing the generator not to copy their content - see `docs/generation.md`.

## Demo-mode voice

The seed data ships one `Demo Voice Profile` with 20 `[FICTIONAL WRITING SAMPLE]`-labeled examples (`src/lib/data/seed-data.ts`), so `/voice` and `/studio` have something real to show before you've added your own samples. Adding your own samples in the UI builds a second, refined profile the same way it would against a real provider - the only difference in demo mode is that `MockAIProvider`'s heuristic (word/sentence counts, punctuation, keyword presence) stands in for a real model's judgment.
