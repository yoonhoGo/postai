import { ChatMessage } from "../../types.js";
import { model } from "../../model.js";
import { langfuseHandler } from "../../langfuse.js";

export async function generalQueryHandler(
  userQuery: string,
  conversation: ChatMessage[],
): Promise<ChatMessage[]> {
  const messages = conversation.map((msg) => ({
    content: msg.content,
    role: msg.role,
  }));

  messages.push({ content: userQuery, role: "user" });

  const response = await model.invoke(messages, {
    callbacks: [langfuseHandler]
  });

  return [
    {
      role: "assistant",
      content: (response.content as string) || "응답을 생성할 수 없습니다.",
      codeBlock: false,
    },
  ];
}
