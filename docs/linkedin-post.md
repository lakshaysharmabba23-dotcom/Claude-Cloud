# LinkedIn post copy

Video: `docs/video/content-intelligence-agent.mp4` (39 sec, silent, 4:5 vertical). Post it as a native video upload.
Fill in the two `[...]` spots before posting. Check that every number matches what you can stand behind.

---

## Main post (recommended)

You can ask Claude to write a LinkedIn post.

So why did I build a whole system for it?

Because one prompt gives you a post. It does not give you:

- the sources behind the claims
- any idea what actually works
- someone checking the numbers
- a record of what you posted and how it did

In GTM, content is a channel. A channel needs a loop: research, ship, measure, repeat. A chat window has no loop. It forgets everything when you close it.

So I built the loop around the model.

Here is what it does:

1. Studies real posts from 10 GTM creators and turns them into reusable patterns. Hooks, structures, CTAs.
2. Researches your topic and keeps the real source links.
3. Writes with plain-language rules. No "leverage". No "game-changer".
4. A critic checks the draft. If a number is not in the research, it gets flagged.
5. You edit and approve. Nothing posts itself.
6. You type in the real results. After a few posts, it starts picking patterns by your own engagement.

The writing model is just one part, and you can swap it. The system around it is what I built.

Stack: Next.js, TypeScript, Supabase, Trigger.dev for background jobs, Zod to validate model output, Vercel, GitHub Actions. The model runs on Modal with NVIDIA as a backup. Built with Claude Code. 96 tests.

What broke along the way: timeouts, a memory crash caused by my own algorithm, and models that returned JSON in the wrong shape. Fixing those taught me more than the happy path did.

Honest limits: the demo uses sample data, finding patterns in new posts is still manual, and nothing can promise you the same reach as the creators it learned from. It gives you a better shot, not a guarantee.

If you post for GTM, which part of your process do you still do by hand?

---

## Short version (about 110 words)

You can ask Claude to write a LinkedIn post. So why build a system for it?

Because one prompt has no sources, no memory of what worked, and nobody checking the numbers.

So I built the loop around the model:

- learns patterns from real GTM creator posts
- researches your topic and keeps the source links
- a critic flags any number that is not in the research
- you approve every post
- you enter real results, and it picks patterns by what worked for you

Next.js, Supabase, Trigger.dev, Zod. 96 tests. Nothing posts itself.

The model is one swappable part. The system is the product.

What do you still do by hand in your content process?

---

## First comment

Repo and write-up: [link]

A few things I would like feedback on: how you check facts in AI-written posts, and whether a "flag any number not in the sources" rule feels strict enough.

---

## If someone asks "why not just use Claude?"

Short answer:
"I do use it. The writing step can be Claude or any other model. What I added is everything a chat can't do: real sources, a fact check on every number, an approval step, and a record of what performed so the next post starts from your own results."

One more line if they push:
"A chat gives you a draft. A system gives you a process you can repeat and measure."

---

## Why this matters in GTM (talking points)

- Founder-led content is a real channel, but most people run it on gut feel with no feedback loop.
- AI-written posts that sound generic cost trust. A fact check and plain-language rules protect your name.
- A repeatable process beats a lucky post. Logging results turns each post into data for the next one.
- Keeping a human in the approval step is not a weakness. It is the part buyers and employers trust.

---

## Posting notes

- Upload the video natively (not a link). Add captions or your own voiceover if you can. The video is silent.
- Post in the morning on a weekday in your audience's time zone.
- Do not name the creators the patterns came from. The app does not show them either.
- Be ready to say that the demo data is sample data. The video says "Demo mode - sample data" on the app screens.
- The bar chart in the video is labelled "Illustrative example". Do not present those numbers as real results.
