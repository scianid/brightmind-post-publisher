# Persona API Reference

The Persona API provides endpoints for managing AI personas (ghostwriters) based on trusted X/Twitter accounts. These personas can be used for chat interactions, content generation, and style analysis.

**Base URL:** `https://app.brightmind-community.com`

## Authentication

All endpoints require an API key passed via the `X-API-Key` header:

```http
X-API-Key: <your-api-key>
Content-Type: application/json
```

### Obtaining an API Key

The API key is configured via the `BO_API_KEY` environment variable on the server. **Contact the system administrator** to request API access credentials. 

The API key is a shared secret and should be kept confidential. Do not expose it in client-side code or public repositories.

---

## Default Values Summary

| Parameter | Default Value | Used In |
|-----------|---------------|---------|
| `post_limit` | `100` | create, refine, batch/create |
| `force` | `false` | create, batch/create |
| `limit` (history) | `10` | history |
| `max_tokens` (generate) | `280` | generate |
| `max_tokens` (chat) | `500` | chat |
| `stream` | `true` | chat |
| `temperature` | `0.2` | chat |
| `include_debug` | `true` | chat |
| `communication_style` | `null` (persona's natural style) | chat |
| `conversation_history` | `[]` | chat |
| `attachments` | `[]` | chat |
| `data_sources` | `null` (disabled) | chat |

---

## Endpoints

### 1. List Available Personas

Lists all accounts that have AI personas available.

```http
GET /personas/list
```

#### Response

```json
{
  "personas": [
    {
      "account_id": "1234567890",
      "handle": "elikiako",
      "display_name": "Eli Kiako",
      "avatar_url": "https://pbs.twimg.com/profile_images/...",
      "persona_version": 3,
      "posts_analyzed": 150
    }
  ],
  "total": 1
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `personas` | array | List of available personas |
| `personas[].account_id` | string | Unique account identifier |
| `personas[].handle` | string | X/Twitter handle (without @) |
| `personas[].display_name` | string | Account display name |
| `personas[].avatar_url` | string | Profile image URL |
| `personas[].persona_version` | integer | Current persona version (default: `1`) |
| `personas[].posts_analyzed` | integer | Number of posts used in analysis (default: `0`) |
| `total` | integer | Total count of personas |

---

### 2. Get Persona Analytics

Get system-wide persona statistics.

```http
GET /personas/analytics
```

#### Response

```json
{
  "total_accounts": 50,
  "accounts_with_personas": 35,
  "coverage_percentage": 70.0,
  "avg_persona_version": 2.5,
  "avg_posts_analyzed": 125
}
```

#### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `total_accounts` | integer | Total number of tracked accounts |
| `accounts_with_personas` | integer | Accounts that have personas |
| `coverage_percentage` | float | Percentage of accounts with personas |
| `avg_persona_version` | float | Average persona version across all |
| `avg_posts_analyzed` | float | Average posts analyzed per persona |

---

### 3. Get Account Persona

Get the current AI persona for a specific account.

```http
GET /personas/{account_id}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_id` | string | Yes | The X/Twitter account ID |

#### Response (200 OK)

```json
{
  "persona": {
    "system_prompt": "You are @elikiako, a thoughtful writer who...",
    "version": 3,
    "posts_analyzed": 150,
    "posts_analyzed_count": 150,
    "confidence_score": 0.85,
    "style_traits": [
      "uses lowercase for emphasis",
      "frequent emoji usage",
      "conversational tone"
    ],
    "refinement_summary": "Persona refined with 50 new posts",
    "engagement_aware": true,
    "avg_engagement": 125.5,
    "created_at": "2025-01-15T10:30:00Z"
  }
}
```

#### Response Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `persona.system_prompt` | string | - | The full system prompt for the persona |
| `persona.version` | integer | `1` | Current version number |
| `persona.posts_analyzed` | integer | `0` | Total posts analyzed (cumulative) |
| `persona.posts_analyzed_count` | integer | `0` | Posts analyzed in latest version |
| `persona.confidence_score` | float | `0.0` | Model confidence (0-1) |
| `persona.style_traits` | array | `[]` | List of identified style characteristics |
| `persona.refinement_summary` | string | - | Description of latest refinement |
| `persona.engagement_aware` | boolean | `true` | Whether engagement metrics were used |
| `persona.avg_engagement` | float | `0.0` | Average engagement per post |
| `persona.created_at` | string | - | ISO 8601 timestamp |

#### Error Response (404 Not Found)

```json
{
  "detail": "Persona not found for this account"
}
```

---

### 4. Create Account Persona

Create an initial persona for an account by analyzing their posts.

```http
POST /personas/{account_id}/create
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_id` | string | Yes | The X/Twitter account ID |

#### Request Body

```json
{
  "force": false,
  "post_limit": 100
}
```

| Field | Type | Default | Required | Description |
|-------|------|---------|----------|-------------|
| `force` | boolean | `false` | No | Recreate even if persona exists |
| `post_limit` | integer | `100` | No | Number of posts to analyze |

#### Response (200 OK)

```json
{
  "success": true,
  "persona": {
    "version": 1,
    "system_prompt": "You are @username...",
    "posts_analyzed_count": 100,
    "confidence_score": 0.82,
    "style_traits": ["trait1", "trait2"],
    "refinement_summary": "Initial persona creation with engagement context",
    "engagement_aware": true,
    "avg_engagement": 98.5
  }
}
```

#### Error Responses

**400 Bad Request** - Persona already exists:
```json
{
  "detail": "Persona already exists for this account. Use force=true to recreate."
}
```

**400 Bad Request** - No posts found:
```json
{
  "detail": "No posts found for this account. Sync posts first."
}
```

---

### 5. Refine Account Persona

Manually trigger persona refinement using recent posts. This increments the persona version.

```http
POST /personas/{account_id}/refine
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_id` | string | Yes | The X/Twitter account ID |

#### Request Body

```json
{
  "post_limit": 100
}
```

| Field | Type | Default | Required | Description |
|-------|------|---------|----------|-------------|
| `post_limit` | integer | `100` | No | Number of recent posts to analyze |

#### Response (200 OK)

```json
{
  "success": true,
  "persona": {
    "version": 4,
    "system_prompt": "...",
    "posts_analyzed_count": 100,
    "confidence_score": 0.88,
    "refinement_summary": "Persona refined with new posts and engagement context"
  }
}
```

#### Error Response (400 Bad Request)

```json
{
  "detail": "No posts found for this account"
}
```

---

### 6. Get Persona History

Get version history of persona evolution.

```http
GET /personas/{account_id}/history?limit=10
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_id` | string | Yes | The X/Twitter account ID |

#### Query Parameters

| Parameter | Type | Default | Required | Description |
|-----------|------|---------|----------|-------------|
| `limit` | integer | `10` | No | Maximum versions to return |

#### Response (200 OK)

```json
{
  "account_id": "1234567890",
  "versions": [
    {
      "version": 3,
      "system_prompt": "...",
      "posts_analyzed_count": 50,
      "refinement_summary": "...",
      "confidence_score": 0.88,
      "created_at": "2025-01-15T10:30:00Z"
    },
    {
      "version": 2,
      "system_prompt": "...",
      "posts_analyzed_count": 75,
      "created_at": "2025-01-10T08:15:00Z"
    }
  ],
  "total_versions": 3
}
```

---

### 7. Rollback Persona

Rollback to a previous persona version.

```http
POST /personas/{account_id}/rollback/{version}
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_id` | string | Yes | The X/Twitter account ID |
| `version` | integer | Yes | Version number to rollback to |

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Rolled back to version 2",
  "persona": { ... }
}
```

#### Error Response (400 Bad Request)

```json
{
  "detail": "Version 5 not found in history"
}
```

---

### 8. Generate Sample Post

Generate a sample post using the account's persona (useful for testing).

```http
POST /personas/{account_id}/generate
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_id` | string | Yes | The X/Twitter account ID |

#### Request Body

```json
{
  "prompt": "Write about the importance of community",
  "max_tokens": 280
}
```

| Field | Type | Default | Required | Description |
|-------|------|---------|----------|-------------|
| `prompt` | string | - | **Yes** | Topic or direction for the post |
| `max_tokens` | integer | `280` | No | Maximum tokens for response |

#### Response (200 OK)

```json
{
  "success": true,
  "generated_post": "Community is everything. It's where we find...",
  "account_id": "1234567890",
  "handle": "elikiako"
}
```

#### Error Response (400 Bad Request)

```json
{
  "detail": "prompt is required"
}
```

---

### 9. Chat with Persona

Chat with an account's AI persona. Supports both streaming (SSE) and non-streaming responses.

```http
POST /personas/{account_id}/chat
```

#### Path Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `account_id` | string | Yes | The X/Twitter account ID |

#### Request Body

```json
{
  "message": "What do you think about AI?",
  "conversation_history": [
    {"role": "user", "content": "Previous message"},
    {"role": "assistant", "content": "Previous response"}
  ],
  "attachments": [
    {
      "type": "image",
      "data": "data:image/jpeg;base64,/9j/4AAQ...",
      "mime_type": "image/jpeg",
      "filename": "photo.jpg"
    }
  ],
  "max_tokens": 500,
  "stream": true,
  "llm_config": {
    "provider": "openai",
    "model": "gpt-4.1",
    "temperature": 0.2,
    "communication_style": null,
    "system_prompt": null,
    "additional_instructions": "Be concise and use bullet points"
  },
  "data_sources": {
    "documents": false,
    "web": false
  },
  "include_debug": true
}
```

#### Request Fields

| Field | Type | Default | Required | Description |
|-------|------|---------|----------|-------------|
| `message` | string | - | **Yes** | User's message to the persona |
| `conversation_history` | array | `[]` | No | Previous messages for context |
| `attachments` | array | `[]` | No | File attachments (images, PDFs) |
| `max_tokens` | integer | `500` | No | Maximum response tokens |
| `stream` | boolean | `true` | No | Enable SSE streaming |
| `llm_config` | object | `{}` | No | LLM configuration options |
| `data_sources` | object | `null` | No | RAG data sources (disabled by default) |
| `include_debug` | boolean | `true` | No | Include tool_calls metadata in response |

#### LLM Config Options

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `provider` | string | `null` (uses server default) | `"openai"` or `"vertex"` |
| `model` | string | `null` (uses server default) | Model name (e.g., `"gpt-4.1"`, `"gemini-2.5-flash"`) |
| `temperature` | float | `0.2` | Response creativity (0.0 - 1.0) |
| `communication_style` | string | `null` | Style override (see below) |
| `system_prompt` | string | `null` | Custom system prompt override |
| `additional_instructions` | string | `null` | Extra instructions (max 2000 chars) |

**Note:** When `provider` or `model` is `null`, the server uses the default configured via environment variables.

#### Communication Styles

| Value | Description |
|-------|-------------|
| `"academic"` | Formal tone, no contractions |
| `"professional"` | Business-like, clear and concise |
| `"balanced"` | Natural mix of formal and casual |
| `"friendly"` | Warm and approachable |
| `"casual"` | Relaxed and conversational |
| `null` | **Default:** Use persona's natural style (recommended) |

#### Attachment Format

```json
{
  "type": "image",
  "data": "data:image/jpeg;base64,..." ,
  "mime_type": "image/jpeg",
  "filename": "photo.jpg"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `type` | string | Yes | `"image"` or `"file"` (for PDFs) |
| `data` | string | Yes | Base64 data URL or direct URL |
| `mime_type` | string | No | MIME type (e.g., `"image/jpeg"`) |
| `filename` | string | No | Original filename |

#### Data Sources (RAG)

Enable retrieval-augmented generation. **Default: disabled (`null`)**

```json
{
  "documents": true,
  "web": true
}
```

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `documents` | boolean | `false` | Search internal documents |
| `web` | boolean | `false` | Search the web |

---

#### Streaming Response (stream=true, default)

Returns `Content-Type: text/plain` with Server-Sent Events:

```
data: {"type": "function_call", "content": "Searching documents..."}

data: {"type": "text_delta", "content": "I think "}

data: {"type": "text_delta", "content": "AI is fascinating..."}

data: {"type": "completed", "content": "{\"response\": {\"response_text\": \"...\", \"references\": []}, \"model\": \"gpt-4.1\"}", "tool_calls": [...]}

data: [DONE]
```

#### SSE Event Types

| Event Type | Description | Content |
|------------|-------------|---------|
| `function_call` | RAG progress updates | String message |
| `text_delta` | Incremental response text | Text chunk |
| `completed` | Final response with metadata | JSON string with full response |
| `error` | Error message | Error description |

#### Completed Event Content Structure

The `content` field in `completed` events is a JSON string:

```json
{
  "response": {
    "response_text": "Full response text...",
    "references": [
      {
        "title": "Source Title",
        "uri": "https://...",
        "preview_url": "https://..."
      }
    ]
  },
  "model": "gpt-4.1"
}
```

---

#### Non-Streaming Response (stream=false)

```json
{
  "success": true,
  "response": "I think AI is fascinating because...",
  "account_id": "1234567890",
  "handle": "elikiako",
  "model": "gpt-4.1",
  "generation_time": 2.5,
  "tool_calls": [...]
}
```

| Field | Type | Description |
|-------|------|-------------|
| `success` | boolean | Whether the request succeeded |
| `response` | string | The persona's response text |
| `account_id` | string | Account ID used |
| `handle` | string | Account handle |
| `model` | string | Model used for generation |
| `generation_time` | float | Time taken in seconds |
| `tool_calls` | array | RAG tool calls made (if `include_debug: true`) |

#### Error Responses

**400 Bad Request** - Missing message:
```json
{
  "detail": "message is required"
}
```

**400 Bad Request** - Additional instructions too long:
```json
{
  "detail": "additional_instructions exceeds 2000 character limit"
}
```

**429 Too Many Requests** - Budget exceeded:
```json
{
  "detail": {
    "error": "budget_exceeded",
    "message": "Budget limit exceeded"
  }
}
```

---

### 10. Batch Create Personas

Create personas for multiple accounts at once.

```http
POST /personas/batch/create
```

#### Request Body

```json
{
  "account_ids": ["1234567890", "0987654321"],
  "force": false,
  "post_limit": 100
}
```

| Field | Type | Default | Required | Description |
|-------|------|---------|----------|-------------|
| `account_ids` | array | `null` | No | Account IDs to process. If `null`, processes all active accounts without personas |
| `force` | boolean | `false` | No | Recreate existing personas |
| `post_limit` | integer | `100` | No | Posts to analyze per account |

#### Response (200 OK)

```json
{
  "success": true,
  "message": "Processed 5 accounts: 4 successful, 1 failed",
  "results": [
    {
      "account_id": "1234567890",
      "success": true,
      "persona_version": 1
    },
    {
      "account_id": "0987654321",
      "success": false,
      "error": "No posts found"
    }
  ],
  "total": 5,
  "successful": 4,
  "failed": 1
}
```

---

## Error Handling

All endpoints return standard HTTP error codes:

| Code | Description |
|------|-------------|
| `400` | Bad request - validation error, missing parameters |
| `403` | Forbidden - invalid API key |
| `404` | Not found - persona or account doesn't exist |
| `429` | Too many requests - budget exceeded |
| `500` | Internal server error |

### Error Response Format

```json
{
  "detail": "Error message describing what went wrong"
}
```

---

## Code Examples

### Python - List and Chat with Persona

```python
import requests
import json

BASE_URL = "https://app.brightmind-community.com"
API_KEY = "your-api-key"  # Obtain from system administrator

headers = {
    "X-API-Key": API_KEY,
    "Content-Type": "application/json"
}

# 1. List available personas
response = requests.get(f"{BASE_URL}/personas/list", headers=headers)
personas = response.json()
print(f"Found {personas['total']} personas")

# 2. Get first persona's account_id
account_id = personas["personas"][0]["account_id"]
handle = personas["personas"][0]["handle"]
print(f"Using persona: @{handle}")

# 3. Chat with persona (streaming - default)
response = requests.post(
    f"{BASE_URL}/personas/{account_id}/chat",
    headers=headers,
    json={
        "message": "What are your thoughts on technology?",
        # stream defaults to true
        # temperature defaults to 0.2
        # max_tokens defaults to 500
    },
    stream=True
)

# Process SSE stream
full_response = ""
for line in response.iter_lines():
    if line:
        line = line.decode('utf-8')
        if line.startswith('data: '):
            data = line[6:]
            if data == '[DONE]':
                break
            event = json.loads(data)
            if event['type'] == 'text_delta':
                print(event['content'], end='', flush=True)
                full_response += event['content']
            elif event['type'] == 'completed':
                print("\n--- Response complete ---")
```

### JavaScript/TypeScript - Non-Streaming Chat

```typescript
const BASE_URL = "https://app.brightmind-community.com";
const API_KEY = "your-api-key"; // Obtain from system administrator

async function chatWithPersona(accountId: string, message: string) {
  const response = await fetch(`${BASE_URL}/personas/${accountId}/chat`, {
    method: "POST",
    headers: {
      "X-API-Key": API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message,
      stream: false,  // Disable streaming for JSON response
      // llm_config is optional - uses defaults:
      // temperature: 0.2, communication_style: null (persona's natural style)
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail);
  }

  return await response.json();
}

// Usage
const result = await chatWithPersona("1234567890", "What do you think about AI?");
console.log(result.response);
console.log(`Generated in ${result.generation_time}s using ${result.model}`);
```

### cURL - Create Persona (with defaults)

```bash
# Uses default post_limit=100 and force=false
curl -X POST "https://app.brightmind-community.com/personas/1234567890/create" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### cURL - Create Persona (with custom values)

```bash
curl -X POST "https://app.brightmind-community.com/personas/1234567890/create" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"post_limit": 200, "force": true}'
```

### cURL - Chat with Streaming (default)

```bash
# Uses defaults: stream=true, max_tokens=500, temperature=0.2
curl -X POST "https://app.brightmind-community.com/personas/1234567890/chat" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Tell me about your perspective on community building"
  }' \
  --no-buffer
```

### cURL - Chat with Custom LLM Config

```bash
curl -X POST "https://app.brightmind-community.com/personas/1234567890/chat" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Explain blockchain in simple terms",
    "stream": false,
    "max_tokens": 1000,
    "llm_config": {
      "temperature": 0.5,
      "communication_style": "friendly",
      "additional_instructions": "Use analogies and avoid jargon"
    },
    "data_sources": {
      "documents": true,
      "web": true
    }
  }'
```

---

## Rate Limits

- Budget-based rate limiting is enforced on the `/chat` endpoint
- When budget is exceeded, requests return `429 Too Many Requests`
- Other endpoints do not have specific rate limits but should be used responsibly

---

## Changelog

- **v1.0** - Initial release with full persona management and chat capabilities
