import os
from pathlib import Path
from typing import List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from openai import OpenAI, APIError, APIConnectionError, RateLimitError
from pydantic import BaseModel, Field

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
TEXT_MODEL = os.getenv("OPENAI_TEXT_MODEL", "gpt-4o-mini")
IMAGE_MODEL = os.getenv("OPENAI_IMAGE_MODEL", "gpt-image-1")

client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None

app = FastAPI(title="Fridge-to-Fork Recipe Generator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Schemas ----------

class IngredientRequest(BaseModel):
    ingredients: List[str]


class RecipeIngredient(BaseModel):
    item: str = Field(description="A single ingredient with quantity, e.g. '2 cups flour'")
    substitution_note: Optional[str] = Field(
        default=None,
        description="Only set if this ingredient is a substitute for something the user didn't list, or optional.",
    )


class Recipe(BaseModel):
    title: str = Field(description="A creative, appetizing name for the dish")
    description: str = Field(description="One or two enticing sentences describing the finished dish, for use as an image prompt")
    servings: Optional[str] = Field(default=None, description="e.g. 'Serves 2'")
    difficulty: Optional[str] = Field(default=None, description="One of: Beginner, Intermediate, Advanced")
    prep_time: Optional[str] = Field(default=None, description="Total time estimate, e.g. '25 min' or '1h 30min'")
    tags: Optional[List[str]] = Field(
        default=None,
        description="3-5 short descriptive tags for the dish, e.g. 'High Protein', 'Quick Meal', 'Vegetarian', 'One Pan'",
    )
    ingredients: List[RecipeIngredient]
    steps: List[str] = Field(description="Numbered cooking steps, one instruction per entry")
    substitution_notes: Optional[List[str]] = Field(
        default=None,
        description="Any notes on substitutions made because an ingredient the user didn't have was needed",
    )


class ImageRequest(BaseModel):
    title: str
    description: str


class ImageResponse(BaseModel):
    image_url: str


# ---------- Helpers ----------

def clean_ingredients(raw: List[str]) -> List[str]:
    return [i.strip() for i in raw if i and i.strip()]


def require_client():
    if client is None:
        raise HTTPException(
            status_code=500,
            detail="Server is missing OPENAI_API_KEY. Set it in backend/.env and restart the server.",
        )


# ---------- Routes ----------

@app.post("/api/recipe", response_model=Recipe)
def generate_recipe(req: IngredientRequest):
    require_client()

    ingredients = clean_ingredients(req.ingredients)

    if len(ingredients) < 2:
        raise HTTPException(
            status_code=400,
            detail="Please enter at least 2-3 ingredients so there's something to cook with.",
        )
    if sum(len(i) for i in ingredients) < 6:
        raise HTTPException(
            status_code=400,
            detail="That ingredient list looks too sparse — try adding a bit more detail.",
        )

    prompt = (
        "You are a creative but practical home cook. Using ONLY (or mostly) the ingredients "
        "listed below, invent a delicious recipe. You may assume the cook has basic pantry "
        "staples on hand (salt, pepper, oil, water). If you must add an ingredient the user "
        "didn't list, keep it minor and note it as a substitution. Do not invent an entirely "
        "different set of ingredients.\n\n"
        f"Available ingredients: {', '.join(ingredients)}"
    )

    try:
        completion = client.beta.chat.completions.parse(
            model=TEXT_MODEL,
            messages=[
                {"role": "system", "content": "You write clear, creative, structured recipes."},
                {"role": "user", "content": prompt},
            ],
            response_format=Recipe,
        )
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail=f"OpenAI rejected the request (rate limit or no available quota): {e}")
    except (APIConnectionError, APIError) as e:
        raise HTTPException(status_code=502, detail=f"Recipe generation failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error generating recipe: {e}")

    recipe = completion.choices[0].message.parsed
    if recipe is None:
        raise HTTPException(status_code=502, detail="The model returned an unreadable recipe. Please try again.")

    return recipe


@app.post("/api/image", response_model=ImageResponse)
def generate_image(req: ImageRequest):
    require_client()

    prompt = (
        f"A high-quality, appetizing food photograph of \"{req.title}\". {req.description} "
        "Professional food photography, natural lighting, shallow depth of field, on a nicely "
        "set table, no text or watermarks."
    )

    try:
        result = client.images.generate(
            model=IMAGE_MODEL,
            prompt=prompt,
            size="1024x1024",
            n=1,
        )
    except RateLimitError as e:
        raise HTTPException(status_code=429, detail=f"OpenAI rejected the request (rate limit or no available quota): {e}")
    except (APIConnectionError, APIError) as e:
        raise HTTPException(status_code=502, detail=f"Image generation failed: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Unexpected error generating image: {e}")

    data = result.data[0]
    if getattr(data, "url", None):
        image_url = data.url
    elif getattr(data, "b64_json", None):
        image_url = f"data:image/png;base64,{data.b64_json}"
    else:
        raise HTTPException(status_code=502, detail="Image generation returned no image data.")

    return ImageResponse(image_url=image_url)


# ---------- Static frontend ----------

FRONTEND_DIR = Path(__file__).resolve().parent.parent / "frontend"
if FRONTEND_DIR.exists():
    app.mount("/", StaticFiles(directory=str(FRONTEND_DIR), html=True), name="frontend")
