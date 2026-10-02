import { OpenAIProvider } from "./openai";

/**
 * A model served from your own Modal endpoint (OpenAI-compatible chat
 * completions behind Modal's proxy auth). Modal authenticates with a token
 * id and secret joined as "<id>.<secret>" in the Bearer header.
 *
 * The default model here (DeepSeek V4.1 Flash) can reason at length before
 * answering, and this pipeline makes several sequential calls per request,
 * so reasoning effort is sent as "low" unless MODAL_REASONING_EFFORT says
 * otherwise (set it to "none" to omit the field entirely).
 */
export class ModalProvider extends OpenAIProvider {
  readonly name = "modal";
  private readonly reasoningEffort: string;

  constructor(opts: { model: string; baseUrl: string; tokenId: string; tokenSecret: string; reasoningEffort: string }) {
    if (!opts.tokenId || !opts.tokenSecret) {
      throw new Error("Missing MODAL_TOKEN_ID / MODAL_TOKEN_SECRET (the Modal proxy auth token). Set both, or choose another AI_PROVIDER.");
    }
    super(opts.model, `${opts.tokenId}.${opts.tokenSecret}`, opts.baseUrl.replace(/\/+$/, ""), "MODAL_TOKEN_ID");
    this.reasoningEffort = opts.reasoningEffort;
  }

  protected extraRequestBody(): Record<string, unknown> {
    return this.reasoningEffort && this.reasoningEffort !== "none" ? { reasoning_effort: this.reasoningEffort } : {};
  }
}
