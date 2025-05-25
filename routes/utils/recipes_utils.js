const axios = require("axios");
const api_domain = "https://api.spoonacular.com/recipes";
const api_key = process.env.spoonacular_apiKey;
const DButils = require("./DButils");
const e = require("express");
require("dotenv").config();

/**
 * Get recipes list from spooncular response and extract the relevant recipe data for preview
 * @param {*} recipes_info 
 */


async function getRecipeInformation(recipe_id) {
    return await axios.get(`${api_domain}/${recipe_id}/information`, {
        params: {
            includeNutrition: false,
            apiKey: api_key
        }
    });
}


// תצוגה מקדימה - מיפוי מתוך מידע מלא
function extractPreview(recipe_info) {
  const {
    id,
    title,
    readyInMinutes,
    image,
    aggregateLikes,
    vegan,
    vegetarian,
    glutenFree
  } = recipe_info;

  let tags = null;
  if (vegan) tags = "טבעוני";
  else if (vegetarian) tags = "צמחוני";

  return {
    id,
    title,
    prep_time_minutes: readyInMinutes,
    image,
    popularity_score: aggregateLikes,
    tags,
    has_gluten: !glutenFree,
    was_viewed: false,
    is_favorite: false,
    can_preview: true
  };
}
exports.extractPreview = extractPreview;


// שליפת מספר מתכונים אקראיים לתצוגה מקדימה
async function getRandomRecipesPreview(number) {
  const response = await axios.get(`${api_domain}/random`, {
    params: {
      number,
      apiKey: api_key
    }
  });
  const recipes = response.data.recipes;
  return recipes.map(extractPreview);
}
exports.getRandomRecipesPreview = getRandomRecipesPreview;


// שליפה מלאה של מתכון לפי מזהה
async function getRecipeDetails(recipe_id) {
  let recipe_info = await getRecipeInformation(recipe_id);
  recipe_info = recipe_info.data;
  const {
    id,
    title,
    readyInMinutes,
    image,
    aggregateLikes,
    vegan,
    vegetarian,
    glutenFree,
    extendedIngredients,
    instructions,
    servings
  } = recipe_info;
  let tags = null;
  if (vegan) tags = "טבעוני";
  else if (vegetarian) tags = "צמחוני";
  return {
    id,
    title,
    prep_time_minutes: readyInMinutes,
    image,
    popularity_score: aggregateLikes,
    tags,
    has_gluten: !glutenFree,
    ingredients: extendedIngredients.map(ing => ({
      name: ing.name,
      amount: ing.original
    })),
    instructions,
    servings,
    was_viewed: false,
    is_favorite: false,
    can_preview: true
  };
}
exports.getRecipeDetails = getRecipeDetails;


// שורה 9 - תצוגה מקדימה של מתכונים אקראיים
async function getRandomRecipesPreview(number = 3) {
  const response = await axios.get(
    `https://api.spoonacular.com/recipes/random`,
    {
      params: {
        number: number,
        apiKey: api_key
      }
    }
  );
  return response.data.recipes.map((recipe) => {
    return {
      image: recipe.image,
      title: recipe.title,
      prep_time_minutes: recipe.readyInMinutes,
      popularity_score: recipe.aggregateLikes,
      tags: recipe.vegetarian ? "צמחוני" : "טבעוני", 
      has_gluten: recipe.glutenFree === false,
      was_viewed: false,
      is_favorite: false,
      can_preview: true,
    };
  });
}
exports.getRandomRecipesPreview = getRandomRecipesPreview;


//שורה 146 - מתכונים שנצפו
async function markRecipeAsViewed(user_id, recipe_id) {
  await DButils.execQuery(
    `INSERT INTO viewed_recipes (user_id, recipe_id) VALUES ('${user_id}', '${recipe_id}')`
  );
}
exports.markRecipeAsViewed = markRecipeAsViewed;


//יצירת מתכון חדש
async function createNewRecipe(user_id, recipeData) {
  const {
    image,
    title,
    prep_time_minutes,
    popularity_score,
    tags,
    has_gluten,
    ingredients,
    instructions,
    servings
  } = recipeData;
  // בדיקה בסיסית
  if (!title || !ingredients || !instructions) {
    const error = new Error("Missing required fields");
    error.status = 400;
    throw error;
  }
  // המרת ערכים בוליאניים ל־0/1
  const hasGlutenValue = has_gluten ? 1 : 0;
  const wasViewedValue = 0;
  const isFavoriteValue = 0;
  const canPreviewValue = 1;
  // הכנסת נתונים למסד
  await DButils.execQuery(`
    INSERT INTO recipes (
      user_id, image, title, prep_time_minutes, popularity_score,
      tags, has_gluten, was_viewed, is_favorite, can_preview, ingredients, instructions, servings
    ) VALUES (
      '${user_id}', '${image}', '${title}', '${prep_time_minutes}', '${popularity_score}',
      '${tags}', '${hasGlutenValue}',  '${wasViewedValue}', '${isFavoriteValue}', '${canPreviewValue}','${JSON.stringify(ingredients)}', '${instructions}', '${servings}'
    )
  `);
  return {
    title,
    image,
    prep_time_minutes,
    popularity_score,
    tags,
    has_gluten: hasGlutenValue,
    ingredients,
    instructions,
    servings
  };
}
exports.createNewRecipe = createNewRecipe;

//3 מתכונים אקראיים
async function get3RandomRecipesPreview(number) {
  const response = await axios.get(`${api_domain}/random`, {
    params: {
      number,
      apiKey: api_key
    }
  });
  return response.data.recipes.map((recipe) => {
    return {
      image: recipe.image,
      title: recipe.title,
      prep_time_minutes: recipe.readyInMinutes,
      popularity_score: recipe.aggregateLikes,
      tags: recipe.vegetarian ? "צמחוני" : "טבעוני",
      has_gluten: recipe.glutenFree === false,
      was_viewed: false,
      is_favorite: false,
      can_preview: true,
    };
  });
}
exports.get3RandomRecipesPreview = get3RandomRecipesPreview;

// חיפוש מתכונים לפי שאילתא
async function searchRecipesAdvanced({
  query,
  cuisine,
  diet,
  intolerances,
  sortBy,
  number = 5
}) {
  try {
    const response = await axios.get(`${api_domain}/complexSearch`, {
      params: {
        query,
        cuisine: cuisine?.join(","),
        diet,
        intolerances: intolerances?.join(","),
        sort: sortBy === "time" ? "readyInMinutes" : "popularity",
        number,
        addRecipeInformation: true,
        apiKey: api_key
      }
    });

    const results = response.data.results.map((recipe) => {
      return {
        id: recipe.id,
        title: recipe.title,
        image: recipe.image,
        prep_time_minutes: recipe.readyInMinutes,
        popularity_score: recipe.aggregateLikes,
        tags: recipe.vegetarian ? "צמחוני" : recipe.vegan ? "טבעוני" : null,
        has_gluten: recipe.glutenFree === false,
        was_viewed: false,
        is_favorite: false,
        can_preview: true
      };
    });

    return results;
  } catch (error) {
    throw new Error("Request failed with status code " + error.response?.status);
  }
}
exports.searchRecipesAdvanced = searchRecipesAdvanced;

