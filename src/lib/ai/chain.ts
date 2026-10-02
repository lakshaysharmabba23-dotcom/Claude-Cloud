import type { AIProvider, CompleteInput, CompleteStructuredInput } from "./provider";
import { runWithFallback } from "./fallback";

/**
 * Tries several AI providers in order and uses the first that works.
 * Used so a failure of the main provider (timeout, bad output, outage)
 * falls back to a backup provider instead of failing the whole request.
 */
export class ProviderChain implements AIProvider {
  readonly name: string;
  readonly model: string;

  constructor(private readonly providers: AIProvider[]) {
    if (providers.length === 0) throw new Error("ProviderChain needs at least one provider.");
    this.name = providers[0]!.name;
    this.model = providers[0]!.model;
  }

  private labelOf(p: AIProvider) {
    return `${p.name}/${p.model}`;
  }

  async complete(input: CompleteInput): Promise<string> {
    return runWithFallback(this.providers.map(this.labelOf), (label) =>
      this.providers.find((p) => this.labelOf(p) === label)!.complete(input)
    );
  }

  async completeStructured<T>(input: CompleteStructuredInput<T>): Promise<T> {
    return runWithFallback(this.providers.map(this.labelOf), (label) =>
      this.providers.find((p) => this.labelOf(p) === label)!.completeStructured<T>(input)
    );
  }
}
