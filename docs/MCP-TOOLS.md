# MCP Tools — canonical catalog

The custom Miro MCP server exposes **20 tools** across two surface groups. All
schemas use **snake_case** keys to match the Miro REST API.

Every tool returns a JSON-serializable object. Validation errors return
`isError: true`; auth/rate-limit errors return typed messages
(`MiroAuthError`, `MiroRateLimitError`).

## Boards

| Tool | Description | REST |
| --- | --- | --- |
| `list_boards` | List boards (paged). | `GET /v2/boards` |
| `create_board` | Create a board. | `POST /v2/boards` |
| `get_board` | Get a board by id. | `GET /v2/boards/{id}` |
| `update_board` | Patch a board. | `PATCH /v2/boards/{id}` |
| `delete_board` | Delete a board. | `DELETE /v2/boards/{id}` |
| `list_board_members` | List board members. | `GET /v2/boards/{id}/members` |
| `list_subscriptions` | List webhook subscriptions. | `GET /v2/boards/{id}/subscriptions` |
| `export_board` | Group items by type (synthesized). | composite |

## Items

| Tool | Description | REST |
| --- | --- | --- |
| `create_sticky_note` | Sticky note with color. | `POST /v2/boards/{id}/sticky_notes` |
| `create_shape` | Shape with fill/border. | `POST /v2/boards/{id}/shapes` |
| `create_text` | Text box. | `POST /v2/boards/{id}/texts` |
| `create_card` | Kanban card. | `POST /v2/boards/{id}/cards` |
| `create_frame` | Section frame. | `POST /v2/boards/{id}/frames` |
| `create_image` | Image from URL or base64. | `POST /v2/boards/{id}/images` |
| `create_connector` | Line between two items. | `POST /v2/boards/{id}/connectors` |
| `get_board_items` | List items (type filter). | `GET /v2/boards/{id}/items` |
| `search_items` | List items + optional free-text. | `GET /v2/boards/{id}/items` |
| `update_item` | Patch an item. | `PATCH /v2/boards/{id}/items/{item_id}` |
| `delete_item` | Delete an item. | `DELETE /v2/boards/{id}/items/{item_id}` |

## Composite

| Tool | Description |
| --- | --- |
| `batch_create_items` | Create up to 20 items sequentially with `429`-aware backoff. Returns `{ successes, failures, results }`. |

## Demo mode (default)

When `MIRO_ACCESS_TOKEN` is unset (or `MIRO_PROVIDER_MODE=demo`), the server
instantiates `FakeMiroApiClient`. Tool schemas are unchanged; responses are
deterministic shapes useful for offline development.

## Live mode

Set `MIRO_ACCESS_TOKEN` to your Miro personal access token. The server
retries with exponential backoff + jitter on 429 (respecting `Retry-After`)
and surfaces `MiroAuthError` on 401.

## More

- See `miro-custom-mcp/src/tools/` for tool source.
- See `.agents/skills/mcp-tool-authoring/SKILL.md` for how to add a tool.
- See `miro-custom-mcp/tests/tools.contract.test.ts` for the contract test
  that runs against every tool.
