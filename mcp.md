# MCP Wrapper (`@muhfweeceevee/mcp-wrapper`)

This project includes an MCP server wrapper around the internal web API.

It exposes CV, template, keywords, photo booth, and OpenRouter settings tools over MCP stdio.

## Install

From repo root:

```bash
npm install
```

## Run

```bash
npm run mcp:api
```

Optional API base override:

```bash
CV_API_BASE_URL=http://127.0.0.1:3001/api npm run mcp:api
```

Default is `http://127.0.0.1:3000/api`.

## Exposed MCP Tools

- `api_info`
- `list_cvs`
- `get_cv`
- `save_cv`
- `create_cv_variant`
- `list_templates`
- `preview_html_url`
- `keyword_analysis`
- `keyword_datasets`
- `keyword_datasets_rebuild`
- `keyword_manage`
- `photo_list`
- `photo_upload_base64`
- `photo_delete`
- `photo_analyze`
- `photo_compare`
- `openrouter_settings_get`
- `openrouter_settings_update`
- `openrouter_credit`

## Client Config Example (MCP stdio)

```json
{
  "mcpServers": {
    "muhfweeceevee-api": {
      "command": "npm",
      "args": ["run", "mcp:api"],
      "cwd": "/home/apoapostolov/git-public/MyFreeCeeVee-Professional CV Template Generator",
      "env": {
        "CV_API_BASE_URL": "http://127.0.0.1:3000/api"
      }
    }
  }
}
```

## Notes

- The wrapper does not replace the web app; it calls existing `/api/*` endpoints.
- The web app/server must be running for MCP tools to work.
- Photo compare supports multi-image ranking via `photo_compare.images[]`.
