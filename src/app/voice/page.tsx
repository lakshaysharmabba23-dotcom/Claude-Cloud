import { getDefaultVoiceProfile, listVoiceExamples } from "@/lib/data/repository";
import { VoiceLab } from "./voice-lab";

export const dynamic = "force-dynamic";

export default async function VoicePage() {
  const profile = await getDefaultVoiceProfile();
  const examples = profile ? await listVoiceExamples(profile.id ?? "") : [];

  return (
    <div className="space-y-6">
      <div>
        <div className="eyebrow mb-3">Content Intelligence</div>
        <h1 className="display text-4xl sm:text-5xl">Voice Lab</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-200">
          Add your own writing samples to build a structured profile of your voice. This is built only from
          the writing you provide here - it never imitates a public figure.
        </p>
      </div>
      {examples.some((e) => (e.source ?? "").startsWith("reference-post")) && (
        <p className="rounded-lg border border-ink-700 bg-ink-800 px-4 py-3 text-sm text-ink-200">
          <span className="badge mr-2">Sample profile</span>
          This profile comes from one sample post written for this project, not from a real person&apos;s posting
          history. Add your own writing below to replace it.
        </p>
      )}
      <VoiceLab initialProfile={profile} initialExamples={examples} />
    </div>
  );
}
