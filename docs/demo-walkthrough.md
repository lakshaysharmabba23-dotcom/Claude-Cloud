# Walkthrough script (3 to 5 minutes)

Record in the live app (or in demo mode, where every record is labelled sample data). Keep the browser at about 1440 px wide. Speak plainly.

## Before you record (2 minutes)
- Open the app once and sign in with the password so the browser remembers it.
- Open `/studio` in a second tab and generate once so the first call is warm (the model can be slow on a cold start).
- Close extra tabs. Light theme looks best on screen.
- Real mode: confirm the Studio runs end to end first. Demo mode: the banner at the top says everything is sample data. Say so out loud.

## Script

**0:00 - Intro (20 sec)** `/dashboard`
"This is a LinkedIn content intelligence tool. Instead of 'type a topic, get a post', it studies what works in real creator posts, writes in a plain voice, checks its own draft, and a person approves everything. Nothing is posted automatically."
Point at the pipeline numbers: posts analysed, patterns, drafts, published, results.

**0:20 - Patterns (50 sec)** click *Patterns*
"From real creator posts I built a pattern library: hooks, structures, storytelling styles, evidence and calls to action. Each pattern has a description, a structure and real examples." Open one pattern.
Be honest: "The library is curated by hand for now. Extracting patterns from new posts automatically is built but not wired into the screen yet."

**1:10 - Voice (30 sec)** click *Voice*
"The voice profile describes how the writing should sound: tone, sentence length, formatting. The shipped profile is a labelled sample. You paste your own writing here to replace it."

**1:40 - Studio, generate (60 sec)** click *Studio*
"Pick a topic, an audience, an objective and a length." Click *Generate*.
While it runs: "It searches the web and recent Hacker News threads, keeps the real source links, picks a pattern, and writes using a plain-language copywriting prompt. This runs as a background job, so it can take a minute or two."

**2:40 - Critique and sources (45 sec)**
Point at the post, then the research sources, then the critique chips.
"Every check is named: relevance, specificity, evidence, originality, voice match and more. There is no single magic score. It also flags any number that does not appear in the research, so invented statistics get caught."

**3:25 - Edit, save and approve (40 sec)**
Change a line, click *Save edit* (it links to Drafts), then *Approve & record as published*. Open *Drafts* to show where every saved post lives, and use *Copy post*.
"A person always decides. Approving records the post as published. It is safe to click twice."

**4:05 - Analytics (30 sec)** click *Analytics*
Enter impressions, likes, comments, reposts and click *Save snapshot*.
"Results are typed in from LinkedIn's own analytics. Nothing is estimated. The tables show sample size and confidence, and they are described as 'associated with', not 'caused by'. Once a pattern has three recorded posts, the Studio starts picking patterns by your own engagement."

**4:35 - Close (15 sec)**
"Stack: Next.js, TypeScript, Supabase, Trigger.dev, Zod. Password-protected, row-level security on, 96 tests. The full engineering audit and the list of known limits are in the repo."

## Things to avoid saying
- Do not promise the same engagement as the creators in the library.
- Do not call the voice profile "my voice" unless you added your own writing.
- If the research for your topic comes back thin, say so. It is a real limit, not a bug to hide.
