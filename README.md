# Fridge to Fork

Type in the ingredients you have on hand, and get back an LLM-generated recipe plus an
AI-generated image of the finished dish.

## How it works

1. The frontend (plain HTML/CSS/JS, no build step) collects a list of ingredients as tags.
2. It POSTs them to the FastAPI backend at `/api/recipe`, which calls the OpenAI Chat
   Completions API to generate a structured recipe (title, ingredients, substitution notes,
   numbered steps).
3. Once the recipe is back, the frontend POSTs the title/description to `/api/image`, which
   calls the OpenAI Images API to generate a photo of the dish.
4. The two calls run sequentially so the UI can show distinct loading states: "Writing your
   recipe..." then "Plating it up...".

The OpenAI API key never reaches the browser — all calls go through the backend.

## Requirements

- Python 3.10+
- An [OpenAI API key](https://platform.openai.com/api-keys) with access to a chat model
  (default `gpt-4o-mini`) and an image model (default `gpt-image-1`)

## Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# edit .env and paste in your OPENAI_API_KEY
```

## Run

```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

Open **http://localhost:8000** — the backend also serves the frontend, so there's only one
server to run.

## Environment variables (`backend/.env`)

| Variable            | Required | Default        | Description                                  |
|---------------------|----------|----------------|-----------------------------------------------|
| `OPENAI_API_KEY`    | Yes      | —              | Your OpenAI API key                          |
| `OPENAI_TEXT_MODEL`  | No       | `gpt-4o-mini`  | Chat model used to generate the recipe       |
| `OPENAI_IMAGE_MODEL` | No       | `gpt-image-1`  | Image model used to generate the dish photo  |

## Error handling

- **Sparse ingredient list**: if fewer than 2 ingredients are given (or the combined text is
  too short to be meaningful), the backend returns a 400 with a message asking for more
  detail, shown inline in the UI.
- **Recipe generation fails** (rate limit, API error, unparseable response): the backend
  returns a 429/502/500 with a human-readable message; the frontend shows it in an error box
  and lets the user retry.
- **Image generation fails**: the recipe is still shown — only the image section shows a
  fallback message, since a missing photo shouldn't block the recipe itself.
- **Missing API key**: the backend responds with a clear 500 telling you to set
  `OPENAI_API_KEY` in `backend/.env`.

## Project structure

```
recipe-generator/
├── backend/
│   ├── main.py            # FastAPI app: /api/recipe, /api/image, serves frontend/
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
└── README.md
```
