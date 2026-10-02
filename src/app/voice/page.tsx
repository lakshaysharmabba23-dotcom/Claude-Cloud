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
      <VoiceLab initialProfile={profile} initialExamples={examples} />
    </div>
  );
}
