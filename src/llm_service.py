from mistralai.client import Mistral
from mistralai.client.models.assistantmessage import AssistantMessage
from mistralai.client.models.systemmessage import SystemMessage
from mistralai.client.models.toolmessage import ToolMessage
from mistralai.client.models.usermessage import UserMessage
from src.config import MISTRAL_API_KEY

Messages = list[AssistantMessage | SystemMessage | ToolMessage | UserMessage]

client = Mistral(api_key=MISTRAL_API_KEY)
MODEL = "mistral-small-2503"


def ask_mistral(question: str) -> str:
    """Send a question to Mistral and return the generated text."""
    messages: Messages = [UserMessage(role="user", content=question)]
    response = client.chat.complete(
        model=MODEL,
        messages=messages,
    )
    content = response.choices[0].message.content
    if not isinstance(content, str):
        return str(content)
    return content
