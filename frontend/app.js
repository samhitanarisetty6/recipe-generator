const tagList = document.getElementById("tag-list");
const ingredientInput = document.getElementById("ingredient-input");
const generateBtn = document.getElementById("generate-btn");
const errorBox = document.getElementById("error-box");
const loadingBox = document.getElementById("loading-box");
const loadingText = document.getElementById("loading-text");
const resultSection = document.getElementById("result");
const inputCard = document.getElementById("input-card");
const popularSection = document.getElementById("popular-section");
const popularGrid = document.getElementById("popular-grid");

const POPULAR_RECIPES = [
  { icon: "🍗", category: "Dinner", title: "Lemon Garlic Chicken & Rice", ingredients: ["chicken thighs", "rice", "lemon", "garlic", "spinach"] },
  { icon: "🍝", category: "Pasta", title: "Creamy Tomato Pasta", ingredients: ["pasta", "tomatoes", "garlic", "basil", "parmesan"] },
  { icon: "🌮", category: "Tacos", title: "Classic Beef Tacos", ingredients: ["ground beef", "taco shells", "cheese", "lettuce", "tomato"] },
  { icon: "🍄", category: "Risotto", title: "Mushroom Risotto", ingredients: ["rice", "mushrooms", "parmesan", "onion", "butter"] },
  { icon: "🥦", category: "Stir Fry", title: "Veggie Stir Fry", ingredients: ["broccoli", "carrots", "soy sauce", "garlic", "rice"] },
];

function renderPopularGrid() {
  popularGrid.innerHTML = "";
  POPULAR_RECIPES.forEach((recipe) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "popular-card";
    card.innerHTML = `
      <span class="popular-card-top">
        <span class="popular-icon-badge">${recipe.icon}</span>
        <span class="popular-category">${recipe.category}</span>
      </span>
      <span class="popular-title">${recipe.title}</span>
      <span class="popular-ingredients">${recipe.ingredients.join(", ")}</span>
    `;
    card.addEventListener("click", () => {
      ingredients = [...recipe.ingredients];
      renderTags();
      generateRecipe();
    });
    popularGrid.appendChild(card);
  });
}

const imageWrap = document.getElementById("image-wrap");
const dishImage = document.getElementById("dish-image");
const imageError = document.getElementById("image-error");
const heroCard = document.querySelector(".hero-card");

const recipeTitle = document.getElementById("recipe-title");
const recipeDescription = document.getElementById("recipe-description");
const recipeServings = document.getElementById("recipe-servings");
const metaPreptime = document.getElementById("meta-preptime");
const metaIngredientCount = document.getElementById("meta-ingredient-count");
const metaDifficulty = document.getElementById("meta-difficulty");
const recipeTags = document.getElementById("recipe-tags");
const recipeIngredients = document.getElementById("recipe-ingredients");
const substitutionsWrap = document.getElementById("substitutions-wrap");
const recipeSubstitutions = document.getElementById("recipe-substitutions");
const recipeSteps = document.getElementById("recipe-steps");

const ICON_RULES = [
  [/chicken|turkey|duck/, "🍗"],
  [/beef|steak/, "🥩"],
  [/pork|bacon|ham/, "🥓"],
  [/fish|salmon|tuna|cod/, "🐟"],
  [/shrimp|prawn|crab|lobster/, "🍤"],
  [/egg/, "🥚"],
  [/milk|cream|yogurt/, "🥛"],
  [/cheese/, "🧀"],
  [/butter/, "🧈"],
  [/rice/, "🍚"],
  [/pasta|noodle|spaghetti/, "🍝"],
  [/bread|toast|bun/, "🍞"],
  [/flour/, "🌾"],
  [/garlic/, "🧄"],
  [/onion|scallion|shallot/, "🧅"],
  [/tomato/, "🍅"],
  [/potato/, "🥔"],
  [/carrot/, "🥕"],
  [/pepper|chili|chilli/, "🌶️"],
  [/mushroom/, "🍄"],
  [/spinach|lettuce|kale|greens/, "🥬"],
  [/lemon|lime/, "🍋"],
  [/apple/, "🍎"],
  [/avocado/, "🥑"],
  [/corn/, "🌽"],
  [/salt/, "🧂"],
  [/sugar|honey/, "🍯"],
  [/oil|olive/, "🫒"],
  [/herb|basil|cilantro|parsley|mint/, "🌿"],
  [/wine|beer/, "🍷"],
  [/water/, "💧"],
];

function pickIngredientIcon(name) {
  const lower = (name || "").toLowerCase();
  for (const [pattern, icon] of ICON_RULES) {
    if (pattern.test(lower)) return icon;
  }
  return "🥄";
}

let ingredients = [];

function renderTags() {
  tagList.innerHTML = "";
  ingredients.forEach((ing, idx) => {
    const tag = document.createElement("div");
    tag.className = "tag";
    tag.innerHTML = `<span></span><button type="button" aria-label="Remove ${ing}">&times;</button>`;
    tag.querySelector("span").textContent = ing;
    tag.querySelector("button").addEventListener("click", () => {
      ingredients.splice(idx, 1);
      renderTags();
    });
    tagList.appendChild(tag);
  });
}

function addIngredientFromText(text) {
  text
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((piece) => {
      if (!ingredients.includes(piece)) {
        ingredients.push(piece);
      }
    });
  renderTags();
}

ingredientInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    if (ingredientInput.value.trim()) {
      addIngredientFromText(ingredientInput.value);
      ingredientInput.value = "";
    }
  } else if (e.key === "Backspace" && !ingredientInput.value && ingredients.length) {
    ingredients.pop();
    renderTags();
  }
});

ingredientInput.addEventListener("paste", (e) => {
  const text = e.clipboardData.getData("text");
  if (text.includes(",")) {
    e.preventDefault();
    addIngredientFromText(text);
  }
});

ingredientInput.addEventListener("blur", () => {
  if (ingredientInput.value.trim()) {
    addIngredientFromText(ingredientInput.value);
    ingredientInput.value = "";
  }
});

function showError(message) {
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function clearError() {
  errorBox.classList.add("hidden");
  errorBox.textContent = "";
}

function setLoading(active, text) {
  loadingBox.classList.toggle("hidden", !active);
  generateBtn.disabled = active;
  if (text) loadingText.textContent = text;
}

async function generateRecipe() {
  clearError();
  resultSection.classList.add("hidden");

  if (ingredients.length < 2) {
    showError("Please add at least 2-3 ingredients so there's something to cook with.");
    return;
  }

  setLoading(true, "Writing your recipe...");

  let recipe;
  try {
    const res = await fetch("/api/recipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ingredients }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Recipe generation failed.");
    }
    recipe = data;
  } catch (err) {
    setLoading(false);
    showError(err.message || "Something went wrong generating the recipe. Please try again.");
    return;
  }

  renderRecipe(recipe);
  resultSection.classList.remove("hidden");
  inputCard.classList.add("compact");
  popularSection.classList.add("hidden");

  setLoading(true, "Plating it up...");
  imageWrap.classList.add("hidden");
  imageError.classList.add("hidden");
  heroCard.classList.add("no-image");

  try {
    const res = await fetch("/api/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: recipe.title, description: recipe.description }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.detail || "Image generation failed.");
    }
    dishImage.src = data.image_url;
    imageWrap.classList.remove("hidden");
    heroCard.classList.remove("no-image");
  } catch (err) {
    imageError.textContent = err.message || "Couldn't generate an image this time, but here's your recipe.";
    imageError.classList.remove("hidden");
  } finally {
    setLoading(false);
  }
}

function renderRecipe(recipe) {
  recipeTitle.textContent = recipe.title;
  recipeDescription.textContent = recipe.description || "";

  if (recipe.servings) {
    recipeServings.textContent = recipe.servings;
    recipeServings.classList.remove("hidden");
  } else {
    recipeServings.classList.add("hidden");
  }

  metaPreptime.textContent = recipe.prep_time || "—";
  metaDifficulty.textContent = recipe.difficulty || "—";
  metaIngredientCount.textContent = (recipe.ingredients || []).length || "—";

  if (recipe.tags && recipe.tags.length) {
    recipeTags.innerHTML = "";
    recipe.tags.forEach((tag) => {
      const span = document.createElement("span");
      span.className = "recipe-tag";
      span.textContent = tag;
      recipeTags.appendChild(span);
    });
    recipeTags.classList.remove("hidden");
  } else {
    recipeTags.classList.add("hidden");
  }

  recipeIngredients.innerHTML = "";
  (recipe.ingredients || []).forEach((ing) => {
    const li = document.createElement("li");

    const icon = document.createElement("span");
    icon.className = "ingredient-icon";
    icon.textContent = pickIngredientIcon(ing.item);

    const nameWrap = document.createElement("span");
    nameWrap.className = "ingredient-name";
    nameWrap.textContent = ing.item;
    if (ing.substitution_note) {
      const note = document.createElement("span");
      note.className = "ingredient-note";
      note.textContent = ing.substitution_note;
      nameWrap.appendChild(note);
    }

    li.appendChild(icon);
    li.appendChild(nameWrap);
    recipeIngredients.appendChild(li);
  });

  if (recipe.substitution_notes && recipe.substitution_notes.length) {
    recipeSubstitutions.innerHTML = "";
    recipe.substitution_notes.forEach((note) => {
      const li = document.createElement("li");
      li.textContent = note;
      recipeSubstitutions.appendChild(li);
    });
    substitutionsWrap.classList.remove("hidden");
  } else {
    substitutionsWrap.classList.add("hidden");
  }

  recipeSteps.innerHTML = "";
  (recipe.steps || []).forEach((step) => {
    const li = document.createElement("li");
    li.textContent = step;
    recipeSteps.appendChild(li);
  });
}

generateBtn.addEventListener("click", generateRecipe);
renderPopularGrid();
