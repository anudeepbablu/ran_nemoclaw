// Minimal OpenAI-compatible Nemotron client.
//
// Inside the OpenShell sandbox, OPENSHELL_INFERENCE_URL points at
// `https://inference.local/v1` and OpenShell's gateway adds NVIDIA
// credentials at the proxy level — our code passes `Authorization` if
// NVIDIA_API_KEY is set, the proxy drops/replaces it as needed.
//
// Outside the sandbox (dev mode), the same code can call
// `https://integrate.api.nvidia.com/v1` directly when NVIDIA_API_KEY is
// set in the env.

export const DEFAULT_BASE_URL = "https://inference.local/v1";
export const DEFAULT_MODEL = "nvidia/nemotron-3-super-120b-a12b";

export function makeClient({ fetchImpl = globalThis.fetch, env = process.env } = {}) {
  const baseUrl = (env.OPENSHELL_INFERENCE_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");
  const model = env.OPENSHELL_INFERENCE_MODEL || DEFAULT_MODEL;
  const apiKey = env.NVIDIA_API_KEY;

  async function chat({ messages, tools, toolChoice = "auto", temperature = 0.2 }) {
    const headers = { "Content-Type": "application/json" };
    if (apiKey) headers["Authorization"] = `Bearer ${apiKey}`;

    const res = await fetchImpl(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: toolChoice,
        temperature
      })
    });

    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Nemotron HTTP ${res.status}: ${body.slice(0, 500)}`);
    }
    return res.json();
  }

  return { chat, baseUrl, model };
}
