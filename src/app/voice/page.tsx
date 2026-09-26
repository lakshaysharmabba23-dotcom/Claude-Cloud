import { getDefaultVoiceProfile, listVoiceExamples } from "@/lib/data/repository";
import { VoiceLab } from "./voice-lab";

export const dynamic = "force-dynamic";

export default async function VoicePage() {
  const profile = await getDefaultVoiceProfile();
  const examples = profile ? await listVoiceExamples(profile.id ?? "") : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Voice Lab</h1>
        <p className="mt-1 text-sm text-ink-400">
          Add your own writing samples to build a structured profile of your voice. This is built only from
          the writing you provide here - it never imitates a public figure.
        </p>
      </div>
      <VoiceLab initialProfile={profile} initialExamples={examples} />
    </div>
  );
}
