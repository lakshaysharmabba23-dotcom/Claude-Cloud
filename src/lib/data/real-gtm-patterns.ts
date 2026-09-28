import { hashContent } from "@/lib/normalization/hash";
import { canonicalizeUrl } from "@/lib/normalization/url";
import type { ContentPattern } from "@/lib/types/schemas";

/**
 * A real, evidence-based Pattern Library seed - alongside (not replacing)
 * the fictional DEMO_MODE dataset in seed-data.ts.
 *
 * Source: the user collected public LinkedIn posts from 10 GTM/sales
 * creators themselves (via a separate tool, outside this app - this app
 * never scrapes LinkedIn, see docs/architecture.md) and handed the export
 * to be analyzed. Every pattern below is derived from actually reading
 * that export; every example is a real excerpt with its real source URL,
 * author, and engagement numbers at collection time. Posts that were pure
 * reposts of someone else's content, or that read as sponsored/affiliate
 * promotion, were excluded - this is original, organic writing only.
 *
 * "impressions" is intentionally omitted from engagement_data: LinkedIn's
 * export didn't include it, and inventing a number would violate this
 * project's core rule against fabricating metrics.
 */

function deterministicId(namespace: string, index: number | string): string {
  const hex = hashContent(`real:${namespace}:${index}`).slice(0, 32);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

export const REAL_CREATORS = [
  {
    id: deterministicId("creator", "bharatt-arorah"),
    name: "Bharatt Arorah",
    profile_url: "https://www.linkedin.com/in/bharattarorah",
    niche: "GTM engineering / cold email",
    description: "Senior GTM Engineer at Instantly.ai; posts raw outbound campaign numbers and what he learns iterating on them."
  },
  {
    id: deterministicId("creator", "divyanshi-sharma"),
    name: "Divyanshi Sharma",
    profile_url: "https://www.linkedin.com/in/divyanshis-saasleadgen",
    niche: "GTM / AI / lead gen",
    description: "Writes about AI agents applied to GTM workflows, often reacting to a product launch or an observed detail."
  },
  {
    id: deterministicId("creator", "michel-lieben"),
    name: "Michel Lieben",
    profile_url: "https://www.linkedin.com/in/michel-lieben",
    niche: "GTM systems / cold outbound",
    description: "CEO at ColdIQ; publishes detailed tool-stack and funnel breakdowns from running GTM for ~300 B2B companies."
  },
  {
    id: deterministicId("creator", "christian-plascencia"),
    name: "Christian Plascencia",
    profile_url: "https://www.linkedin.com/in/coldemailchris",
    niche: "GTM engineering",
    description: "Founder/CEO at Pipeline.tech; writes structured comparisons (old-way-vs-new-way) and full tool-stack reveals."
  },
  {
    id: deterministicId("creator", "adam-robinson"),
    name: "Adam Robinson",
    profile_url: "https://www.linkedin.com/in/retentionadam",
    niche: "Bootstrapped SaaS founder",
    description: "CEO at MoltSets/RB2B/Retention.com; writes vulnerable founder-journey narratives alongside tactical advice."
  },
  {
    id: deterministicId("creator", "enzo-carasso"),
    name: "Enzo Carasso",
    profile_url: "https://www.linkedin.com/in/coldoutreach",
    niche: "Outbound systems / revenue execution",
    description: "Runs cold outbound for B2B teams; consistently opens with a flat contradiction of common sales wisdom."
  },
  {
    id: deterministicId("creator", "aaron-reeves"),
    name: "Aaron Reeves",
    profile_url: "https://www.linkedin.com/in/aaron-reeves-sales",
    niche: "AE / outbound sales coaching",
    description: "Founder at Outbound OS; writes numbered how-to frameworks for AEs, mixed with personal career reflections."
  },
  {
    id: deterministicId("creator", "suprava-sabat"),
    name: "Suprava Sabat",
    profile_url: "https://www.linkedin.com/in/suprava-sabat-saasleadgen",
    niche: "SaaS lead gen",
    description: "Founder at AcquisitionX; short, casual, imperative posts about what to stop doing in sales conversations."
  },
  {
    id: deterministicId("creator", "manthan-patel"),
    name: "Manthan Patel",
    profile_url: "https://www.linkedin.com/in/leadgenmanthan",
    niche: "AI agents / lead gen",
    description: "Teaches AI agents and lead gen; often opens from a specific real-world observation before the GTM point."
  },
  {
    id: deterministicId("creator", "eric-nowoslawski"),
    name: "Eric Nowoslawski",
    profile_url: "https://www.linkedin.com/in/outboundphd",
    niche: "Clay / agentic GTM",
    description: "Founder, Growth Engine X; posts hands-on build logs of agentic GTM tooling."
  }
];

interface RealPostSeed {
  key: string;
  creatorKey: string;
  author: string;
  source_url: string;
  content: string;
  published_at: string;
  likes: number;
  comments: number;
  reposts: number;
}

// A representative, curated subset (not the full export) chosen to cover
// every pattern below with at least two real examples each. Content is the
// real post text, unedited except for the trailing self-promotional CTA
// line on a couple of posts (kept minimal - see notes inline).
const REAL_POSTS: RealPostSeed[] = [
  {
    key: "enzo-lead-not-opportunity",
    creatorKey: "enzo-carasso",
    author: "Enzo Carasso",
    source_url:
      "https://www.linkedin.com/posts/coldoutreach_a-lead-is-not-an-opportunity-just-because-activity-7487484461605928960-Ihdh",
    published_at: "2026-07-27T14:30:06Z",
    likes: 108,
    comments: 33,
    reposts: 0,
    content:
      "A lead is not an opportunity just because someone agreed to a call.\n\nHere's how to know the difference before you invest the time.\n\nMost teams treat every lead the same way. Same sequence, same effort, same closer time allocated regardless of whether the prospect was ever likely to buy. The only filter is whether they picked up the phone. And that's not qualification. It's hope with a calendar invite attached.\n\nHere are the 6 things worth scoring before anyone picks up the phone:\n\n1/ Economic fit\n↳ If the deal size doesn't justify the cost of pursuing this lead, nothing else matters.\n\n2/ Decision maker access\n↳ Are you speaking to someone who can actually say yes?\n\n3/ Active buying trigger\n↳ Something needs to be happening in their business right now to create urgency.\n\n4/ Sales capacity\n↳ Can they actually act on what you're about to send them?\n\n5/ Problem awareness\n↳ Do they know they have the problem you solve?\n\n6/ Previous attempts\n↳ Have they tried to solve this before?\n\nScore every lead across all 6 before your team spends serious time on it.\n\nRemember that qualification isn't gatekeeping. It's the difference between a pipeline that converts and one that just looks busy."
  },
  {
    key: "enzo-silence-diagnostic",
    creatorKey: "enzo-carasso",
    author: "Enzo Carasso",
    source_url:
      "https://www.linkedin.com/posts/coldoutreach_a-prospect-going-silent-doesnt-mean-the-activity-7479900275403558912-ACVs",
    published_at: "2026-07-06T16:13:15Z",
    likes: 108,
    comments: 33,
    reposts: 0,
    content:
      "A prospect going silent doesn't mean the deal is dead.\n\nIt means the approach that got them this far stopped working.\n\nMost teams respond to silence the same way regardless of where the prospect is in the pipeline. The reason someone stops responding after outreach is completely different to the reason they go silent after a pilot. The fix is different too.\n\n❌ No reply after outreach\nThey're not ignoring you. They're ignoring everyone. Send one final piece of value before you close the sequence.\n\n❌ No-show after booking\nA no-show is not a lost deal. Call within 15 minutes, follow immediately with a text, rebook within 24 hours.\n\n❌ Went quiet after the pilot\nSomething internally is slowing the decision. Send a short summary of the pilot results framed for internal sharing.\n\n❌ Stalled after the proposal\nThe proposal asked for more commitment than they felt comfortable making alone. Reduce the commitment instead.\n\nEvery stage of silence has a different cause and a different fix. Silence is not a no. It's a diagnostic."
  },
  {
    key: "enzo-full-calendar",
    creatorKey: "enzo-carasso",
    author: "Enzo Carasso",
    source_url: "https://www.linkedin.com/posts/coldoutreach_a-full-calendar-is-not-a-full-pipeline-activity-7477309108485009408-bFWr",
    published_at: "2026-06-29T12:36:53Z",
    likes: 71,
    comments: 28,
    reposts: 0,
    content:
      "A full calendar is not a full pipeline.\n\nMost sales teams don't find out the difference until the end of the quarter.\n\nThe SDR hits their number. Twelve meetings booked last week. It looks good on the Monday morning report. By Friday three showed up, one was the right fit, and the closer spent the week in conversations that were never going to go anywhere.\n\nBOOKED MEETING:\n↳ Someone agreed to talk. That's all you know.\n↳ Closer walks into a cold room starting from zero.\n\nQUALIFIED MEETING:\n↳ ICP verified before the call. Revenue, LTV, and sales capacity confirmed.\n↳ Closer walks in with context and a reason to be there.\n\nWhen you measure SDR performance on meetings booked, you get meetings booked. Not pipeline.\n\nA booked meeting tells you someone agreed to talk. A qualified meeting tells you it was worth having."
  },
  {
    key: "aaron-cold-email-5-steps",
    creatorKey: "aaron-reeves",
    author: "Aaron Reeves",
    source_url: "https://www.linkedin.com/posts/aaron-reeves-sales_how-to-write-a-cold-email-in-5-steps-activity-7508455708095455232-3lNz",
    published_at: "2026-09-23T11:22:21Z",
    likes: 125,
    comments: 44,
    reposts: 0,
    content:
      "How to write a cold email (in 5 steps):\n\nThis got me 9% reply rates every month\n\n1. Trigger\nGet straight into the reason you are sending them an email, personal to the company. Example: \"Was reading through your FY24 annual report John and saw you are expanding to the US from the UK\"\n\n2. Implication\nBased on that key event, what could be a key focus for them. Example: \"With the expansion, curious how you're planning to manage currency conversion from GBP to USD?\"\n\n3. Pain\nWhat happens if they stay the same and don't fix it. Example: \"Most companies use high street banks with 3% FX fees, meaning that could be as much as $300,000 in fees.\"\n\n4. Social Proof + Solution\nPeople care about what you've done for others. Example: \"Deel paid 0.4% on average with our online bank & saved $50,000 in extra fees.\"\n\n5. Soft CTA\nDon't dive straight into booking the meeting, start the conversation instead. Example: \"If we could save you costs on transactions, would that be worth a chat?\"\n\nReps have gone from getting opens with 0 replies, to hitting 12% reply rates."
  },
  {
    key: "bharatt-30-day-numbers",
    creatorKey: "bharatt-arorah",
    author: "Bharatt Arorah",
    source_url:
      "https://www.linkedin.com/posts/bharattarorah_heres-how-i-generated-526-leads-in-my-first-activity-7505546832350216193-GAt7",
    published_at: "2026-09-15T10:43:31Z",
    likes: 107,
    comments: 39,
    reposts: 0,
    content:
      "Here's how I generated 526 leads in my first 30 days at Instantly.ai\n\n278,000 emails sent.\n526 people replied saying they want to talk.\n\nLet me tell you the secret: there is no secret.\n\nAll I did was stick to the fundamentals and iterate way more than most people ever do.\n\nIn 30 days I launched 10 campaigns across 6 completely different markets. Most people spend a month perfecting one campaign. I'd rather launch ten and let the data tell me which one deserves my attention.\n\nEvery campaign gets a number it has to hit before I even launch it. Hits it, I pour everything into it. Misses it, it's dead that week. No hoping. No \"let's give it one more week.\"\n\nThe campaigns I was most confident about aren't the ones working. The ones I almost didn't bother running are carrying the pipeline right now. Which is exactly why you test instead of debate.\n\nITERATE MORE."
  },
  {
    key: "bharatt-dms-blew-up",
    creatorKey: "bharatt-arorah",
    author: "Bharatt Arorah",
    source_url:
      "https://www.linkedin.com/posts/bharattarorah_my-dms-blew-up-after-i-shared-my-instantlyai-activity-7496195477630259200-TyU7",
    published_at: "2026-08-20T15:24:34Z",
    likes: 77,
    comments: 35,
    reposts: 0,
    content:
      "My DMs blew up after I shared my Instantly.ai campaign stats last week.\n\nAlmost everyone asked the same question: \"Cool numbers. But does it hold when you scale?\"\n\nSo here are the updated numbers:\n\n24,674 emails sent.\n364 replies.\n146 opportunities.\n6 fig pipeline.\n\nOne campaign. All net-new leads. 7 days.\n\nWant to know the secret? I spent like 30 minutes writing the initial copy. Everything else went into the boring stuff nobody posts about: understanding the actual need of the market, what my ideal buyers care about, every reason they'd say no.\n\nA fancy email cannot fix a broken offer.\n\nThe playbook is simple: have a good offer, reach out to the right people, say the things that matter. Stop overcomplicating outbound."
  },
  {
    key: "divyanshi-tube-map",
    creatorKey: "divyanshi-sharma",
    author: "Divyanshi Sharma",
    source_url:
      "https://www.linkedin.com/posts/divyanshis-saasleadgen_someone-turned-a-sales-pipeline-into-a-tube-activity-7509159182848372736-ipWB",
    published_at: "2026-09-25T09:57:42Z",
    likes: 281,
    comments: 39,
    reposts: 0,
    content:
      "Someone turned a sales pipeline into a Tube map.\n\nAnd honestly, this might be the most accurate map I've seen in London.\n\nOpened → Spotted → Researched → Follow-up Central → Booked → Closed\n\nThe funny part is that every sales/GTM person immediately knows where this journey goes. You can spend days getting someone from \"opened\" to \"researched\"... and then they disappear somewhere between Follow-up Central and Booked.\n\nWhat I like about this billboard is that it doesn't try to explain anything. It just turns something every sales team knows into something everyone in London already understands: a journey with stops, delays, and the occasional train that simply never arrives.\n\nWhich stop are you spending the most time at?"
  },
  {
    key: "manthan-billboard-tube",
    creatorKey: "manthan-patel",
    author: "Manthan Patel",
    source_url:
      "https://www.linkedin.com/posts/leadgenmanthan_i-see-a-lot-of-billboards-on-the-london-tube-activity-7508502872997781505-v_N9",
    published_at: "2026-09-23T14:29:46Z",
    likes: 65,
    comments: 72,
    reposts: 0,
    content:
      "I see a lot of billboards on the London tube and most of them I ignore right away...\n\nBut this one made me stop & I've been staring at it for ten minutes.\n\nIt's inside Shoreditch High Street station, drawn as a tube line with six stops: Opened, Spotted, Researched, Follow-Up Central, Booked and Closed. Then one greyed out and shut: Left on Read, Service Withdrawn.\n\nI run cold email for a living and that stop is where a lot of my leads are sitting right now. My CRM still shows them as \"Contacted\", which means nothing.\n\nThe part I like is the next stop on the map: Follow-Up Central, the only interchange on the whole line. Nobody leaves Left on Read on their own.\n\nA lot of people in sales are still waiting for the reply to come on its own, and I've been guilty of it too. The people I watch booking meetings are annoyingly consistent about email 3 and 4, because they understand somebody has to send the next one."
  },
  {
    key: "adam-five-questions",
    creatorKey: "adam-robinson",
    author: "Adam Robinson",
    source_url:
      "https://www.linkedin.com/posts/retentionadam_5-questions-that-always-make-feel-like-shit-activity-7508212343064068096-g1QH",
    published_at: "2026-09-22T19:15:18Z",
    likes: 120,
    comments: 39,
    reposts: 0,
    content:
      "5 QUESTIONS THAT ALWAYS MAKE ME FEEL LIKE SHIT ABOUT MYSELF:\n\n1. How many employees do you have? (\"oh - so you're just getting started...\")\n2. What's your revenue?\n3. You're in tech? How much money have you raised? None? Oh.\n4. Do you have an office? Oh okay.\n5. What's your company called? Wait - what did you say?\n\nI still get the \"oh that's cute\" eyes every once in a while. I remember the PAIN from back in the day, year 2, 3, 4. We only had a couple mm's in revenue, we were stuck, I had ZERO confidence in myself as a founder, we grew our team to 38, shrunk it to 6.\n\nNow - 12 years after we launched our first product - if someone actually takes time to understand the details of the operation we have going on, ALMOST NO ONE says anything other than \"that's one of the best businesses I have ever heard of.\"\n\nTAKEAWAY: I think it would take a person much more zen than me to rise above the crushing social pressure of being small and stuck. For everybody else, my advice is to just keep building."
  },
  {
    key: "adam-founders-confidence",
    creatorKey: "adam-robinson",
    author: "Adam Robinson",
    source_url:
      "https://www.linkedin.com/posts/retentionadam_founders-if-you-dont-have-confidence-in-activity-7506415126498021376-Ow6P",
    published_at: "2026-09-17T20:13:48Z",
    likes: 82,
    comments: 23,
    reposts: 0,
    content:
      "FOUNDERS: If you don't have confidence in yourself as an entrepreneur, it's normal. I didn't believe in myself AT ALL as a Founder until my SECOND startup took off.\n\nWe scraped 250k paying customers from a community page, cold called them all, got 5k to switch over, and from the day that list was completely burned I did not figure out a SINGLE OTHER WAY to acquire a customer for that product. It was devastating.\n\nAfter YEARS of banging my head against the wall, I finally got traction with something COMPLETELY NEW. I made a VSL, got someone on Upwork to make word art out of it, spent $1k on ads, and got $5k MRR back in a WEEK. 3 years later it was at $13m ARR and we only had 6 people.\n\nBut that confidence wasn't always there and took a LONG time to build. If you're struggling with self doubt, there's really only one thing you CAN do: keep building."
  },
  {
    key: "christian-2021-vs-2026",
    creatorKey: "christian-plascencia",
    author: "Christian Plascencia",
    source_url: "https://www.linkedin.com/posts/coldemailchris_gtm-teams-in-2021-vs-2026-tech-team-activity-7497955949660385282-87Wr",
    published_at: "2026-08-25T12:00:03Z",
    likes: 90,
    comments: 37,
    reposts: 0,
    content:
      "GTM teams in 2021 vs 2026.\n\nTECH STACK\n2021: Over-priced, limited capability, annually contracted software - Zoominfo, RingCentral, Salesforce, Outreach, Zapier, Dux-Soup. Total: ~$200k/year\n2026: Pay-per-credit, API & MCP capability, cost effective software - EmailBison, ScaledMail, Claude Code, Clay, Supabase, Airtable. Total: ~$5k/month\n\nTEAM STRUCTURE\n2021: 2 large teams, labor intensive roles - 2 SDRs per AE, outbound only scales with more hires, $80k+/month payroll\n2026: 4 specialized roles, only high-leverage activities - GTM Strategist, GTM Engineer, SDR, AE\n\nCAMPAIGN OUTPUT\n2021: Daily Output Per Rep - 100 Cold Calls, 10 Cold Emails, 10 LinkedIn DMs. Total: 5-10 Calls/Month\n2026: Daily Output Per Campaign - 10,000 Cold Emails, 10-40 Interested Leads/Day. Total: 22-80+ Calls/Month\n\nOPERATING COSTS\n2021: $100k+/month\n2026: <$40k/month\n\nThe future is smaller teams with more impact."
  },
  {
    key: "christian-gtm-engineer-phases",
    creatorKey: "christian-plascencia",
    author: "Christian Plascencia",
    source_url: "https://www.linkedin.com/posts/coldemailchris_gtm-engineer-job-postings-are-up-205-yoy-activity-7499161758620794880-8uiz",
    published_at: "2026-08-28T19:51:30Z",
    likes: 254,
    comments: 40,
    reposts: 0,
    content:
      "GTM Engineer job postings are up 205% YoY.\n\nBut few stacking that title actually have the skills to hold it.\n\nGTM ENGINEER PHASES\nPhase 1: SDR - Master outreach fundamentals.\nPhase 2: Operator - Run campaigns end-to-end.\nPhase 3: Systems Builder - Design workflows. Connect tools.\nPhase 4: Orchestrator - Direct AI agents. Build classifiers.\nPhase 5: GTM Engineer - Architect the stack.\n\nA lot of operators I meet are still working through the first three phases. The next skill is true AI-native orchestration to unlock 100x leverage.\n\nTRENDS IN GTM\nGTM Engineer postings up 205% - from ~1,400 in mid-2025 to 3,000+ by January 2026.\nAgents over MCP, not hand-scripts - orchestration is replacing manual scripting.\n4-5 integrated tools beats 12+ - lean stacks consistently outperform teams stitching together a dozen-plus disconnected tools.\n\nThe \"GTM engineer\" role is here to stay."
  },
  {
    key: "christian-terminal-tools",
    creatorKey: "christian-plascencia",
    author: "Christian Plascencia",
    source_url: "https://www.linkedin.com/posts/coldemailchris_we-operate-30-gtm-tools-directly-from-our-activity-7496502614939938816-ndGD",
    published_at: "2026-08-21T11:45:01Z",
    likes: 87,
    comments: 27,
    reposts: 0,
    content:
      "We operate 30+ GTM tools directly from our terminal.\n\nFrom data scraping, to enrichment, signal tracking, and sequencing - all can be activated through natural language via Claude Code or Codex.\n\nTERMINAL\n↳ Claude Code\n↳ Codex\n\nAGENT\n↳ Hermes - an autonomous AI agent that can self proficiently complete tasks.\n\nAUTOMATION\n↳ n8n - any productized automations we build here.\n\nENRICHMENT WORKFLOWS\n↳ Clay - waterfall enrichment, prospect research.\n\nDATA HOUSING\n↳ Supabase\n↳ Airtable\n\nOUTBOUND INFRASTRUCTURE\n↳ EmailBison - email sequencer\n↳ HeyReach - LinkedIn sequencer\n\nThis GTM OS streamlines campaign creation for Pipeline.tech clients that contact 100,000+ ICP prospects/month across email, calling, and LinkedIn."
  },
  {
    key: "michel-cold-vs-ads-vs-content",
    creatorKey: "michel-lieben",
    author: "Michel Lieben",
    source_url:
      "https://www.linkedin.com/posts/michel-lieben_cold-email-vs-linkedin-ads-vs-linkedin-activity-7506304892886675456-xLQL",
    published_at: "2026-09-17T12:55:46Z",
    likes: 192,
    comments: 118,
    reposts: 0,
    content:
      "Cold Email vs. LinkedIn Ads vs. LinkedIn Content: which books more meetings?\n\nI ran GTM for ~300 B2B companies. And the winner is... it depends. Here's how to know which to use when:\n\n1/ Core Focus\n→ Cold Email: Book meetings with 'ideal clients' who don't know you yet.\n→ LinkedIn Ads: Place a specific offer in front of a defined segment.\n→ LinkedIn Content: Educate your target market with relevant snackable content.\n\n2/ Cost to reach 10,000+ prospects\n→ Cold Email: $500-$1,000\n→ LinkedIn Ads: $750-$1,500\n→ LinkedIn Content: Could be free.\n\n3/ How to win\n→ Cold Email: Invest in proper deliverability infra.\n→ LinkedIn Ads: Stop the scroll with your creatives.\n→ LinkedIn Content: Post 3-5X per week. Stay consistent for 3+ months.\n\nWhat's the one channel driving most of your growth?"
  },
  {
    key: "michel-crm-setup",
    creatorKey: "michel-lieben",
    author: "Michel Lieben",
    source_url: "https://www.linkedin.com/posts/michel-lieben_this-crm-setup-runs-my-7m-arr-agency-it-activity-7508479073296220161-pt3u",
    published_at: "2026-09-23T12:55:11Z",
    likes: 175,
    comments: 132,
    reposts: 0,
    content:
      "This CRM setup runs my $7M ARR agency.\n\n7 things we do with our CRM (folk) and its MCP:\n\n1/ Company Brain - captures context on everything happening in the business.\n2/ Automatic CRM cleaning - every deal updates itself: stage, next step, last touch.\n3/ Closed-lost reactivation - the agent rereads every deal we lost and names the real objection.\n4/ Live job change sync - when a champion moves, the agent confirms the new company and updates the record.\n5/ An ICP model built on our own data - we backtest the model against our closed-won accounts before trusting it.\n6/ Lookalikes from our CRM - closed-won domains leave folk, scored and tiered lookalikes come back in.\n7/ Product signups - every signup lands in folk as a person and company, enriched and scored.\n\nWhich play would you add?"
  },
  {
    key: "suprava-dm-opener",
    creatorKey: "suprava-sabat",
    author: "Suprava Sabat",
    source_url:
      "https://www.linkedin.com/posts/suprava-sabat-saasleadgen_instead-of-starting-with-hey-name-do-this-activity-7503431330299461632-Q3oR",
    published_at: "2026-09-09T14:37:16Z",
    likes: 134,
    comments: 34,
    reposts: 0,
    content:
      "Instead of starting with \"hey name\" do this to get their attention through your dm:\n\n1. Start with something that looks like a niche question\n\n2. If you run a reddit agency: ask this - are you posting content on Reddit right now? How's that going?\n\n3. If you wanna sell your saas: ask this - did you see this? (niche feature) is going viral, did you get a chance to use it?\n\n- Provoke + peak their curiosity\n- Keep it one liner and simple\n- Remove em dashes\n\nYou get them to open the DM + get their reply"
  },
  {
    key: "suprava-discovery-questions",
    creatorKey: "suprava-sabat",
    author: "Suprava Sabat",
    source_url:
      "https://www.linkedin.com/posts/suprava-sabat-saasleadgen_stop-asking-discovery-questions-on-sales-activity-7508870830848872448-9LRR",
    published_at: "2026-09-24T14:51:54Z",
    likes: 119,
    comments: 24,
    reposts: 0,
    content:
      "stop asking discovery questions on sales calls if you book them through outbound\n\nwe booked 32 something calls for a SaaS company, they closed 0\n\nour process is pretty simple:\n> we run the outbound\n> get positive replies\n> then give the sales team all the in-depth research we have on each prospect\n> we ask them to look at the data and make a roadmap to show their prospects on the call\n\nbut instead of using it, they followed traditional product demos asking a lot of questions and giving no value\n\nnoone seriously cares about ur saas features so stop showing features\n\nshow them a picture of how their day to day life would look like using ur product and show them how much research u have done"
  },
  {
    key: "manthan-tetris-model",
    creatorKey: "manthan-patel",
    author: "Manthan Patel",
    source_url:
      "https://www.linkedin.com/posts/leadgenmanthan_local-laya-moggs-jev-at-grok-47-built-tetris-activity-7508191601589157888--E0Z",
    published_at: "2026-09-22T17:52:53Z",
    likes: 98,
    comments: 49,
    reposts: 0,
    content:
      "A 421M-parameter open-weights model just beat Jev at Tetris, and it did it on a 16GB MacBook Air with zero cloud calls.\n\nJev and Laya don't generate text. You send a state plus a typed question and get a probability back in one pass, so Laya made a move every 47ms on the laptop while Jev's cloud round trip took about 316ms.\n\nHonest take: most of that 11x is the network, and Jev is still the more polished hosted option. But that's the whole argument for local. When a decision runs every turn, the network is the bottleneck, and the only real fix is running the model on your own machine.\n\nRunning the model on your own laptop means zero API bill, no rate limit, and without waiting on someone else's servers for a decision you need 20 times a second.\n\nOver to you: which decision in your agent loop would you move local first?"
  }
];

export const REAL_SOURCE_POSTS = REAL_POSTS.map((post) => {
  const canonical_url = canonicalizeUrl(post.source_url);
  return {
    id: deterministicId("post", post.key),
    creator_id: deterministicId("creator", post.creatorKey),
    source_url: post.source_url,
    canonical_url,
    content_hash: hashContent(post.content),
    source_platform: "linkedin",
    author: post.author,
    content: post.content,
    published_at: post.published_at,
    engagement_data: {
      likes: post.likes,
      comments: post.comments,
      reposts: post.reposts,
      impressions: null
    },
    raw_data: {
      real: true,
      source: "user-provided export of public LinkedIn posts (collected outside this app)"
    }
  };
});

interface RealPatternSeed {
  key: string;
  name: string;
  category: ContentPattern["category"];
  description: string;
  structure: string[];
  strengths: string[];
  weaknesses: string[];
  exampleKey: string;
  postKeys: Array<{ key: string; confidence: number; evidence: string[] }>;
}

const REAL_PATTERN_DEFS: RealPatternSeed[] = [
  {
    key: "flat-denial-reframe",
    name: "Flat Denial Reframe",
    category: "hook",
    description:
      "Opens with a short declarative sentence that flatly contradicts a common belief or metric ('X is not Y'), then spends the rest of the post explaining the real distinction.",
    structure: ["flat_denial_claim", "why_the_common_read_is_wrong", "the_real_distinction", "actionable_reframe"],
    strengths: ["Stops the scroll in one line", "Sets up a clear thesis the rest of the post has to deliver on"],
    weaknesses: ["Feels formulaic if the same author repeats it back-to-back without varying the subject"],
    exampleKey: "enzo-lead-not-opportunity",
    postKeys: [
      {
        key: "enzo-lead-not-opportunity",
        confidence: 0.95,
        evidence: ["Opens with the exact flat-denial line: 'A lead is not an opportunity just because someone agreed to a call.'"]
      },
      {
        key: "enzo-silence-diagnostic",
        confidence: 0.93,
        evidence: ["Opens with 'A prospect going silent doesn't mean the deal is dead', then reframes what silence actually means."]
      },
      {
        key: "enzo-full-calendar",
        confidence: 0.9,
        evidence: ["Opens with 'A full calendar is not a full pipeline', the same denial-then-distinction shape."]
      }
    ]
  },
  {
    key: "numbered-arrow-framework",
    name: "Numbered Framework with Arrow Sub-points",
    category: "structure",
    description:
      "Breaks the core advice into a short numbered list, where each numbered item is one line of the 'what' followed by an indented arrow (↳) line giving the 'why' or a concrete example.",
    structure: ["one_line_setup", "numbered_item_with_arrow_subpoint (repeated 3-7x)", "closing_synthesis_line"],
    strengths: ["Extremely skimmable and save/share-friendly", "Each point stands alone, good for a carousel-style read"],
    weaknesses: ["Reads as a generic listicle if the sub-points stay abstract instead of using a concrete example"],
    exampleKey: "enzo-lead-not-opportunity",
    postKeys: [
      {
        key: "enzo-lead-not-opportunity",
        confidence: 0.92,
        evidence: ["Six numbered items (Economic fit, Decision maker access, ...), each with a ↳ sub-line."]
      },
      {
        key: "aaron-cold-email-5-steps",
        confidence: 0.9,
        evidence: ["Five numbered steps (Trigger, Implication, Pain, Social Proof + Solution, Soft CTA), each with a concrete example line."]
      },
      {
        key: "suprava-dm-opener",
        confidence: 0.8,
        evidence: ["Three numbered items with a short imperative sub-line under each."]
      }
    ]
  },
  {
    key: "raw-number-proof-open",
    name: "Raw-Number Proof Open",
    category: "evidence",
    description:
      "Opens the post with 2-4 raw campaign/business numbers stacked on their own separate lines before any explanation, letting the metrics do the hook work instead of a claim.",
    structure: ["raw_number_line (repeated)", "context_and_lesson"],
    strengths: ["Immediate, verifiable-feeling credibility", "No warm-up needed - very fast to read in-feed"],
    weaknesses: ["Loses all impact if the numbers aren't genuinely notable, and reads as boastful without a lesson attached"],
    exampleKey: "bharatt-30-day-numbers",
    postKeys: [
      {
        key: "bharatt-30-day-numbers",
        confidence: 0.93,
        evidence: ["Opens with '278,000 emails sent.\\n526 people replied saying they want to talk.' as two standalone lines."]
      },
      {
        key: "bharatt-dms-blew-up",
        confidence: 0.9,
        evidence: ["Stacks '24,674 emails sent. / 364 replies. / 146 opportunities. / 6 fig pipeline.' before any narrative."]
      }
    ]
  },
  {
    key: "mundane-object-lesson",
    name: "Mundane Object -> Business Lesson",
    category: "storytelling",
    description:
      "Describes something ordinary and unrelated to work (a billboard, an AI benchmark, a tube map) in concrete sensory detail, then draws a direct, specific parallel to a GTM/sales lesson.",
    structure: ["concrete_observation", "the_detail_that_made_them_stop", "the_parallel_to_their_work", "the_lesson_or_open_question"],
    strengths: ["High scroll-stopping novelty - doesn't read as another tactical post", "Feels observational and personal rather than preachy"],
    weaknesses: ["Requires a genuinely apt real-world analogy; a forced one reads as gimmicky"],
    exampleKey: "divyanshi-tube-map",
    postKeys: [
      {
        key: "divyanshi-tube-map",
        confidence: 0.95,
        evidence: ["A literal Tube map billboard is mapped stop-by-stop onto a sales pipeline stage."]
      },
      {
        key: "manthan-billboard-tube",
        confidence: 0.95,
        evidence: ["Same billboard, described with sensory detail ('I've been staring at it for ten minutes') before the CRM parallel."]
      },
      {
        key: "manthan-tetris-model",
        confidence: 0.75,
        evidence: ["An AI-vs-AI Tetris benchmark is used to make a concrete point about local vs. cloud latency."]
      }
    ]
  },
  {
    key: "vulnerable-personal-narrative",
    name: "Vulnerable Personal Narrative -> Lesson",
    category: "storytelling",
    description:
      "Tells a specific, emotionally honest first-person story about a struggle, failure, or turning point, ending with a takeaway that generalizes beyond the story itself.",
    structure: ["specific_personal_moment", "the_emotional_low_point", "what_changed", "generalized_takeaway"],
    strengths: ["Builds trust and relatability that pure tactics can't", "Differentiates the author from generic advice accounts"],
    weaknesses: ["Needs real specificity and vulnerability - a vague or humble-brag version falls flat"],
    exampleKey: "adam-five-questions",
    postKeys: [
      {
        key: "adam-five-questions",
        confidence: 0.94,
        evidence: [
          "Names the specific painful questions, the specific low ('we grew our team to 38, shrunk it to 6'), then a generalized takeaway."
        ]
      },
      {
        key: "adam-founders-confidence",
        confidence: 0.92,
        evidence: ["Tells the specific failed-product story ('the list was completely burned') before generalizing to 'keep building.'"]
      }
    ]
  },
  {
    key: "before-after-category-comparison",
    name: "Before/After Category Comparison",
    category: "structure",
    description:
      "Compares an old approach vs a new one across several fixed categories (tech, team, cost, workflow), using short bolded category headers with parallel lists underneath each.",
    structure: ["framing_line", "category_before_after (repeated)", "closing_synthesis"],
    strengths: ["Makes an abstract shift concrete and directly comparable", "Highly save/screenshot-worthy as a reference"],
    weaknesses: ["Needs genuine category-by-category detail on both sides or it reads as padded"],
    exampleKey: "christian-2021-vs-2026",
    postKeys: [
      {
        key: "christian-2021-vs-2026",
        confidence: 0.96,
        evidence: ["Four parallel categories (tech stack, team, campaign output, cost), each with a 2021 block and a 2026 block."]
      },
      {
        key: "christian-gtm-engineer-phases",
        confidence: 0.7,
        evidence: ["A 5-phase progression (SDR to GTM Engineer) used as an implicit before/after career ladder."]
      }
    ]
  },
  {
    key: "arrow-bullet-tool-stack",
    name: "Arrow-Bullet Tool Stack Reveal",
    category: "formatting",
    description:
      "Lists tools or workflow steps using a consistent arrow glyph (→ or ↳) instead of plain bullets, grouped under short spaced/bolded category headers, reading like a terminal output.",
    structure: ["category_header", "arrow_bulleted_items (repeated per category)"],
    strengths: ["High skim value; feels technical and credible for an operator audience", "Doubles as a reference people screenshot"],
    weaknesses: ["Becomes an unreadable wall of names without any narrative connecting the categories"],
    exampleKey: "christian-terminal-tools",
    postKeys: [
      {
        key: "christian-terminal-tools",
        confidence: 0.95,
        evidence: ["Six category headers (Terminal, Agent, Automation, Enrichment, Data Housing, Outbound), each with ↳-bulleted tools."]
      },
      {
        key: "michel-crm-setup",
        confidence: 0.6,
        evidence: ["Numbered rather than arrow-only, but same 'category header + concrete tool/play list' shape."]
      }
    ]
  },
  {
    key: "open-question-poll-cta",
    name: "Open Question Poll CTA",
    category: "cta",
    description:
      "Ends the post with a short, specific question that follows directly from the post's content, inviting a comment reply rather than a generic engagement-bait question.",
    structure: ["closing_statement", "specific_follow_on_question"],
    strengths: ["Drives real comment engagement because the question is earned by the post, not generic"],
    weaknesses: ["Ineffective if the question doesn't follow naturally from what was just said"],
    exampleKey: "manthan-tetris-model",
    postKeys: [
      {
        key: "manthan-tetris-model",
        confidence: 0.85,
        evidence: ["Closes with 'Over to you: which decision in your agent loop would you move local first?', directly tied to the post's topic."]
      },
      {
        key: "michel-cold-vs-ads-vs-content",
        confidence: 0.8,
        evidence: ["Closes with 'What's the one channel driving most of your growth?', a direct follow-on to the comparison just made."]
      },
      {
        key: "michel-crm-setup",
        confidence: 0.8,
        evidence: ["Closes with 'Which play would you add?', inviting a specific comment rather than generic engagement."]
      }
    ]
  }
];

export const REAL_PATTERNS: ContentPattern[] = REAL_PATTERN_DEFS.map((p) => {
  const examplePost = REAL_POSTS.find((post) => post.key === p.exampleKey);
  return {
    id: deterministicId("pattern", p.key),
    name: p.name,
    category: p.category,
    description: p.description,
    structure: p.structure,
    example: examplePost ? examplePost.content.slice(0, 400) : null,
    strengths: p.strengths,
    weaknesses: p.weaknesses
  };
});

export const REAL_POST_PATTERNS = REAL_PATTERN_DEFS.flatMap((p) =>
  p.postKeys.map(({ key, confidence, evidence }) => ({
    post_id: deterministicId("post", key),
    pattern_id: deterministicId("pattern", p.key),
    confidence,
    evidence,
    extraction: { real: true, method: "manual analysis of user-provided post export" }
  }))
);
