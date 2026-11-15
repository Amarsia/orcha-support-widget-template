import { orcha } from "orchajs";

orcha.init({
  amarsia: {
    key: process.env.AMARSIA_PROJECT_KEY ?? "",
    endpoint: process.env.AMARSIA_API_URL,
    inference: true,
  },
  storage: {
    strategy: "cloud",
  },
  agents: { assistant: "./assistant" },
});

export { orcha };
