import { CallbackHandler } from "langfuse-langchain";
import { RunnableSequence } from "@langchain/core/runnables";

// Initialize Langfuse callback handler
export const langfuseHandler = new CallbackHandler({
  publicKey: "pk-lf-4e140539-88ee-43c4-b0a5-90a4d669d530",
  secretKey: "sk-lf-688bb561-2cb6-4e25-b905-1d17499e505c",
  baseUrl: "http://localhost:3000",
});

// // Your Langchain implementation
// const chain = new LLMChain(...);

// // Add handler as callback when running the Langchain agent
// await chain.invoke(
//   { input: "<user_input>" },
//   { callbacks: [langfuseHandler] }
// );
